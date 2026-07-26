import asyncio

from backend import server


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


class DummyProductsCollection:
    async def find_one(self, query, projection):
        return _product()


def test_product_delivery_endpoint_returns_delivery_prediction(monkeypatch):
    monkeypatch.setattr(server.db, "products", DummyProductsCollection())

    expected = server.predict_delivery(_product(), "500081", event_date=None, payment_method="card")
    result = asyncio.run(server.get_product_delivery("p-test", pin="500081", payment_method="card"))

    assert result["warehouse"] == expected["warehouse"]
    assert result["warehouse_distance_km"] == expected["warehouse_distance_km"]
    assert result["options"][0]["fee"] == expected["options"][0]["fee"]
    assert result["options"][0]["date"] == expected["options"][0]["date"]
