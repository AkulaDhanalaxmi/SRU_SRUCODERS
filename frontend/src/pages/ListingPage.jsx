import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { Header } from "../components/Header";
import { TrustStrip } from "../components/TrustStrip";
import { ProductCard } from "../components/ProductCard";

const CATEGORIES = ["Kurtas", "Sarees", "Lehengas", "Dresses", "Tops", "Jeans", "Footwear", "Men", "Beauty"];
const SORTS = [{ v: "", l: "Popularity" }, { v: "price_asc", l: "Price: Low to High" }, { v: "price_desc", l: "Price: High to Low" }, { v: "rating", l: "Rating" }];

export default function ListingPage() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState(null);
  const category = params.get("category") || "";
  const gender = params.get("gender") || "";
  const search = params.get("search") || "";
  const sort = params.get("sort") || "";

  useEffect(() => {
    setProducts(null);
    api.get("/products", { params: { category: category || undefined, gender: gender || undefined, search: search || undefined, sort: sort || undefined } })
      .then(({ data }) => setProducts(data));
  }, [category, gender, search, sort]);

  const setParam = (k, v) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    setParams(p);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="w-full">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <h1 className="font-heading font-bold text-xl text-[#282C3F]">
            {search ? `Results for "${search}"` : category || gender || "All Products"}
            {products && <span className="text-sm font-normal text-[#7E818C] ml-2">({products.length} items)</span>}
          </h1>
          <select data-testid="sort-select" value={sort} onChange={(e) => setParam("sort", e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm outline-none bg-white">
            {SORTS.map((s) => <option key={s.v} value={s.v}>Sort: {s.l}</option>)}
          </select>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-5 border-b border-gray-100">
          <button data-testid="filter-all" onClick={() => setParam("category", "")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${!category ? "bg-[#282C3F] text-white border-[#282C3F]" : "border-gray-300 text-[#535766]"}`}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c} data-testid={`filter-${c.toLowerCase()}`} onClick={() => setParam("category", c)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${category === c ? "bg-[#282C3F] text-white border-[#282C3F]" : "border-gray-300 text-[#535766] hover:border-[#282C3F]"}`}>{c}</button>
          ))}
        </div>

        {!products ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse"><div className="aspect-[3/4] bg-gray-100 rounded-lg" /><div className="h-3 bg-gray-100 rounded mt-3 w-2/3" /><div className="h-3 bg-gray-100 rounded mt-2 w-1/2" /></div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div data-testid="empty-listing" className="text-center py-20 text-[#7E818C]">
            <p className="font-heading font-bold text-lg text-[#282C3F]">No products found</p>
            <p className="text-sm mt-1">Try a different category or search term.</p>
          </div>
        ) : (
          <div data-testid="product-grid" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
        </div>
      </main>
      <TrustStrip />
    </div>
  );
}
