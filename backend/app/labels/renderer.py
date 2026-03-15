"""
Label renderer — professional layout using Pillow + python-barcode.

All labels:
  - 62mm wide, 300 DPI, continuous tape, monochrome (L mode)
  - Canvas width = 720px
  - Minimum 28px margin on all sides
  - Max 3 type sizes per label
  - Barcode always last, centred, with rule above and number below
  - Nutrition table: alternating grey rows, sub-rows indented
  - Monochrome only: black (0) and light grey fill (245)
"""

import io
import os
from PIL import Image, ImageDraw, ImageFont

# ── Font loading ──────────────────────────────────────────────────────────────

FONT_DIR = "/usr/share/fonts/truetype/dejavu"
_FONT_CACHE: dict = {}

GREY_FILL = 245   # light grey row fill  (#F5F5F5)
GREY_TEXT = 80    # secondary text
BLACK = 0
WHITE = 255


def _font(size: int, bold: bool = False, italic: bool = False):
    key = ("bold" if bold else "italic" if italic else "regular", size)
    if key in _FONT_CACHE:
        return _FONT_CACHE[key]
    try:
        if bold:
            name = "DejaVuSans-Bold.ttf"
        elif italic:
            name = "DejaVuSans-Oblique.ttf"
        else:
            name = "DejaVuSans.ttf"
        font = ImageFont.truetype(os.path.join(FONT_DIR, name), size)
    except (IOError, OSError):
        font = ImageFont.load_default()
    _FONT_CACHE[key] = font
    return font


# ── Helpers ───────────────────────────────────────────────────────────────────

CANVAS_W = 720
PAD = 28          # minimum margin all sides
INNER_W = CANVAS_W - 2 * PAD


def _canvas(height: int = 600) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("L", (CANVAS_W, height), WHITE)
    return img, ImageDraw.Draw(img)


def _grow(img: Image.Image, extra: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    new = Image.new("L", (CANVAS_W, img.height + extra), WHITE)
    new.paste(img, (0, 0))
    return new, ImageDraw.Draw(new)


def _ensure(img: Image.Image, draw, needed_y: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    if needed_y > img.height:
        img, draw = _grow(img, needed_y - img.height + PAD * 2)
    return img, draw


def _text_h(draw, text: str, font) -> int:
    bb = draw.textbbox((0, 0), text, font=font)
    return bb[3] - bb[1]


def _text_w(draw, text: str, font) -> int:
    bb = draw.textbbox((0, 0), text, font=font)
    return bb[2] - bb[0]


def _wrap(draw, text: str, font, max_w: int) -> list[str]:
    words = text.split()
    lines, cur = [], ""
    for word in words:
        test = (cur + " " + word).strip()
        if _text_w(draw, test, font) <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines or [""]


def _draw_text_left(draw, x: int, y: int, text: str, font, fill=BLACK) -> int:
    """Draw text left-aligned, return new y after the line."""
    draw.text((x, y), text, font=font, fill=fill)
    return y + _text_h(draw, text, font)


def _draw_text_centre(draw, y: int, text: str, font, fill=BLACK) -> int:
    draw.text((CANVAS_W // 2, y), text, font=font, fill=fill, anchor="ma")
    return y + _text_h(draw, text, font)


def _draw_wrapped_left(draw, x: int, y: int, text: str, font, max_w: int,
                        fill=BLACK, line_gap: int = 4) -> int:
    for line in _wrap(draw, text, font, max_w):
        y = _draw_text_left(draw, x, y, line, font, fill)
        y += line_gap
    return y


def _rule(draw, y: int, weight: int = 1, fill: int = BLACK) -> int:
    draw.line([(PAD, y), (CANVAS_W - PAD, y)], fill=fill, width=weight)
    return y + weight


def _price_str(price_gbp) -> str:
    return f"£{float(price_gbp):.2f}"


def _weight_str(weight_g) -> str:
    v = float(weight_g)
    return f"{int(v)}g" if v == int(v) else f"{v}g"


# ── Barcode ───────────────────────────────────────────────────────────────────

def _barcode_img(code: str, target_w: int) -> tuple[Image.Image | None, str]:
    """
    Generate a Code128 barcode without embedded text.
    Returns (PIL Image in L mode, code string).
    """
    try:
        import barcode
        from barcode.writer import ImageWriter

        writer = ImageWriter()
        bc = barcode.get("code128", code, writer=writer)
        buf = io.BytesIO()
        bc.write(buf, options={
            "module_height": 18.0,
            "module_width": 0.38,
            "quiet_zone": 4.0,
            "font_size": 0,        # no embedded text
            "text_distance": 0,
            "background": "white",
            "foreground": "black",
            "write_text": False,
        })
        buf.seek(0)
        img = Image.open(buf).convert("L")
        # Resize to target width, preserve aspect
        aspect = img.height / img.width
        new_h = max(1, int(target_w * aspect))
        img = img.resize((target_w, new_h), Image.LANCZOS)
        return img, code
    except Exception:
        return None, code


def _paste_barcode(
    img: Image.Image,
    draw,
    y: int,
    barcode_str: str,
) -> tuple[Image.Image, ImageDraw.ImageDraw, int]:
    """
    Draw a separator rule, paste centred barcode, draw number below.
    Returns updated (img, draw, new_y).
    """
    y += 10
    img, draw = _ensure(img, draw, y + 180)
    y = _rule(draw, y, weight=1, fill=BLACK) + 10

    bc_img, code = _barcode_img(barcode_str, INNER_W)
    if bc_img:
        x_offset = PAD + (INNER_W - bc_img.width) // 2
        img, draw = _ensure(img, draw, y + bc_img.height + 40)
        img.paste(bc_img, (x_offset, y))
        y += bc_img.height + 6

    # Barcode number — small, centred, monospace-ish
    font_num = _font(18)
    y = _draw_text_centre(draw, y, barcode_str, font_num, fill=GREY_TEXT) + 4
    return img, draw, y


# ── Label 1 — Shelf Label ─────────────────────────────────────────────────────
#
#  Typography: 48px (name), 64px (price), 24px (weight)
#  Layout:
#    [28px top pad]
#    Product name — 48 bold, left
#    [gap 8]
#    Weight — 24px regular, grey
#    [gap 4]
#    Price — 64px bold
#    [gap 12]
#    ── rule ──
#    Barcode centred
#    Barcode number — 18px centre
#    [28px bottom pad]

def render_label_1(
    product_name: str,
    weight_g=None,
    price_gbp=None,
    barcode: str | None = None,
) -> Image.Image:
    img, draw = _canvas(480)
    y = PAD

    f_name  = _font(48, bold=True)
    f_price = _font(64, bold=True)
    f_weight = _font(24)

    # Product name (wrapping)
    for line in _wrap(draw, product_name, f_name, INNER_W):
        img, draw = _ensure(img, draw, y + _text_h(draw, line, f_name) + 8)
        y = _draw_text_left(draw, PAD, y, line, f_name) + 2
    y += 10

    # Weight
    if weight_g is not None:
        img, draw = _ensure(img, draw, y + 40)
        y = _draw_text_left(draw, PAD, y, _weight_str(weight_g), f_weight, fill=GREY_TEXT) + 4

    # Price
    if price_gbp is not None:
        img, draw = _ensure(img, draw, y + 80)
        y = _draw_text_left(draw, PAD, y, _price_str(price_gbp), f_price) + 8

    # Barcode
    if barcode:
        img, draw, y = _paste_barcode(img, draw, y, barcode)

    y += PAD
    return img.crop((0, 0, CANVAS_W, y))


# ── Label 2 — Info Label ──────────────────────────────────────────────────────
#
#  Typography: 28px (brand), 40px (title), 22px (body)
#  Layout:
#    Brand — 28px bold, top centre
#    ── rule ──
#    [gap 14]
#    Title — 40px bold, left
#    [gap 10]
#    Body — 22px regular, left, wrapping

def render_label_2(
    brand: str,
    title: str,
    body: str,
) -> Image.Image:
    img, draw = _canvas(560)
    y = PAD

    f_brand = _font(28, bold=True)
    f_title = _font(40, bold=True)
    f_body  = _font(22)

    # Brand — centred, then rule
    y = _draw_text_centre(draw, y, brand, f_brand) + 8
    y = _rule(draw, y) + 14

    # Title
    for line in _wrap(draw, title, f_title, INNER_W):
        img, draw = _ensure(img, draw, y + _text_h(draw, line, f_title) + 6)
        y = _draw_text_left(draw, PAD, y, line, f_title) + 4
    y += 10

    # Body (respects newlines)
    for para in body.split("\n"):
        for line in _wrap(draw, para or " ", f_body, INNER_W):
            img, draw = _ensure(img, draw, y + _text_h(draw, line, f_body) + 4)
            y = _draw_text_left(draw, PAD, y, line, f_body) + 3
        y += 8

    y += PAD
    return img.crop((0, 0, CANVAS_W, y))


# ── Label 3 — Product Info Label ─────────────────────────────────────────────
#
#  Typography: 36px (name), 24px (brand/section labels/price), 20px (body/nutrition)
#  Layout:
#    Brand — 24px bold, top centre
#    ── rule ──
#    [gap 10]
#    Product name — 36px bold
#    [gap 6]
#    Description — 20px italic, grey
#    [gap 8]
#    "Ingredients:" 20px bold, then ingredient text 20px regular
#    [gap 8]
#    ── rule ──
#    "Nutrition per 100g" — 20px bold
#    Nutrition rows — 20px, alternating grey fill, sub-rows indented
#    ── rule ──
#    [gap 8]
#    Price  Weight — 28px bold, same line
#    ── rule ──
#    Barcode centred + number

def render_label_3(
    brand: str,
    product_name: str,
    description: str,
    ingredients: str,
    nutrition: dict | None,
    price_gbp=None,
    weight_g=None,
    barcode: str | None = None,
) -> Image.Image:
    img, draw = _canvas(1000)
    y = PAD

    f_brand  = _font(24, bold=True)
    f_name   = _font(36, bold=True)
    f_body   = _font(20)
    f_body_b = _font(20, bold=True)
    f_body_i = _font(20, italic=True)
    f_price  = _font(28, bold=True)
    ROW_H    = 26   # nutrition row height

    # Brand — centred + rule
    y = _draw_text_centre(draw, y, brand, f_brand) + 8
    y = _rule(draw, y) + 10

    # Product name
    for line in _wrap(draw, product_name, f_name, INNER_W):
        img, draw = _ensure(img, draw, y + _text_h(draw, line, f_name) + 4)
        y = _draw_text_left(draw, PAD, y, line, f_name) + 3
    y += 6

    # Description
    if description:
        for line in _wrap(draw, description, f_body_i, INNER_W):
            img, draw = _ensure(img, draw, y + _text_h(draw, line, f_body_i) + 4)
            y = _draw_text_left(draw, PAD, y, line, f_body_i, fill=GREY_TEXT) + 3
        y += 8

    # Ingredients
    if ingredients:
        img, draw = _ensure(img, draw, y + 30)
        y = _draw_text_left(draw, PAD, y, "Ingredients:", f_body_b) + 4
        for line in _wrap(draw, ingredients, f_body, INNER_W):
            img, draw = _ensure(img, draw, y + _text_h(draw, line, f_body) + 4)
            y = _draw_text_left(draw, PAD, y, line, f_body) + 3
        y += 8

    # Nutrition table
    if nutrition:
        img, draw = _ensure(img, draw, y + 20)
        y = _rule(draw, y) + 8
        y = _draw_text_left(draw, PAD, y, "Nutrition per 100g", f_body_b) + 6

        INDENT = 16
        table_x2 = CANVAS_W - PAD
        rows = [
            (False, "Energy",              f"{nutrition.get('energy_kj', '—')}kJ / {nutrition.get('energy_kcal', '—')}kcal"),
            (False, "Fat",                 f"{nutrition.get('fat', '—')}g"),
            (True,  "of which saturates",  f"{nutrition.get('saturates', '—')}g"),
            (False, "Carbohydrates",       f"{nutrition.get('carbs', '—')}g"),
            (True,  "of which sugars",     f"{nutrition.get('sugars', '—')}g"),
            (False, "Fibre",               f"{nutrition.get('fibre', '—')}g"),
            (False, "Protein",             f"{nutrition.get('protein', '—')}g"),
            (False, "Salt",                f"{nutrition.get('salt', '—')}g"),
        ]
        for i, (is_sub, label, value) in enumerate(rows):
            img, draw = _ensure(img, draw, y + ROW_H + 2)
            # Alternating grey fill on even rows
            if i % 2 == 0:
                draw.rectangle([(PAD, y), (CANVAS_W - PAD, y + ROW_H)], fill=GREY_FILL)
            label_font = f_body
            label_x = PAD + (INDENT if is_sub else 0)
            lbl_fill = GREY_TEXT if is_sub else BLACK
            draw.text((label_x, y + 3), label, font=label_font, fill=lbl_fill)
            val_w = _text_w(draw, value, label_font)
            draw.text((table_x2 - val_w, y + 3), value, font=label_font, fill=BLACK)
            y += ROW_H
            # hairline between rows
            draw.line([(PAD, y), (table_x2, y)], fill=210, width=1)
        y += 10
        y = _rule(draw, y) + 8

    # Price + weight on same line
    parts = []
    if price_gbp is not None:
        parts.append(_price_str(price_gbp))
    if weight_g is not None:
        parts.append(_weight_str(weight_g))
    if parts:
        pw = "    ·    ".join(parts)
        img, draw = _ensure(img, draw, y + 40)
        y = _draw_text_left(draw, PAD, y, pw, f_price) + 8

    # Barcode
    if barcode:
        img, draw, y = _paste_barcode(img, draw, y, barcode)

    y += PAD
    return img.crop((0, 0, CANVAS_W, y))


# ── Label 4 — Title Label ─────────────────────────────────────────────────────
#
#  Typography: 64px (name), 52px (price), 28px (weight)
#  All centred, generous spacing.

def render_label_4(
    product_name: str,
    price_gbp=None,
    weight_g=None,
    barcode: str | None = None,
) -> Image.Image:
    img, draw = _canvas(500)
    y = PAD + 8  # a little extra top breathing room

    f_name   = _font(64, bold=True)
    f_price  = _font(52, bold=True)
    f_weight = _font(28)

    # Product name — large, centred, wrapping
    for line in _wrap(draw, product_name, f_name, INNER_W):
        img, draw = _ensure(img, draw, y + _text_h(draw, line, f_name) + 8)
        y = _draw_text_centre(draw, y, line, f_name) + 4
    y += 14

    # Price
    if price_gbp is not None:
        img, draw = _ensure(img, draw, y + 70)
        y = _draw_text_centre(draw, y, _price_str(price_gbp), f_price) + 10

    # Weight
    if weight_g is not None:
        img, draw = _ensure(img, draw, y + 40)
        y = _draw_text_centre(draw, y, _weight_str(weight_g), f_weight, fill=GREY_TEXT) + 10

    # Barcode
    if barcode:
        img, draw, y = _paste_barcode(img, draw, y, barcode)

    y += PAD
    return img.crop((0, 0, CANVAS_W, y))


# ── Dispatch ──────────────────────────────────────────────────────────────────

def render_label(label_type: int, params: dict) -> Image.Image:
    if label_type == 1:
        return render_label_1(
            product_name=params.get("product_name", ""),
            weight_g=params.get("weight_g"),
            price_gbp=params.get("price_gbp"),
            barcode=params.get("barcode"),
        )
    elif label_type == 2:
        return render_label_2(
            brand=params.get("info_brand") or params.get("brand", ""),
            title=params.get("info_title", ""),
            body=params.get("info_body", ""),
        )
    elif label_type == 3:
        return render_label_3(
            brand=params.get("brand", ""),
            product_name=params.get("product_name", ""),
            description=params.get("description", ""),
            ingredients=params.get("ingredients", ""),
            nutrition=params.get("nutrition_json"),
            price_gbp=params.get("price_gbp"),
            weight_g=params.get("weight_g"),
            barcode=params.get("barcode"),
        )
    elif label_type == 4:
        return render_label_4(
            product_name=params.get("product_name", ""),
            price_gbp=params.get("price_gbp"),
            weight_g=params.get("weight_g"),
            barcode=params.get("barcode"),
        )
    else:
        raise ValueError(f"Unknown label type: {label_type}")
