import tempfile
import base64
import os
import time
import mimetypes
import requests
import asyncio
from pathlib import Path

LIGHTX_API_KEY = os.getenv("LIGHTX_API_KEY")


print("LIGHTX_API_KEY:", os.getenv("LIGHTX_API_KEY"))

UPLOAD_URL = "https://api.lightxeditor.com/external/api/v2/uploadImageUrl"
TRYON_URL = "https://api.lightxeditor.com/external/api/v2/aivirtualtryon"
STATUS_URL = "https://api.lightxeditor.com/external/api/v2/order-status"


class VTONError(Exception):
    pass


def get_headers():
    return {
        "Content-Type": "application/json",
        "x-api-key": LIGHTX_API_KEY,
    }


def upload_image(image_input):
    """
    Upload a local file OR a base64 image to LightX.
    """

    # Base64 image from frontend
    if isinstance(image_input, str) and image_input.startswith("data:image"):
        header, encoded = image_input.split(",", 1)

        ext = ".png"
        if "jpeg" in header or "jpg" in header:
            ext = ".jpg"

        temp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)

        temp.write(base64.b64decode(encoded))
        temp.close()

        image_path = temp.name

    else:
        image_path = image_input

        # Resolve "/products/xyz.webp" references to actual files on disk
        if image_path.startswith("/products/"):
            project_root = Path(__file__).resolve().parent.parent.parent
            image_path = str(project_root / "public" / image_path.lstrip("/"))

    print("Uploading:", image_path)

    if not os.path.exists(image_path):
        raise VTONError(f"Image file not found on disk: {image_path}")

    # Computed unconditionally now, after image_path has its final resolved value
    image_size = os.path.getsize(image_path)

    content_type = (
        mimetypes.guess_type(image_path)[0]
        or "image/jpeg"
    )

    response = requests.post(
        UPLOAD_URL,
        headers=get_headers(),
        json={
            "uploadType": "imageUrl",
            "size": image_size,
            "contentType": content_type,
        },
    )

    response.raise_for_status()

    body = response.json()["body"]

    upload_url = body["uploadImage"]
    image_url = body["imageUrl"]

    with open(image_path, "rb") as f:
        put = requests.put(
            upload_url,
            headers={"Content-Type": content_type},
            data=f,
        )

    put.raise_for_status()

    return image_url


def start_tryon(user_image_url, outfit_image_url, segmentation_type=0):
    """
    Starts a LightX virtual try-on job.
    Returns the orderId.
    """

    response = requests.post(
        TRYON_URL,
        headers=get_headers(),
        json={
            "imageUrl": user_image_url,
            "outfitImageUrl": outfit_image_url,
            "segmentationType": segmentation_type,
        },
    )

    response.raise_for_status()

    data = response.json()

    if data.get("statusCode") != 2000:
        raise VTONError(f"LightX error: {data}")

    return data["body"]["orderId"]


def wait_for_result(order_id, max_attempts=20, poll_interval=3):
    """
    Poll LightX until the generated image is ready.

    max_attempts * poll_interval = total time willing to wait.
    20 * 3 = 60 seconds by default; increase if LightX generations
    routinely take longer than that.
    """

    for attempt in range(1, max_attempts + 1):
        response = requests.post(
            STATUS_URL,
            headers=get_headers(),
            json={"orderId": order_id},
        )

        response.raise_for_status()

        data = response.json()

        if data.get("statusCode") != 2000:
            raise VTONError(f"LightX status error: {data}")

        body = data["body"]
        status = body["status"]

        print(f"[LightX] order={order_id} attempt={attempt}/{max_attempts} status={status}")

        if status == "active":
            return body["output"]

        if status == "failed":
            raise VTONError(f"LightX generation failed. Response: {body}")

        time.sleep(poll_interval)

    raise VTONError(
        f"Timed out waiting for LightX output after "
        f"{max_attempts * poll_interval} seconds (order_id={order_id})."
    )


def _get_segmentation_type(product_image: str) -> int:
    """
    Decide which body region to replace.
    """

    name = product_image.lower()

    if any(x in name for x in [
        "pant", "jean", "trouser", "short",
        "skirt", "bottom"
    ]):
        return 1

    if any(x in name for x in [
        "dress", "kurta", "gown", "saree",
        "lehenga", "jumpsuit"
    ]):
        return 2

    return 0


async def generate_virtual_tryon(
    user_image,
    product_image,
    selected_color=None,
    selected_size=None,
):
    """
    Main LightX virtual try-on function.
    """

    user_url = await asyncio.to_thread(upload_image, user_image)

    outfit_url = await asyncio.to_thread(upload_image, product_image)

    segmentation = _get_segmentation_type(product_image)

    order_id = await asyncio.to_thread(
        start_tryon,
        user_url,
        outfit_url,
        segmentation,
    )

    output = await asyncio.to_thread(
        wait_for_result,
        order_id,
    )

    return {
        "provider": "lightx",
        "generated_image": output,
    }