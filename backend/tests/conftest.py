import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fit-delivery-trust.preview.emergentagent.com').rstrip('/')


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def demo_user(api_client):
    """Return {token, user} via one-click demo login."""
    r = api_client.post(f"{BASE_URL}/api/auth/demo")
    assert r.status_code == 200, f"Demo login failed: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture
def auth_client(api_client, demo_user):
    api_client.headers.update({"Authorization": f"Bearer {demo_user['token']}"})
    return api_client
