import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend import seed
import random

products = seed.build_products()
rng = random.Random(7)

tops = [p['id'] for p in products if p.get('category') == 'Tops']
selected = set(rng.sample(tops, min(5, len(tops)))) if tops else set()
reviews = seed.build_reviews(products)

print('SELECTED_IDS:', sorted(selected))
for sid in sorted(selected):
    rlist = [r for r in reviews if r['product_id'] == sid]
    pos = sum(1 for r in rlist if r.get('sentiment') == 'positive')
    neg = sum(1 for r in rlist if r.get('sentiment') == 'negative')
    print(f"\n{sid} - {next(p['name'] for p in products if p['id'] == sid)} -> total reviews: {len(rlist)}, positive: {pos}, negative: {neg}")
    if rlist:
        print('Sample negative reviews:')
        for r in [x for x in rlist if x.get('sentiment') == 'negative'][:3]:
            print('-', r['text'])
