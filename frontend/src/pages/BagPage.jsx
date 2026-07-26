import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ShoppingBag, Minus, Plus, Trash2, Tag, ShieldCheck } from "lucide-react";
import api, { apiError } from "../lib/api";
import { Header } from "../components/Header";
import { TrustStrip } from "../components/TrustStrip";
import { useShop } from "../context/ShopContext";

export default function BagPage() {
  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart } = useShop();
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(null);

  const subtotal = cart.reduce((n, i) => n + i.product.price * i.qty, 0);
  const mrpTotal = cart.reduce((n, i) => n + i.product.mrp * i.qty, 0);
  const discount = applied ? Math.floor(subtotal * applied.percent / 100) : 0;
  const total = subtotal - discount;
  const avgConfidence = cart.length ? Math.round(cart.reduce((n, i) => n + i.product.size_accuracy, 0) / cart.length) : 0;

  const applyCoupon = async () => {
    try {
      const { data } = await api.get(`/coupons/${coupon}`);
      setApplied(data);
      toast.success(`Coupon ${data.code} applied — ${data.percent}% off!`);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="font-heading font-bold text-xl text-[#282C3F] mb-6">Shopping Bag <span className="text-sm font-normal text-[#7E818C]">({cart.length} items)</span></h1>
        {cart.length === 0 ? (
          <div data-testid="empty-bag" className="text-center py-24">
            <ShoppingBag size={48} className="mx-auto text-gray-300" />
            <p className="font-heading font-bold text-lg mt-4">Your bag is empty</p>
            <p className="text-sm text-[#7E818C] mt-1">Add items with confidence using BuyReady.</p>
            <Link to="/products" data-testid="bag-shop-now" className="inline-block mt-6 bg-[#FF3E6C] text-white font-bold px-8 py-3 rounded-md text-sm uppercase">Shop Now</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3 space-y-4">
              {cart.map((i) => (
                <div key={`${i.product_id}-${i.size}`} data-testid={`bag-item-${i.product_id}`} className="flex gap-4 border border-gray-200 rounded-xl p-4">
                  <Link to={`/product/${i.product_id}`} className="w-20 h-28 rounded-lg overflow-hidden bg-[#F5F5F6] shrink-0">
                    <img src={i.product.images[0]} alt={i.product.name} className="w-full h-full object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-bold text-sm truncate">{i.product.brand}</p>
                    <p className="text-xs text-[#7E818C] truncate">{i.product.name}</p>
                    {i.size && <p className="text-xs mt-1 font-semibold text-[#535766]">Size: {i.size}</p>}
                    <p className="text-sm font-bold mt-1">₹{i.product.price} <span className="text-xs text-[#7E818C] line-through font-normal">₹{i.product.mrp}</span></p>
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center border border-gray-300 rounded-md">
                        <button data-testid={`qty-minus-${i.product_id}`} onClick={() => addToCart(i.product_id, i.size, -1)} className="p-1.5 hover:bg-gray-50"><Minus size={13} /></button>
                        <span data-testid={`qty-value-${i.product_id}`} className="px-3 text-sm font-semibold">{i.qty}</span>
                        <button data-testid={`qty-plus-${i.product_id}`} onClick={() => addToCart(i.product_id, i.size, 1)} className="p-1.5 hover:bg-gray-50"><Plus size={13} /></button>
                      </div>
                      <button data-testid={`bag-remove-${i.product_id}`} onClick={() => removeFromCart(i.product_id, i.size)} className="text-[#7E818C] hover:text-[#FF3E6C] transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#535766] mb-3 flex items-center gap-1.5"><Tag size={14} /> Coupons</p>
                <div className="flex gap-2">
                  <input data-testid="coupon-input" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Try BUYREADY10"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FF3E6C]" />
                  <button data-testid="apply-coupon-btn" onClick={applyCoupon} className="text-[#FF3E6C] font-bold text-sm px-3 border border-[#FF3E6C] rounded-md hover:bg-[#FF3E6C]/5">Apply</button>
                </div>
                {applied && <p data-testid="coupon-applied" className="text-xs text-[#03A685] font-semibold mt-2">✓ {applied.code} applied — {applied.percent}% off</p>}
              </div>

              <div data-testid="buyready-bag-summary" className="border border-[#03A685]/30 bg-[#03A685]/5 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#03A685] flex items-center gap-1.5"><ShieldCheck size={14} /> BuyReady Summary</p>
                <p className="text-xs text-[#535766] mt-2">Avg. size accuracy across your bag: <b>{avgConfidence}%</b>. All items from verified sellers with easy returns.</p>
              </div>

              <div className="border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#535766] mb-3">Price Details</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-[#535766]"><span>Total MRP</span><span>₹{mrpTotal}</span></div>
                  <div className="flex justify-between text-[#03A685]"><span>Discount on MRP</span><span>−₹{mrpTotal - subtotal}</span></div>
                  {applied && <div className="flex justify-between text-[#03A685]"><span>Coupon ({applied.code})</span><span>−₹{discount}</span></div>}
                  <div className="flex justify-between text-[#535766]"><span>Delivery Fee</span><span className="text-[#03A685]">FREE</span></div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-[#282C3F]"><span>Total Amount</span><span data-testid="bag-total">₹{total}</span></div>
                </div>
                <button data-testid="place-order-btn" onClick={() => navigate("/checkout", { state: { coupon: applied?.code } })}
                  className="w-full mt-4 bg-[#FF3E6C] hover:bg-[#E6355F] text-white font-bold py-3 rounded-md text-sm uppercase transition-colors">
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <TrustStrip />
    </div>
  );
}
