import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import asyncio
import json
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / 'backend' / '.env')

MONGO_URL = os.getenv('MONGO_URL')
DB_NAME = os.getenv('DB_NAME')

async def fetch_reviews():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    product_ids = ['p57', 'p60', 'p66', 'p68', 'p76']
    
    for pid in product_ids:
        reviews = await db.reviews.find({"product_id": pid}, {"_id": 0}).to_list(200)
        
        pos = [r for r in reviews if r.get("rating", 0) >= 4]
        neg = [r for r in reviews if r.get("rating", 0) <= 2]
        total = len(reviews)
        
        pos_pct = round(len(pos) / total * 100) if total else 0
        neg_pct = round(len(neg) / total * 100) if total else 0
        
        print(f"\n{pid}:")
        print(f"  Total reviews: {total}")
        print(f"  Positive (4-5★): {len(pos)} ({pos_pct}%)")
        print(f"  Negative (1-2★): {len(neg)} ({neg_pct}%)")
        print(f"  Should show negative UI: {pos_pct < 50}")
        if reviews:
            print(f"  First review: rating={reviews[0].get('rating')}, text={reviews[0].get('text')[:80]!r}")

asyncio.run(fetch_reviews())
