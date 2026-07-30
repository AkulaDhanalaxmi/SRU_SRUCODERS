import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { ShoppingBag, MapPin, Truck, Zap, CreditCard, Banknote, Smartphone, CheckCircle2, ShieldCheck, Package } from "lucide-react";
import api, { apiError } from "../lib/api";
import { Header } from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { useShop } from "../context/ShopContext";

const DELIVERY = [
  { v: "standard", l: "Standard (FREE)", days: 1, time: "By 10 PM", note: "FREE Delivery", icon: Truck, fee: 0 },
  { v: "express", l: "Express (+₹99)", days: 1, time: "By 10 PM", note: "Fastest Delivery", icon: Zap, fee: 99 },
];

const formatDeliveryDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return `Arrives by ${parsed.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}`;
};

const PAYMENTS = [
  { v: "cod", l: "Cash on Delivery", icon: Banknote, popular: true },
  { v: "card", l: "Credit / Debit Card", icon: CreditCard, popular: false },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuth();
  const { cart, clearCart } = useShop();
  const [addressId, setAddressId] = useState(user?.addresses?.find((a) => a.default)?.id || user?.addresses?.[0]?.id);
  const [delivery, setDelivery] = useState("standard");
  const [payment, setPayment] = useState("cod");
  const [busy, setBusy] = useState(false);
  const [predictions, setPredictions] = useState({});

  const subtotal = cart.reduce((n, i) => n + i.product.price * i.qty, 0);
  const mrpTotal = cart.reduce((n, i) => n + i.product.mrp * i.qty, 0);
  const fee = DELIVERY.find((d) => d.v === delivery)?.fee || 0;
  const selectedAddress = user?.addresses?.find((a) => a.id === addressId);
  const pin = selectedAddress?.pin;

  useEffect(() => {
    if (!pin || cart.length === 0) {
      setPredictions({});
      return;
    }

    let cancelled = false;
    const uniqueIds = [...new Set(cart.map((item) => item.product_id))];

    Promise.all(uniqueIds.map((pid) =>
      api.get(`/products/${pid}/delivery`, { params: { pin, payment_method: payment, delivery_type: delivery } })
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
  }, [cart, pin, payment, delivery]);

  const formatDeliveryPrediction = (prediction, selectedType) => {
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
    return formatDeliveryPrediction(prediction, delivery) || formatDeliveryDate(item.product.delivery_estimate) || item.product.delivery_estimate || "Arrives Tomorrow";
  };

  const placeOrder = async () => {
    if (!addressId) return toast.error("Please select a delivery address");
    if (cart.length === 0) return toast.error("Your bag is empty");
    setBusy(true);
    try {
      const { data } = await api.post("/orders", {
        items: cart.map((i) => ({
          product_id: i.product_id,
          size: i.size,
          color: i.product?.color || i.product?.colors?.[0] || null,
          qty: i.qty,
        })),
        address_id: addressId,
        payment_method: payment,
        delivery_type: delivery,
        coupon: state?.coupon || null,
      });
      console.info("[Checkout] create-order response", { orderId: data?.id, order: data });
      window.dispatchEvent(new CustomEvent("buyready:order-created", { detail: data }));
      clearCart();
      navigate(`/order-success/${data.id}`);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="font-heading font-bold text-2xl text-[#282C3F]">Checkout</h1>
            <p className="text-sm text-[#7E818C] mt-1">Confirm your details and place the order</p>
          </div>
          <div className="flex items-center gap-4 overflow-x-auto py-2">
            {[
              { label: "Bag", active: false },
              { label: "Address", active: true },
              { label: "Payment", active: false },
              { label: "Review", active: false },
              { label: "Done", active: false },
            ].map(({ label, active }, idx) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${active ? "border-[#FF3E6C] bg-[#FFEBEE] text-[#FF3E6C]" : "border-[#E5E7EB] bg-white text-[#6B7280]"}`}>
                  {idx + 1}
                </div>
                <span className={`text-xs uppercase tracking-[0.2em] ${active ? "text-[#111827]" : "text-[#94A3B8]"}`}>{label}</span>
                {idx < 4 && <span className="h-px w-6 bg-[#E5E7EB]" />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.9fr_1fr]">
          <div className="space-y-5">
            <section className="rounded-[24px] border border-[#F6D0D8] bg-[#FFFAFB] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#EC4899] mb-3">1. Delivery Address</p>
                  {selectedAddress ? (
                    <div className="w-full rounded-[20px] border border-[#F6D0D8] bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FEE4E6] text-[#BE123C]"><MapPin size={18} /></span>
                            <div>
                              <p className="font-semibold text-[#111827]">{selectedAddress.receiver}</p>
                              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#EC4899]">{selectedAddress.label?.toUpperCase() || "HOME"}</p>
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full border border-[#D1FAE5] bg-[#DCFCE7] px-3 py-1 text-[10px] font-semibold text-[#065F46]">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#16A34A]" /> Default Address
                          </div>
                        </div>
                        <button onClick={() => toast.success("Edit address flow")}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#FBCFE8] bg-[#FFEEF2] px-4 py-2 text-xs font-semibold text-[#BE123C] transition-colors hover:bg-[#FBCFE8]">
                          Edit
                        </button>
                      </div>
                      <p className="text-sm text-[#334155] mt-4">{selectedAddress.line1}</p>
                      <p className="text-sm text-[#334155] mt-1">{selectedAddress.city}, {selectedAddress.state} — {selectedAddress.pin}</p>
                      <p className="text-sm text-[#334155] mt-2">{selectedAddress.phone}</p>
                      <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#047857]">
                        <CheckCircle2 size={16} /> Deliverable to this location
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-[#64748B]">No delivery address found. Please add one in profile.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-[#E8ECF1] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#475569] mb-4">2. Delivery Speed</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {DELIVERY.map(({ v, l, d, note, icon: Icon }) => (
                  <button key={v} onClick={() => setDelivery(v)}
                    className={`rounded-3xl border p-4 text-left transition ${delivery === v ? "border-[#FF3E6C] bg-[#FFEEF2]" : "border-[#E5E7EB] bg-white"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${delivery === v ? "bg-[#FEE4E6] text-[#BE123C]" : "bg-[#F3F4F6] text-[#475569]"}`}><Icon size={18} /></div>
                      <div>
                        <p className="font-semibold text-[#111827]">{l}</p>
                        <p className="text-xs text-[#64748B]">{d}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#16A34A]">{note}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-[#E8ECF1] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#475569] mb-4">3. Payment Method</p>
              <div className="space-y-3">
                {PAYMENTS.map(({ v, l, icon: Icon, popular }) => (
                  <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-3xl border p-4 transition ${payment === v ? "border-[#FF3E6C] bg-[#FFEEF2]" : "border-[#E5E7EB] bg-white"}`}>
                    <input type="radio" checked={payment === v} onChange={() => setPayment(v)} className="accent-[#FF3E6C]" />
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#475569]"><Icon size={18} /></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#111827]">{l}</p>
                        {popular && <span className="rounded-full bg-[#FEF3F2] px-2 py-0.5 text-[10px] font-semibold text-[#B91C1C]">Popular</span>}
                      </div>
                      <p className="text-xs text-[#64748B]">{v === "cod" ? "Pay when your order is delivered" : "Visa, Mastercard, RuPay & more"}</p>
                    </div>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[24px] border border-[#E8ECF1] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#475569]">Order Summary ({cart.length} items)</p>
                <button onClick={() => navigate("/bag")} className="text-sm font-semibold text-[#EF4444]">Edit Bag</button>
              </div>
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={`${item.product_id}-${item.size}`} className="flex items-center gap-3 rounded-3xl border border-[#F1F5F9] bg-[#F8FAFC] p-3">
                    <img src={item.product.images[0]} alt={item.product.name} className="h-16 w-16 rounded-3xl object-cover" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#111827] truncate">{item.product.name}</p>
                      <p className="text-xs text-[#64748B] mt-1">Size: {item.size || "-"} · Color: {item.product.color || "Rust"}</p>
                      <p className="text-xs text-[#64748B] mt-1">Qty: {item.qty}</p>
                      <p className="text-xs text-[#64748B] mt-1">{getDeliveryLabelForItem(item)}</p>
                    </div>
                    <p className="ml-auto text-sm font-semibold text-[#111827]">₹{item.product.price}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#E8ECF1] bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-[#111827] mb-4 uppercase tracking-[0.2em]">Price Details</p>
              <div className="space-y-3 text-sm text-[#475569]">
                <div className="flex justify-between"><span>Total MRP</span><span>₹{mrpTotal}</span></div>
                <div className="flex justify-between text-[#10B981]"><span>Discount on MRP</span><span>−₹{mrpTotal - subtotal}</span></div>
                <div className="flex justify-between"><span>Delivery Fee</span><span className={fee ? "text-[#EF4444]" : "text-[#10B981] font-semibold"}>{fee ? `₹${fee}` : "FREE"}</span></div>
                <div className="border-t border-[#E5E7EB] pt-4 flex justify-between text-base font-bold text-[#111827]"><span>Payable Amount</span><span data-testid="checkout-total">₹{subtotal + fee}</span></div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#E8ECF1] bg-white p-5 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#475569] mb-4">BUYREADY VERIFICATION</p>
              <div className="grid gap-3">
                {[
                  { icon: CheckCircle2, label: "Great Fit", desc: "Matches your profile", bg: "bg-[#DCFCE7]", color: "text-[#065F46]" },
                  { icon: ShieldCheck, label: "Verified Seller", desc: "Trusted & verified", bg: "bg-[#F3E8FF]", color: "text-[#7C3AED]" },
                  { icon: Truck, label: "Fast Delivery", desc: "On-time delivery", bg: "bg-[#E0F2FE]", color: "text-[#0C4A6E]" },
                  { icon: Package, label: "Easy Returns", desc: "15-day easy returns", bg: "bg-[#EFF6FF]", color: "text-[#1D4ED8]" },
                ].map(({ icon: Icon, label, desc, bg, color }) => (
                  <div key={label} className="flex items-center gap-3 rounded-3xl border border-[#E5E7EB] bg-white p-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${bg} ${color}`}><Icon size={18} /></div>
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{label}</p>
                      <p className="text-xs text-[#475569]">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-3xl border border-[#D1FAE5] bg-[#ECFDF5] p-4 text-[13px] font-semibold text-[#047857] flex items-center justify-center gap-2">
                <CheckCircle2 size={16} /> Ready to Place Order
              </div>
            </div>

            <button data-testid="confirm-order-btn" onClick={placeOrder} disabled={busy}
              className="w-full rounded-3xl bg-[#FF3E6C] py-4 text-sm font-bold uppercase text-white shadow-sm hover:bg-[#E11D48] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {busy ? "Placing Order..." : `Place Order • ₹${subtotal + fee}`}
            </button>
            <p className="text-center text-xs text-[#64748B]">Secure Payments · 100% Safe</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
