import os
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Tuple

import cv2
import imagehash
import numpy as np
from PIL import Image, ImageOps
from skimage.metrics import structural_similarity as ssim
import time


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


def _load_catalog_image(image_ref: Any) -> Image.Image:
    if not image_ref:
        raise ValueError("Catalog image reference missing")
    if isinstance(image_ref, str) and image_ref.startswith("/products/"):
        rel = image_ref.removeprefix("/products/")
        path = PRODUCTS_DIR / rel
        if not path.exists():
            raise FileNotFoundError(f"Catalog image not found: {path}")
        img = Image.open(path)
        return ImageOps.exif_transpose(img).convert("RGB")
    # fallback: if it's a URL or bytes, try to open via PIL
    if isinstance(image_ref, (bytes, bytearray)):
        return Image.open(BytesIO(image_ref)).convert("RGB")
    if isinstance(image_ref, str) and image_ref.startswith("data:"):
        header, b64 = image_ref.split(",", 1)
        data = BytesIO(__import__("base64").b64decode(b64))
        return Image.open(data).convert("RGB")
    # attempt to open path
    if isinstance(image_ref, str) and os.path.exists(image_ref):
        return Image.open(image_ref).convert("RGB")
    raise ValueError("Unsupported catalog image reference")


def _load_warehouse_image(image_ref: Dict[str, Any]) -> Image.Image:
    if not isinstance(image_ref, dict):
        raise ValueError("Warehouse image reference must be an object")
    if image_ref.get("type") == "file":
        path = image_ref.get("value")
        if not path or not os.path.exists(path):
            raise ValueError("Warehouse image file not found")
        return Image.open(path).convert("RGB")
    if image_ref.get("type") == "dataUrl":
        val = image_ref.get("value")
        if not val or not isinstance(val, str):
            raise ValueError("Invalid dataUrl value")
        header, b64 = val.split(",", 1)
        return Image.open(BytesIO(__import__("base64").b64decode(b64))).convert("RGB")
    raise ValueError("Unsupported warehouse image reference type")


def _resize_pair(img1: Image.Image, img2: Image.Image, size=(512, 512)) -> Tuple[np.ndarray, np.ndarray]:
    a = np.array(img1.resize(size, Image.LANCZOS))
    b = np.array(img2.resize(size, Image.LANCZOS))
    return a, b


def _remove_background(img: np.ndarray) -> np.ndarray:
    # Try to isolate the largest foreground contour (garment) and mask out background.
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Find contours and pick the largest one as the garment region
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    h, w = gray.shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)
    if contours:
        c = max(contours, key=cv2.contourArea)
        # ignore tiny contours
        if cv2.contourArea(c) > (w * h) * 0.01:
            hull = cv2.convexHull(c)
            cv2.drawContours(mask, [hull], -1, 255, -1)
            # refine mask with morphological ops
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
            mask = cv2.GaussianBlur(mask, (21, 21), 0)
    else:
        # fallback: use inverted threshold as mask
        mask = cv2.bitwise_not(thresh)

    # apply mask (scale mask to 0/1)
    mask_bool = (mask.astype(np.float32) / 255.0)[:, :, None]
    result = (img.astype(np.float32) * mask_bool).astype(np.uint8)
    return result


def _dominant_color_similarity(a: np.ndarray, b: np.ndarray) -> float:
    # HSV histogram comparison using Bhattacharyya distance for multi-color garments
    t0 = time.perf_counter()
    try:
        # convert to HSV
        hsv_a = cv2.cvtColor(a.astype(np.uint8), cv2.COLOR_RGB2HSV)
        hsv_b = cv2.cvtColor(b.astype(np.uint8), cv2.COLOR_RGB2HSV)

        # 2D histogram for H and S channels
        hist_a = cv2.calcHist([hsv_a], [0, 1], None, [50, 60], [0, 180, 0, 256])
        hist_b = cv2.calcHist([hsv_b], [0, 1], None, [50, 60], [0, 180, 0, 256])
        cv2.normalize(hist_a, hist_a)
        cv2.normalize(hist_b, hist_b)

        # Bhattacharyya distance: 0 = identical, 1 = max diff
        dist = cv2.compareHist(hist_a, hist_b, cv2.HISTCMP_BHATTACHARYYA)
        sim = max(0.0, 1.0 - float(dist))
        score = float(np.clip(sim * 100.0, 0.0, 100.0))
    except Exception:
        score = 0.0
    dt = time.perf_counter() - t0
    print(f"[LOCAL_COMPARE][timing] color: {dt:.3f}s")
    return score


def _shape_similarity(a: np.ndarray, b: np.ndarray) -> float:
    t0 = time.perf_counter()
    # Use contour-based silhouette comparison. Focus on largest contour area.
    ga = cv2.cvtColor(a, cv2.COLOR_RGB2GRAY)
    gb = cv2.cvtColor(b, cv2.COLOR_RGB2GRAY)
    _, ta = cv2.threshold(cv2.GaussianBlur(ga, (5, 5), 0), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    _, tb = cv2.threshold(cv2.GaussianBlur(gb, (5, 5), 0), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours_a, _ = cv2.findContours(ta, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours_b, _ = cv2.findContours(tb, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours_a or not contours_b:
        print(f"[LOCAL_COMPARE][timing] shape: {time.perf_counter() - t0:.3f}s")
        return 0.0
    ca = max(contours_a, key=cv2.contourArea)
    cb = max(contours_b, key=cv2.contourArea)
    try:
        # Hu moments / matchShapes gives a small value for similar shapes
        m = cv2.matchShapes(ca, cb, cv2.CONTOURS_MATCH_I1, 0.0)
        # also compare area ratio and bounding box aspect ratio
        area_a = cv2.contourArea(ca)
        area_b = cv2.contourArea(cb)
        area_ratio = min(area_a, area_b) / max(1.0, max(area_a, area_b))
        xa, ya, wa, ha = cv2.boundingRect(ca)
        xb, yb, wb, hb = cv2.boundingRect(cb)
        ar_a = wa / max(1.0, ha)
        ar_b = wb / max(1.0, hb)
        ar_sim = max(0.0, 1.0 - abs(ar_a - ar_b) / max(ar_a, ar_b))

        # combine matchShapes (inverted), area_ratio and aspect-ratio similarity
        shape_score = max(0.0, 1.0 - m) * 0.6 + area_ratio * 0.25 + ar_sim * 0.15
        out = float(np.clip(shape_score * 100.0, 0.0, 100.0))
    except Exception:
        out = 0.0
    dt = time.perf_counter() - t0
    print(f"[LOCAL_COMPARE][timing] shape: {dt:.3f}s")
    return out


def _texture_similarity(a: np.ndarray, b: np.ndarray) -> float:
    t0 = time.perf_counter()
    ga = cv2.cvtColor(a, cv2.COLOR_RGB2GRAY)
    gb = cv2.cvtColor(b, cv2.COLOR_RGB2GRAY)
    try:
        # Crop to central region to reduce pose variance for SSIM
        h, w = ga.shape
        ch, cw = int(h * 0.6), int(w * 0.6)
        sy, sx = (h - ch) // 2, (w - cw) // 2
        gca = ga[sy:sy + ch, sx:sx + cw]
        gcb = gb[sy:sy + ch, sx:sx + cw]
        data_range = float(gca.max() - gca.min()) if gca.max() != gca.min() else 1.0
        sim, _ = ssim(gca, gcb, full=True, data_range=data_range)
    except Exception:
        sim = 0.0
    out = float(np.clip(sim * 100.0, 0.0, 100.0))
    dt = time.perf_counter() - t0
    print(f"[LOCAL_COMPARE][timing] texture: {dt:.3f}s")
    return out


def _orb_feature_similarity(a: np.ndarray, b: np.ndarray) -> float:
    t0 = time.perf_counter()
    try:
        gray_a = cv2.cvtColor(a, cv2.COLOR_RGB2GRAY)
        gray_b = cv2.cvtColor(b, cv2.COLOR_RGB2GRAY)
        # Prefer SIFT if available for better robustness; fall back to ORB
        use_sift = hasattr(cv2, "SIFT_create")
        if use_sift:
            try:
                sift = cv2.SIFT_create()
                kp1, des1 = sift.detectAndCompute(gray_a, None)
                kp2, des2 = sift.detectAndCompute(gray_b, None)
                norm = cv2.NORM_L2
            except Exception:
                use_sift = False
        if not use_sift:
            orb = cv2.ORB_create(nfeatures=1500)
            kp1, des1 = orb.detectAndCompute(gray_a, None)
            kp2, des2 = orb.detectAndCompute(gray_b, None)
            norm = cv2.NORM_HAMMING

        if des1 is None or des2 is None or len(kp1) == 0 or len(kp2) == 0:
            print(f"[LOCAL_COMPARE][timing] orb: {time.perf_counter() - t0:.3f}s")
            return 0.0

        bf = cv2.BFMatcher(norm)
        knn_matches = bf.knnMatch(des1, des2, k=2)
        good = []
        for m_n in knn_matches:
            if len(m_n) < 2:
                continue
            m, n = m_n[0], m_n[1]
            if m.distance < 0.75 * n.distance:
                good.append(m)

        # compute geometric verification via homography to filter inliers
        inliers = 0
        if len(good) >= 4:
            src_pts = np.float32([kp1[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
            dst_pts = np.float32([kp2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
            try:
                M, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
                if mask is not None:
                    inliers = int(mask.sum())
            except Exception:
                inliers = 0

        denom = max(1, min(len(kp1), len(kp2)))
        # combine ratio of good matches and inlier fraction
        match_ratio = len(good) / denom
        inlier_ratio = inliers / denom
        score = 0.7 * match_ratio + 0.3 * inlier_ratio
        out = float(np.clip(score * 100.0, 0.0, 100.0))
    except Exception:
        out = 0.0
    dt = time.perf_counter() - t0
    print(f"[LOCAL_COMPARE][timing] orb: {dt:.3f}s")
    return out


def _imagehash_similarity(pil_a: Image.Image, pil_b: Image.Image) -> float:
    t0 = time.perf_counter()
    try:
        ha = imagehash.phash(pil_a.convert("L"))
        hb = imagehash.phash(pil_b.convert("L"))
        # hamming distance
        dist = (ha - hb)
        # normalize by hash size (default 64 bits)
        sim = max(0.0, 1.0 - dist / 64.0)
        out = float(np.clip(sim * 100.0, 0.0, 100.0))
    except Exception:
        out = 0.0
    dt = time.perf_counter() - t0
    print(f"[LOCAL_COMPARE][timing] hash: {dt:.3f}s")
    return out


def _make_boolean(sim_score: float, threshold: float = 75.0) -> bool:
    return bool(sim_score >= threshold)


def compare(product: Dict[str, Any], warehouse_image_ref: Dict[str, Any]) -> Dict[str, Any]:
    overall_t0 = time.perf_counter()
    # Load images
    catalog_url = product.get("image") or product.get("image_url") or (product.get("images") or [None])[0]
    catalog_img = None
    if isinstance(catalog_url, str) and catalog_url:
        try:
            catalog_img = _load_catalog_image(catalog_url)
        except Exception:
            catalog_img = None
    if catalog_img is None:
        # fallback: use a tiny blank image
        catalog_img = Image.new("RGB", (512, 512), (255, 255, 255))

    warehouse_img = _load_warehouse_image(warehouse_image_ref)

    # Resize
    a, b = _resize_pair(catalog_img, warehouse_img, size=(512, 512))

    # Optional background removal
    a_nb = _remove_background(a)
    b_nb = _remove_background(b)

    # Compute similarities
    color_sim = _dominant_color_similarity(a_nb, b_nb)
    shape_sim = _shape_similarity(a_nb, b_nb)
    texture_sim = _texture_similarity(a_nb, b_nb)
    orb_sim = _orb_feature_similarity(a_nb, b_nb)
    hash_sim = _imagehash_similarity(Image.fromarray(a_nb), Image.fromarray(b_nb))

    # weights (tuned for apparel): ORB features dominate, then color, shape, texture, hash
    weights = {"orb": 0.40, "color": 0.25, "shape": 0.20, "texture": 0.10, "hash": 0.05}
    overall = (
        orb_sim * weights["orb"] +
        color_sim * weights["color"] +
        shape_sim * weights["shape"] +
        texture_sim * weights["texture"] +
        hash_sim * weights["hash"]
    )
    overall_score = float(np.clip(overall, 0.0, 100.0))
    # Confidence aligned with weighted overall score
    confidence = float(np.clip(overall_score, 0.0, 100.0))

    overall_dt = time.perf_counter() - overall_t0
    print(f"[LOCAL_COMPARE][timing] overall: {overall_dt:.3f}s")

    product_type_match = _make_boolean(overall_score, 70.0)
    color_match = _make_boolean(color_sim, 60.0)
    logo_match = _make_boolean(orb_sim, 55.0)
    pattern_match = _make_boolean(texture_sim, 45.0)
    accessories_match = _make_boolean(hash_sim, 40.0)

    mismatch: List[str] = []
    if not product_type_match:
        mismatch.append("Product type mismatch")
    if not color_match:
        mismatch.append("Color mismatch")
    if not logo_match:
        mismatch.append("Logo / brand mismatch")
    if not pattern_match:
        mismatch.append("Pattern mismatch")
    if not accessories_match:
        mismatch.append("Accessories mismatch")

    return {
        "productTypeMatch": bool(product_type_match),
        "colorMatch": bool(color_match),
        "logoMatch": bool(logo_match),
        "patternMatch": bool(pattern_match),
        "accessoriesMatch": bool(accessories_match),
        "overallSimilarity": round(float(overall_score), 1),
        "confidence": round(float(confidence), 1),
        "mismatchReasons": mismatch,
    }
