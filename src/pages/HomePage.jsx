import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  PackageCheck,
  Truck,
  RotateCcw,
  Ruler,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

import api from "../lib/api";
import { Header } from "../components/Header";
import { TrustStrip } from "../components/TrustStrip";

const CATEGORIES = [
  { name: "Tops", img: "/products/tops.jpg" },
  { name: "Sarees", img: "/products/saree.jpg" },
  { name: "Dresses", img: "/products/dress.png" },
  { name: "Lehengas", img: "/products/lehengas.jpg" },
  { name: "Footwear", img: "/products/footwear.jpg" },
  { name: "Beauty", img: "/products/beauty.jpg" },
  { name: "Denim", img: "/products/Denim.webp" },
  { name: "Shirt", img: "/products/Shirt.webp" },
  { name: "Sunglasses", img: "/products/Sunglasses.webp" },
  { name: "Tshirt", img: "/products/Tshirt.webp" },
  { name: "Handbag", img: "/products/Handbag.jpeg" },
  { name: "Kids", img: "/products/kids.jpg" },
];

const EXCLUDED_TOP_PICKS = ["Printed Wrap Top", "Pleated Sleeve Blouse"];

const AI_FEATURES = [
  {
    icon: Ruler,
    title: "AI Size Recommendation",
    sub: "Perfect fit for you",
    from: "#FFFFFF",
    to: "#FDE3EC",
    color: "#E01870",
  },
  {
    icon: ShieldCheck,
    title: "Trust Score",
    sub: "Verified sellers & products",
    from: "#4F8EF7",
    to: "#1552B0",
    color: "#FFFFFF",
  },
  {
    icon: PackageCheck,
    title: "PackGuard Protected",
    sub: "Verified before shipping",
    from: "#F2E9FF",
    to: "#E3D0FF",
    color: "#6B21D8",
  },
  {
    icon: Truck,
    title: "Delivery Confidence",
    sub: "On-time delivery insights",
    from: "#FFFFFF",
    to: "#E6F9EE",
    color: "#16A34A",
  },
  {
    icon: RotateCcw,
    title: "Easy Returns",
    sub: "Hassle-free returns",
    from: "#FFF1E6",
    to: "#FFE0C2",
    color: "#D9700F",
  },
];

const TopPickProductCard = ({ product }) => {
  const [imageBroken, setImageBroken] = useState(false);
  const primaryImage = product.images?.[0] || product.image || product.image_url || "";
  const matchScore = Math.min(100, Math.max(55, Math.round(product.size_accuracy ?? (product.rating ? product.rating * 20 : 90))));
  const matchLabel = matchScore >= 85 ? "Great fit" : matchScore >= 70 ? "Good fit" : "Review fit";

  if (!primaryImage || imageBroken) {
    return null;
  }

  return (
    <Link
      key={product.id}
      to={`/product/${product.id}`}
      className="group overflow-hidden rounded-[18px] border border-[#F0F0F1] bg-white shadow-sm hover:shadow-md transition"
    >
      <div className="relative aspect-square bg-[#F5F5F6] overflow-hidden">
        <img
          src={primaryImage}
          alt={product.name}
          loading="lazy"
          onError={() => setImageBroken(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 rounded-full bg-gradient-to-r from-[#FF8FAB] to-[#FF3E6C] px-3 py-1 text-[10px] font-bold text-white shadow-[0_6px_20px_rgba(255,62,108,0.18)]">
          {matchScore}% AI Match
        </div>
        <div className="absolute bottom-3 left-3 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-[#ff3f6c] shadow-sm">
          {product.rating?.toFixed(1) || "4.0"} ★
        </div>
      </div>
      <div className="p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7E818C]">{product.brand}</p>
        <p className="mt-2 text-sm font-semibold text-[#282C3F] truncate">{product.name}</p>
        <p className="mt-2 text-xs font-semibold text-[#FF3E6C]">{matchLabel} for your profile</p>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-extrabold text-[#282C3F]">₹{product.price}</span>
          {product.discount != null && (
            <span className="text-xs font-semibold text-[#FF905A]">{product.discount}% OFF</span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default function HomePage() {
  const [topPicksProducts, setTopPicksProducts] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/products", { params: { category: "Tops", limit: 10, sort: "rating" } }),
      api.get("/products", { params: { category: "Dresses", limit: 6, sort: "rating" } }),
      api.get("/products", { params: { category: "Kurtas", limit: 4, sort: "rating" } }),
    ]).then(([topsRes, dressesRes, kurtasRes]) => {
      const rawProducts = [...(topsRes.data || []), ...(dressesRes.data || []), ...(kurtasRes.data || [])];
      const filtered = rawProducts.filter((product) => !EXCLUDED_TOP_PICKS.includes(product.name));
      setTopPicksProducts(filtered);
    });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Full Width Banner */}
      <div
        data-testid="home-banner"
        className="w-full px-6 lg:px-8 mt-5"
      >
        <div className="relative w-full h-[280px] rounded-3xl overflow-hidden shadow-lg">
          <img
            src="/products/homebanner.png"
            alt="BuyReady Banner"
            className="absolute inset-0 w-full h-full object-cover object-[55%]"
          />
        </div>
      </div>

      <main className="w-full">
        {/* BuyReady AI trust strip */}
        <section className="w-full px-4 md:px-6 lg:px-8 mt-4 rounded-none border-b border-[#F5F5F6] bg-white shadow-sm py-3 flex flex-wrap items-center gap-8">
          <div className="flex flex-col items-start pr-6 border-r border-[#F5F5F6] shrink-0">
            <div className="flex items-center gap-2">
              <div
                className="rounded-xl p-2"
                style={{ backgroundImage: "linear-gradient(135deg, #FF6FA0, #E01870)" }}
              >
                <ShieldCheck size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#282C3F] leading-tight">
                  BuyReady <span className="text-[#FF3E6C]">AI</span>
                </p>
                <p className="text-[10px] text-[#94969F] leading-tight">Shop with Total Confidence</p>
              </div>
            </div>
            <button className="mt-1.5 ml-1 text-[10px] font-bold text-[#FF3E6C] flex items-center gap-1 hover:underline">
              <Sparkles size={10} /> How It Works
            </button>
          </div>

          <div className="flex flex-1 justify-evenly">
            {AI_FEATURES.map(({ icon: Icon, title, sub, from, to, color }) => (
              <div key={title} className="flex items-center gap-2.5 min-w-[150px]">
                <div className="relative shrink-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
                  >
                    <Icon size={16} style={{ color }} strokeWidth={2.25} />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full">
                    <CheckCircle2 size={13} className="text-[#03A685] fill-white" strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#282C3F] leading-tight">{title}</p>
                  <p className="text-[10px] text-[#94969F] leading-tight">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Shop by Category */}
        <section className="w-full px-4 md:px-6 lg:px-8 pt-3 pb-2">
          <h2 className="font-heading font-bold text-lg text-[#282C3F] uppercase tracking-wide mb-4">Shop by Category</h2>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3 md:gap-4">
            {CATEGORIES.map((c) => (
              <Link key={c.name} to={`/products?category=${c.name}`} data-testid={`category-${c.name.toLowerCase()}`} className="group text-center">
                <div className="w-14 h-14 md:w-16 md:h-16 mx-auto rounded-full overflow-hidden bg-[#F5F5F6] ring-1 ring-[#F0F0F1]">
                  <img src={c.img} alt={c.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <p className="text-[11px] font-semibold text-[#535766] mt-2">{c.name}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Top Picks For You */}
        <section className="w-full px-4 md:px-6 lg:px-8 pt-8 pb-6">
          <div className="mb-4">
            <h2 className="font-heading font-bold text-lg text-[#282C3F] uppercase tracking-wide">Top Picks for You</h2>
          </div>
          {!topPicksProducts.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="animate-pulse rounded-[18px] border border-[#F0F0F1] bg-white p-4 h-72" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {topPicksProducts.map((product) => (
                <TopPickProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </main>
      <TrustStrip />
    </div>
  );
}