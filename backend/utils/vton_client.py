"""
vton_client.py
---------------------------------------------------------------
Real virtual try-on generation for BuyReady's FitCheck AI Studio.

This module calls the IDM-VTON model directly through its official
Hugging Face Space's Gradio API (no fal.ai / GPU hosting account
needed):

  IDM-VTON
    Choi et al., "Improving Diffusion Models for Authentic Virtual
    Try-on in the Wild" -- https://github.com/yisol/IDM-VTON
    Hugging Face Space: https://huggingface.co/spaces/yisol/IDM-VTON
    Gradio API route used: /tryon

The Space runs the actual diffusion inference on Hugging Face's own
GPU hardware, so this backend never needs to provision or manage GPU
hardware itself -- it only needs the `gradio_client` package and
network access to huggingface.co.

IDM-VTON is a purpose-built garment-transfer / virtual try-on model
(not a general-purpose image editor like OpenAI/Gemini image APIs),
which is why it gives much better likeness-preserving results for
this use case.

LICENSING NOTE: the upstream IDM-VTON project is licensed for
non-commercial use only. That's fine for a hackathon/demo, but if
this ever ships as a commercial feature, swap to a commercially
licensed try-on model/provider instead.

No placeholder / mock image is ever returned by this module. If the
Space is unreachable, or generation fails, this module raises an
explicit exception so the caller can surface a real error instead of
silently faking a result.
---------------------------------------------------------------
"""
import asyncio
import base64
import logging
import mimetypes
import os
import tempfile
import time
from pathlib import Path
from typing import Optional

from gradio_client import Client, file

logger = logging.getLogger(__name__)

# backend/utils/vton_client.py -> backend/
BACKEND_ROOT = Path(__file__).resolve().parent.parent
# backend/.. -> project root (holds /public)
PROJECT_ROOT = BACKEND_ROOT.parent

# The Hugging Face Space hosting IDM-VTON. Overridable via env var in case
# the Space is ever forked/renamed/self-hosted.
IDM_VTON_SPACE = os.environ.get("IDM_VTON_SPACE", "yisol/IDM-VTON")

# This module intentionally runs fully anonymous / without an HF token --
# the public Space doesn't require auth. Anonymous calls do get lower queue
# priority than authenticated ones, so we compensate with a generous
# timeout and retries below instead of requiring an API key.
CLIENT_TIMEOUT_SECONDS = int(os.environ.get("IDM_VTON_TIMEOUT", "180"))
MAX_RETRIES = int(os.environ.get("IDM_VTON_MAX_RETRIES", "3"))
RETRY_BACKOFF_SECONDS = int(os.environ.get("IDM_VTON_RETRY_BACKOFF", "15"))

# Lazily-constructed, module-level Gradio client so we don't reconnect to
# the Space on every request.
_client: Optional[Client] = None


class VTONError(Exception):
    """Raised when virtual try-on generation fails for any reason."""


class VTONNotConfiguredError(VTONError):
    """Raised when the IDM-VTON Hugging Face Space client can't be reached."""


def _get_client() -> Client:
    global _client
    if _client is not None:
        return _client
    try:
        # No hf_token passed -> fully anonymous connection to the public
        # Space. httpx_kwargs bumps the read timeout well past the default
        # (a few seconds), since anonymous requests can sit in a shared
        # queue or wait on a cold-started Space for well over a minute.
        _client = Client(
            IDM_VTON_SPACE,
            httpx_kwargs={"timeout": CLIENT_TIMEOUT_SECONDS},
        )
    except Exception as exc:
        raise VTONNotConfiguredError(
            f"Could not connect to the IDM-VTON Hugging Face Space "
            f"('{IDM_VTON_SPACE}'). Make sure the Space is up at "
            f"https://huggingface.co/spaces/{IDM_VTON_SPACE} and that this "
            f"backend has network access to huggingface.co. Original error: {exc}"
        ) from exc
    return _client


def _data_uri_to_tempfile(data_uri: str) -> str:
    """Decode a data: URI to a temp file on disk, since gradio_client's
    file() helper expects a local filesystem path or an http(s) URL, not
    an inline data URI."""
    header, sep, b64data = data_uri.partition(",")
    if not sep:
        raise VTONError("Malformed data URI image reference")
    content_type = "image/jpeg"
    if header.startswith("data:") and ";" in header:
        content_type = header[len("data:"):header.index(";")]
    ext = mimetypes.guess_extension(content_type) or ".jpg"
    try:
        raw = base64.b64decode(b64data)
    except Exception as exc:
        raise VTONError(f"Could not decode base64 image data: {exc}") from exc
    fd, tmp_path = tempfile.mkstemp(suffix=ext)
    with os.fdopen(fd, "wb") as f:
        f.write(raw)
    return tmp_path


def _resolve_image_ref(image_ref: str) -> str:
    """
    Normalize any image reference this app might pass (a data URL from a
    freshly uploaded photo, a full external URL, or a path served by this
    same FastAPI app like "/products/xyz.jpg") into something gradio_client's
    file() helper accepts directly: a local filesystem path or an http(s)
    URL.
    """
    if not image_ref:
        raise VTONError("Image reference is empty")

    if image_ref.startswith("data:"):
        return _data_uri_to_tempfile(image_ref)

    if image_ref.startswith("http://") or image_ref.startswith("https://"):
        return image_ref
    relative = image_ref.lstrip("/")

    candidates = [
    PROJECT_ROOT / relative,
    PROJECT_ROOT / "public" / relative,      # <-- ADD THIS
    PROJECT_ROOT / "src" / "assets" / relative,
    BACKEND_ROOT / relative,
    ]
    logger.info("PROJECT_ROOT = %s", PROJECT_ROOT)
    logger.info("BACKEND_ROOT = %s", BACKEND_ROOT)

    for candidate in candidates:
        logger.info("Checking candidate: %s", candidate)
        logger.info("Exists: %s", candidate.exists())

        if candidate.exists() and candidate.is_file():
            logger.info("Resolved image path: %s", candidate)
            return str(candidate)

    raise VTONError(f"Could not resolve image reference on disk: {image_ref}")


def _build_garment_description(selected_color: Optional[str], selected_size: Optional[str]) -> str:
    parts = []
    if selected_color:
        parts.append(str(selected_color))
    parts.append("garment")
    if selected_size:
        parts.append(f"(size {selected_size})")
    return " ".join(parts)


def _extract_image_url(result) -> str:
    """
    The Space's /tryon route returns a tuple of two Gradio image outputs:
    (generated_image, masked_image). Each comes back from gradio_client as
    either a local filepath string or a dict with a "url"/"path" key,
    depending on the installed gradio_client version.
    """
    if not result:
        raise VTONError("Try-on provider returned an empty response")

    output = result[0] if isinstance(result, (list, tuple)) else result

    url = None
    if isinstance(output, dict):
        url = output.get("url") or output.get("path")
    elif isinstance(output, str):
        url = output

    if not url:
        raise VTONError("Try-on provider returned a response with no image output")
    return url


async def _call_idm_vton(human_image_ref: str, garment_image_ref: str, description: str) -> str:
    def _run():
        client = _get_client()
        logger.info("Calling IDM-VTON Space api_name=/tryon")
        logger.info("human_image_ref=%s", human_image_ref)
        logger.info("garment_image_ref=%s", garment_image_ref)
        logger.info("description=%s", description)
        return client.predict(
           dict={
           "background": file(human_image_ref),
            "layers": [],
           "composite": file(human_image_ref),
            },
            garm_img=file(garment_image_ref),
            garment_des=description,
            is_checked=True,
            is_checked_crop=False,
            denoise_steps=30,
            seed=42,
            api_name="/tryon",
        )

    last_exc: Optional[Exception] = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            result = await asyncio.to_thread(_run)
            logger.info("Raw IDM-VTON Space response: %s", result)
            return _extract_image_url(result)
        except VTONError:
            raise
        except Exception as exc:
            last_exc = exc
            if attempt == MAX_RETRIES:
                break
            wait = RETRY_BACKOFF_SECONDS * attempt
            logger.warning(
                "IDM-VTON call failed (attempt %s/%s): %s -- retrying in %ss",
                attempt, MAX_RETRIES, exc, wait,
            )
            await asyncio.sleep(wait)

    raise VTONError(
        f"IDM-VTON Space call failed after {MAX_RETRIES} attempts: {last_exc}"
    ) from last_exc


async def generate_virtual_tryon(
    user_image: str,
    product_image: str,
    selected_color: Optional[str] = None,
    selected_size: Optional[str] = None,
) -> dict:
    """
    Generate a real virtual try-on composite: the person from `user_image`
    wearing the garment from `product_image`.

    Calls the yisol/IDM-VTON Hugging Face Space's Gradio API (/tryon), fully
    anonymously (no HF token needed). If the call fails (Space down,
    timeout, unresolvable image, etc.) this raises VTONError with details
    so the failure is visible in logs/response rather than masked. A few
    retries with backoff are attempted first, since the public Space can be
    cold-started or briefly queued for anonymous callers.

    Returns: {"provider": "idm-vton", "generated_image": <path-or-url>}
    """
    human_image_ref = _resolve_image_ref(user_image)
    garment_image_ref = _resolve_image_ref(product_image)
    description = _build_garment_description(selected_color, selected_size)

    try:
        image_url = await _call_idm_vton(human_image_ref, garment_image_ref, description)
        return {"provider": "idm-vton", "generated_image": image_url}
    except Exception as exc:
        logger.exception("IDM-VTON generation via Hugging Face Space failed")
        raise VTONError(f"Virtual try-on generation failed: {exc}") from exc