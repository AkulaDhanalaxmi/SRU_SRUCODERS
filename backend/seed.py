import os
import random
from pathlib import Path
from datetime import datetime, timezone, timedelta
import bcrypt
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

PRODUCTS_DIR = ROOT_DIR.parent / 'public' / 'products'
LOCAL_PRODUCT_IMAGES = []
if PRODUCTS_DIR.exists():
    _exclude = {'first.png', 'second.png', 'third.png', 'fourth.png', 'login.png'}
    LOCAL_PRODUCT_IMAGES = sorted(
        f"/products/{p.name}"
        for p in PRODUCTS_DIR.iterdir()
        if p.is_file()
        and p.suffix.lower() in {'.jpg', '.jpeg', '.png','.webp'}
        and p.name not in _exclude
    )


def _tokenize_text(s):
    if not s:
        return set()
    import re
    parts = re.split(r"[^a-z0-9]+", s.lower())
    return set([p for p in parts if p])


def match_local_image_for_product(name, brand, category, gender, color, description, local_images):
    """Deterministically find the best local image for a product by matching
    tokens from name, brand, category, gender, color and description against
    local image filenames. Returns the matching image path (e.g. '/products/..')
    or None if no suitable match is found.

    The function scores each image by how many distinct tokens appear in the
    filename and returns the highest-scoring image only if it matches at
    least two tokens (to avoid weak, accidental matches)."""
    if not local_images:
        return None
    # Build search tokens
    tokens = set()
    tokens |= _tokenize_text(name)
    tokens |= _tokenize_text(brand)
    tokens |= _tokenize_text(category)
    tokens |= _tokenize_text(gender)
    tokens |= _tokenize_text(color)
    tokens |= _tokenize_text(description)
    # Remove very short tokens
    tokens = {t for t in tokens if len(t) >= 2}
    if not tokens:
        return None

    best = None
    best_score = 0
    # filenames are like '/products/filename.jpg' -> compare lower-cased
    for img in local_images:
        fname = img.lower()
        score = 0
        for t in tokens:
            if t in fname:
                score += 1
        # prefer earlier tie by lexical order to be deterministic
        if score > best_score or (score == best_score and best and fname < best.lower()):
            best = img
            best_score = score

    # require at least two token matches to consider it an exact image
    if best_score >= 2:
        return best
    return None

IMAGES = {
    "kurta": [
        "/products/ajoy-das-AhaiR2xiqBA-unsplash.jpg",
        "/products/ikshana-productions-33x1Qg2-4JY-unsplash.jpg",
        "/products/ikshana-productions-WwjqSo1so4g-unsplash.jpg",
        "/products/mahdi-bafande-npyWFYpHQ94-unsplash.jpg",
        "/products/kinjal-sanchaniya-NLBTc-0CCz8-unsplash.jpg",
        "/products/urvi-kotasthane-gl-KSnRyhE0-unsplash.jpg",
        "/products/mohammad-ali-8F57VUfOB00-unsplash.jpg",
        "/products/sushanta-rokka-ZishCzTycps-unsplash.jpg",
    ],

    "saree": [
        "/products/saree.jpg",
        "/products/saree1.jpg",
        "/products/saree2.jpg",
        "/products/saree3.jpg",
        "/products/saree4.jpg",
        "/products/saree5.jpg",
        "/products/saree6.jpg",
        "/products/saree7.jpg",
        "/products/saree8.jpg",
        "/products/saree9.jpg",
        "/products/saree10.jpg",
        "/products/saree12.jpg",
        "/products/morni-saree-unFmQCqV8Ow-unsplash.jpg",
        "/products/shahenaz-india-kN3tHdXDDrs-unsplash.jpg",
        "/products/urvi-kotasthane-gl-KSnRyhE0-unsplash.jpg",
        "/products/kinjal-sanchaniya-NLBTc-0CCz8-unsplash.jpg",
        "/products/ajoy-das-AhaiR2xiqBA-unsplash.jpg",
        "/products/ikshana-productions-WwjqSo1so4g-unsplash.jpg",
        "/products/mahdi-bafande-npyWFYpHQ94-unsplash.jpg",
        "/products/sushanta-rokka-ZishCzTycps-unsplash.jpg",
    ],

    "lehenga": [
        "/products/shahenaz-india-kN3tHdXDDrs-unsplash.jpg",
        "/products/kinjal-sanchaniya-NLBTc-0CCz8-unsplash.jpg",
        "/products/urvi-kotasthane-gl-KSnRyhE0-unsplash.jpg",
        "/products/mahdi-bafande-npyWFYpHQ94-unsplash.jpg",
        "/products/morni-saree-unFmQCqV8Ow-unsplash.jpg",
        "/products/ajoy-das-AhaiR2xiqBA-unsplash.jpg",
        "/products/ikshana-productions-WwjqSo1so4g-unsplash.jpg",
        "/products/sushanta-rokka-ZishCzTycps-unsplash.jpg",
    ],

    "dress": [
        "/products/dress.jpg",
        "/products/dress1.jpg",
        "/products/dress2.jpg",
        "/products/dress3.jpg",
        "/products/dress4.jpg",
        "/products/dress5.jpg",
        "/products/dress6.jpg",
        "/products/dress7.jpg",
        "/products/dress8.jpg",
        "/products/dress9.webp",
        "/products/dress10.jpg",
        "/products/bulbul-ahmed-BtkHK1vhg1E-unsplash.jpg",
        "/products/bulbul-ahmed-SiQTqnp-qd8-unsplash.jpg",
        "/products/clement-vatte-f67Caxg3akg-unsplash.jpg",
        "/products/ikshana-productions-WwjqSo1so4g-unsplash.jpg",
        "/products/imana-DhqQdAzmhhI-unsplash.jpg",
        "/products/imana-FuGHcMhxM-g-unsplash.jpg",
        "/products/james-lewis-ohiyigDmlYc-unsplash.jpg",
        "/products/ikshana-productions-33x1Qg2-4JY-unsplash.jpg",
    ],

    "top": [
        "/products/top1.jpg",
        "/products/top2.webp",
        "/products/top3.jpg",
        "/products/top4.jpg",
        "/products/top5.webp",
        "/products/top6.webp",
        "/products/top7.webp",
        "/products/top8.webp",
        "/products/top9.webp",
        "/products/top10.webp",
        "/products/top11.jpg",
        "/products/top12.webp",
        "/products/top13.jpg",
        "/products/top14.webp",
        "/products/top15.webp",
        "/products/top16.jpg",
        "/products/top17.webp",
        "/products/top18.jpg",
        "/products/top19.jpg",
        "/products/top20.jpg",
        "/products/top21.jpg",
        "/products/top22.webp",
        "/products/top24.jpg",
        "/products/top25.jpg",
        "/products/tops.jpg",
    ],

    "jeans": [
        "/products/jeans.jpg",
        "/products/jeans1.jpg",
        "/products/jeans2.jpg",
        "/products/jeans3.jpg",
        "/products/jeans4.jpg",
        "/products/jeans5.jpg",
        "/products/jeans6.jpg",
        "/products/jeans7.jpg",
        "/products/jeans8.jpg",
        "/products/jeans9.jpg",
        "/products/jeans10.jpg",
        "/products/ikshana-productions-SpuJyhnlxzM-unsplash.jpg",
        "/products/imana-6f3Lw_gZczU-unsplash.jpg",
        "/products/junior-reis-6unx_9DIbe4-unsplash.jpg",
        "/products/nikhil-uttam-ONMoNz3ggHU-unsplash.jpg",
        "/products/muneeb-malhotra-I3s4QdWnGUs-unsplash.jpg",
        "/products/sahil-shettigar-wvTYdzF5K_A-unsplash.jpg",
    ],

    "kids": [
        "/products/kids1.jpg",
        "/products/kids2.jpg",
        "/products/kids3.jpg",
        "/products/kids4.webp",
        "/products/kids5.jpg",
        "/products/kids6.webp",
        "/products/kids7.jpg",
        "/products/kids8.webp",
        "/products/kids9.jpg",
        "/products/kids10.jpg",
        "/products/kids11.jpg",
        "/products/kids12.jpg",
    ],

    "footwear": [
        "/products/pexels-airamdphoto-30131203.jpg",
        "/products/pexels-happypixels-5566186.jpg",
        "/products/pexels-kunal-yadav-photography-2158088461-35445207.jpg",
        "/products/pexels-worod-fashion-471600287-15752053.jpg",
        "/products/pexels-omar-tapia-129681804-36921464.jpg",
        "/products/pexels-alikarimibn-27514942.jpg",
        "/products/pexels-oswaldo-lopez-1539475039-28196613.jpg",
        "/products/pexels-fotobi-7749549.jpg",
    ],

    "men": [
        "/products/shirt1.jpg",
        "/products/shirt2.jpg",
        "/products/shirt3.jpg",
        "/products/shirt4.jpg",
        "/products/shirt5.jpg",
        "/products/shirt6.jpg",
        "/products/shirt7.jpg",
        "/products/shirt8.jpg",
        "/products/shirt9.jpg",
        "/products/mohammad-ali-8F57VUfOB00-unsplash.jpg",
        "/products/sahil-shettigar-wvTYdzF5K_A-unsplash.jpg",
        "/products/muneeb-malhotra-I3s4QdWnGUs-unsplash.jpg",
        "/products/robert-richman-vcTKFYNZop4-unsplash.jpg",
        "/products/james-lewis-ohiyigDmlYc-unsplash.jpg",
        "/products/ikshana-productions-SpuJyhnlxzM-unsplash.jpg",
        "/products/nikhil-uttam-ONMoNz3ggHU-unsplash.jpg",
        "/products/mahdi-bafande-npyWFYpHQ94-unsplash.jpg",
    ],

    "beauty": [
        "/products/beauty.jpg",
        "/products/beauty1.jpg",
        "/products/beauty2.jpg",
        "/products/beauty3.jpg",
        "/products/beauty4.jpg",
        "/products/beauty5.jpg",
        "/products/beauty6.jpg",
        "/products/beauty7.jpg",
        "/products/beauty8.jpg",
        "/products/beauty9.jpg",
        "/products/beauty10.jpg",
        "/products/beauty11.jpg",
        "/products/beauty12.jpg",
        "/products/beauty13.jpg",
        "/products/beauty14.jpg",
        "/products/beauty15.jpg",
        "/products/beauty16.jpg",
        "/products/beauty17.jpg",
        "/products/pexels-anna-keibalo-620756389-17721462.jpg",
        "/products/pexels-stardustmultimedia-12915246.jpg",
        "/products/pexels-felix-young-449360607-28969046.jpg",
        "/products/pexels-anh-qu-c-66735925-31121529.jpg",
        "/products/pexels-colordragon-36888237.jpg",
        "/products/pexels-colordragon-36888247.jpg",
        "/products/pexels-susheelparihar-33180676.jpg",
        "/products/pexels-glassesshop-gs-1317359316-29288802.jpg",
    ],

    "premium_dress": [
        "/products/bulbul-ahmed-BtkHK1vhg1E-unsplash.jpg",
        "/products/bulbul-ahmed-SiQTqnp-qd8-unsplash.jpg",
        "/products/clement-vatte-f67Caxg3akg-unsplash.jpg",
        "/products/ikshana-productions-WwjqSo1so4g-unsplash.jpg",
        "/products/imana-DhqQdAzmhhI-unsplash.jpg",
        "/products/imana-FuGHcMhxM-g-unsplash.jpg",
        "/products/james-lewis-ohiyigDmlYc-unsplash.jpg",
        "/products/ikshana-productions-33x1Qg2-4JY-unsplash.jpg",
    ],
}

ADDITIONAL_IMAGES = [
    "/products/imana-1qsb5rGOcC4-unsplash.jpg",
    "/products/pexels-91089796-9136065.jpg",
    "/products/pexels-arjunadinata-30248250.jpg",
    "/products/pexels-harsh-kukadiya-244412142-38563282.jpg",
    "/products/pexels-montage-art-media-3910955-6705270.jpg",
    "/products/pexels-romantymochko-33135933.jpg",
    "/products/pexels-shootsaga-30809730.jpg",
    "/products/pexels-teodorapopa-33511041.jpg",
    "/products/sabesh-photography-ltd-njVir8eVq1M-unsplash.jpg",
    "/products/shades-by-43-Rm9DL9DmGi4-unsplash.jpg",
    "/products/the-behruz-theory-wusSGdCQQVA-unsplash.jpg",
    "/products/yamaitrop-vioreenlack-Ww8eY4LFrfc-unsplash.jpg",
    "/products/zulfugar-karimov-PkBmOJvR0wE-unsplash.jpg",
]

CATALOG = [
    ("Premium Dresses", "premium_dress", "Women", [
        ("Elegance Co", "Black Sparkle Evening Dress with Sequin Details", 2899),
        ("Elegance Co", "Maroon Velvet Gown with Wrap Detail", 3299),
        ("Elegance Co", "Azure Blue Evening Dress - Elegant Cut", 2499),
        ("Elegance Co", "White Casual Dress - Classic Comfort", 1899),
        ("Elegance Co", "Denim Button-Up Dress - Casual Chic", 1899),
        ("Elegance Co", "Rust Wrap Dress - Boho Elegance", 2399),
        ("Elegance Co", "Rust Floral Wrap Dress - Garden Party", 2199),
        ("Elegance Co", "Denim Jacket Dress - Street Style", 2199),
        ("Elegance Co", "Beige Knit Maxi Dress - Timeless Layer", 1699),
        ("Elegance Co", "Rust Pleated Gown - Evening Sophisticated", 2899),
        ("Elegance Co", "Cream Floral Gown - Romantic Style", 2699),
        ("Elegance Co", "Checkered Prairie Dress - Country Charm", 1799),
        ("Elegance Co", "Rust V-Neck Gown - Sultry Sophistication", 2599),
        ("Elegance Co", "Mixed Texture Evening Collection - Multi-Style", 2799),
    ]),
    ("Kurtas", "kurta", "Women", [
        ("Anouk", "Women Floral Printed Anarkali Kurta", 1499), ("Libas", "Ethnic Motifs Straight Kurta with Trousers", 2199),
        ("W", "Chanderi Silk A-Line Kurta", 1899), ("Biba", "Cotton Yoke Design Kurta Set", 2499),
        ("Varanga", "Embroidered Kurta with Dupatta", 1799), ("Sangria", "Bandhani Printed Straight Kurta", 1299),
        ("Anouk", "Solid Kurta with Palazzos", 1699), ("Indya", "Mirror Work Festive Kurta", 2899),
        ("Rangmanch", "Printed Cotton Daily Kurta", 899), ("Aurelia", "Yoke Embroidered Kurta Set", 1599),
        ("Libas", "Zari Woven Festive Kurta", 2399), ("Global Desi", "Boho Print Flared Kurta", 1499),
    ]),
    ("Sarees", "saree", "Women", [
        ("Kalini", "Banarasi Silk Blend Woven Saree", 3499),
        ("Anika", "Handloom Chanderi Saree - Pastel Weave", 2599),
        ("Saree House", "Georgette Designer Floral Saree", 2199),
        ("Ethnic Bazaar", "Printed Kota Doria Saree - Summer Edition", 1499),
        ("Varanga", "Silk Blend Floral Saree - Festive", 1999),
        ("Silk Route", "Pure Silk Party Saree - Rich Weave", 4599),
        ("Ritu", "Zari Border Bridal Saree", 3899),
        ("Shubhkala", "Sequinned Festive Saree", 4999),
        ("ZariCraft", "Traditional Zari Woven Saree", 4299),
        ("Sari Studio", "Contemporary Printed Saree", 1799),
        ("Nava", "Embroidered Organza Saree", 2899),
        ("Heritage", "Kanchipuram Inspired Silk Saree", 5999),
    ]),
    ("Lehengas", "lehenga", "Women", [
        ("Kalki", "Embroidered Semi-Stitched Lehenga Choli", 7999), ("Shubhkala", "Sequinned Wedding Lehenga", 6499),
        ("Inddus", "Net Bridal Lehenga Set", 9999), ("Kalki", "Mirror Work Festive Lehenga", 5499),
        ("Chhabra 555", "Zari Woven Lehenga Choli", 8499), ("Shubhkala", "Georgette Party Lehenga", 4999),
    ]),
    ("Dresses", "dress", "Women", [
        ("ONLY", "Bodycon Party Dress", 2099), ("Mango", "Satin Wrap Dress", 3499),
        ("Vero Moda", "Puff Sleeve A-Line Dress", 1899), ("Athena", "Ruffled Maxi Dress", 2599),
        ("Tokyo Talkies", "Smocked Mini Dress", 1299), ("H&M", "Printed Tiered Dress", 1799),
        ("Zara", "Structured Midi Dress", 2499), ("Global Desi", "Embroidered Boho Dress", 1999),
        ("Street & Soul", "Denim Shirt Dress", 2199), ("Forever 21", "Floral Mini Dress", 1599),
        ("Elegance Co", "Satin Slip Dress", 2799),
    ]),
    ("Tops", "top", "Women", [
        ("Roadster", "Cotton Solid Casual Top", 699), ("H&M", "Ribbed Fitted Top", 899),
        ("Vero Moda", "Satin Cami Top", 1099), ("ONLY", "Printed Wrap Top", 999),
        ("Tokyo Talkies", "Puff Sleeve Blouse", 799), ("Roadster", "Oversized Graphic Tee", 599),
        ("Elegance Co", "Burgundy Crop Top - Modern Edge", 899),
        ("Global Desi", "Embroidered Summer Top", 1299), ("W", "Floral Peplum Top", 1099),
        ("Biba", "Printed Kurti Style Top", 1199), ("Fabindia", "Handloom Cotton Shirt", 1499),
        ("Zara", "Striped Button-Up Top", 1299), ("Mango", "Ribbed Mock Neck Top", 999),
        ("Forever 21", "Lace Trim Cami", 799), ("LC Waikiki", "Denim Jacket Style Top", 1599),
        ("H&M", "Pleated Sleeve Blouse", 1099), ("Roadster", "Textured Knit Top", 899),
        ("Vero Moda", "Chiffon Layered Top", 1399), ("ONLY", "Solid Knot Front Top", 949),
        ("Tokyo Talkies", "Gathered Waist Top", 1049), ("Elegance Co", "Embroidered High-Low Top", 1299),
        ("Global Desi", "Printed Ruffle Top", 1199), ("Biba", "Geometric Print Top", 999),
        ("Fabindia", "Organic Cotton Peasant Top", 1599), ("H&M", "Modal Jersey Wrap Top", 899),
        ("Roadster", "Sports Stripe Tee", 699),
    ]),
    ("Jeans", "jeans", "Women", [
        ("Levi's", "Classic Regular Fit Jeans", 2999),
        ("Roadster", "Slim Stretch Skinny Jeans", 1499),
        ("H&M", "Wide Leg High Waist Jeans", 2299),
        ("Wrangler", "Mid-Rise Relaxed Jeans", 1999),
        ("Lee", "Straight Leg Dark Wash Jeans", 2199),
        ("Gap", "Tapered Comfort Denim", 1899),
        ("Uniqlo", "High Rise Ankle Jeans", 2499),
        ("DenimCo", "Vintage Washed Flare Jeans", 2799),
        ("Mustang", "Skinny High-Stretch Jeans", 1699),
        ("Pepe", "Loose Fit Light Wash Jeans", 1599),
        ("Jack & Jones", "Classic Blue Mid-Rise Jeans", 1999),
    ]),
    ("Kids", "kids", "Kids", [
        ("Mothercare", "Toddler Graphic Tee (2-3Y)", 599),
        ("Babyhug", "Cotton Playwear Set (2-3Y)", 899),
        ("Gini & Jony", "Denim Shorts (4-5Y)", 799),
        ("H&M Kids", "Striped Polo Shirt (4-5Y)", 699),
        ("Little Kangaroos", "Printed Frock (6-7Y)", 999),
        ("Pepe", "Comfort Fit Jeans (6-7Y)", 799),
        ("MiniKlub", "Sleeveless Romper (8-9Y)", 699),
        ("FirstCry", "Hooded Sweatshirt (8-9Y)", 999),
        ("Carter's", "Summer Dress (2-3Y)", 899),
        ("Chicco", "Checked Shirt (4-5Y)", 749),
        ("KidsVille", "Activewear Set (6-7Y)", 899),
        ("PlayZone", "Printed Leggings (8-9Y)", 599),
    ]),
    ("Footwear", "footwear", "Women", [
        ("Inc 5", "Nude Stiletto Pumps", 1799), ("Mochi", "Gold Toned Kolhapuri Flats", 1299),
        ("Bata", "Casual White Sneakers", 1899),
    ]),
    ("Men", "men", "Men", [
        ("Roadster", "Casual Check Shirt - Blue", 1299),
        ("H&M", "Slim Fit Solid Shirt - White", 1199),
        ("Jack & Jones", "Denim Casual Shirt - Dark Wash", 1499),
        ("Peter England", "Formal Oxford Shirt - Sky", 1399),
        ("United Colors", "Striped Cotton Shirt", 1299),
        ("Allen Solly", "Smart Casual Shirt - Grey", 1499),
        ("Levi's", "Checked Casual Shirt", 1599),
        ("US Polo", "Chambray Shirt - Navy", 1699),
        ("Roadster", "Printed Relaxed Shirt", 999),
    ]),
    ("Beauty", "beauty", "Beauty", [
        ("Lakme", "9to5 Primer + Matte Lipstick", 549),
        ("Maybelline", "Fit Me Foundation", 649),
        ("MAC", "Studio Fix Compact", 2450),
        ("Lakme", "Eyeconic Kajal Twin Pack", 399),
        ("L'Oreal", "Paris Revitalift Night Cream", 799),
        ("NYX", "Soft Matte Lip Cream", 549),
        ("Clinique", "Moisture Surge Hydrator", 1499),
        ("Colorbar", "Perfect Match Foundation", 899),
        ("Revlon", "ColorStay Lipstick", 699),
        ("Plum", "Green Tea Mattifying Moisturizer", 399),
        ("The Body Shop", "Shea Body Butter", 599),
        ("Biotique", "Bio Honey Moisturizer", 299),
        ("Forest Essentials", "Sandalwood Face Cleanser", 1299),
        ("Kama Ayurveda", "Rose Jasmine Face Cleanser", 999),
        ("Himalaya", "Herbal Face Wash", 199),
        ("Lotus Herbals", "SunProtect SPF 50", 499),
        ("Innisfree", "Jeju Volcanic Pore Clay Mask", 799),
        ("Minimalist", "10% Vitamin C Serum", 699),
    ]),
]

SELLERS = [
    ("RetailNet", 4.5, 2.1), ("Omnitech Retail", 4.3, 3.4), ("Fashionista Co", 4.7, 1.6),
    ("TrendVilla", 4.1, 5.2), ("StyleHub India", 4.4, 2.8), ("Ethnic Bazaar", 4.6, 1.9),
]
WAREHOUSES = ["Bengaluru", "Mumbai", "Delhi NCR", "Hyderabad", "Kolkata"]
FABRICS = {
    "kurta": "Cotton",
    "saree": "Silk Blend",
    "lehenga": "Georgette",
    "dress": "Polyester",
    "premium_dress": "Satin Blend",
    "top": "Cotton",
    "jeans": "Denim",
    "footwear": "Synthetic",
    "men": "Cotton",
    "kids": "Soft, skin-friendly fabric",
    "beauty": "N/A",
}
SIZES_APPAREL = ["XS", "S", "M", "L", "XL", "XXL"]
SIZES_FOOT = ["36", "37", "38", "39", "40", "41"]

REVIEWERS = [
    ("Priya S", "Hyderabad"), ("Ananya R", "Vijayawada"), ("Kavya M", "Warangal"), ("Sneha P", "Pune"),
    ("Lakshmi D", "Chennai"), ("Meghana K", "Bengaluru"), ("Ritika J", "Jaipur"), ("Divya T", "Lucknow"),
    ("Sowmya V", "Guntur"), ("Pooja B", "Indore"), ("Neha K", "Mumbai"), ("Amit S", "Delhi"),
    ("Rahul K", "Noida"), ("Rhea N", "Ahmedabad"), ("Isha M", "Kolkata"), ("Vikram P", "Bengaluru"),
    ("Mira L", "Mysuru"), ("Karan T", "Hyderabad"), ("Sana G", "Lucknow"), ("Arjun B", "Pune"),
    ("Tanya R", "Bhopal"),
]
REVIEW_PHOTOS = [
    "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&q=70",
    "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=300&q=70",
    "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=300&q=70",
]

REVIEW_SIZE_FEEDBACK_POS = ["perfect", "comfortable", "true to size", "just right", "easy to move in"]
REVIEW_SIZE_FEEDBACK_NEG = ["tight", "loose", "snug", "narrow", "roomy in the wrong places"]

REVIEW_COLOR_COMMENTS = {
    "cotton": "soft cotton feels breathable all day",
    "denim": "sturdy denim with the right amount of stretch",
    "silk blend": "smooth silk blend that drapes beautifully",
    "georgette": "light georgette fabric that feels flowy",
    "polyester": "lightweight polyester that dries quickly",
    "satin blend": "smooth satin blend with a soft sheen",
    "synthetic": "lightweight synthetic material that holds shape",
}

def _select_reviewers(rng, count):
    reviewers = REVIEWERS.copy()
    if count <= len(reviewers):
        return rng.sample(reviewers, count)
    selected = reviewers[:]  # use all once first
    while len(selected) < count:
        selected.append(rng.choice(reviewers))
    return selected


def _fabric_description(fabric):
    if not fabric or fabric == "N/A":
        return ""
    return REVIEW_COLOR_COMMENTS.get(fabric.lower(), fabric.lower())


def _review_intro(product, size, color):
    name = product.get("name", "This product")
    if size:
        return f"I ordered the {name} in size {size}{color}."
    return f"I bought the {name}{color}."


def _build_review_text(product, positive, idx, size):
    category = (product.get("category") or "").lower()
    name = product.get("name", "This product")
    fabric = product.get("fabric", "")
    color = product.get("color") or (product.get("colors") or [""])[0] or ""
    color_text = f" in {color.lower()}" if color else ""
    fabric_text = _fabric_description(fabric)
    name_lower = name.lower()
    fit_type = (product.get("fit_type") or "").lower()
    intro = _review_intro(product, size, color_text)
    review_lines = [intro]

    if category == "beauty":
        if positive:
            review_lines.append(
                f"The formula feels lightweight and the finish is smooth without being greasy."
            )
            if "lip" in name_lower or "lipstick" in name_lower:
                review_lines.append(
                    "The pigmentation is rich and one swipe gives even coverage."
                )
            else:
                review_lines.append(
                    "The fragrance is mild, it blends nicely, and it lasted through a long day."
                )
            review_lines.append(
                "I liked how it did not settle into fine lines and the texture stayed comfortable."
            )
        else:
            review_lines.append(
                "The shade looked good in the app but the finish is a bit patchy in natural light."
            )
            review_lines.append(
                "The formula feels heavier than expected and it takes a while to blend."
            )
            review_lines.append(
                "I would recommend checking the colour once more before ordering."
            )
        return " ".join(review_lines)

    if category == "footwear":
        if positive:
            review_lines.append(
                f"The {color.lower() if color else 'pair'} is comfortable and the sole grip is dependable."
            )
            review_lines.append(
                "The cushioning is good for daily wear and the upper feels durable."
            )
            if fit_type == "fitted":
                review_lines.append(
                    "It fits snugly without pinching and stays secure while walking."
                )
            else:
                review_lines.append(
                    "The width is generous enough and it is easy to wear for long hours."
                )
        else:
            review_lines.append(
                "The shoe is a little narrow around the toe box and needs a break-in period."
            )
            review_lines.append(
                "The sole feels firmer than expected, especially on longer walks."
            )
            review_lines.append(
                "I liked the look, but I would choose a half size up for better comfort."
            )
        return " ".join(review_lines)

    if category in {"jeans", "men"}:
        if positive:
            review_lines.append(
                f"The {fabric.lower()} material feels breathable and the colour stayed true after washing."
            )
            if category == "jeans":
                review_lines.append(
                    "The denim has just enough stretch and the waist fit feels balanced."
                )
            else:
                review_lines.append(
                    "The cut is sharp enough for office wear and the fabric is easy to move in."
                )
            review_lines.append(
                "It is comfortable all day and the stitching seems sturdy."
            )
        else:
            review_lines.append(
                f"The {color.lower() if color else 'piece'} fits a bit tighter than expected around the waist."
            )
            review_lines.append(
                "The fabric feels slightly stiff at first and needs a couple of washes to soften."
            )
            review_lines.append(
                "The finish is okay, but I would prefer a more relaxed fit next time."
            )
        return " ".join(review_lines)

    is_ethnic = category in {"sarees", "lehngas", "kurtas"}
    if positive:
        if is_ethnic:
            review_lines.append(
                f"The {fabric.lower()} drapes beautifully and the {color.lower() if color else 'color'} looks elegant."
            )
            review_lines.append(
                "The embroidery and finishing feel premium for the price."
            )
            review_lines.append(
                "It was comfortable to wear for an event and the fabric did not feel heavy."
            )
        else:
            review_lines.append(
                f"The {fabric_text if fabric_text else 'fabric'} feels pleasant on the skin."
            )
            if "floral" in name_lower or "print" in name_lower:
                review_lines.append(
                    "The print stayed crisp and the piece looked fresh throughout the day."
                )
            else:
                review_lines.append(
                    "The fit is comfortable and the piece is easy to style."
                )
            review_lines.append(
                "I got positive comments on the colour and it was a good buy for everyday wear."
            )
    else:
        if is_ethnic:
            review_lines.append(
                f"The {fabric.lower()} is nice, but the blouse/dupatta felt a bit loose around the shoulders."
            )
            review_lines.append(
                "The colour is slightly different from the images and the drape could be better."
            )
            review_lines.append(
                "It may need some stitching adjustments for a perfect fit."
            )
        else:
            review_lines.append(
                f"The {fabric_text if fabric_text else 'material'} feels thinner than expected and creases easily."
            )
            if "denim" in name_lower:
                review_lines.append(
                    "The jeans need a few wears before they loosen up and feel right."
                )
            else:
                review_lines.append(
                    "The fit is not quite true to size and the finish is less polished in person."
                )
            review_lines.append(
                "I would recommend checking the measurements before buying."
            )
    return " ".join(review_lines)


USERS = [
    ("Priya Sharma", "priya@buyready.in"), ("Ananya Reddy", "ananya@buyready.in"), ("Kavya Mehta", "kavya@buyready.in"),
    ("Sneha Patil", "sneha@buyready.in"), ("Lakshmi Devi", "lakshmi@buyready.in"), ("Meghana Rao", "meghana@buyready.in"),
    ("Ritika Jain", "ritika@buyready.in"), ("Divya Tiwari", "divya@buyready.in"), ("Sowmya Varma", "sowmya@buyready.in"),
    ("Pooja Bansal", "pooja@buyready.in"),
]

ADDRESSES = [
    {"label": "Home", "line1": "Flat 302, Sri Sai Residency, Madhapur", "city": "Hyderabad", "state": "Telangana", "pin": "500081"},
    {"label": "Office", "line1": "T-Hub, Plot 1/C, Raidurg", "city": "Hyderabad", "state": "Telangana", "pin": "500032"},
    {"label": "Parents", "line1": "H.No 4-21, Gandhi Nagar", "city": "Vijayawada", "state": "Andhra Pradesh", "pin": "520003"},
    {"label": "Hostel", "line1": "Sree Ladies Hostel, Ameerpet", "city": "Hyderabad", "state": "Telangana", "pin": "500016"},
]

FIT_PROFILES = [
    {"name": "Priya", "height_cm": 158, "weight_kg": 55, "body_shape": "Pear", "preferred_fit": "Regular", "language": "en"},
    {"name": "Wedding", "height_cm": 158, "weight_kg": 55, "body_shape": "Pear", "preferred_fit": "Fitted", "language": "te"},
    {"name": "Office", "height_cm": 158, "weight_kg": 55, "body_shape": "Pear", "preferred_fit": "Comfort", "language": "en"},
    {"name": "Gift", "height_cm": 165, "weight_kg": 62, "body_shape": "Hourglass", "preferred_fit": "Regular", "language": "hi"},
]


def hash_pw(p):
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


# Color keywords mapped to image indices so products with matching color names get consistent images
_COLOR_IMG_MAP = [
    # Multi-word or patterns that could match substrings of other words — checked FIRST
    ("off white", 3), ("navy blue", 2), ("azure blue", 2),
    ("checkered", 5), ("checker", 5),  # BEFORE "red" to avoid 'checkeRED' substring match
    # Dark / Black (index 0)
    ("black", 0),
    # Red / Maroon / Burgundy (index 1) — burgundy is red-toned, not black
    ("burgundy", 1), ("maroon", 1), ("red", 1), ("wine", 1),
    # Blue (index 2)
    ("blue", 2), ("azure", 2), ("navy", 2), ("teal", 2),
    # White / Light neutrals (index 3)
    ("white", 3), ("cream", 3), ("beige", 3), ("nude", 3), ("crème", 3),
    # Denim / Cotton / Casual (index 4)
    ("denim", 4),
    # Floral / Print / Pattern (index 5)
    ("floral", 5), ("print", 5), ("boho", 5), ("graphic", 5),
    # Rust / Earth tones (index 6)
    ("rust", 6), ("brown", 6),
    # Pink / Party / Gold (index 7)
    ("pink", 7), ("party", 7), ("gold", 7), ("mustard", 7),
    # Style keywords (fallbacks — only checked if no color matched)
    ("evening", 0), ("gown", 1), ("silk", 1),
    ("slim", 2), ("skinny", 0), ("flare", 1),
    ("wedding", 1), ("festive", 2), ("mixed", 7),
]


def select_image_by_name(name, images):
    """Pick the best-matching image from a pool based on color/style keywords in the product name."""
    name_lower = name.lower()
    for keyword, idx in _COLOR_IMG_MAP:
        if keyword in name_lower:
            return images[idx % len(images)]
    # Fallback: stable hash-based deterministic selection
    name_bytes = name_lower.encode()
    # Use CRC32 for stable hashing across Python interpreter runs
    import zlib
    return images[zlib.crc32(name_bytes) % len(images)]


def _choose_unique_product_image(name, img_key, brand, category, gender, color, description, local_images, used_images):
    prefix_map = {
        "men": ["shirt", "men"],
        "kids": ["kids"],
        "beauty": ["beauty"],
        "top": ["top"],
        "dress": ["dress"],
        "jeans": ["jeans"],
        "saree": ["saree"],
    }

    def _starts_with_prefix(img):
        try:
            fname = img.split("/")[-1].lower()
            prefixes = prefix_map.get(img_key.lower(), [img_key.lower()])
            return any(fname.startswith(prefix) for prefix in prefixes)
        except Exception:
            return False

    preferred_local = [img for img in local_images if _starts_with_prefix(img) and img not in used_images]
    if preferred_local:
        candidate = match_local_image_for_product(name, brand, category, gender, color, description, preferred_local)
        if candidate and candidate not in used_images:
            return candidate
        return select_image_by_name(name, preferred_local)

    # Only fall back to any local image if no prefix-based local pool is available.
    candidate = match_local_image_for_product(name, brand, category, gender, color, description, [img for img in local_images if img not in used_images])
    if candidate and candidate not in used_images:
        return candidate

    candidate_list = []
    candidate_list.extend([img for img in IMAGES.get(img_key, []) if img not in used_images])
    candidate_list.extend([img for img in local_images if img not in used_images])
    candidate_list.extend([img for img in ADDITIONAL_IMAGES if img not in used_images])
    candidate_list = list(dict.fromkeys(candidate_list))

    if candidate_list:
        return select_image_by_name(name, candidate_list)

    fallback_images = list(dict.fromkeys([*IMAGES.get(img_key, []), *local_images, *ADDITIONAL_IMAGES]))
    return select_image_by_name(name, fallback_images) if fallback_images else None


def _override_category_gender_by_name(name, category, gender, img_key):
    normalized = name.strip().lower()
    if normalized.startswith("kid"):
        return "Kids", "Kids", "kids"
    if normalized.startswith("beauty"):
        return "Beauty", "Beauty", "beauty"
    if normalized.startswith("shirt"):
        return "Men", "Men", "men"
    if normalized.startswith("dress"):
        return "Dresses", "Women", "dress"
    if normalized.startswith("top"):
        return "Tops", "Women", "top"
    if normalized.startswith("jeans"):
        return "Jeans", "Women", "jeans"
    if normalized.startswith("saree"):
        return "Sarees", "Women", "saree"
    return category, gender, img_key


def _generate_size_guide(sizes, category_key):
    if not sizes:
        return []
    if category_key == "footwear":
        base = 23
        return [
            {"size": size, "foot_length_cm": f"{base + idx * 0.5:.1f}"}
            for idx, size in enumerate(sizes)
        ]

    guide = []
    for idx, size in enumerate(sizes):
        chest_low = 32 + idx * 2
        chest_high = chest_low + 2
        waist_low = 26 + idx * 2
        waist_high = waist_low + 2
        hip_low = 34 + idx * 2
        hip_high = hip_low + 2
        guide.append({
            "size": size,
            "chest": f"{chest_low}-{chest_high}",
            "waist": f"{waist_low}-{waist_high}",
            "hip": f"{hip_low}-{hip_high}",
        })
    return guide


def _generate_size_chart(sizes, category_key, fit_type):
    if not sizes:
        return {}
    if category_key == "footwear":
        base = 23.0
        chart = {}
        for idx, size in enumerate(sizes):
            chart[size] = {
                "foot_length_cm": [round(base + idx * 0.6, 1), round(base + idx * 0.6 + 0.6, 1)],
                "width_cm": [8.5 + idx * 0.2, 9.2 + idx * 0.2],
                "fit_type": fit_type,
                "stretch": "Medium",
            }
        return chart

    chart = {}
    stretch = "Medium"
    if fit_type == "Relaxed":
        stretch = "High"
    elif fit_type == "Fitted":
        stretch = "Low"

    base_height = 150
    base_weight = 45
    for idx, size in enumerate(sizes):
        height_low = base_height + idx * 4
        height_high = height_low + 8 + (2 if fit_type == "Relaxed" else 0)
        weight_low = base_weight + idx * 5
        weight_high = weight_low + 8 + (3 if fit_type == "Relaxed" else 0)
        chart[size] = {
            "height": [height_low, height_high],
            "weight": [weight_low, weight_high],
            "fit_type": fit_type,
            "stretch": stretch,
        }
    return chart


def _generate_size_popularity(sizes, rng):
    if not sizes:
        return {}
    spread = len(sizes) // 2
    popularity = {}
    for idx, size in enumerate(sizes):
        center_boost = max(0, spread + 1 - abs(idx - spread)) * 6
        popularity[size] = max(5, center_boost + rng.randint(-2, 6))
    return popularity


def _choose_recommended_size_from_trends(sizes, popularity, base_size, size_accuracy):
    if not sizes:
        return None
    if not popularity:
        return base_size
    most_bought = max(popularity, key=popularity.get)
    if most_bought != base_size and popularity[most_bought] >= max(popularity.values()) * 0.95:
        return most_bought
    return base_size


def build_products():
    rng = random.Random(42)
    products = []
    brands = {}
    assigned_images = set()
    pid = 1
    for category, img_key, gender, items in CATALOG:
        for brand, name, price in items:
            seller = SELLERS[pid % len(SELLERS)]
            discount = rng.choice([20, 30, 40, 50, 55, 60])
            mrp = int(price / (1 - discount / 100) // 10 * 10)
            rating = round(rng.uniform(3.7, 4.8), 1)
            sizes = [] if img_key == "beauty" else (SIZES_FOOT if img_key == "footwear" else SIZES_APPAREL)
            size_stock = {s: rng.randint(0, 25) for s in sizes}
            if sizes:
                size_stock[sizes[2]] = max(size_stock[sizes[2]], 5)
            warehouse_stock = {wh: rng.randint(0, 20) for wh in WAREHOUSES}
            warehouse_stock[WAREHOUSES[pid % len(WAREHOUSES)]] = max(warehouse_stock[WAREHOUSES[pid % len(WAREHOUSES)]], 10)
            imgs = None
            catalog_image = None
            images_list = None
            fit_type = rng.choice(["Regular", "Fitted", "Relaxed"]) if img_key not in ("beauty", "footwear") else "N/A"
            return_percent = round(rng.uniform(2, 14), 1)
            size_accuracy = round(rng.uniform(78, 97), 0)
            size_popularity = _generate_size_popularity(sizes, rng)
            size_guide = _generate_size_guide(sizes, img_key)
            size_recommendation_brand = sizes[len(sizes) // 2] if sizes else None
            size_recommendation_review = _choose_recommended_size_from_trends(sizes, size_popularity, size_recommendation_brand, size_accuracy)
            if brand not in brands and sizes:
                review_bias = rng.choices(
                    ["true_to_size", "runs_large", "runs_small"],
                    weights=[40, 30, 30],
                    k=1,
                )[0]
                sizes_are_numeric = all(s.isdigit() for s in sizes)
                brands[brand] = {
                    "brand": brand,
                    "fit_type": fit_type,
                    "size_chart": _generate_size_chart(sizes, img_key, fit_type),
                    "review_bias": review_bias,
                    "product_type": "footwear" if sizes_are_numeric else "apparel",
                }
            # Assign primary color based on product name, fallback to random
            name_lower = name.lower()
            # Color pool includes all colors found in product names plus extras
            color_pool = ["Maroon", "Navy Blue", "Teal", "Mustard", "Pink", "Black", "Off White", "Green", "White", "Cream", "Rust", "Gold", "Nude", "Burgundy", "Azure Blue", "Beige"]
            named_color = None
            # Check multi-word colors first, then single-word, to avoid partial matches
            for c in ["Off White", "Navy Blue", "Azure Blue", "Black", "White", "Maroon", "Pink", "Green", "Teal", "Mustard", "Burgundy", "Cream", "Beige", "Rust", "Gold", "Nude"]:
                if c.lower() in name_lower:
                    named_color = c
                    break
            if named_color and named_color in color_pool:
                remaining = [c for c in color_pool if c != named_color]
                colors = [named_color] + rng.sample(remaining, 2)
            else:
                colors = rng.sample(color_pool, 3)
            product_color = colors[0]
            # Category-aware descriptions and detail sections
            is_apparel = img_key not in ("beauty", "footwear")
            is_beauty = img_key == "beauty"
            description = (
                f"{name} from {brand} is made with {FABRICS[img_key]} and designed to feel comfortable all day."
            ) if is_apparel else (
                f"{name} from {brand} - a premium quality beauty product for everyday use." if is_beauty else
                f"{name} from {brand} - stylish and comfortable footwear for everyday wear."
            )
            quality_description = (
                f"This item uses {FABRICS[img_key]} fabric and sturdy stitching for a reliable everyday wear experience."
            ) if is_apparel else (
                f"This beauty product is formulated with quality ingredients for reliable everyday use." if is_beauty else
                f"This footwear features quality materials and comfortable cushioning for reliable everyday wear."
            )
            if is_apparel:
                details = [
                    f"Soft {FABRICS[img_key]} material",
                    f"{fit_type} fit",
                    f"{size_accuracy}% true-to-size",
                    "Comfortable and breathable design",
                    f"{return_percent}% return rate",
                ]
            elif is_beauty:
                details = [
                    "Soft, lightweight formula",
                    "Long-lasting finish",
                    "Good coverage",
                    "Dermatologically tested",
                    "Suitable for all skin types",
                ]
            else:
                details = [
                    "Good cushioning and support",
                    "Soft padded insole",
                    "Durable outsole",
                    "Comfortable for daily wear",
                    "True-to-size fit",
                ]
            if is_apparel:
                prod_details = [
                    "Soft fabric with premium feel", "Comfortable everyday fit",
                    "Easy care and breathable", "High-quality stitching",
                ]
                size_fit_items = ["The model (height 5'8\") is wearing a size S"]
                material_care = [FABRICS[img_key], "Hand Wash"]
                specs = [
                    "Sleeve Length: Three-Quarter Sleeves",
                    "Shape: Straight", "Neck: Round Neck",
                    "Design Styling: Regular", "Slit Detail: Side Slits",
                    "Ornamentation: Thread Work", "Length: Calf Length",
                    "Hemline: Straight", "Colour Family: Bright",
                    "Weave Pattern: Dobby", "Weave Type: Machine Weave",
                ]
            elif is_beauty:
                prod_details = [
                    "Soft formula that blends easily", "Good coverage with natural finish",
                    "Non-greasy feel for all-day wear", "Suitable for sensitive skin",
                ]
                size_fit_items = ["One size - suitable for all"]
                material_care = ["Premium Cosmetics", "Store in a cool dry place"]
                specs = [
                    "Net Quantity: 1", "Packaging Type: Box",
                    "Shelf Life: 36 months", "Country of Origin: India",
                    "Marketed by: Brand", "Imported: No",
                    "Number of Items: 1", "Package Contains: 1 item",
                ]
            else:  # footwear
                prod_details = [
                    "Soft cushioned insole", "Comfortable arch support",
                    "Durable outsole for good grip", "Breathable upper material",
                ]
                size_fit_items = ["True to size. Standard width fit."]
                material_care = [FABRICS[img_key], "Wipe with a damp cloth"]
                specs = [
                    "Heel Height: Varies by style", "Closure: Slip-on / Buckle / Lace-up",
                    "Occasion: Casual / Party / Ethnic", "Country of Origin: India",
                    "Package Contains: 1 pair", "Marketed by: Brand",
                ]
            detail_sections = [
                {"title": "Product Details", "items": [f"Colour: {product_color}"] + prod_details},
                {"title": "Size & Fit", "items": size_fit_items},
                {"title": "Material & Care", "items": material_care},
                {"title": "Specifications", "items": specs},
            ]
            # Override category/gender for explicit name prefixes before selecting images.
            category, gender, img_key = _override_category_gender_by_name(name, category, gender, img_key)
            # Determine images after product metadata (product_color, description) is known
            catalog_image = _choose_unique_product_image(
                name, img_key, brand, category, gender, product_color,
                description, LOCAL_PRODUCT_IMAGES, assigned_images
            )
            if catalog_image:
                assigned_images.add(catalog_image)
                imgs = list(dict.fromkeys([catalog_image] + LOCAL_PRODUCT_IMAGES))
                image_candidates = [img for img in [*IMAGES.get(img_key, []), *LOCAL_PRODUCT_IMAGES, *ADDITIONAL_IMAGES] if img != catalog_image and img not in assigned_images]
                images_list = [catalog_image] + image_candidates[:2]
            else:
                # Skip product when no unique image can be assigned to avoid duplicates.
                continue
            products.append({
                "id": f"p{pid}",
                "name": name, "brand": brand, "category": category, "gender": gender,
                "price": price, "mrp": mrp, "discount": discount,
                "rating": rating, "rating_count": rng.randint(120, 8500),
                "image": catalog_image,
                "image_url": catalog_image,
                "images": images_list,
                "colors": colors,
                "color": colors[0] if colors else None,
                "sizes": sizes, "size_stock": size_stock,
                "warehouse_stock": warehouse_stock,
                "fabric": FABRICS[img_key], "fit_type": fit_type,
                "seller": {"name": seller[0], "rating": seller[1], "return_rate": seller[2], "years": rng.randint(2, 9)},
                "warehouse": WAREHOUSES[pid % len(WAREHOUSES)],
                "historical_low": int(price * rng.uniform(0.9, 1.0)),
                "price_trend": rng.choice(["stable", "dropping", "rising"]),
                "return_percent": return_percent,
                "size_accuracy": size_accuracy,
                "size_guide": size_guide,
                "size_popularity": size_popularity,
                "size_recommendation": {
                    "brand_guide": size_recommendation_brand,
                    "review_trend": size_recommendation_review,
                    "confidence": max(55, min(96, int(size_accuracy + rng.randint(-5, 5))))
                },
                "description": description,
                "quality_description": quality_description,
                "details": details,
                "detail_sections": detail_sections,
                "trending": pid % 4 == 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            pid += 1
    low_quality_indexes = {3, 10, 18}
    for idx in low_quality_indexes:
        if idx < len(products):
            p = products[idx]
            p["rating"] = round(rng.uniform(2.7, 3.2), 1)
            p["rating_count"] = rng.randint(80, 450)
            p["return_percent"] = round(rng.uniform(10.5, 14.5), 1)
            p["size_accuracy"] = round(rng.uniform(55, 68), 0)
            p["seller"]["rating"] = round(rng.uniform(3.1, 3.7), 1)
            p["quality_flag"] = "low"

    trending_top_tops = [p for p in products if p.get("category") == "Tops" and p.get("trending")]
    for p in trending_top_tops[:5]:
        p["rating"] = round(rng.uniform(2.7, 3.2), 1)
        p["rating_count"] = rng.randint(80, 450)
        p["return_percent"] = round(rng.uniform(10.5, 14.5), 1)
        p["size_accuracy"] = round(rng.uniform(55, 68), 0)
        p["seller"]["rating"] = round(rng.uniform(3.1, 3.7), 1)
        p["quality_flag"] = "low"
        p["quality_description"] = "BuyReady flagged multiple negative reviews and quality concerns for this product."
        p["details"] = list(dict.fromkeys([*(p.get("details") or []), "Quality concerns reported by customers."]))
        p["description"] = f"{p.get('description', '')} Some shoppers reported quality and fit concerns."

    # --- Demo products for BuyReady demo (A: Ready, B: Review, C: High Risk) ---
    demo_pid = pid
    demo_now = datetime.now(timezone.utc).isoformat()
    demo_products = [
        {
            "id": f"p{demo_pid}",
            "name": "Product A - Ready to Buy",
            "brand": "DemoBrand",
            "category": "Dresses",
            "gender": "Women",
            "price": 1299,
            "mrp": 1699,
            "discount": 24,
            "rating": 4.8,
            "rating_count": 2200,
            "image": IMAGES["dress"][0],
            "image_url": IMAGES["dress"][0],
            "images": [IMAGES["dress"][0], IMAGES["dress"][1]],
            "colors": ["Pink", "Off White"],
            "sizes": SIZES_APPAREL,
            "size_chart": _generate_size_chart(SIZES_APPAREL, "dress", "Regular"),
            "size_stock": {s: 10 for s in SIZES_APPAREL},
            "fabric": FABRICS["dress"],
            "fit_type": "Regular",
            "seller": {"name": "DemoSeller", "rating": 4.6, "return_rate": 2.0, "years": 3},
            "warehouse": WAREHOUSES[0],
            "historical_low": 1199,
            "price_trend": "stable",
            "return_percent": 3.0,
            "size_accuracy": 95,
            "description": "Product A - A perfect dress that's ready to buy with high confidence from BuyReady.",
            "quality_description": "This dress features premium fabric and excellent craftsmanship.",
            "details": ["Satin Blend material", "Regular fit", "95% true-to-size", "3.0% return rate", "Seller rating 4.6/5"],
            "detail_sections": [{"title": "Product Details", "items": ["Colour: Pink", "Premium quality", "Ready to buy"]}, {"title": "Size & Fit", "items": ["True to size"]}, {"title": "Material & Care", "items": ["Satin Blend", "Dry Clean"]}],
            "warehouse_stock": {"Bengaluru": 15, "Mumbai": 8, "Delhi NCR": 10, "Hyderabad": 5, "Kolkata": 3},
            "trending": False,
            "created_at": demo_now,
        },
        {
            "id": f"p{demo_pid+1}",
            "name": "Product B - Review Before Buying",
            "brand": "DemoBrand",
            "category": "Kurtas",
            "gender": "Women",
            "price": 999,
            "mrp": 1299,
            "discount": 23,
            "color": "Teal",
            "rating": 4.0,
            "rating_count": 420,
            "image": IMAGES["kurta"][0],
            "image_url": IMAGES["kurta"][0],
            "images": [IMAGES["kurta"][0], IMAGES["kurta"][1]],
            "colors": ["Teal", "Mustard"],
            "sizes": SIZES_APPAREL,
            "size_chart": _generate_size_chart(SIZES_APPAREL, "kurta", "Relaxed"),
            "size_stock": {s: (5 if s == "M" else 2) for s in SIZES_APPAREL},
            "fabric": FABRICS["kurta"],
            "fit_type": "Relaxed",
            "seller": {"name": "DemoSeller", "rating": 4.1, "return_rate": 6.0, "years": 2},
            "warehouse": WAREHOUSES[1],
            "historical_low": 899,
            "price_trend": "stable",
            "return_percent": 8.5,
            "size_accuracy": 78,
            "description": "Product B - A kurta set that needs review before purchasing due to middling feedback.",
            "quality_description": "This kurta features decent fabric but may have sizing inconsistencies.",
            "details": ["Cotton material", "Relaxed fit", "78% true-to-size", "8.5% return rate", "Seller rating 4.1/5"],
            "detail_sections": [{"title": "Product Details", "items": ["Colour: Teal", "Ethnic design"]}, {"title": "Size & Fit", "items": ["Check reviews before ordering"]}, {"title": "Material & Care", "items": ["Cotton", "Hand Wash"]}],
            "warehouse_stock": {"Bengaluru": 5, "Mumbai": 12, "Delhi NCR": 3, "Hyderabad": 8, "Kolkata": 2},
            "trending": False,
            "created_at": demo_now,
        },
        {
            "id": f"p{demo_pid+2}",
            "name": "Product C - High Risk",
            "brand": "DemoBrand",
            "category": "Tops",
            "gender": "Women",
            "price": 599,
            "mrp": 999,
            "discount": 40,
            "color": "Black",
            "rating": 2.9,
            "rating_count": 95,
            "image": IMAGES["top"][0],
            "image_url": IMAGES["top"][0],
            "images": [IMAGES["top"][0], IMAGES["top"][1]],
            "colors": ["Black", "Maroon"],
            "sizes": SIZES_APPAREL,
            "size_chart": _generate_size_chart(SIZES_APPAREL, "top", "Fitted"),
            "size_stock": {s: (0 if s in ["XS", "S"] else 1) for s in SIZES_APPAREL},
            "fabric": FABRICS["top"],
            "fit_type": "Fitted",
            "seller": {"name": "DemoSeller", "rating": 3.2, "return_rate": 12.0, "years": 1},
            "warehouse": WAREHOUSES[2],
            "historical_low": 549,
            "price_trend": "dropping",
            "return_percent": 13.5,
            "size_accuracy": 58,
            "description": "Product C - High risk purchase. Poor ratings and high return rate; consider alternatives.",
            "quality_description": "This top has reported quality concerns. Proceed with caution.",
            "details": ["Cotton material", "Fitted fit", "58% true-to-size", "13.5% return rate", "Seller rating 3.2/5"],
            "detail_sections": [{"title": "Product Details", "items": ["Colour: Black", "Basic design", "Quality concerns reported"]}, {"title": "Size & Fit", "items": ["Runs small, order one size up"]}, {"title": "Material & Care", "items": ["Cotton", "Machine Wash"]}],
            "warehouse_stock": {"Bengaluru": 2, "Mumbai": 1, "Delhi NCR": 3, "Hyderabad": 0, "Kolkata": 1},
            "trending": False,
            "quality_flag": "low",
            "created_at": demo_now,
        },
    ]
    products.extend(demo_products)
    pid += len(demo_products)
    return products


def build_reviews(products):
    rng = random.Random(7)
    reviews = []
    rid = 1
    low_quality_ids = {p["id"] for p in products if p.get("quality_flag") == "low"}
    # Select 5 random Tops products and force their reviews to be negative
    tops = [p["id"] for p in products if p.get("category") == "Tops"]
    selected_tops_negative = set(rng.sample(tops, min(5, len(tops)))) if tops else set()
    negative_phrases = [
        "Poor fabric — not what I expected.",
        "Colour was different and not colour perfect.",
        "Not proper fabric; badly made.",
        "Very thin material, feels cheap.",
        "Stitching came apart after first wash.",
        "Badly finished edges; avoid.",
        "Not good quality — disappointed with the purchase.",
        "Size runs weird and fabric feels synthetic.",
    ]
    for p in products:
        negative_bias = p["id"] in low_quality_ids or p["id"] in selected_tops_negative
        review_count = 10
        reviewer_list = _select_reviewers(rng, review_count)
        seen_texts = set()
        # If product is one of the selected Tops, use the exact supplied negative reviews
        if p["id"] in selected_tops_negative:
            fixed_negative = [
                (1, "The fabric feels very cheap and rough. After just one wash, the colour started fading. Definitely not worth the price."),
                (1, "The size chart is completely inaccurate. I ordered my usual size, but it was too tight around the shoulders and waist."),
                (2, "The product looks nothing like the pictures. The colour is much duller, and the material feels thin and low quality."),
                (1, "Poor stitching throughout the dress. Loose threads were hanging everywhere, and one seam came apart after wearing it once."),
                (2, "Very disappointed. The fabric is almost transparent and requires an extra layer underneath, which wasn't shown in the product images."),
                (1, "The fit is awkward. It's tight around the chest but extremely loose near the waist, making it uncomfortable to wear."),
                (2, "Received the wrong size even though the tag says my size. It feels at least two sizes smaller than expected."),
                (1, "The quality doesn't justify the price. It started pilling after just two wears, making it look old very quickly."),
                (2, "The sleeves are much shorter than shown in the pictures. Overall, the product doesn't match the online description."),
                (1, "Very poor shopping experience. The product arrived late, the packaging was damaged, and the dress had a noticeable stain."),
            ]
            for idx, ((reviewer, city), (rating, txt)) in enumerate(zip(reviewer_list, fixed_negative)):
                size = rng.choice(p["sizes"]) if p["sizes"] else None
                photos = []
                if rng.random() < 0.2:
                    photo_count = min(1, len(REVIEW_PHOTOS))
                    photos = rng.sample(REVIEW_PHOTOS, photo_count)
                review = {
                    "id": f"r{rid}",
                    "product_id": p["id"],
                    "reviewer": reviewer,
                    "region": city,
                    "rating": rating,
                    "text": txt,
                    "sentiment": "negative" if rating <= 2 else "positive",
                    "photos": photos,
                    "size_bought": size,
                    "fit_feedback": rng.choice(REVIEW_SIZE_FEEDBACK_NEG),
                    "created_at": (datetime.now(timezone.utc) - timedelta(days=idx + 2)).isoformat(),
                }
                reviews.append(review)
                rid += 1
        else:
            for idx, (reviewer, city) in enumerate(reviewer_list):
                if p["id"] in selected_tops_negative:
                    positive = False
                else:
                    positive = rng.random() < (0.32 if negative_bias else 0.72)
                size = rng.choice(p["sizes"]) if p["sizes"] else None
                text = _build_review_text(p, positive, idx, size)
                if p["id"] in selected_tops_negative and not positive:
                    neg_phrase = rng.choice(negative_phrases)
                    text = f"{neg_phrase} {text}"
                if text in seen_texts:
                    text = f"{text} {rng.choice(['Worth buying.', 'Good value for the price.', 'Nice experience overall.'])}"
                seen_texts.add(text)
                photos = []
                if rng.random() < 0.95:
                    photo_count = min(rng.randint(1, 3), len(REVIEW_PHOTOS))
                    photos = rng.sample(REVIEW_PHOTOS, photo_count)
                review = {
                    "id": f"r{rid}",
                    "product_id": p["id"],
                    "reviewer": reviewer,
                    "region": city,
                    "rating": (rng.randint(4, 5) if positive else (rng.randint(1, 2) if p["id"] in selected_tops_negative else rng.randint(1, 3))),
                    "text": text,
                    "sentiment": "positive" if positive else "negative",
                    "photos": photos,
                    "size_bought": size,
                    "fit_feedback": rng.choice(REVIEW_SIZE_FEEDBACK_NEG if negative_bias else REVIEW_SIZE_FEEDBACK_POS),
                    "created_at": (datetime.now(timezone.utc) - timedelta(days=rng.randint(2, 90))).isoformat(),
                }
                reviews.append(review)
                rid += 1
    return reviews


def build_users():
    pw = hash_pw("Demo@123")
    users = []
    users.append({
        "id": "ops-admin",
        "name": "Ops Admin",
        "email": "ops@buyready.in",
        "password_hash": hash_pw("Ops@123"),
        "phone": "9999999999",
        "addresses": [],
        "fit_profiles": [],
        "active_fit_profile": None,
        "wishlist": [],
        "cart": [],
        "language": "en",
        "fit_profile_done": True,
        "role": "operator",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    for i, (name, email) in enumerate(USERS):
        addrs = []
        for j, a in enumerate(ADDRESSES):
            addrs.append({**a, "id": f"a{i}_{j}", "receiver": name, "phone": f"98{i}0{j}23456", "default": j == 0})
        fps = [{**fp, "id": f"fp{i}_{k}"} for k, fp in enumerate(FIT_PROFILES)]
        fps[0]["name"] = name.split()[0]
        users.append({
            "id": f"u{i+1}",
            "name": name, "email": email, "password_hash": pw,
            "phone": f"98765432{10+i}",
            "addresses": addrs, "fit_profiles": fps,
            "active_fit_profile": fps[0]["id"],
            "wishlist": [f"p{(i*5) % 54 + 1}", f"p{(i*7) % 54 + 2}"],
            "cart": [],
            "language": "en",
            "fit_profile_done": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return users


def build_brands(products):
    brand_map = {}
    for product in products:
        brand = product.get("brand")
        if not brand or brand in brand_map:
            continue
        sizes = product.get("sizes") or []
        fit_type = product.get("fit_type", "Regular")
        sizes_are_numeric = all(str(s).isdigit() for s in sizes)
        review_bias = random.choice(["true_to_size", "runs_large", "runs_small"])
        brand_map[brand] = {
            "brand": brand,
            "fit_type": fit_type,
            "product_type": "footwear" if sizes_are_numeric else "apparel",
            "review_bias": review_bias,
            "size_chart": _generate_size_chart(sizes, "footwear" if sizes_are_numeric else "apparel", fit_type),
        }
    return list(brand_map.values())


async def seed_db(db):
    products = build_products()
    brands = build_brands(products)
    existing_count = await db.products.count_documents({})
    if existing_count == 0:
        await db.products.insert_many(products)
    else:
        for product in products:
            await db.products.replace_one(
                {"id": product["id"]},
                product,
                upsert=True,
            )
    existing_brand_count = await db.brands.count_documents({})
    if existing_brand_count == 0:
        await db.brands.insert_many(brands)
    else:
        for brand in brands:
            await db.brands.replace_one({"brand": brand["brand"]}, brand, upsert=True)

    # Always re-seed reviews to ensure 5 Tops have negative reviews
    await db.reviews.delete_many({})
    products_from_db = await db.products.find({}, {"_id": 0}).to_list(200)
    await db.reviews.insert_many(build_reviews(products_from_db))
    for u in build_users():
        existing = await db.users.find_one({"email": u["email"]})
        if not existing:
            await db.users.insert_one(u)
        else:
            await db.users.update_one({"email": u["email"]}, {"$set": {
                "name": u.get("name"),
                "password_hash": u.get("password_hash"),
                "role": u.get("role", "customer"),
                "fit_profile_done": u.get("fit_profile_done", True),
            }})

    # --- Demo orders for Ops dashboard and Trust Recovery ---
    if await db.orders.count_documents({}) == 0:
        products = await db.products.find({}, {"_id": 0}).to_list(200)
        users = await db.users.find({}, {"_id": 0}).to_list(200)
        if not products or not users:
            return
        rng = random.Random(99)
        now = datetime.now(timezone.utc)
        demo_orders = []
        order_seq = 1000
        existing_ids = {doc["id"] for doc in await db.orders.find({"id": {"$regex": r"^OD\d+$"}}, {"_id": 0, "id": 1}).to_list(1000) if doc.get("id")}

        def next_order_id():
            nonlocal order_seq
            while f"OD{order_seq}" in existing_ids:
                order_seq += 1
            oid = f"OD{order_seq}"
            existing_ids.add(oid)
            order_seq += 1
            return oid

        def make_item(prod):
            return {
                "product_id": prod["id"],
                "name": prod.get("name"),
                "brand": prod.get("brand"),
                "image": prod.get("image") or prod.get("image_url") or (prod.get("images") or [None])[0],
                "price": prod.get("price"),
                "size": (prod.get("sizes") or [None])[0],
                "qty": 1,
                "warehouse": prod.get("warehouse"),
            }

        # 5 Pending PackGuard orders (status packed, packguard pending)
        for i in range(5):
            p = rng.choice(products)
            u = rng.choice(users)
            oid = next_order_id()
            demo_orders.append({
                "id": oid,
                "user_id": u.get("id"),
                "items": [make_item(p)],
                "address": (u.get("addresses") or [])[0] if u.get("addresses") else {},
                "status": "packed",
                "packguard": {"status": "pending"},
                "dispatch_blocked": True,
                "created_at": (now - timedelta(minutes=30 + i)).isoformat(),
            })

        # 3 AI Verified orders
        for i in range(3):
            p = rng.choice(products)
            u = rng.choice(users)
            oid = next_order_id()
            demo_orders.append({
                "id": oid,
                "user_id": u.get("id"),
                "items": [make_item(p)],
                "address": (u.get("addresses") or [])[0] if u.get("addresses") else {},
                "status": "packed",
                "packguard": {"status": "verified", "final_status": "AI_VERIFIED", "verified_at": now.isoformat(), "dispatch_enabled": True},
                "dispatch_blocked": False,
                "created_at": (now - timedelta(hours=1 + i)).isoformat(),
            })

        # 2 Dispatch Blocked orders (verification failed)
        for i in range(2):
            p = rng.choice(products)
            u = rng.choice(users)
            oid = next_order_id()
            demo_orders.append({
                "id": oid,
                "user_id": u.get("id"),
                "items": [make_item(p)],
                "address": (u.get("addresses") or [])[0] if u.get("addresses") else {},
                "status": "packed",
                "packguard": {"status": "verification_failed", "final_status": "MISMATCH", "dispatch_enabled": False},
                "dispatch_blocked": True,
                "created_at": (now - timedelta(hours=2 + i)).isoformat(),
            })

        # 3 Pending Trust Recovery cases
        for i in range(3):
            p = rng.choice(products)
            u = rng.choice(users)
            oid = next_order_id()
            demo_orders.append({
                "id": oid,
                "user_id": u.get("id"),
                "items": [make_item(p)],
                "address": (u.get("addresses") or [])[0] if u.get("addresses") else {},
                "status": "delivered",
                "return_status": "requested",
                "trust_recovery": {"status": "submitted"},
                "dispatch_blocked": False,
                "created_at": (now - timedelta(days=1, hours=i)).isoformat(),
            })

        # 4 Completed today (delivered today)
        for i in range(4):
            p = rng.choice(products)
            u = rng.choice(users)
            oid = next_order_id()
            demo_orders.append({
                "id": oid,
                "user_id": u.get("id"),
                "items": [make_item(p)],
                "address": (u.get("addresses") or [])[0] if u.get("addresses") else {},
                "status": "delivered",
                "packguard": {"status": "verified", "final_status": "AI_VERIFIED", "verified_at": now.isoformat(), "dispatch_enabled": True},
                "dispatch_blocked": False,
                "created_at": now.isoformat(),
            })

        if demo_orders:
            await db.orders.insert_many(demo_orders)