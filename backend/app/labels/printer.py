"""
Convert PIL Image to Brother QL raster bytes for QL-820NWB.
Uses brother_ql library.
"""

import io
import logging
from PIL import Image

# brother_ql 0.9.2 uses the removed PIL.Image.ANTIALIAS — patch it before import
if not hasattr(Image, "ANTIALIAS"):
    Image.ANTIALIAS = Image.LANCZOS  # type: ignore[attr-defined]

logger = logging.getLogger("labelflow.printer")


def image_to_raster_bytes(image: Image.Image) -> bytes:
    """
    Convert a PIL Image to raw raster bytes for the Brother QL-820NWB.
    Media type: 62mm continuous tape.
    Returns raw bytes ready to send over USB.
    """
    try:
        from brother_ql.conversion import convert
        from brother_ql.backends.helpers import send
        from brother_ql.raster import BrotherQLRaster

        # Convert image to 1-bit (monochrome)
        bw_image = image.convert("1")

        qlr = BrotherQLRaster("QL-820NWB")
        qlr.exception_on_warning = False

        instructions = convert(
            qlr=qlr,
            images=[bw_image],
            label="62",
            rotate="0",
            threshold=70.0,
            dither=False,
            compress=False,
            red=False,
            dpi_600=False,
            hq=True,
            cut=True,
        )
        return instructions

    except ImportError:
        logger.warning("brother_ql not available, returning PNG fallback bytes")
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        return buf.getvalue()

    except Exception as e:
        logger.error("Error converting image to raster: %s", e)
        raise
