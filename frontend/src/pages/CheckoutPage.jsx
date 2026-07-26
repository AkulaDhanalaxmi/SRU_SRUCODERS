import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { MapPin, Truck, Zap, CreditCard, Banknote, Smartphone } from "lucide-react";
import api, { apiError } from "../lib/api";
import { Header } from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { useShop } from "../context/ShopContext";

const DELIVERY = [
  { v: "standard", l: "Standard (FREE)", d: "Arrives Tomorrow", note: "FREE Delivery", icon: Truck, fee: 0 },
  { v: "express", l: "Express (+₹99)", d: "Guaranteed by Tomorrow 10 PM", note: "Fastest Delivery", icon: Zap, fee: 99 },
];
const PAYMENTS = [
  { v: "cod", l: "Cash on Delivery", icon: Banknote },
  { v: "card", l: "Credit / Debit Card", icon: CreditCard },
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

  const subtotal = cart.reduce((n, i) => n + i.product.price * i.qty, 0);
  const fee = DELIVERY.find((d) => d.v === delivery)?.fee || 0;

  const placeOrder = async () => {
    if (!addressId) return toast.error("Please select a delivery address");
    if (cart.length === 0) return toast.error("Your bag is empty");
    setBusy(true);
    try {
      const { data } = await api.post("/orders", {
        items: cart.map((i) => ({ product_id: i.product_id, size: i.size, qty: i.qty })),
        address_id: addressId, payment_method: payment, delivery_type: delivery, coupon: state?.coupon || null,
      });
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
      <main className="max-w-3xl mx-auto px-4 py-6 pb-28">
        <h1 className="font-heading font-bold text-xl text-[#282C3F] mb-6">Checkout</h1>

        <section className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-[#535766] mb-3 flex items-center gap-1.5"><MapPin size={14} /> Delivery Address</p>
          <div className="space-y-3">
            {user?.addresses?.map((a) => (
              <label key={a.id} data-testid={`checkout-address-${a.label.toLowerCase()}`}
                className={`flex gap-3 border rounded-xl p-4 cursor-pointer transition-colors ${addressId === a.id ? "border-[#FF3E6C] bg-[#FF3E6C]/[0.03]" : "border-gray-200"}`}>
                <input type="radio" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="accent-[#FF3E6C] mt-1" />
                <div>
                  <p className="text-sm font-bold">{a.receiver} <span className="text-[10px] bg-[#F5F5F6] rounded px-2 py-0.5 ml-1 uppercase font-semibold text-[#535766]">{a.label}</span></p>
                  <p className="text-xs text-[#7E818C] mt-1">{a.line1}, {a.city}, {a.state} — {a.pin}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-[#535766] mb-3">Delivery Speed</p>
          <div className="grid grid-cols-2 gap-3">
            {DELIVERY.map(({ v, l, d, note, icon: Icon }) => (
              <button key={v} data-testid={`delivery-${v}`} onClick={() => setDelivery(v)}
                className={`border rounded-xl p-4 text-left transition-colors ${delivery === v ? "border-[#FF3E6C] bg-[#FF3E6C]/[0.03]" : "border-gray-200"}`}>
                <Icon size={18} className={delivery === v ? "text-[#FF3E6C]" : "text-[#535766]"} />
                <p className="text-sm font-bold mt-2">{l}</p>
                <p className="text-xs text-[#7E818C]">{d}</p>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#16A34A]">{note}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-[#535766] mb-3">Payment Method</p>
          <div className="space-y-3">
            {PAYMENTS.map(({ v, l, icon: Icon }) => (
              <label key={v} data-testid={`payment-${v}`}
                className={`flex items-center gap-3 border rounded-xl p-4 cursor-pointer transition-colors ${payment === v ? "border-[#FF3E6C] bg-[#FF3E6C]/[0.03]" : "border-gray-200"}`}>
                <input type="radio" checked={payment === v} onChange={() => setPayment(v)} className="accent-[#FF3E6C]" />
                <Icon size={18} className="text-[#535766]" />
                <span className="text-sm font-semibold">{l}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#535766] mb-3">Order Summary ({cart.length} items)</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-[#535766]"><span>Items total</span><span>₹{subtotal}</span></div>
            <div className="flex justify-between text-[#535766]"><span>Delivery fee</span><span>{fee ? `₹${fee}` : "FREE"}</span></div>
            {state?.coupon && <div className="flex justify-between text-[#03A685]"><span>Coupon {state.coupon}</span><span>applied at order</span></div>}
            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold"><span>Payable</span><span data-testid="checkout-total">₹{subtotal + fee}</span></div>
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 p-4 z-50">
        <div className="max-w-3xl mx-auto">
          <button data-testid="confirm-order-btn" onClick={placeOrder} disabled={busy}
            className="w-full bg-[#FF3E6C] hover:bg-[#E6355F] text-white font-bold py-3.5 rounded-md text-sm uppercase tracking-wide transition-colors disabled:opacity-60">
            {busy ? "Placing Order..." : `Place Order • ₹${subtotal + fee}`}
          </button>
        </div>
      </div>
    </div>
  );
}
