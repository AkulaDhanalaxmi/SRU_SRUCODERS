import os
from typing import Dict, Any
from fastapi import HTTPException
from .vision_client import compare_product_images, VisionProviderNotConfiguredError
try:
    # optional local comparator
    from . import local_compare
except Exception:
    local_compare = None

THRESHOLD = float(os.environ.get("VISION_MATCH_THRESHOLD", "85"))


def _normalize(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip().lower()


def _normalize_score(value: Any) -> float:
    try:
        score = float(value)
    except (TypeError, ValueError):
        return 0.0
    if 0.0 <= score <= 1.0:
        return round(score * 100.0, 1)
    return round(max(0.0, min(100.0, score)), 1)


def run_packguard_ai(product: Dict[str, Any], scan_input: Dict[str, Any]) -> Dict[str, Any]:
    scanned_sku = _normalize(scan_input.get("scanned_sku") or scan_input.get("scannedSku"))
    warehouse_image = scan_input.get("warehouse_image") or scan_input.get("warehouseImage")
    if not warehouse_image:
        raise ValueError("Warehouse image is required for PackGuard verification")

    sku_match = scanned_sku == "" or (scanned_sku != "" and scanned_sku == _normalize(product.get("sku")))
    try:
        # Use the configured vision compare function. The underlying
        # implementation has been switched to prefer the local comparator
        # and will not call external vision APIs.
        model_result = compare_product_images(product, warehouse_image)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"error": "local_compare_failed", "message": str(exc)})

    product_match = _normalize_score(model_result.get("overallSimilarity", 0.0))
    confidence = _normalize_score(model_result.get("confidence", 0.0))
    brand_match = model_result.get("logoMatch", False)
    color_match = model_result.get("colorMatch", False)
    pattern_match = model_result.get("patternMatch", False)
    final_status = "AI_VERIFIED" if sku_match and model_result.get("productTypeMatch") and brand_match and color_match and pattern_match and model_result.get("accessoriesMatch") and product_match >= THRESHOLD and confidence >= THRESHOLD else "MISMATCH"

    mismatch_reasons = list(model_result.get("mismatchReasons", []))
    if not sku_match:
        mismatch_reasons.insert(0, "Wrong SKU")
    if not model_result.get("productTypeMatch") and not any("product type" in r.lower() for r in mismatch_reasons):
        mismatch_reasons.append("Wrong Product Type")
    if not color_match and not any("color" in r.lower() for r in mismatch_reasons):
        mismatch_reasons.append("Wrong Color")
    if not brand_match and not any("logo" in r.lower() or "brand" in r.lower() for r in mismatch_reasons):
        mismatch_reasons.append("Wrong Brand / Logo Mismatch")
    if not pattern_match and not any("pattern" in r.lower() for r in mismatch_reasons):
        mismatch_reasons.append("Pattern Mismatch")
    if not model_result.get("accessoriesMatch") and not any("accessor" in r.lower() for r in mismatch_reasons):
        mismatch_reasons.append("Accessory Mismatch")

    return {
        "sku_match": sku_match,
        "product_match": product_match,
        "brand_match": brand_match,
        "color_match": color_match,
        "pattern_match": pattern_match,
        "confidence": confidence,
        "mismatch_reasons": mismatch_reasons,
        "final_status": final_status,
        "dispatch_enabled": final_status == "AI_VERIFIED",
        "raw_vision": model_result,
    }
