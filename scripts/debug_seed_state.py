#!/usr/bin/env python3
import asyncio
import random
from motor.motor_asyncio import AsyncMongoClient

async def main():
    client = AsyncMongoClient('mongodb+srv://buyreadydev:2vqqwqPx1xPr8fMW@buyready-cluster.mongodb.net/?retryWrites=true&w=majority')
    db = client['myntra']
    
    # Check what tops exist
    print("=== CHECKING TOPS IN DATABASE ===")
    tops = await db.products.find({'category': 'Tops'}, {'_id': 0, 'id': 1, 'name': 1}).to_list(100)
    print(f"Total Tops: {len(tops)}")
    top_ids = [p['id'] for p in tops]
    print(f"Top IDs: {top_ids}")
    
    # Check what would be selected with Random(7)
    print("\n=== CHECKING RANDOM SELECTION ===")
    rng = random.Random(7)
    selected = set(rng.sample(top_ids, min(5, len(top_ids)))) if top_ids else set()
    print(f"Selected for negative: {selected}")
    
    # Check reviews for these products
    print("\n=== CHECKING REVIEWS IN DATABASE ===")
    for pid in selected:
        reviews = await db.reviews.find({'product_id': pid}, {'_id': 0, 'rating': 1, 'text': 1}).to_list(100)
        print(f"\n{pid}: {len(reviews)} reviews")
        for i, rev in enumerate(reviews[:3]):
            print(f"  {i+1}. Rating {rev['rating']}: {rev['text'][:80]}...")
    
    client.close()

if __name__ == '__main__':
    asyncio.run(main())
