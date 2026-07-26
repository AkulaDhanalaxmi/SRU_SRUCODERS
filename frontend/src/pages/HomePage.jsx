import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Sparkles,
  ShieldCheck,
  PackageCheck,
  Truck,
  RotateCcw,
  Ruler,
} 

from "lucide-react";
import homeBannerImg from "../products/homebanner.png"; // adjust path to wherever it actually is
import topsImg from "../products/tops.jpg";
import sareeImg from "../products/saree.jpg";
import dressImg from "../products/dress.png";
import lehengasImg from "../products/lehengas.jpg";
import footwearImg from "../products/footwear.jpg";
import beautyImg from "../products/beauty.jpg";
import api from "../lib/api";
import { Header } from "../components/Header";
import { TrustStrip } from "../components/TrustStrip";
import { ProductCard } from "../components/ProductCard";
import { useAuth } from "../context/AuthContext";

const BANNERS = [
  {
    img: "homebanner.png",
    tag: "NEW ARRIVALS",
    title: "Everyday Style,",
    accent: "Elevated",
    sub: "Comfort, quality & style - handpicked for you",
    link: "/products?category=Dresses",
  },
];
  
   

const CATEGORIES = [
  { name: "Tops", img: topsImg },
  { name: "Sarees", img: sareeImg },
  { name: "Dresses", img: dressImg },
  { name: "Lehengas", img: lehengasImg },
  { name: "Footwear", img: footwearImg },
  { name: "Beauty", img: beautyImg },
];
const AI_FEATURES = [
  { icon: Ruler, title: "AI Size Recommendation", sub: "Perfect fit for you" },
  { icon: ShieldCheck, title: "Trust Score", sub: "Verified sellers & products" },
  { icon: PackageCheck, title: "PackGuard Protected", sub: "Verified before shipping" },
  { icon: Truck, title: "Delivery Confidence", sub: "On-time delivery insights" },
  { icon: RotateCcw, title: "Easy Returns", sub: "Hassle-free returns" },
];

export default function HomePage() {
  const { user } = useAuth();
  const [trending, setTrending] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [banner, setBanner] = useState(0);

  useEffect(() => {
    api.get("/products", { params: { trending: true, limit: 12 } }).then(({ data }) => setTrending(data));
    api.get("/products", { params: { limit: 12, sort: "rating" } }).then(({ data }) => setRecommended(data));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setBanner((b) => (b + 1) % BANNERS.length), 4500);
    return () => clearInterval(t);
  }, []);

  const b = BANNERS[banner];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Banner - Full Width Edge to Edge */}
      <Link to={b.link} data-testid="home-banner" className="block px-4 md:px-8 lg:px-12 mt-2">
        <motion.div
          key={banner}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
         className="relative w-full h-36 md:h-52 lg:h-64 flex bg-gradient-to-r from-[#282C3F] via-[#3d4150] to-[#5a5f6f]"
        >
          <div className="flex-1 flex flex-col justify-center pl-6 md:pl-20 pr-4 z-10">
            <p className="text-[#FF3E6C] text-xs font-bold uppercase tracking-wider w-fit">{b.tag}</p>
            <h2 className="font-heading font-extrabold text-3xl md:text-5xl text-white mt-2 tracking-tight leading-tight">
              {b.title}
              {b.accent && <span className="block text-[#FF3E6C]">{b.accent}</span>}
            </h2>
            <p className="text-gray-300 text-sm md:text-base mt-2">{b.sub}</p>
            <button className="mt-5 bg-[#FF3E6C] text-white text-xs font-bold uppercase tracking-wide rounded-full px-6 py-3 w-fit hover:bg-[#ff1f52] transition-colors">
              Shop Now
            </button>
          </div>
          <div className="hidden sm:block absolute right-0 top-0 w-1/2 md:w-2/5 h-full">
            <img src={b.img} alt={b.title} className="w-full h-full object-cover" />
          </div>
          <div className="absolute bottom-4 left-6 md:left-20 flex gap-1.5 z-10">
            {BANNERS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === banner ? "w-6 bg-[#FF3E6C]" : "w-1.5 bg-white/30"}`} />
            ))}
          </div>
        </motion.div>
      </Link>

      <main className="w-full">
        {/* BuyReady AI trust strip */}
        <section className="w-full px-4 md:px-6 lg:px-8 mt-4 rounded-none border-b border-[#F5F5F6] bg-white shadow-sm py-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2 pr-6 border-r border-[#F5F5F6] shrink-0">
            <div className="bg-[#FFE8EF] rounded-full p-2">
              <Sparkles size={18} className="text-[#FF3E6C]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#282C3F]">
                BuyReady <span className="text-[#FF3E6C]">AI</span>
              </p>
              <p className="text-[10px] text-[#94969F]">Shop with Total Confidence</p>
            </div>
          </div>
          <div className="flex flex-1 flex-wrap justify-between gap-4">
            {AI_FEATURES.map(({ icon: Icon, title, sub }) => (
              <div key={title} className="flex items-center gap-2 min-w-[140px]">
                <Icon size={18} className="text-[#FF3E6C] shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-[#282C3F]">{title}</p>
                  <p className="text-[10px] text-[#94969F]">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Shop by Category */}
        <section className="w-full px-4 md:px-6 lg:px-8 py-10">
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

        {/* Top Picks */}
        <section className="w-full px-4 md:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-lg text-[#282C3F] uppercase tracking-wide flex items-center gap-2">
              <Sparkles size={16} className="text-[#FF3E6C]" /> Top Picks for You
            </h2>
            <Link to="/products" data-testid="view-all-trending" className="text-xs font-bold text-[#FF3E6C] flex items-center">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-6 gap-4">
            {trending.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* Recommended */}
        <section className="w-full px-4 md:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-lg text-[#282C3F] uppercase tracking-wide">
              Recommended for {user?.name?.split(" ")[0] || "You"}
            </h2>
            <Link to="/products" className="text-xs font-bold text-[#FF3E6C] flex items-center">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-6 gap-4">
            {recommended.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </main>
      <TrustStrip />
    </div>
  );
}