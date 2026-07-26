import sys
from pathlib import Path
if len(sys.argv) < 2:
    print('Usage: python print_reviews_for_pid.py <product_id>')
    sys.exit(1)
pid = sys.argv[1]
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend import seed
products = seed.build_products()
reviews = seed.build_reviews(products)
plist = [p for p in products if p['id'] == pid]
if not plist:
    print('Product not found in generated catalog')
    sys.exit(1)
product = plist[0]
rlist = [r for r in reviews if r['product_id'] == pid]
print(f"Product: {product['id']} - {product['name']} ({len(rlist)} reviews)")
for i, r in enumerate(rlist, 1):
    print('\n--- Review', i, '---')
    print('Rating:', r.get('rating'))
    print('Sentiment:', r.get('sentiment'))
    print('Reviewer:', r.get('reviewer'), '|', r.get('region'))
    print('Size:', r.get('size_bought'))
    print('Text:')
    print(r.get('text'))
