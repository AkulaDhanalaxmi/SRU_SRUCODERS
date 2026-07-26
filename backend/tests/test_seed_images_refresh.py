import asyncio
from pathlib import Path

from backend import seed
from backend.seed import seed_db


class FakeCursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, limit):
        return self.docs[:limit]


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = docs or []

    async def count_documents(self, query):
        return len(self.docs)

    async def insert_many(self, docs):
        self.docs.extend(docs)

    async def insert_one(self, doc):
        self.docs.append(doc)

    def find(self, query=None, projection=None):
        return FakeCursor(self.docs)

    async def find_one(self, query=None):
        for doc in self.docs:
            if query is None or all(doc.get(k) == v for k, v in query.items()):
                return doc
        return None

    async def update_one(self, query, update):
        for doc in self.docs:
            if doc.get("id") == query.get("id"):
                if "$set" in update:
                    doc.update(update["$set"])
                return None
        return None


class FakeDB:
    def __init__(self):
        self.products = FakeCollection([
            {
                "id": "p1",
                "name": "Women Floral Printed Anarkali Kurta",
                "brand": "Anouk",
                "image": "old-url",
                "image_url": "old-url",
                "images": ["old-url"],
                "sizes": ["S", "M", "L"],
            }
        ])
        self.reviews = FakeCollection([])
        self.users = FakeCollection([])
        self.orders = FakeCollection([])


def test_seed_db_refreshes_existing_product_images():
    db = FakeDB()

    asyncio.run(seed_db(db))

    updated = next(doc for doc in db.products.docs if doc["id"] == "p1")
    assert updated["image"].startswith("/products/")
    assert updated["image_url"].startswith("/products/")
    assert updated["images"][0].startswith("/products/")


def test_build_products_uses_local_product_images():
    products = seed.build_products()
    assert products, "Expected build_products to return at least one product"
    for product in products:
        image = product.get("image")
        image_url = product.get("image_url")
        images = product.get("images") or []
        assert isinstance(image, str) and image.startswith("/products/"), f"Invalid primary image for {product['id']}"
        assert isinstance(image_url, str) and image_url.startswith("/products/"), f"Invalid image_url for {product['id']}"
        assert images and isinstance(images[0], str) and images[0].startswith("/products/"), f"Invalid images list for {product['id']}"
        assert (Path("public/products") / image.removeprefix("/products/")).exists(), f"Primary image file missing for {product['id']}"
        assert (Path("public/products") / image_url.removeprefix("/products/")).exists(), f"Image_url file missing for {product['id']}"
