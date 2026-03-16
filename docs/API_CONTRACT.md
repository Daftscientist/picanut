# API Contract (Sanic backend)

This document is derived from the backend code under `picanut/backend/app/`.

## Auth model

- **Auth header**: `Authorization: Bearer <token>`
- **Token type**: opaque session token stored server-side in `sessions` table.
- **Identity**: `GET /api/auth/me` returns the current user and flags used for RBAC:
  - `role`: `manager` | `subuser`
  - `is_platform_admin`: boolean

## RBAC

- **Unauthenticated**:
  - `POST /api/auth/login`
  - `POST /api/auth/signup`
  - `GET /api/billing/plans`
  - `POST /api/billing/webhook`
  - `POST /api/webhooks/*`
  - `GET /api/agent/poll`
  - `POST /api/agent/result`
- **Manager-only** (unless `is_platform_admin=true`):
  - `/api/agents/*` mutating routes
  - `/api/settings/users*`
- **Platform-admin-only**:
  - `/api/admin/*`

## Endpoints

### Auth (`/api/auth/*`)

#### `POST /api/auth/login`

Request JSON:

```json
{ "username": "string", "password": "string" }
```

Response JSON (200):

```json
{
  "token": "string",
  "username": "string",
  "is_admin": true,
  "org_id": "uuid|string|null",
  "role": "manager|subuser",
  "is_platform_admin": true
}
```

Errors:
- 400 `{ "error": "Username and password required" }`
- 401 `{ "error": "Invalid credentials" }`

#### `POST /api/auth/signup`

Request JSON:

```json
{
  "username": "string",
  "email": "string (currently unused by backend)",
  "password": "string (>= 8 chars)",
  "company_name": "string"
}
```

Response JSON (201):

```json
{
  "token": "string",
  "username": "string",
  "is_admin": false,
  "is_platform_admin": false,
  "role": "manager",
  "org_id": "uuid|string"
}
```

Errors:
- 400 `{ "error": "All fields required" }`
- 400 `{ "error": "Password must be at least 8 characters" }`
- 409 `{ "error": "Username already taken" }`

#### `POST /api/auth/logout`

Response JSON:

```json
{ "ok": true }
```

#### `GET /api/auth/me`

Response JSON:

```json
{
  "user_id": "uuid|string",
  "username": "string",
  "is_admin": true,
  "org_id": "uuid|string|null",
  "role": "manager|subuser",
  "is_platform_admin": true,
  "default_agent_id": "uuid|string|null"
}
```

### Billing (`/api/billing/*`)

#### `GET /api/billing/plans` (public)

Response JSON:

```json
[
  {
    "id": "uuid|string",
    "name": "string",
    "price_pence": 2900,
    "trial_days": 30,
    "subuser_limit": 5,
    "agent_limit": 2,
    "product_limit": 100,
    "print_quota": 1000
  }
]
```

#### `GET /api/billing/status`

Response JSON contains organization + joined plan info + usage counters:

```json
{
  "id": "uuid|string",
  "name": "string",
  "slug": "string",
  "plan_id": "uuid|string|null",
  "plan_name": "string|null",
  "subscription_status": "trialing|active|past_due|cancelled|...",
  "trial_ends_at": "iso8601|null",
  "current_period_end": "iso8601|null",
  "created_at": "iso8601",
  "usage": {
    "quota": { "used": 0, "limit": 1000 },
    "products": { "used": 0, "limit": 100 },
    "agents": { "used": 0, "limit": 2 },
    "subusers": { "used": 0, "limit": 5 }
  }
}
```

Errors:
- 400 `{ "error": "No organisation" }`
- 404 `{ "error": "Org not found" }`

#### `POST /api/billing/checkout`

Request JSON:

```json
{ "plan_id": "uuid|string" }
```

Response JSON:

```json
{ "url": "string" }
```

Errors:
- 400 `{ "error": "No organisation" }`
- 400 `{ "error": "Plan not available for purchase" }`

#### `POST /api/billing/portal`

Response JSON:

```json
{ "url": "string" }
```

Errors:
- 400 `{ "error": "No billing account found" }`

### Tags (`/api/tags`)

#### `GET /api/tags`

Response JSON:

```json
[{ "id": "uuid|string", "name": "string", "colour": "#RRGGBB" }]
```

#### `POST /api/tags`

Request JSON:

```json
{ "name": "string", "colour": "#RRGGBB" }
```

Response JSON (201):

```json
{ "id": "uuid|string", "name": "string", "colour": "#RRGGBB" }
```

### Products (`/api/products`)

#### `GET /api/products?search=&tag_id=`

Response JSON:

```json
[
  {
    "id": "uuid|string",
    "name": "string",
    "description": "string|null",
    "brand": "string|null",
    "created_at": "iso8601",
    "tags": [{ "id": "uuid|string", "name": "string", "colour": "#RRGGBB" }],
    "variant_count": 0
  }
]
```

#### `POST /api/products`

Request JSON:

```json
{
  "name": "string",
  "description": "string",
  "brand": "string",
  "tag_ids": ["uuid|string"]
}
```

Response JSON (201): product summary.

Errors:
- 402 `{ "error": "Product limit reached. Upgrade your plan.", "limit_hit": true }`

#### `GET /api/products/:product_id`

Response JSON:

```json
{
  "id": "uuid|string",
  "name": "string",
  "description": "string|null",
  "brand": "string|null",
  "created_at": "iso8601",
  "tags": [{ "id": "uuid|string", "name": "string", "colour": "#RRGGBB" }],
  "variants": [
    {
      "id": "uuid|string",
      "sku": "string",
      "barcode": "string|null",
      "weight_g": 123.45,
      "price_gbp": 12.34,
      "nutrition_json": {},
      "is_active": true,
      "created_at": "iso8601"
    }
  ]
}
```

### Printing (`/api/print/*`, plus `/api/printers`)

#### `POST /api/print/render`

- **Request**: JSON.
- **Response**: `application/octet-stream` label raster bytes.
- **Response headers**: `X-Job-Id: <uuid>`

Request JSON (variant-based render):

```json
{ "variant_id": "uuid|string", "label_type": 1, "quantity": 1 }
```

May include extra fields depending on `label_type`:
- `label_type=2`: `info_brand`, `info_title`, `info_body`
- common: `ingredients` (used by some label types)

Errors:
- 402 `{ "error": "Monthly print quota exceeded. Upgrade your plan.", "limit_hit": true }`

#### `POST /api/print/:job_id/confirm`

Response JSON:

```json
{ "ok": true, "job_id": "uuid|string" }
```

#### `GET /api/print/jobs?limit=&status=`

Response JSON: list of recent jobs with product name and SKU if available.

#### `GET /api/print/orders/pending`

Response JSON: pending Woo orders including derived fields:
- `customer_name`, `order_number`, `unmatched`, `jobs[]`

#### `POST /api/print/orders/:order_id/print-all`

- **Response**: `application/octet-stream` combined raster bytes for all queued jobs in order
- **Response header**: `X-Job-Ids: id1,id2,...`

#### `GET /api/printers`

- Uses local agent connectivity; returns printer names if the agent is connected.

Success response JSON:

```json
{ "printers": ["string"] }
```

Errors:
- 503 `{ "error": "No agent configured" }` (or no connected agent)
- 504 `{ "error": "Agent timed out" }`

### Agents (`/api/agents/*`)

`GET /api/agents` response JSON:

```json
{
  "agents": [
    {
      "id": "uuid|string",
      "name": "string",
      "selected_printer": "string|null",
      "paper_size": "string|null",
      "is_default": true,
      "last_seen_at": "iso8601|null",
      "created_at": "iso8601",
      "connected": true
    }
  ]
}
```

Manager-only mutations:
- `POST /api/agents`
- `PUT /api/agents/:agent_id`
- `DELETE /api/agents/:agent_id`
- `POST /api/agents/:agent_id/regenerate-token`
- `POST /api/agents/:agent_id/set-default`
- `PUT /api/agents/:agent_id/access`
- `DELETE /api/agents/:agent_id/access/:user_id`

Limit errors:
- 402 `{ "error": "Agent limit reached. Upgrade your plan.", "limit_hit": true }`

### Settings (`/api/settings/*`)

Manager-only:
- `GET /api/settings/users`
- `POST /api/settings/users`

User-scoped:
- `GET /api/settings/user`
- `PUT /api/settings/user/default-agent`
- `POST /api/settings/revoke-sessions`

Limit errors:
- 402 `{ "error": "Subuser limit reached. Upgrade your plan.", "limit_hit": true }`

### Platform admin (`/api/admin/*`)

Platform-admin-only.

- Plans:
  - `GET /api/admin/plans` → `Plan[]`
  - `POST /api/admin/plans` → created `Plan`
  - `PUT /api/admin/plans/:plan_id` → updated `Plan`
  - `DELETE /api/admin/plans/:plan_id` → `{ "ok": true }`
- Organizations:
  - `GET /api/admin/organizations` → org list includes `plan_name`, `user_count`, `agent_count`
  - `GET /api/admin/organizations/:org_id` → org detail includes `users[]`
  - `PUT /api/admin/organizations/:org_id` → updates plan/status
