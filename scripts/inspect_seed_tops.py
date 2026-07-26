import sys, os
# Ensure project root is on sys.path so `backend` package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from backend import seed
import random

products = seed.build_products()
reviews = seed.build_reviews(products)

rng = random.Random(7)

tops = [p for p in products if p.get('category') == 'Tops']
selected = set(rng.sample([p['id'] for p in tops], min(5, len(tops)))) if tops else set()

print('Selected negative-top IDs:', sorted(selected))

# Map product id to name
prod_map = {p['id']: p for p in products}
for pid in sorted(selected):
    p = prod_map.get(pid)
    print('\nProduct:', pid, '-', p.get('name'))
    # find reviews for this product
    rlist = [r for r in reviews if r['product_id'] == pid]
    print('Total reviews generated:', len(rlist))
    for i, r in enumerate(rlist[:5]):
        print(f"  Review {i+1}: rating={r['rating']} sentiment={r.get('sentiment')} text={r.get('text')[:120]!r}")
