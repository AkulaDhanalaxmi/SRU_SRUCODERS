from pathlib import Path
from dotenv import load_dotenv
import os, pymongo

root = Path("backend")
load_dotenv(root / ".env")
client = pymongo.MongoClient(os.getenv("MONGO_URL"))
db = client[os.getenv("DB_NAME")]

print("total", db.products.count_documents({}))
print("exact Tops", db.products.count_documents({"category": "Tops"}))
cats = sorted(db.products.distinct("category"))
print("distinct categories", cats)
print("category counts", {cat: db.products.count_documents({"category": cat}) for cat in cats})
