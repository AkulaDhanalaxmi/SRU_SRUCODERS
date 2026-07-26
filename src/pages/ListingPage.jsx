import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { Header } from "../components/Header";
import { TrustStrip } from "../components/TrustStrip";
import { ProductCard } from "../components/ProductCard";

// UI categories by gender
const CATEGORY_MAP = {
  Women: ["Kurtas", "Sarees", "Lehengas", "Dresses", "Tops", "Jeans", "Footwear"],
  Men: ["Shirts"],
  Kids: ["Kids Clothing"],
  Beauty: ["Makeup", "Skincare", "Haircare"],
};

const DEFAULT_CATEGORIES = ["Kurtas", "Sarees", "Lehengas", "Dresses", "Tops", "Jeans", "Footwear", "Beauty"];

// Translate UI category labels to backend category keys (frontend-only mapping)
const UI_TO_BACKEND_CATEGORY = {
  Shirts: "Men",
  "Kids Clothing": "Kids",
  Makeup: "Beauty",
  Skincare: "Beauty",
  Haircare: "Beauty",
};

const SORTS = [
  { v: "", l: "Relevance" },
  { v: "rating", l: "Rating" },
  { v: "price_asc", l: "Price: Low to High" },
  { v: "price_desc", l: "Price: High to Low" },
  { v: "newest", l: "Newest" },
];
export default function ListingPage() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState(null);
  const category = params.get("category") || "";
  const gender = params.get("gender") || "";
  const search = params.get("search") || "";
  const sort = params.get("sort") || "";
  const minPrice = params.get("min_price") ? Number(params.get("min_price")) : undefined;
  const maxPrice = params.get("max_price") ? Number(params.get("max_price")) : undefined;
  const colorFilter = params.get("color") || "";
  const occasion = params.get("occasion") || "";

  const categoryOptions = gender in CATEGORY_MAP ? CATEGORY_MAP[gender] : DEFAULT_CATEGORIES;

  const filteredProducts = useMemo(() => {
    if (!products) return null;
    return products.filter((p) => {
      // Hide specific products from Women > Tops as requested
      const HIDE_BRANDS_FOR_WOMEN_TOPS = ["H&M", "Forever 21"];
      const HIDE_NAME_SUBSTRINGS = ["Pleated Sleeve", "Lace Trim", "Pleated"];
      if (gender === "Women" && category === "Tops") {
        const HIDE_TOPS_NAME_SUBSTRINGS = ["Sports Stripe Tee"];
        if (HIDE_BRANDS_FOR_WOMEN_TOPS.includes(p.brand)) return false;
        if (p.name && HIDE_NAME_SUBSTRINGS.some((sub) => p.name.includes(sub))) return false;
        if (p.name && HIDE_TOPS_NAME_SUBSTRINGS.some((sub) => p.name.includes(sub))) return false;
      }
      // Hide specific products from Lehenga section (UI category "Lehengas") only
      const HIDE_LEHENGA_BRANDS = ["Chhabra 555", "Chhabra", "Shubhkala", "Shubhkhala", "Shubh" ];
      const HIDE_LEHENGA_NAME_SUBSTRINGS = ["Lehenga Choli", "Party Lehenga", "Georgette Party Lehenga", "Zari Woven Lehenga"];
      if (category === "Lehengas") {
        if (p.brand && HIDE_LEHENGA_BRANDS.some((b) => p.brand.includes(b))) return false;
        if (p.name && HIDE_LEHENGA_NAME_SUBSTRINGS.some((sub) => p.name.includes(sub))) return false;
      }
      // Hide specific product shown in Dresses (image provided)
      const HIDE_DRESSES_BRANDS = ["ONLY"];
      const HIDE_DRESSES_NAME_SUBSTRINGS = ["Bodycon Party Dress", "Bodycon Party"];
      if (category === "Dresses") {
        if (p.brand && HIDE_DRESSES_BRANDS.some((b) => p.brand.includes(b))) return false;
        if (p.name && HIDE_DRESSES_NAME_SUBSTRINGS.some((sub) => p.name.includes(sub))) return false;
      }

      // Hide specific product from Kurtas (remove shown Biba kurta)
      const HIDE_KURTA_BRANDS = ["Biba"];
      const HIDE_KURTA_NAME_SUBSTRINGS = ["Cotton Yoke Design Kurta Set", "Yoke Design Kurta"];
      if (category === "Kurtas") {
        if (p.brand && HIDE_KURTA_BRANDS.some((b) => p.brand.includes(b))) return false;
        if (p.name && HIDE_KURTA_NAME_SUBSTRINGS.some((sub) => p.name.includes(sub))) return false;
      }
      if (minPrice != null && p.price < minPrice) return false;
      if (maxPrice != null && p.price > maxPrice) return false;
      if (colorFilter && !p.colors?.some((c) => c.toLowerCase() === colorFilter.toLowerCase())) return false;
      if (occasion === "event") {
        return ["Sarees", "Lehengas", "Kurtas", "Dresses"].includes(p.category);
      }
      return true;
    });
  }, [products, minPrice, maxPrice, colorFilter, occasion]);
  useEffect(() => {
    setProducts(null);
    const apiCategory = category ? (UI_TO_BACKEND_CATEGORY[category] || category) : undefined;
    api
      .get("/products", {
        params: {
          category: apiCategory || undefined,
          gender: gender || undefined,
          search: search || undefined,
          sort: sort || (category === "Tops" ? "rating" : undefined),
          limit: 1000,
        },
      })
      .then(({ data }) => setProducts(data))
      .catch(() => setProducts([]));
  }, [category, gender, search, sort, minPrice, maxPrice, colorFilter, occasion]);

  const setParam = (k, v) => {
    const p = new URLSearchParams(params);
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
    else p.delete(k);
    setParams(p);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="w-full px-6 lg:px-10 xl:px-12 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <h1 className="font-heading font-bold text-xl text-[#282C3F]">
            {search ? `Results for "${search}"` : category || gender || "All Products"}
            {filteredProducts && <span className="text-sm font-normal text-[#7E818C] ml-2">({filteredProducts.length} items)</span>}
          </h1>
          <select data-testid="sort-select" value={sort} onChange={(e) => setParam("sort", e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm outline-none bg-white">
            {SORTS.map((s) => <option key={s.v} value={s.v} label={`Sort: ${s.l}`} />)}
          </select>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-5 border-b border-gray-100">
          <button data-testid="filter-all" onClick={() => setParam("category", "")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${!category ? "bg-[#282C3F] text-white border-[#282C3F]" : "border-gray-300 text-[#535766]"}`}>All</button>
          {categoryOptions.map((c) => (
            <button key={c} data-testid={`filter-${c.toLowerCase()}`} onClick={() => setParam("category", c)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${category === c ? "bg-[#282C3F] text-white border-[#282C3F]" : "border-gray-300 text-[#535766] hover:border-[#282C3F]"}`}>{c}</button>
          ))}
        </div>

        {!products ? (
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse"><div className="aspect-[3/4] bg-gray-100 rounded-lg" /><div className="h-3 bg-gray-100 rounded mt-3 w-2/3" /><div className="h-3 bg-gray-100 rounded mt-2 w-1/2" /></div>
            ))}
          </div>
        ) : filteredProducts?.length === 0 ? (
          <div data-testid="empty-listing" className="text-center py-20 text-[#7E818C]">
            <p className="font-heading font-bold text-lg text-[#282C3F]">No products found</p>
            <p className="text-sm mt-1">Try a different category or search term.</p>
          </div>
        ) : (
          <div data-testid="product-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {filteredProducts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </main>
      <TrustStrip />
    </div>
  );
}
