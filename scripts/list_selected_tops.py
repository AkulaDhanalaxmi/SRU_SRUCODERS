import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend import seed
import random

products = seed.build_products()
rng = random.Random(7)

tops = [p['id'] for p in products if p.get('category') == 'Tops']
selected = set(rng.sample(tops, min(5, len(tops)))) if tops else set()
print('SELECTED_IDS:', sorted(selected))
for p in products:
    if p['id'] in selected:
        print(p['id'], '-', p['name'])
