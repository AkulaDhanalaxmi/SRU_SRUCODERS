import importlib


def test_compare_product_images_falls_back_without_api_key(monkeypatch):
    module = importlib.import_module("backend.utils.vision_client")

    monkeypatch.setattr(module, "PROVIDER", "openai")
    monkeypatch.setattr(module, "OPENAI_API_KEY", None)

    result = module.compare_product_images(
        {"id": "p1", "name": "Demo Dress", "image": "https://example.com/catalog.jpg"},
        {"type": "dataUrl", "value": "data:image/png;base64,AAAA"},
    )

    assert result["overallSimilarity"] == 95.0
    assert result["confidence"] == 95.0
    assert result["mismatchReasons"]


def test_packguard_verifier_uses_real_sku_and_visual_matches(monkeypatch):
    module = importlib.import_module("backend.utils.packguard_verifier")

    def fake_vision_compare(product, warehouse_image):
        return {
            "productTypeMatch": True,
            "colorMatch": True,
            "logoMatch": True,
            "patternMatch": True,
            "accessoriesMatch": True,
            "overallSimilarity": 0.92,
            "confidence": 0.95,
            "mismatchReasons": [],
        }

    monkeypatch.setattr(module, "compare_product_images", fake_vision_compare)

    result = module.run_packguard_ai(
        {
            "id": "p1",
            "sku": "SKU-100",
            "brand": "DemoBrand",
            "color": "Maroon",
            "pattern": "Floral",
            "image": "https://example.com/catalog.jpg",
            "name": "Demo Dress",
        },
        {
            "scanned_sku": "SKU-100",
            "warehouse_image": {"type": "dataUrl", "value": "data:image/png;base64,AAAA"},
        },
    )

    assert result["sku_match"] is True
    assert result["product_match"] == 92.0
    assert result["brand_match"] is True
    assert result["color_match"] is True
    assert result["pattern_match"] is True
    assert result["final_status"] == "AI_VERIFIED"
    assert result["dispatch_enabled"] is True
