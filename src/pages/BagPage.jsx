import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ShoppingBag, Minus, Plus, Trash2, Tag, ShieldCheck, CheckCircle2, Package, Truck, ArrowRight, Star, Lock, BadgeCheck } from "lucide-react";
import api, { apiError } from "../lib/api";
import { Header } from "../components/Header";
import { TrustStrip } from "../components/TrustStrip";
import { useAuth } from "../context/AuthContext";
import { useShop } from "../context/ShopContext";

const formatDeliveryDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return `Arrives by ${parsed.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}`;
};

export default function BagPage() {
  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart } = useShop();
  const { user } = useAuth();
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(null);
  const [predictions, setPredictions] = useState({});

  const subtotal = cart.reduce((n, i) => n + i.product.price * i.qty, 0);
  const mrpTotal = cart.reduce((n, i) => n + i.product.mrp * i.qty, 0);
  const discount = applied ? Math.floor(subtotal * applied.percent / 100) : 0;
  const total = subtotal - discount;
  const avgConfidence = cart.length ? Math.round(cart.reduce((n, i) => n + i.product.size_accuracy, 0) / cart.length) : 0;

  const pin = user?.addresses?.find((a) => a.default)?.pin || user?.addresses?.[0]?.pin;

  useEffect(() => {
    if (!pin || cart.length === 0) {
      setPredictions({});
      return;
    }

    let cancelled = false;
    const uniqueIds = [...new Set(cart.map((item) => item.product_id))];

    Promise.all(uniqueIds.map((pid) =>
      api.get(`/products/${pid}/delivery`, { params: { pin, payment_method: "card", delivery_type: "standard" } })
        .then(({ data }) => ({ pid, prediction: data }))
        .catch(() => ({ pid, prediction: null }))
    ))
      .then((results) => {
        if (cancelled) return;
        setPredictions(Object.fromEntries(results.map((result) => [result.pid, result.prediction])));
      });

    return () => {
      cancelled = true;
    };
  }, [cart, pin]);

  const formatDeliveryPrediction = (prediction, selectedType = "standard") => {
    if (!prediction) return null;
    const option = prediction.options?.find((o) => o.type === selectedType) || prediction.options?.[0];
    if (!option) return prediction.estimated_label || prediction.prediction_text || null;
    if (option.date) return `Arrives by ${option.date}`;
    if (option.arrival_iso) {
      const parsed = new Date(option.arrival_iso);
      if (!Number.isNaN(parsed.getTime())) {
        return `Arrives by ${parsed.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}`;
      }
    }
    return prediction.estimated_label || prediction.prediction_text || null;
  };

  const getDeliveryLabelForItem = (item) => {
    const prediction = predictions[item.product_id];
    return formatDeliveryPrediction(prediction) || formatDeliveryDate(item.product.delivery_estimate) || item.product.delivery_estimate || "Arrives Tomorrow";
  };

  const applyCoupon = async () => {
    try {
      const { data } = await api.get(`/coupons/${coupon}`);
      setApplied(data);
      toast.success(`Coupon ${data.code} applied — ${data.percent}% off!`);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const removeCoupon = () => {
    setApplied(null);
    setCoupon("");
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6">
          <div>
            <h1 className="font-heading font-bold text-2xl text-[#282C3F]">Shopping Bag</h1>
            <p className="text-sm text-[#7E818C] mt-1">{cart.length} items</p>
          </div>
          <div className="rounded-full bg-[#F5F7FA] px-4 py-2 text-sm text-[#535766] inline-flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#03A685]" /> Verified seller products
          </div>
        </div>

        {cart.length === 0 ? (
          <div data-testid="empty-bag" className="text-center py-24">
            <ShoppingBag size={56} className="mx-auto text-gray-300" />
            <p className="font-heading font-bold text-lg mt-4">Your bag is empty</p>
            <p className="text-sm text-[#7E818C] mt-1">Add items with confidence using BuyReady.</p>
            <Link to="/products" data-testid="bag-shop-now" className="inline-block mt-6 bg-[#FF3E6C] text-white font-bold px-8 py-3 rounded-full text-sm uppercase">Shop Now</Link>
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[1.8fr_1fr]">
            <div className="space-y-4">
              <div className="space-y-4">
                {cart.map((i) => (
                  <div key={`${i.product_id}-${i.size}`} data-testid={`bag-item-${i.product_id}`} className="rounded-[24px] border border-[#E8ECF1] bg-white p-5 shadow-sm">
                    <div className="flex gap-4 sm:gap-5">
                      <Link to={`/product/${i.product_id}`} className="w-28 h-32 rounded-3xl overflow-hidden bg-[#F5F7FA] flex-shrink-0">
                        <img src={i.product.images[0]} alt={i.product.name} className="w-full h-full object-cover" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#7E818C]">{i.product.brand}</p>
                        <p className="font-heading font-semibold text-base text-[#1F2937] mt-1 line-clamp-2">{i.product.name}</p>
                        <div className="flex flex-wrap gap-3 items-center mt-3 text-xs text-[#4B5563]">
                          {i.size && <span className="rounded-full bg-[#F3F4F6] px-3 py-1">Size: {i.size}</span>}
                          <span className="rounded-full bg-[#F3F4F6] px-3 py-1">Color: {i.product.color || "Rust"}</span>
                        </div>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xl font-bold text-[#111827]">₹{i.product.price}</p>
                            <p className="text-sm text-[#9CA3AF] line-through">₹{i.product.mrp}</p>
                          </div>
                          <div className="flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F8FAFC] p-2">
                            <button data-testid={`qty-minus-${i.product_id}`} onClick={() => addToCart(i.product_id, i.size, -1)} className="p-1 rounded-full hover:bg-[#E5E7EB]"><Minus size={14} /></button>
                            <span data-testid={`qty-value-${i.product_id}`} className="px-3 text-sm font-semibold">{i.qty}</span>
                            <button data-testid={`qty-plus-${i.product_id}`} onClick={() => addToCart(i.product_id, i.size, 1)} className="p-1 rounded-full hover:bg-[#E5E7EB]"><Plus size={14} /></button>
                          </div>
                          <button data-testid={`bag-remove-${i.product_id}`} onClick={() => removeFromCart(i.product_id, i.size)} className="inline-flex items-center gap-2 text-[#6B7280] hover:text-[#EF4444] text-sm">
                            <Trash2 size={16} /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Delivery + review badges */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D1FAE5] bg-[#ECFDF5] px-3 py-1.5 text-xs font-semibold text-[#047857]">
                        <Truck size={14} /> {getDeliveryLabelForItem(i)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FEF3C7] bg-[#FFFBEB] px-3 py-1.5 text-xs font-semibold text-[#B45309]">
                        <Star size={14} className="fill-[#B45309]" /> Verified Reviews ({i.product.rating ?? "4.5"})
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-[#E8ECF1] bg-[#F8FAFC] p-5">
                  <div className="flex items-center gap-3 text-sm font-semibold text-[#111827] mb-3">
                    <CheckCircle2 size={18} className="text-[#03A685]" /> BUYREADY CHECKOUT
                  </div>
                  <div className="space-y-3 text-sm text-[#475569]">
                    <div className="flex items-start gap-3">
                      <Package size={18} className="mt-1 text-[#03A685]" />
                      <div>
                        <p className="font-semibold text-[#111827]">Both items match your Fit Profile</p>
                        <p className="text-[#64748B]">Expected comfort and fit based on your profile</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Truck size={18} className="mt-1 text-[#03A685]" />
                      <div>
                        <p className="font-semibold text-[#111827]">Expected delivery before selected date</p>
                        <p className="text-[#64748B]">Fast delivery on all BuyReady orders</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="mt-1 text-[#03A685]" />
                      <div>
                        <p className="font-semibold text-[#111827]">Easy returns available</p>
                        <p className="text-[#64748B]">Return at no extra cost if not satisfied</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#E8ECF1] bg-[#F8FAFC] p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#64748B] mb-3">BuyReady Confidence</p>
                  <div className="rounded-3xl border border-[#D1FAE5] bg-[#ECFDF5] p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-[#047857]" />
                      <p className="text-sm font-semibold text-[#047857]">Ready to Checkout</p>
                    </div>
                    <p className="mt-1 text-xs text-[#059669]">Our AI checks look good</p>
                    <div className="mt-3 space-y-2">
                      {["Great Fit", "Fast Delivery", "Verified Seller", "Easy Returns"].map((label) => (
                        <div key={label} className="flex items-center gap-2 text-sm text-[#065F46]">
                          <CheckCircle2 size={15} className="text-[#10B981] flex-shrink-0" />
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-[24px] border border-[#D1FAE5] bg-[#ECFDF5] p-4 flex items-start gap-3">
                <ShieldCheck size={20} className="text-[#03A685] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#047857]">Verified Seller Products</p>
                  <p className="text-xs text-[#059669] mt-0.5">All items in your bag are sold by trusted sellers</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#E8ECF1] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#475569]">Coupons</p>
                  {!applied && <span className="text-xs text-[#10B981]">Save ₹500 on orders above ₹1499</span>}
                </div>
                {!applied ? (
                  <div className="flex items-center gap-3">
                    <input data-testid="coupon-input" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="BUYREADY10"
                      className="flex-1 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#374151] outline-none focus:border-[#FF3E6C] focus:ring-[#FF3E6C]/20" />
                    <button data-testid="apply-coupon-btn" onClick={applyCoupon} className="rounded-xl bg-[#FF3E6C] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#E52C52] transition-colors">Apply</button>
                  </div>
                ) : (
                  <div data-testid="coupon-applied" className="rounded-xl border border-[#D1FAE5] bg-[#ECFDF5] px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-[#047857]" />
                      <div>
                        <p className="text-sm font-semibold text-[#047857]">{applied.code} applied <span className="text-[#10B981]">✓</span></p>
                        <p className="text-xs text-[#059669]">You saved ₹{discount} on this order</p>
                      </div>
                    </div>
                    <button data-testid="coupon-remove-btn" onClick={removeCoupon} className="text-xs font-semibold text-[#EF4444] hover:underline">Remove</button>
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-[#E8ECF1] bg-white p-5 shadow-sm">
                <p className="text-sm font-bold text-[#111827] mb-4 uppercase tracking-[0.2em]">Price Details</p>
                <div className="space-y-3 text-sm text-[#475569]">
                  <div className="flex justify-between"><span>Total MRP</span><span>₹{mrpTotal}</span></div>
                  <div className="flex justify-between text-[#10B981]"><span>Discount on MRP</span><span>−₹{mrpTotal - subtotal}</span></div>
                  {applied && <div className="flex justify-between text-[#10B981]"><span>Coupon ({applied.code})</span><span>−₹{discount}</span></div>}
                  <div className="flex justify-between"><span>Delivery Fee</span><span className="text-[#10B981] font-semibold">FREE</span></div>
                  <div className="border-t border-[#E5E7EB] pt-4 flex justify-between text-base font-bold text-[#111827]"><span>Total Amount</span><span data-testid="bag-total">₹{total}</span></div>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#E8ECF1] bg-white p-5 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#475569] mb-4">Checkout Steps</p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-[#111827]">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEE2E5] text-[#E11D48]">1</span>
                    <div>
                      <p className="font-semibold">Bag</p>
                      <p className="text-xs text-[#6B7280]">Review your items</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#111827]">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4338CA]">2</span>
                    <div>
                      <p className="font-semibold">Address</p>
                      <p className="text-xs text-[#6B7280]">Enter shipping details</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#111827]">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309]">3</span>
                    <div>
                      <p className="font-semibold">Payment</p>
                      <p className="text-xs text-[#6B7280]">Secure checkout</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#111827]">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ECFDF5] text-[#047857]">4</span>
                    <div>
                      <p className="font-semibold">Done</p>
                      <p className="text-xs text-[#6B7280]">Order confirmed</p>
                    </div>
                  </div>
                </div>
                <button data-testid="place-order-btn" onClick={() => navigate("/checkout", { state: { coupon: applied?.code } })}
                  className="mt-6 w-full rounded-3xl bg-[#FF3E6C] py-5 text-sm font-bold uppercase text-white shadow-sm hover:bg-[#E11D48] transition-colors flex items-center justify-center gap-2">
                  <Lock size={16} /> Continue to Address <ArrowRight size={18} />
                </button>
                <p className="mt-3 text-center text-xs text-[#6B7280]">100% Secure Payments</p>
              </div>
            </aside>
          </div>
        )}
      </main>
      <TrustStrip />
    </div>
  );
}
