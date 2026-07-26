import asyncio

import pytest
from pymongo.errors import ServerSelectionTimeoutError

import server


def test_login_uses_fallback_demo_user_when_db_is_unavailable(monkeypatch):
    async def broken_find_one(*args, **kwargs):
        raise ServerSelectionTimeoutError("MongoDB is unavailable")

    monkeypatch.setattr(server.db.users, "find_one", broken_find_one)

    response = asyncio.run(
        server.login(server.LoginIn(email="priya@buyready.in", password="Demo@123"))
    )

    assert response["user"]["email"] == "priya@buyready.in"
    assert "token" in response
    assert response["user"]["fit_profiles"]
