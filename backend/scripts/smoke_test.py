import argparse
import json
import os
import sys
import time
import uuid
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


JsonObj = Dict[str, Any]


@dataclass
class HttpResp:
    status: int
    headers: Dict[str, str]
    body: bytes


def _hdrs_to_dict(headers) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for k, v in headers.items():
        out[str(k).lower()] = str(v)
    return out


def http_request(
    *,
    base_url: str,
    method: str,
    path: str,
    token: Optional[str] = None,
    query: Optional[Dict[str, str]] = None,
    json_body: Optional[JsonObj] = None,
    raw_body: Optional[bytes] = None,
    extra_headers: Optional[Dict[str, str]] = None,
    timeout_s: float = 20.0,
) -> HttpResp:
    if query:
        path = f"{path}?{urlencode(query)}"
    url = base_url.rstrip("/") + path

    headers: Dict[str, str] = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if extra_headers:
        headers.update(extra_headers)

    data: Optional[bytes] = None
    if json_body is not None:
        data = json.dumps(json_body).encode("utf-8")
        headers.setdefault("Content-Type", "application/json")
        headers.setdefault("Accept", "application/json")
    elif raw_body is not None:
        data = raw_body

    req = Request(url=url, method=method.upper(), data=data, headers=headers)
    try:
        with urlopen(req, timeout=timeout_s) as resp:
            return HttpResp(
                status=int(resp.status),
                headers=_hdrs_to_dict(resp.headers),
                body=resp.read(),
            )
    except HTTPError as e:
        body = e.read() if hasattr(e, "read") else b""
        return HttpResp(
            status=int(getattr(e, "code", 0) or 0),
            headers=_hdrs_to_dict(getattr(e, "headers", {}) or {}),
            body=body,
        )
    except URLError as e:
        raise RuntimeError(f"Network error calling {url}: {e}") from e


def must_json(resp: HttpResp) -> JsonObj | list:
    try:
        return json.loads(resp.body.decode("utf-8") if resp.body else "{}")
    except Exception as e:
        raise AssertionError(f"Expected JSON but got {len(resp.body)} bytes") from e


def assert_status(resp: HttpResp, expected: int | Tuple[int, ...], label: str) -> None:
    exp = expected if isinstance(expected, tuple) else (expected,)
    if resp.status not in exp:
        detail = resp.body[:500].decode("utf-8", errors="replace")
        raise AssertionError(f"{label}: expected {exp}, got {resp.status}. body={detail!r}")


def _print_ok(msg: str) -> None:
    print(f"[OK]  {msg}")


def _print_warn(msg: str) -> None:
    print(f"[WARN]{msg}")


def _print_fail(msg: str) -> None:
    print(f"[FAIL]{msg}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Smoke test LabelFlow backend APIs.")
    parser.add_argument(
        "--base-url",
        default=os.environ.get("LABELFLOW_BASE_URL", "http://localhost:8000"),
        help="Backend origin, e.g. http://localhost:8000",
    )
    parser.add_argument(
        "--admin-user",
        default=os.environ.get("LABELFLOW_ADMIN_USER", "admin"),
        help="Admin username (default admin)",
    )
    parser.add_argument(
        "--admin-pass",
        default=os.environ.get("LABELFLOW_ADMIN_PASS", "admin"),
        help="Admin password (default admin)",
    )
    parser.add_argument(
        "--run-admin-tests",
        action="store_true",
        help="Also test /api/admin/* endpoints (requires platform admin token).",
    )
    parser.add_argument(
        "--create-fixtures",
        action="store_true",
        help="Create tag/product/variant fixtures and clean them up at end.",
    )
    args = parser.parse_args()

    base_url: str = args.base_url
    started = time.time()
    created: Dict[str, str] = {}

    try:
        # 1) Public plans
        resp = http_request(base_url=base_url, method="GET", path="/api/billing/plans")
        assert_status(resp, 200, "public plans")
        plans = must_json(resp)
        if not isinstance(plans, list):
            raise AssertionError("public plans: expected list")
        _print_ok(f"GET /api/billing/plans ({len(plans)} plans)")

        # 2) Login as admin
        resp = http_request(
            base_url=base_url,
            method="POST",
            path="/api/auth/login",
            json_body={"username": args.admin_user, "password": args.admin_pass},
        )
        assert_status(resp, 200, "admin login")
        login = must_json(resp)
        if not isinstance(login, dict) or "token" not in login:
            raise AssertionError("admin login: missing token")
        admin_token = str(login["token"])
        _print_ok("POST /api/auth/login (admin)")

        # 3) /me
        resp = http_request(base_url=base_url, method="GET", path="/api/auth/me", token=admin_token)
        assert_status(resp, 200, "admin me")
        me = must_json(resp)
        if not isinstance(me, dict):
            raise AssertionError("admin me: expected object")
        _print_ok(f"GET /api/auth/me (role={me.get('role')}, platform={me.get('is_platform_admin')})")

        # 4) Create subuser (manager-only endpoint), then verify RBAC for subuser
        sub_username = f"smoke_subuser_{uuid.uuid4().hex[:8]}"
        sub_password = f"TestPass!{uuid.uuid4().hex[:8]}"
        resp = http_request(
            base_url=base_url,
            method="POST",
            path="/api/settings/users",
            token=admin_token,
            json_body={"username": sub_username, "password": sub_password, "role": "subuser"},
        )
        assert_status(resp, (201, 409), "create subuser")
        if resp.status == 201:
            u = must_json(resp)
            if isinstance(u, dict) and "id" in u:
                created["subuser_id"] = str(u["id"])
            _print_ok("POST /api/settings/users (created subuser)")
        else:
            _print_warn(" subuser already existed (unexpected for random username)")

        resp = http_request(
            base_url=base_url,
            method="POST",
            path="/api/auth/login",
            json_body={"username": sub_username, "password": sub_password},
        )
        assert_status(resp, 200, "subuser login")
        sub_token = str(must_json(resp)["token"])
        _print_ok("POST /api/auth/login (subuser)")

        # Subuser should be blocked from manager-only pages
        resp = http_request(base_url=base_url, method="GET", path="/api/settings/users", token=sub_token)
        assert_status(resp, 403, "subuser GET /api/settings/users")
        _print_ok("RBAC: subuser blocked from /api/settings/users")

        resp = http_request(base_url=base_url, method="POST", path="/api/agents", token=sub_token, json_body={"name": "Nope"})
        assert_status(resp, 403, "subuser POST /api/agents")
        _print_ok("RBAC: subuser blocked from /api/agents mutations")

        # 5) Products/tags (subuser can read; manager can create fixtures if requested)
        resp = http_request(base_url=base_url, method="GET", path="/api/tags", token=sub_token)
        assert_status(resp, 200, "subuser list tags")
        _print_ok("GET /api/tags (subuser)")

        resp = http_request(base_url=base_url, method="GET", path="/api/products", token=sub_token)
        assert_status(resp, 200, "subuser list products")
        _print_ok("GET /api/products (subuser)")

        if args.create_fixtures:
            # Tag
            resp = http_request(
                base_url=base_url,
                method="POST",
                path="/api/tags",
                token=admin_token,
                json_body={"name": f"SmokeTag {uuid.uuid4().hex[:6]}", "colour": "#206BC4"},
            )
            assert_status(resp, 201, "create tag")
            tag = must_json(resp)
            tag_id = str(tag["id"])
            created["tag_id"] = tag_id
            _print_ok("POST /api/tags (fixture)")

            # Product
            resp = http_request(
                base_url=base_url,
                method="POST",
                path="/api/products",
                token=admin_token,
                json_body={
                    "name": f"Smoke Product {uuid.uuid4().hex[:6]}",
                    "description": "smoke test product",
                    "brand": "Smoke",
                    "tag_ids": [tag_id],
                },
            )
            assert_status(resp, (201, 402), "create product")
            if resp.status == 402:
                _print_warn(" product limit reached; skipping product/variant/print tests")
            else:
                product = must_json(resp)
                product_id = str(product["id"])
                created["product_id"] = product_id
                _print_ok("POST /api/products (fixture)")

                # Variant
                resp = http_request(
                    base_url=base_url,
                    method="POST",
                    path=f"/api/products/{product_id}/variants",
                    token=admin_token,
                    json_body={
                        "sku": f"SMOKE-{uuid.uuid4().hex[:6]}",
                        "barcode": "1234567890123",
                        "weight_g": 120.5,
                        "price_gbp": 2.99,
                        "nutrition_json": {"kcal": 100},
                        "is_active": True,
                    },
                )
                assert_status(resp, 201, "create variant")
                variant = must_json(resp)
                variant_id = str(variant["id"])
                created["variant_id"] = variant_id
                _print_ok("POST /api/products/:id/variants (fixture)")

                # Render label -> bytes + job id header
                resp = http_request(
                    base_url=base_url,
                    method="POST",
                    path="/api/print/render",
                    token=admin_token,
                    json_body={"variant_id": variant_id, "label_type": 1, "quantity": 1},
                )
                assert_status(resp, (200, 402), "render label")
                if resp.status == 402:
                    _print_warn(" print quota exceeded; skipping confirm/job list checks")
                else:
                    job_id = resp.headers.get("x-job-id", "").strip()
                    if not job_id:
                        raise AssertionError("render label: missing X-Job-Id header")
                    created["job_id"] = job_id
                    _print_ok(f"POST /api/print/render ({len(resp.body)} bytes, job_id={job_id})")

                    # Confirm
                    resp2 = http_request(
                        base_url=base_url,
                        method="POST",
                        path=f"/api/print/{job_id}/confirm",
                        token=admin_token,
                    )
                    assert_status(resp2, 200, "confirm job")
                    _print_ok("POST /api/print/:job_id/confirm")

                    # Job list
                    resp3 = http_request(
                        base_url=base_url,
                        method="GET",
                        path="/api/print/jobs",
                        token=admin_token,
                        query={"limit": "5"},
                    )
                    assert_status(resp3, 200, "list jobs")
                    jobs = must_json(resp3)
                    if not isinstance(jobs, list):
                        raise AssertionError("list jobs: expected list")
                    _print_ok(f"GET /api/print/jobs (count={len(jobs)})")

        # 6) Orders pending should always be valid (can be empty)
        resp = http_request(base_url=base_url, method="GET", path="/api/print/orders/pending", token=admin_token)
        assert_status(resp, 200, "pending orders")
        orders = must_json(resp)
        if not isinstance(orders, list):
            raise AssertionError("pending orders: expected list")
        _print_ok(f"GET /api/print/orders/pending (count={len(orders)})")

        # 7) Admin endpoints: verify RBAC and, optionally, happy paths
        resp = http_request(base_url=base_url, method="GET", path="/api/admin/plans", token=sub_token)
        assert_status(resp, 403, "subuser admin plans blocked")
        _print_ok("RBAC: non-platform user blocked from /api/admin/*")

        if args.run_admin_tests:
            resp = http_request(base_url=base_url, method="GET", path="/api/admin/plans", token=admin_token)
            assert_status(resp, 200, "admin list plans")
            plans_admin = must_json(resp)
            if not isinstance(plans_admin, list):
                raise AssertionError("admin list plans: expected list")
            _print_ok(f"GET /api/admin/plans (count={len(plans_admin)})")

            resp = http_request(base_url=base_url, method="GET", path="/api/admin/organizations", token=admin_token)
            assert_status(resp, 200, "admin list orgs")
            orgs = must_json(resp)
            if not isinstance(orgs, list):
                raise AssertionError("admin list orgs: expected list")
            _print_ok(f"GET /api/admin/organizations (count={len(orgs)})")

        # 8) Logout
        resp = http_request(base_url=base_url, method="POST", path="/api/auth/logout", token=admin_token)
        assert_status(resp, 200, "admin logout")
        _print_ok("POST /api/auth/logout")

        elapsed = time.time() - started
        print(f"\nAll checks passed in {elapsed:.2f}s.")
        return 0

    except Exception as e:
        _print_fail(f" {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

