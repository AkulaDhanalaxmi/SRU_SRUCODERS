import { Info, ShieldCheck, MapPin, Factory } from "lucide-react";

// ---- deterministic helpers (same product always shows the same derived values) ----
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function pick(seed, arr) {
  return arr[hash(seed) % arr.length];
}

const MATERIAL_MAP = {
  Cotton: "100% Pure Cotton",
  "Silk Blend": "Silk Blend (Silk + Polyester)",
  Georgette: "Georgette (Polyester based)",
  Polyester: "100% Polyester",
  Denim: "Cotton Denim",
  Synthetic: "Synthetic Blend",
  "N/A": "Not Applicable",
};

const CARE_MAP = {
  Cotton: "Machine wash cold with like colours. Do not bleach. Tumble dry low. Warm iron if needed.",
  "Silk Blend": "Dry clean only. Do not wring or twist. Iron on reverse at low heat.",
  Georgette: "Dry clean recommended. Hand wash separately in cold water for touch-ups.",
  Polyester: "Machine washable in cold water. Do not iron directly on print/embellishment.",
  Denim: "Machine wash inside-out in cold water. Wash separately for first few washes.",
  Synthetic: "Wipe clean / hand wash recommended. Avoid direct heat.",
  "N/A": "Refer to product packaging for usage instructions.",
};

const PATTERNS = ["Solid", "Printed", "Embroidered", "Striped", "Floral Print", "Textured Weave", "Woven Design"];
const SLEEVE_NECK = [
  "Three-Quarter Sleeves, Round Neck",
  "Full Sleeves, Mandarin Collar",
  "Sleeveless, V-Neck",
  "Half Sleeves, Round Neck",
  "Puff Sleeves, Square Neck",
  "Regular Sleeves, Collared Neck",
];
const SLEEVE_APPLICABLE_CATEGORIES = ["Kurtas", "Tops", "Dresses", "Men"];

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-semibold text-[#7E818C] shrink-0 w-[38%]">{label}</span>
      <span className="text-xs text-[#282C3F] text-right flex-1">{value}</span>
    </div>
  );
}

export default function ProductDetailsSection({ product }) {
  if (!product) return null;

  const material = MATERIAL_MAP[product.fabric] || product.fabric || "As per product";
  const care = CARE_MAP[product.fabric] || "Follow standard garment care instructions.";
  const pattern = pick(`${product.id}-pattern`, PATTERNS);
  const showSleeveNeck = SLEEVE_APPLICABLE_CATEGORIES.includes(product.category);
  const sleeveNeck = showSleeveNeck ? pick(`${product.id}-sleeve`, SLEEVE_NECK) : null;
  const countryOfOrigin = "India";
  const manufacturer = `${product.brand} Fashions Pvt. Ltd., India`;
  const seller = product.seller;

  return (
    <section data-testid="product-details-section" className="mt-8 pt-8 border-t border-gray-100">
      <h2 className="flex items-center gap-2 font-heading font-bold text-lg text-[#282C3F] mb-4">
        <Info size={18} className="text-[#FF3E6C]" /> Product Details
      </h2>

      <div className="border border-gray-200 rounded-xl p-4">
        <Row label="Material" value={material} />
        <Row label="Fabric" value={product.fabric} />
        <Row label="Fit" value={product.fit_type} />
        <Row label="Pattern" value={pattern} />
        {showSleeveNeck && <Row label="Sleeve / Neck" value={sleeveNeck} />}
        <Row label="Care Instructions" value={care} />
        <Row label="Country of Origin" value={countryOfOrigin} />
        <Row label="Manufacturer" value={manufacturer} />
      </div>

      {seller && (
        <div data-testid="seller-information-card" className="border border-gray-200 rounded-xl p-4 mt-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#535766] mb-3">
            <Factory size={13} /> Seller Information
          </p>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#282C3F]">{seller.name}</p>
              <p className="flex items-center gap-1 text-xs text-[#7E818C] mt-1">
                <ShieldCheck size={12} className="text-[#03A685]" /> {seller.years} years on platform
              </p>
              <p className="flex items-center gap-1 text-xs text-[#7E818C] mt-1">
                <MapPin size={12} /> Ships from {product.warehouse}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="bg-[#03A685] text-white text-xs font-extrabold rounded px-2 py-1">{seller.rating}★</span>
              <p className="text-[10px] text-[#7E818C] mt-1.5">Only {seller.return_rate}% returns</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
