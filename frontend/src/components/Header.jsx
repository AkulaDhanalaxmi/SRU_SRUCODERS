import { Link, useNavigate } from "react-router-dom";
import { Search, Heart, ShoppingBag, User, Bell } from "lucide-react";
import { useState } from "react";
import { useShop } from "../context/ShopContext";

const NAV = ["Women", "Men", "Kids", "Beauty", "Home", "Studio"];

export const Header = () => {
  const navigate = useNavigate();
  const { cartCount, wishlist } = useShop();
  const [q, setQ] = useState("");

  const submitSearch = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/products?search=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center gap-4">
        <Link to="/" data-testid="header-logo" className="flex items-center gap-1 shrink-0">
          <span className="font-heading font-extrabold text-xl text-[#FF3E6C]">Buy</span>
          <span className="font-heading font-extrabold text-xl text-[#282C3F]">Ready</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 ml-4">
          {NAV.map((n) => (
            <Link
              key={n}
              to={n === "Women" || n === "Men" || n === "Beauty" ? `/products?gender=${n}` : "/products"}
              data-testid={`nav-${n.toLowerCase()}`}
              className="text-sm font-semibold text-[#282C3F] uppercase tracking-wide hover:text-[#FF3E6C] border-b-2 border-transparent hover:border-[#FF3E6C] py-1 transition-colors"
            >
              {n}
            </Link>
          ))}
        </nav>
        <form onSubmit={submitSearch} className="flex-1 max-w-md ml-auto hidden sm:block">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              data-testid="search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search for products, brands and more"
              className="w-full bg-[#F5F5F6] rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#FF3E6C]"
            />
          </div>
        </form>
        <div className="flex items-center gap-4 ml-auto sm:ml-0">
          <Link to="/notifications" data-testid="header-notifications" className="flex flex-col items-center text-[#282C3F] hover:text-[#FF3E6C] transition-colors">
            <Bell size={20} />
            <span className="text-[10px] font-semibold hidden md:block">Alerts</span>
          </Link>
          <Link to="/profile" data-testid="header-profile" className="flex flex-col items-center text-[#282C3F] hover:text-[#FF3E6C] transition-colors">
            <User size={20} />
            <span className="text-[10px] font-semibold hidden md:block">Profile</span>
          </Link>
          <Link to="/wishlist" data-testid="header-wishlist" className="relative flex flex-col items-center text-[#282C3F] hover:text-[#FF3E6C] transition-colors">
            <Heart size={20} />
            {wishlist.length > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-[#FF3E6C] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{wishlist.length}</span>
            )}
            <span className="text-[10px] font-semibold hidden md:block">Wishlist</span>
          </Link>
          <Link to="/bag" data-testid="header-bag" className="relative flex flex-col items-center text-[#282C3F] hover:text-[#FF3E6C] transition-colors">
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-[#FF3E6C] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{cartCount}</span>
            )}
            <span className="text-[10px] font-semibold hidden md:block">Bag</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
