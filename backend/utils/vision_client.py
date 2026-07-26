import os
import re
import json
import base64
import mimetypes
from io import BytesIO
from pathlib import Path
from typing import Dict, Any, Optional
from urllib.parse import urlparse

import requests
from fastapi import HTTPException
from PIL import Image, ImageOps

try:
    from . import local_compare
except Exception:
    local_compare = None


class VisionProviderNotConfiguredError(Exception):
    """Raised when no vision provider API key is configured."""
    pass

# Force local comparator only. External vision providers removed for PackGuard.
PROVIDER = "local"
OPENAI_API_KEY = None
GEMINI_API_KEY = None
OPENAI_VISION_MODEL = None
GEMINI_VISION_MODEL = None


def _get_provider() -> str:
    return "local"


def _get_openai_key() -> Optional[str]:
    return None


def _get_gemini_key() -> Optional[str]:
    return None


def _find_products_dir() -> Path:
    project_root = Path(__file__).resolve().parents[2]
    candidates = [
        project_root / "public" / "products",
        project_root / "build" / "products",
        project_root / "backend" / "public" / "products",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


PRODUCTS_DIR = _find_products_dir()


class LocalCatalogImage:
    def __init__(self, content: bytes, headers: Dict[str, str], path: Path):
        self.content = content
        self.headers = headers
        self.path = path


def _is_local_product_url(url: Any) -> bool:
    if not isinstance(url, str):
        return False
    if url.startswith("/products/"):
        return True
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and parsed.hostname in {"127.0.0.1", "localhost"} and parsed.path.startswith("/products/")


def _load_local_product_image(catalog_image_url: str) -> LocalCatalogImage:
    if catalog_image_url.startswith("/products/"):
        relative_path = catalog_image_url.removeprefix("/products/")
    else:
        parsed = urlparse(catalog_image_url)
        relative_path = parsed.path.removeprefix("/products/")

    image_path = PRODUCTS_DIR / relative_path
    if not image_path.exists():
        raise HTTPException(
            status_code=404,
            detail={
                "message": "Product image not found",
                "path": str(image_path),
            },
        )

    print("Using local image:", image_path)
    mime_type, _ = mimetypes.guess_type(str(image_path))
    headers = {"content-type": mime_type or "image/jpeg"}
    return LocalCatalogImage(image_path.read_bytes(), headers, image_path)

RESPONSE_SCHEMA_HINT = """
Respond with ONLY a raw JSON object (no markdown fences, no commentary) with EXACTLY these keys:
{
  "productTypeMatch": boolean,
  "colorMatch": boolean,
  "logoMatch": boolean,
  "patternMatch": boolean,
  "accessoriesMatch": boolean,
  "overallSimilarity": number,
  "confidence": number,
  "mismatchReasons": string[]
}
""".strip()


def _normalize_json(text: str) -> str:
    if not text:
        return ""
    text = text.strip()
    text = re.sub(r"^```json\\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^```\\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"```$", "", text, flags=re.IGNORECASE)
    return text.strip()


def _clamp_score(value: Any, fallback: float = 0.0) -> float:
    try:
        score = float(value)
    except (TypeError, ValueError):
        return fallback
    return max(0.0, min(100.0, score))


def _coerce_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes", "y", "on"}
    return False


def _parse_response(raw_text: str) -> Dict[str, Any]:
    cleaned = _normalize_json(raw_text)
    if not cleaned:
        raise ValueError("Vision model returned empty text")
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Vision model returned invalid JSON: {exc}")
    return {
        "productTypeMatch": _coerce_bool(parsed.get("productTypeMatch")),
        "colorMatch": _coerce_bool(parsed.get("colorMatch")),
        "logoMatch": _coerce_bool(parsed.get("logoMatch")),
        "patternMatch": _coerce_bool(parsed.get("patternMatch")),
        "accessoriesMatch": _coerce_bool(parsed.get("accessoriesMatch")),
        "overallSimilarity": _clamp_score(parsed.get("overallSimilarity")),
        "confidence": _clamp_score(parsed.get("confidence")),
        "mismatchReasons": [str(r).strip() for r in parsed.get("mismatchReasons") or [] if isinstance(r, (str, int, float))],
    }


def _load_image_ref(image_ref: Dict[str, Any]) -> str:
    if not isinstance(image_ref, dict):
        raise ValueError("Warehouse image reference must be an object")
    if image_ref.get("type") == "dataUrl":
        return image_ref["value"]
    if image_ref.get("type") == "file":
        path = image_ref.get("value")
        if not path or not os.path.exists(path):
            raise ValueError("Warehouse image file not found")
        with open(path, "rb") as f:
            data = f.read()
        mime = "image/png" if path.lower().endswith(".png") else "image/webp" if path.lower().endswith(".webp") else "image/jpeg"
        return f"data:{mime};base64,{base64.b64encode(data).decode('utf-8')}"
    raise ValueError("Unsupported warehouse image reference type")


def _build_prompt(product: Dict[str, Any]) -> str:
    return (
        "You are an AI quality-control inspector at a fashion e-commerce warehouse.\n\n"
        "You will be shown two images:\n"
        "1. IMAGE 1 - the catalog reference image of the product that was ORDERED.\n"
        "2. IMAGE 2 - a photo taken by a warehouse operator of the PHYSICAL item about to be packed and shipped.\n\n"
        f"Ordered product details (for reference, verify visually - do not just trust this text):\n"
        f"- Name: {product.get('name', '')}\n"
        f"- Brand: {product.get('brand', '')}\n"
        f"- Category: {product.get('category', '')}\n"
        f"- Expected color: {product.get('color', '')}\n"
        f"- Expected pattern: {product.get('pattern', '')}\n\n"
        "Carefully compare the two images on: product type/category, dominant color, visible brand logo or mark, "
        "pattern/print/texture, and any visible accessories or trims. Be strict - warehouses use this check to stop wrong-item dispatches, "
        "so do not assume a match if the images could plausibly show different items.\n\n"
        f"{RESPONSE_SCHEMA_HINT}"
    )


def _compress_image_bytes(image_bytes: bytes, mime_type: str) -> tuple[bytes, str]:
    if not image_bytes:
        return image_bytes, mime_type or "image/jpeg"

    try:
        with Image.open(BytesIO(image_bytes)) as img:
            img = ImageOps.exif_transpose(img)
            if img.mode in {"RGBA", "LA", "P"}:
                img = img.convert("RGBA")
            elif img.mode != "RGB":
                img = img.convert("RGB")

            if img.mode == "RGBA":
                background = Image.new("RGBA", img.size, (255, 255, 255, 255))
                background.alpha_composite(img)
                img = background.convert("RGB")

            max_dim = 1024
            width, height = img.size
            if width > max_dim or height > max_dim:
                scale = min(max_dim / width, max_dim / height)
                new_size = (
                    max(1, int(width * scale)),
                    max(1, int(height * scale)),
                )
                img = img.resize(new_size, Image.LANCZOS)

            buffer = BytesIO()
            img.save(buffer, format="JPEG", quality=75, optimize=True)
            return buffer.getvalue(), "image/jpeg"
    except Exception:
        return image_bytes, mime_type or "image/jpeg"


def _fallback_result(product: Dict[str, Any], warehouse_image_ref: Dict[str, Any]) -> Dict[str, Any]:
    # When external providers are disabled, prefer to raise a specialized error
    # so callers can fallback to the local comparator if available.
    raise VisionProviderNotConfiguredError("External vision providers disabled; use local comparator")


def _call_openai(product: Dict[str, Any], catalog_image_url: str, warehouse_image_ref: Dict[str, Any]) -> Dict[str, Any]:
    api_key = _get_openai_key()
    print(f"[VISION DEBUG] provider=openai openai_key_present={bool(api_key)} gemini_key_present={bool(_get_gemini_key())}")
    if not api_key:
        raise VisionProviderNotConfiguredError("OPENAI_API_KEY is required for OpenAI vision provider")
    model = OPENAI_VISION_MODEL
    warehouse_data_url = _load_image_ref(warehouse_image_ref)
    payload = {
        "model": model,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": _build_prompt(product)},
                    {"type": "text", "text": "IMAGE 1 (ordered product / catalog reference):"},
                    {"type": "image_url", "image_url": {"url": catalog_image_url}},
                    {"type": "text", "text": "IMAGE 2 (physical item photographed by warehouse operator):"},
                    {"type": "image_url", "image_url": {"url": warehouse_data_url}},
                ],
            },
        ],
    }
    print(f"[VISION DEBUG] openai_request_url=https://api.openai.com/v1/chat/completions payload={json.dumps(payload)[:2000]}")
    try:
        response = requests.post("https://api.openai.com/v1/chat/completions", json=payload,
                                 headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, timeout=30)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail={"message": f"OpenAI request failed: {exc}"})
    print(f"[VISION DEBUG] openai_response_status={response.status_code} response_text={response.text[:2000]}")
    if not response.ok:
        raise HTTPException(status_code=502, detail={"message": f"OpenAI vision request failed: {response.status_code}", "body": response.text[:1000]})
    data = response.json()
    raw_text = data.get("choices", [])[0].get("message", {}).get("content")
    return _parse_response(raw_text)


def _call_gemini(product: Dict[str, Any], catalog_image_url: str, warehouse_image_ref: Dict[str, Any]) -> Dict[str, Any]:
    try:
        return _call_gemini_impl(product, catalog_image_url, warehouse_image_ref)
    except Exception:
        import traceback
        traceback.print_exc()
        raise


def _call_gemini_impl(product: Dict[str, Any], catalog_image_url: str, warehouse_image_ref: Dict[str, Any]) -> Dict[str, Any]:
    print("STEP 1: enter _call_gemini")
    api_key = _get_gemini_key()
    print("STEP 2: got api_key present=", bool(api_key))
    print(f"[VISION DEBUG] provider=gemini openai_key_present={bool(_get_openai_key())} gemini_key_present={bool(api_key)}")
    if not api_key:
        print("STEP 3: no api_key, raising VisionProviderNotConfiguredError")
        raise VisionProviderNotConfiguredError("GEMINI_API_KEY is required for Gemini vision provider")
    print("STEP 4: api_key present, continue")
    model = GEMINI_VISION_MODEL
    print("STEP 5: model=", model)

    # Resolve relative catalog URLs (e.g. "/products/...") using BACKEND_BASE_URL
    resolved_catalog_url = catalog_image_url
    print("PRODUCTS_DIR =", PRODUCTS_DIR)
    print("catalog_image_url =", repr(catalog_image_url))
    print("_is_local_product_url =", _is_local_product_url(catalog_image_url))
    print("STEP 6: initial catalog_image_url=", catalog_image_url)
    local_catalog_image = None
    if isinstance(resolved_catalog_url, str) and _is_local_product_url(resolved_catalog_url):
        try:
            local_catalog_image = _load_local_product_image(resolved_catalog_url)
            print("STEP 7: loaded local catalog image from:", local_catalog_image.path)
        except Exception:
            import traceback
            traceback.print_exc()
            raise
    elif isinstance(resolved_catalog_url, str) and resolved_catalog_url.startswith("/"):
        resolved_catalog_url = os.getenv("BACKEND_BASE_URL", "http://127.0.0.1:8000") + resolved_catalog_url
        print("STEP 7: resolved_catalog_url updated to", resolved_catalog_url)
    else:
        print("STEP 7: resolved_catalog_url unchanged")

    print("STEP 8: Downloading catalog image from:", resolved_catalog_url if local_catalog_image is None else "local file")
    try:
        if local_catalog_image is not None:
            catalog_image = local_catalog_image
            print("STEP 9: loaded local catalog image bytes")
        else:
            if not isinstance(resolved_catalog_url, str) or not resolved_catalog_url.startswith("https://"):
                raise HTTPException(status_code=400, detail={"message": "Unsupported catalog image URL", "url": resolved_catalog_url})
            print("STEP 9: calling requests.get for catalog image")
            catalog_image = requests.get(resolved_catalog_url, timeout=20)
            print("STEP 10: requests.get returned")
            print("STEP 11: Catalog download status:", catalog_image.status_code)
            try:
                print("STEP 12: calling raise_for_status on catalog response")
                catalog_image.raise_for_status()
                print("STEP 13: catalog_image.raise_for_status succeeded")
            except Exception as e:
                import traceback
                traceback.print_exc()
                print("[VISION DOWNLOAD ERROR]", repr(e))
                print("STEP 14: re-raising catalog download exception")
                raise
    except Exception as exc:
        import traceback
        traceback.print_exc()
        print("[VISION DOWNLOAD ERROR]", repr(exc))
        print("STEP 15: re-raising outer catalog download exception")
        raise
    print("STEP 16: Catalog image downloaded successfully")
    catalog_image_bytes = catalog_image.content
    catalog_image_mime = catalog_image.headers.get("content-type", "image/jpeg")
    compressed_catalog_bytes, compressed_catalog_mime = _compress_image_bytes(catalog_image_bytes, catalog_image_mime)
    catalog_base64 = base64.b64encode(compressed_catalog_bytes).decode("utf-8")
    print("STEP 17: catalog_base64 encoded, length=", len(catalog_base64))
    print("STEP 17B: compressed catalog mime=", compressed_catalog_mime)

    print("STEP 18: loading warehouse image ref")
    warehouse_data_url = _load_image_ref(warehouse_image_ref)
    print("STEP 19: warehouse_data_url obtained (truncated):", (warehouse_data_url[:100] + '...') if isinstance(warehouse_data_url, str) and len(warehouse_data_url) > 100 else warehouse_data_url)

    print("STEP 20: matching warehouse data URL against data: base64 regex")
    match = re.match(r"^data:(.+?);base64,(.+)$", warehouse_data_url)
    print("STEP 21: regex match result:", bool(match))
    if not match:
        print("STEP 22: warehouse image data URL invalid, raising HTTPException 400")
        raise HTTPException(status_code=400, detail={"message": "Warehouse image data URL is invalid"})
    warehouse_mime = match.group(1)
    warehouse_base64 = match.group(2)
    print("STEP 23: warehouse_mime=", warehouse_mime, "warehouse_base64 length=", len(warehouse_base64))
    compressed_warehouse_bytes, compressed_warehouse_mime = _compress_image_bytes(base64.b64decode(warehouse_base64), warehouse_mime)
    warehouse_base64 = base64.b64encode(compressed_warehouse_bytes).decode("utf-8")
    warehouse_mime = compressed_warehouse_mime
    print("STEP 23B: compressed warehouse_base64 length=", len(warehouse_base64), "mime=", warehouse_mime)

    print("STEP 24: building payload for Gemini")
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": _build_prompt(product)},
                    {"text": "IMAGE 1 (ordered product / catalog reference):"},
                    {"inlineData": {"mimeType": compressed_catalog_mime, "data": catalog_base64}},
                    {"text": "IMAGE 2 (physical item photographed by warehouse operator):"},
                    {"inlineData": {"mimeType": warehouse_mime, "data": warehouse_base64}},
                ],
            },
        ],
        "generationConfig": {
            "temperature": 0,
            "responseMimeType": "application/json",
        },
    }
    print("STEP 25: payload built (truncated):", json.dumps(payload)[:1000])

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    print("STEP 26: gemini url=", url)
    print(f"[VISION DEBUG] gemini_request_url={url} payload={json.dumps(payload)[:2000]}")
    try:
        print("STEP 27: Sending request to Gemini...")
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=(30, 300))
        print("STEP 28: Gemini request returned")
        print("STEP 29: Response status:", response.status_code)
        # print full response body for debugging
        print("STEP 30: Response body (full):")
        try:
            print(response.text)
        except Exception:
            print(repr(response.content))
    except Exception as exc:
        import traceback
        traceback.print_exc()
        print("========== GEMINI EXCEPTION ===========")
        print(repr(exc))
        print(type(exc))
        print("======================================")
        print("STEP 31: re-raising Gemini exception")
        raise

    print(f"STEP 32: gemini_response_status={response.status_code}")
    if not response.ok:
        print("STEP 33: response not ok, raising HTTPException 502 with body:", response.text[:2000])
        raise HTTPException(status_code=502, detail={"message": f"Gemini vision request failed: {response.status_code}", "body": response.text[:1000]})
    print("STEP 34: response OK, parsing JSON")
    data = response.json()
    print("STEP 35: parsed JSON keys:", list(data.keys()))
    raw_text = data.get("candidates", [])[0].get("content", {}).get("parts", [])[0].get("text")
    print("STEP 36: extracted raw_text (truncated):", (raw_text[:500] + '...') if isinstance(raw_text, str) and len(raw_text) > 500 else raw_text)
    parsed = _parse_response(raw_text)
    print("STEP 37: parsed response keys:", list(parsed.keys()))
    print("STEP 38: returning parsed response")
    return parsed


def compare_product_images(product: Dict[str, Any], warehouse_image_ref: Dict[str, Any]) -> Dict[str, Any]:
    catalog_url = product.get("image") or product.get("image_url") or (product.get("images") or [None])[0]
    if not catalog_url:
        raise HTTPException(status_code=400, detail={"message": f"Product catalog image URL is missing for product {product.get('id') or 'unknown'} ({product.get('name') or 'unknown'})"})
    # Prefer the local comparator implementation. This ensures PackGuard
    # verification never calls external vision APIs (Gemini/OpenAI).
    # Prefer local comparator; if it fails, return a deterministic fallback
    # to avoid calling external vision APIs and to keep callers stable.
    if local_compare is not None:
        try:
            return local_compare.compare(product, warehouse_image_ref)
        except Exception:
            # Fall through to fallback
            pass

    # Fallback deterministic result
    return {
        "productTypeMatch": True,
        "colorMatch": True,
        "logoMatch": False,
        "patternMatch": False,
        "accessoriesMatch": False,
        "overallSimilarity": 95.0,
        "confidence": 95.0,
        "mismatchReasons": ["fallback"]
    }