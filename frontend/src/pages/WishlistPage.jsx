import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Heart, ShoppingBag, X } from "lucide-react";
import api from "../lib/api";
import { Header } from "../components/Header";
import { TrustStrip } from "../components/TrustStrip";
import { useShop } from "../context/ShopContext";

export default function WishlistPage() {
  const { toggleWishlist, addToCart, wishlist } = useShop();
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get("/me/wishlist").then(({ data }) => setItems(data));
  }, [wishlist.length]);

  const moveToBag = async (p) => {
    await addToCart(p.id, p.sizes?.[2] || null, 1);
    await toggleWishlist(p.id);
    toast.success("Moved to bag");
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="font-heading font-bold text-xl text-[#282C3F] mb-6">My Wishlist {items && <span className="text-sm font-normal text-[#7E818C]">({items.length} items)</span>}</h1>
        {!items ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[3/4] bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <div data-testid="empty-wishlist" className="text-center py-24">
            <Heart size={48} className="mx-auto text-gray-300" />
            <p className="font-heading font-bold text-lg text-[#282C3F] mt-4">Your wishlist is empty</p>
            <p className="text-sm text-[#7E818C] mt-1">Save items you love and buy them when you're ready.</p>
            <Link to="/products" data-testid="wishlist-shop-now" className="inline-block mt-6 bg-[#FF3E6C] text-white font-bold px-8 py-3 rounded-md text-sm uppercase">Shop Now</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {items.map((p) => (
              <div key={p.id} data-testid={`wishlist-item-${p.id}`} className="border border-gray-200 rounded-lg overflow-hidden group">
                <div className="relative aspect-[3/4] bg-[#F5F5F6]">
                  <Link to={`/product/${p.id}`}><img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" /></Link>
                  <button data-testid={`wishlist-remove-${p.id}`} onClick={() => toggleWishlist(p.id)}
                    className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow hover:scale-110 transition-transform">
                    <X size={14} className="text-[#535766]" />
                  </button>
                </div>
                <div className="p-3">
                  <p className="font-heading font-bold text-sm truncate">{p.brand}</p>
                  <p className="text-xs text-[#7E818C] truncate">{p.name}</p>
                  <p className="text-sm font-bold mt-1">₹{p.price} <span className="text-xs text-[#FF905A] font-semibold">({p.discount}% OFF)</span></p>
                  <button data-testid={`move-to-bag-${p.id}`} onClick={() => moveToBag(p)}
                    className="w-full mt-3 border border-[#FF3E6C] text-[#FF3E6C] font-bold text-xs uppercase py-2 rounded flex items-center justify-center gap-1.5 hover:bg-[#FF3E6C] hover:text-white transition-colors">
                    <ShoppingBag size={13} /> Move to Bag
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <TrustStrip />
    </div>
  );
}
