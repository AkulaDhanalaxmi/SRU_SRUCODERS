"""
BuyReady backend regression tests.
Covers: auth (register/login/demo/me), products, buyready evaluate + better-choice,
wishlist, cart, coupons, orders (create/advance/monitor/feedback/return), notifications.
"""
import os
import uuid
import time
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fit-delivery-trust.preview.emergentagent.com').rstrip('/')


# ---------- AUTH ----------
class TestAuth:
    def test_demo_login(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/demo")
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 20
        assert data["user"]["email"] == "priya@buyready.in"
        assert "password_hash" not in data["user"]
        assert data["user"]["fit_profiles"], "Priya should have fit_profiles seeded"
        assert data["user"]["addresses"], "Priya should have addresses seeded"

    def test_login_priya(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login",
                            json={"email": "priya@buyready.in", "password": "Demo@123"})
        assert r.status_code == 200
        assert r.json()["user"]["email"] == "priya@buyready.in"

    def test_login_invalid(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login",
                            json={"email": "priya@buyready.in", "password": "wrong"})
        assert r.status_code == 401

    def test_register_new_user(self, api_client):
        email = f"TEST_{uuid.uuid4().hex[:8]}@buyready.in"
        r = api_client.post(f"{BASE_URL}/api/auth/register",
                            json={"name": "Test User", "email": email, "password": "Demo@123"})
        assert r.status_code == 200, r.text
        # backend lowercases emails (correct behavior)
        assert r.json()["user"]["email"] == email.lower()
        # Duplicate
        r2 = api_client.post(f"{BASE_URL}/api/auth/register",
                             json={"name": "X", "email": email, "password": "Demo@123"})
        assert r2.status_code == 400

    def test_me_endpoint(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == "priya@buyready.in"

    def test_me_unauth(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401


# ---------- PRODUCTS ----------
class TestProducts:
    def test_list_60_products(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/products?limit=200")
        assert r.status_code == 200
        products = r.json()
        assert len(products) >= 60, f"Expected >=60 products, got {len(products)}"

    def test_filter_category_kurtas(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/products?category=Kurtas")
        assert r.status_code == 200
        assert all(p["category"] == "Kurtas" for p in r.json())

    def test_filter_gender_women(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/products?gender=Women")
        assert r.status_code == 200
        assert all(p["gender"] == "Women" for p in r.json())

    def test_search_saree(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/products?search=saree")
        assert r.status_code == 200
        results = r.json()
        assert len(results) > 0
        for p in results:
            text = f"{p['name']} {p['brand']} {p['category']}".lower()
            assert "saree" in text

    def test_sort_price_asc(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/products?sort=price_asc&limit=20")
        prices = [p["price"] for p in r.json()]
        assert prices == sorted(prices)

    def test_get_p1(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/products/p1")
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == "p1"
        assert "sizes" in data and "price" in data

    def test_p1_reviews_with_ai_summary(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/products/p1/reviews")
        assert r.status_code == 200
        data = r.json()
        assert "reviews" in data and "summary" in data
        s = data["summary"]
        assert "positive" in s and "negative" in s and "positive_percent" in s

    def test_product_404(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/products/nonexistent")
        assert r.status_code == 404


# ---------- BUYREADY ----------
class TestBuyReady:
    def _payload(self, user, purpose="Wedding"):
        fp_id = user["fit_profiles"][0]["id"] if user["fit_profiles"] else None
        addr_id = user["addresses"][0]["id"] if user["addresses"] else None
        event_date = (datetime.now(timezone.utc) + timedelta(days=15)).isoformat()
        return {
            "product_id": "p1",
            "fit_profile_id": fp_id,
            "address_id": addr_id,
            "purpose": purpose,
            "event_date": event_date,
        }

    def test_evaluate_full(self, auth_client, demo_user):
        r = auth_client.post(f"{BASE_URL}/api/buyready/evaluate", json=self._payload(demo_user["user"]))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["unlocked"] is True
        assert d["recommended_size"] in ["XS", "S", "M", "L", "XL", "XXL"]
        assert d.get("usual_size") in [None, "XS", "S", "M", "L", "XL", "XXL"]
        assert isinstance(d.get("recommendation_reason"), str)
        assert 0 < d["fit_confidence"] <= 96
        assert "delivery" in d
        assert "options" in d["delivery"]
        assert 0 < d["delivery"]["confidence"] <= 100
        assert "why" in d
        for lang in ["en", "hi", "te"]:
            for facet in ["fit", "delivery", "trust", "value"]:
                assert d["why"][facet][lang], f"missing {facet}/{lang}"
        assert d["verdict"] in ["Buy with Confidence", "Good Choice", "Think Twice"]

    def test_evaluate_locked_without_purpose(self, auth_client, demo_user):
        payload = self._payload(demo_user["user"])
        payload["purpose"] = None
        r = auth_client.post(f"{BASE_URL}/api/buyready/evaluate", json=payload)
        assert r.status_code == 200
        assert r.json()["unlocked"] is False

    def test_evaluate_product_not_found(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/buyready/evaluate",
                             json={"product_id": "nonexistent"})
        assert r.status_code == 404

    def test_better_choice(self, auth_client, demo_user):
        r = auth_client.post(f"{BASE_URL}/api/buyready/better-choice",
                             json=self._payload(demo_user["user"]))
        assert r.status_code == 200, r.text
        d = r.json()
        assert "current" in d and "alternatives" in d and "recommended_id" in d
        assert len(d["alternatives"]) <= 10
        for alt in d["alternatives"]:
            assert "product" in alt and "score" in alt


# ---------- WISHLIST + CART + COUPONS ----------
class TestShoppingBasics:
    def test_wishlist_toggle(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/me/wishlist/p2")
        assert r.status_code == 200
        first = r.json()["wishlisted"]
        r2 = auth_client.post(f"{BASE_URL}/api/me/wishlist/p2")
        assert r2.json()["wishlisted"] != first

    def test_wishlist_get(self, auth_client):
        auth_client.post(f"{BASE_URL}/api/me/wishlist/p3")
        r = auth_client.get(f"{BASE_URL}/api/me/wishlist")
        assert r.status_code == 200
        # cleanup
        auth_client.post(f"{BASE_URL}/api/me/wishlist/p3")

    def test_cart_add_remove(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/me/cart",
                             json={"product_id": "p1", "size": "M", "qty": 2})
        assert r.status_code == 200
        cart = r.json()
        assert any(i["product_id"] == "p1" and i["size"] == "M" and i["qty"] == 2 for i in cart)

        # get cart returns products
        r2 = auth_client.get(f"{BASE_URL}/api/me/cart")
        assert r2.status_code == 200
        items = r2.json()
        assert any(i["product_id"] == "p1" and i.get("product") for i in items)

        r3 = auth_client.delete(f"{BASE_URL}/api/me/cart/p1?size=M")
        assert r3.status_code == 200
        assert not any(i["product_id"] == "p1" and i["size"] == "M" for i in r3.json())

    def test_coupon_valid(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/coupons/BUYREADY10")
        assert r.status_code == 200
        assert r.json()["percent"] == 10

    def test_coupon_invalid(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/coupons/XYZ")
        assert r.status_code == 404


# ---------- ORDERS FLOW ----------
class TestOrdersFlow:
    @pytest.fixture(scope="class")
    def order_ctx(self):
        """Fresh session-scoped context so all tests share one order."""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        r = s.post(f"{BASE_URL}/api/auth/demo")
        token = r.json()["token"]
        user = r.json()["user"]
        s.headers.update({"Authorization": f"Bearer {token}"})
        # add to cart
        s.post(f"{BASE_URL}/api/me/cart", json={"product_id": "p1", "size": "M", "qty": 1})
        # create order
        addr_id = user["addresses"][0]["id"]
        order_resp = s.post(f"{BASE_URL}/api/orders", json={
            "items": [{"product_id": "p1", "size": "M", "qty": 1}],
            "address_id": addr_id,
            "payment_method": "COD",
            "delivery_type": "standard",
            "coupon": "BUYREADY10",
            "purpose": "Wedding",
            "event_date": (datetime.now(timezone.utc) + timedelta(days=15)).isoformat(),
        })
        assert order_resp.status_code == 200, order_resp.text
        return {"session": s, "user": user, "order": order_resp.json()}

    def test_order_created_and_cart_cleared(self, order_ctx):
        s = order_ctx["session"]
        o = order_ctx["order"]
        assert o["status"] == "placed"
        assert o["discount"] > 0  # BUYREADY10 applied
        # cart cleared
        cart = s.get(f"{BASE_URL}/api/me/cart").json()
        assert cart == []

    def test_gift_preference_is_saved_with_order(self, auth_client, demo_user):
        addr_id = demo_user["user"]["addresses"][0]["id"]
        r = auth_client.post(f"{BASE_URL}/api/orders", json={
            "items": [{"product_id": "p2", "size": "M", "qty": 1}],
            "address_id": addr_id,
            "payment_method": "COD",
            "delivery_type": "standard",
            "delivery_preference": "event",
            "preferred_delivery_date": "2026-08-10",
            "gift_wrap": True,
            "gift_message": "Happy birthday!",
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["delivery_preference"] == "event"
        assert data["preferred_delivery_date"] == "2026-08-10"
        assert data["gift_wrap"] is True
        assert data["gift_message"] == "Happy birthday!"
        assert data["tracking_number"]
        assert data["courier_partner"]
    def test_get_order_list(self, order_ctx):
        s = order_ctx["session"]
        r = s.get(f"{BASE_URL}/api/orders")
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()]
        assert order_ctx["order"]["id"] in ids

    def test_monitor_structure(self, order_ctx):
        s = order_ctx["session"]
        r = s.get(f"{BASE_URL}/api/orders/{order_ctx['order']['id']}/monitor")
        assert r.status_code == 200
        d = r.json()
        assert "delayed" in d and isinstance(d["delayed"], bool)
        assert isinstance(d["checks"], list) and len(d["checks"]) == 4
        assert "options" in d
        if d["delayed"]:
            assert len(d["options"]) == 3

    def test_monitor_resolve(self, order_ctx):
        s = order_ctx["session"]
        r = s.post(f"{BASE_URL}/api/orders/{order_ctx['order']['id']}/monitor/resolve",
                   json={"action": "express"})
        assert r.status_code == 200
        assert "message" in r.json()

    def test_advance_through_all_stages(self, order_ctx):
        s = order_ctx["session"]
        oid = order_ctx["order"]["id"]
        stages = ["packed", "shipped", "out_for_delivery", "delivered"]
        for st in stages:
            r = s.post(f"{BASE_URL}/api/orders/{oid}/advance")
            assert r.status_code == 200
            assert r.json()["status"] == st
        # advancing beyond delivered is a no-op returning delivered
        r = s.post(f"{BASE_URL}/api/orders/{oid}/advance")
        assert r.json()["status"] == "delivered"

    def test_fit_feedback_tight_returns_exchange(self, order_ctx):
        s = order_ctx["session"]
        oid = order_ctx["order"]["id"]
        r = s.post(f"{BASE_URL}/api/orders/{oid}/feedback", json={"fit": "tight"})
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert d["suggestion"] and "exchange" in d["suggestion"].lower()

    def test_return_options(self, order_ctx):
        s = order_ctx["session"]
        oid = order_ctx["order"]["id"]
        r = s.get(f"{BASE_URL}/api/orders/{oid}/return-options")
        assert r.status_code == 200
        opts = r.json()["options"]
        assert len(opts) == 4
        ids = {o["id"] for o in opts}
        assert {"styling", "exchange", "care", "expert"} <= ids

    def test_request_return(self, order_ctx):
        s = order_ctx["session"]
        oid = order_ctx["order"]["id"]
        r = s.post(f"{BASE_URL}/api/orders/{oid}/return")
        assert r.status_code == 200
        assert r.json()["ok"] is True


# ---------- NOTIFICATIONS ----------
class TestNotifications:
    def test_notifications_after_order(self, auth_client, demo_user):
        # Ensure at least one order exists
        addr_id = demo_user["user"]["addresses"][0]["id"]
        auth_client.post(f"{BASE_URL}/api/orders", json={
            "items": [{"product_id": "p2", "size": "M", "qty": 1}],
            "address_id": addr_id,
            "payment_method": "COD",
            "delivery_type": "standard",
        })
        r = auth_client.get(f"{BASE_URL}/api/me/notifications")
        assert r.status_code == 200
        notifs = r.json()
        assert len(notifs) > 0
        assert any("Order Placed" in n["title"] for n in notifs)

    def test_notifications_read_all(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/me/notifications/read-all")
        assert r.status_code == 200
        # verify read
        r2 = auth_client.get(f"{BASE_URL}/api/me/notifications")
        assert all(n["read"] for n in r2.json())
