import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import { useShop } from "../context/ShopContext";

export const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { wishlist, toggleWishlist } = useShop();
  const [imageBroken, setImageBroken] = useState(false);
  const wished = wishlist.includes(product.id);
  const primaryImage = product.images?.[0] || product.image || product.image_url || "";

  if (!primaryImage || imageBroken) {
    return null;
  }

  return (
    <div
      data-testid={`product-card-${product.id}`}
      onClick={() => navigate(`/product/${product.id}`)}
      className="group cursor-pointer bg-white rounded-lg overflow-hidden border border-transparent hover:border-gray-200 hover:shadow-[0_2px_8px_rgba(40,44,63,0.08)] transition-shadow"
    >
      <div className="relative h-64 bg-[#F5F5F6] overflow-hidden">
        <img
          src={primaryImage}
          alt={product.name}
          loading="lazy"
          onError={() => setImageBroken(true)}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
        />
        <button
          data-testid={`wishlist-toggle-${product.id}`}
          onClick={(e) => { e.stopPropagation(); toggleWishlist(product.id); }}
          className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-sm hover:scale-110 transition-transform"
        >
          <Heart size={16} className={wished ? "fill-[#FF3E6C] text-[#FF3E6C]" : "text-[#535766]"} />
        </button>
        <div className="absolute bottom-2 left-2 bg-white/95 rounded px-1.5 py-0.5 flex items-center gap-1 text-xs font-semibold shadow-sm">
          {product.rating} <Star size={10} className="fill-[#03A685] text-[#03A685]" />
          <span className="text-gray-400 font-normal">| {product.rating_count > 1000 ? `${(product.rating_count / 1000).toFixed(1)}k` : product.rating_count}</span>
        </div>
      </div>
      <div className="p-3">
        <p className="font-heading font-bold text-sm text-[#282C3F] truncate">{product.brand}</p>
        <p className="text-xs text-[#7E818C] truncate mt-0.5">{product.name}</p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className="text-sm font-bold text-[#282C3F]">₹{product.price}</span>
          <span className="text-xs text-[#7E818C] line-through">₹{product.mrp}</span>
          <span className="text-xs font-semibold text-[#FF905A]">({product.discount}% OFF)</span>
        </div>
      </div>
    </div>
  );
};
