import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Package, MapPin, Ruler, LogOut, ChevronRight, Heart, Bell, CreditCard, Globe } from "lucide-react";
import api from "../lib/api";
import { Header } from "../components/Header";
import { TrustStrip } from "../components/TrustStrip";
import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("orders");

  useEffect(() => {
    api.get("/orders").then(({ data }) => setOrders(data));
  }, []);

  const TABS = [
    { v: "orders", l: "Orders", icon: Package },
    { v: "addresses", l: "Addresses", icon: MapPin },
    { v: "fit", l: "Fit Profiles", icon: Ruler },
    { v: "settings", l: "Settings", icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-full bg-[#FF3E6C] text-white font-heading font-extrabold text-xl flex items-center justify-center">
            {user?.name?.[0]}
          </div>
          <div>
            <h1 data-testid="profile-name" className="font-heading font-bold text-xl text-[#282C3F]">{user?.name}</h1>
            <p className="text-xs text-[#7E818C]">{user?.email} {user?.phone && `• ${user.phone}`}</p>
          </div>
          <button data-testid="logout-btn" onClick={() => { logout(); navigate("/auth"); }}
            className="ml-auto flex items-center gap-1.5 text-xs font-bold text-[#535766] border border-gray-300 rounded-md px-3 py-2 hover:border-[#FF3E6C] hover:text-[#FF3E6C] transition-colors">
            <LogOut size={14} /> Logout
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide border-b border-gray-100 mb-6">
          {TABS.map(({ v, l, icon: Icon }) => (
            <button key={v} data-testid={`profile-tab-${v}`} onClick={() => setTab(v)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${tab === v ? "border-[#FF3E6C] text-[#FF3E6C]" : "border-transparent text-[#535766]"}`}>
              <Icon size={15} /> {l}
            </button>
          ))}
        </div>

        {tab === "orders" && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <p data-testid="no-orders" className="text-sm text-[#7E818C] py-10 text-center">No orders yet. Start shopping with confidence!</p>
            ) : orders.map((o) => (
              <Link key={o.id} to={`/track/${o.id}`} data-testid={`order-row-${o.id}`}
                className="flex items-center gap-4 border border-gray-200 rounded-xl p-4 hover:border-[#FF3E6C]/50 transition-colors">
                <img src={o.items[0].image} alt="" className="w-14 h-18 rounded-lg object-cover bg-[#F5F5F6]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{o.items[0].brand} {o.items.length > 1 ? `+ ${o.items.length - 1} more` : ""}</p>
                  <p className="text-xs text-[#7E818C] truncate">{o.items[0].name}</p>
                  <p className="text-xs mt-1"><span className={`font-bold uppercase ${o.status === "delivered" ? "text-[#03A685]" : "text-[#FF3E6C]"}`}>{o.status.replace(/_/g, " ")}</span> • ₹{o.total}</p>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </Link>
            ))}
          </div>
        )}

        {tab === "addresses" && (
          <div className="grid md:grid-cols-2 gap-3">
            {user?.addresses?.map((a) => (
              <div key={a.id} data-testid={`profile-address-${a.label.toLowerCase()}`} className="border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-bold">{a.receiver} <span className="text-[10px] bg-[#F5F5F6] rounded px-2 py-0.5 ml-1 uppercase font-semibold text-[#535766]">{a.label}</span></p>
                <p className="text-xs text-[#7E818C] mt-1">{a.line1}, {a.city}, {a.state} — {a.pin}</p>
                <p className="text-xs text-[#7E818C] mt-0.5">{a.phone}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "fit" && (
          <div className="grid md:grid-cols-2 gap-3">
            {user?.fit_profiles?.map((f) => (
              <div key={f.id} data-testid={`profile-fit-${f.name.toLowerCase()}`}
                className={`border rounded-xl p-4 ${user.active_fit_profile === f.id ? "border-[#FF3E6C] bg-[#FF3E6C]/[0.03]" : "border-gray-200"}`}>
                <p className="text-sm font-bold flex items-center gap-2"><Ruler size={14} className="text-[#FF3E6C]" /> {f.name} {user.active_fit_profile === f.id && <span className="text-[10px] text-[#FF3E6C] uppercase font-bold">Active</span>}</p>
                <p className="text-xs text-[#7E818C] mt-1">{f.height_cm}cm • {f.weight_kg}kg • {f.body_shape} • {f.preferred_fit} fit</p>
              </div>
            ))}
            {(!user?.fit_profiles || user.fit_profiles.length === 0) && (
              <Link to="/fit-setup" data-testid="create-fit-profile-link" className="border border-dashed border-gray-300 rounded-xl p-4 text-sm text-[#FF3E6C] font-semibold text-center">+ Create Fit Profile</Link>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-3 max-w-md">
            {[{ icon: Heart, l: "Wishlist", to: "/wishlist" }, { icon: Bell, l: "Notifications", to: "/notifications" }, { icon: CreditCard, l: "Saved Payments", to: null }, { icon: Globe, l: "Language: English", to: null }].map(({ icon: Icon, l, to }) => (
              to ? (
                <Link key={l} to={to} className="flex items-center gap-3 border border-gray-200 rounded-xl p-4 text-sm font-semibold text-[#282C3F] hover:border-[#FF3E6C]/50 transition-colors">
                  <Icon size={16} className="text-[#535766]" /> {l} <ChevronRight size={16} className="ml-auto text-gray-400" />
                </Link>
              ) : (
                <div key={l} className="flex items-center gap-3 border border-gray-200 rounded-xl p-4 text-sm font-semibold text-[#7E818C]">
                  <Icon size={16} /> {l}
                </div>
              )
            ))}
          </div>
        )}
      </main>
      <TrustStrip />
    </div>
  );
}
