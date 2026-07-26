from datetime import datetime, timezone

from backend.server import predict_delivery, rank_better_choice_results


def _product():
    return {
        "id": "p-test",
        "warehouse": "Hyderabad",
        "warehouse_stock": {"Hyderabad": 5, "Bengaluru": 0},
        "category": "Kurtas",
        "price": 1499,
        "mrp": 1999,
        "discount": 25,
        "historical_low": 1299,
        "price_trend": "steady",
        "seller": {"name": "TrendHub", "rating": 4.5, "years": 6, "return_rate": 4},
        "size_accuracy": 84,
        "sizes": ["S", "M", "L"],
    }


def test_predict_delivery_for_casual_uses_green_status():
    result = predict_delivery(_product(), "500081", event_date=None, payment_method="card")
    assert result["options"][0]["color"] == "green"
    assert result["options"][1]["color"] == "green"
    assert result["options"][0]["meets_event"] is True
    assert result["options"][1]["meets_event"] is True


def test_predict_delivery_marks_standard_yellow_and_express_green_for_event():
    event_date = (datetime.now(timezone.utc) + __import__("datetime").timedelta(days=2)).isoformat()
    result = predict_delivery(_product(), "500081", event_date=event_date, payment_method="card")
    assert result["options"][0]["color"] in {"green", "yellow"}
    assert result["options"][1]["color"] in {"green", "yellow"}
    assert result["event_notice"] is not None


def test_predict_delivery_suggests_alternatives_when_both_miss():
    event_date = (datetime.now(timezone.utc) - __import__("datetime").timedelta(days=5)).isoformat()
    result = predict_delivery(_product(), "999999", event_date=event_date, payment_method="cod")
    assert result.get("both_miss_event") is True
    assert result.get("alternative") is not None


def test_predict_delivery_uses_pin_specific_day_shift():
    product = _product()
    first = predict_delivery(product, "506001", event_date=None, payment_method="card")
    second = predict_delivery(product, "506002", event_date=None, payment_method="card")
    third = predict_delivery(product, "506003", event_date=None, payment_method="card")
    assert first["options"][0]["days"] != second["options"][0]["days"]
    assert second["options"][0]["days"] != third["options"][0]["days"]


def test_rank_better_choice_results_prioritises_faster_delivery():
    ranked = rank_better_choice_results([
        {"product": {"id": "slow"}, "score": 88, "delivery_days": 6, "warehouse_distance_km": 220, "warehouse_stock_qty": 0},
        {"product": {"id": "fast"}, "score": 70, "delivery_days": 2, "warehouse_distance_km": 40, "warehouse_stock_qty": 7},
        {"product": {"id": "mid"}, "score": 82, "delivery_days": 4, "warehouse_distance_km": 80, "warehouse_stock_qty": 3},
    ])
    assert [item["product"]["id"] for item in ranked[:2]] == ["fast", "mid"]


def test_rank_better_choice_results_prioritises_nearby_warehouse_stock():
    ranked = rank_better_choice_results([
        {"product": {"id": "far"}, "score": 84, "delivery_days": 3, "warehouse_distance_km": 180, "warehouse_stock_qty": 2},
        {"product": {"id": "near"}, "score": 80, "delivery_days": 4, "warehouse_distance_km": 45, "warehouse_stock_qty": 8},
    ])
    assert ranked[0]["product"]["id"] == "near"
