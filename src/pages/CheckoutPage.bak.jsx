import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Check, MapPin, Truck, Zap, CreditCard, Banknote, Smartphone, Gift, CalendarDays, Sparkles, MessageCircleMore } from "lucide-react";
import api, { apiError } from "../lib/api";
import { Header } from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { useShop } from "../context/ShopContext";

const DELIVERY = [
  { v: "standard", l: "Standard — FREE", d: "3-5 days", icon: Truck, fee: 0 },
  { v: "express", l: "Express — ₹99", d: "1-2 days", icon: Zap, fee: 99 },
];
const DELIVERY_PREFERENCES = [
  { v: "normal", l: "Normal Delivery", d: "Delivered as usual", icon: Truck },
  { v: "gift", l: "Gift Delivery 🎁", d: "Elegant wrap and handoff", icon: Gift },
  { v: "event", l: "Event Delivery 🎉", d: "Perfect before your celebration", icon: Sparkles },
];
const PAYMENTS = [
  { v: "cod", l: "Cash on Delivery", icon: Banknote },
  { v: "upi", l: "UPI", icon: Smartphone },
  { v: "card", l: "Credit / Debit Card", icon: CreditCard },
];

const DELIVERY_DAYS = { standard: 4, express: 2, same_day: 0 };
const getEventDeliveryResult = (deliveryType, preference, dateStr) => {
  if (preference === "normal") {
    return { canDeliver: true, message: "Delivered as usual." };
  }
  if (!dateStr) {
    return { canDeliver: false, message: "Select a delivery date to confirm your gift/event delivery." };
  }

  const target = new Date(dateStr);
  const today = new Date();
  const arrival = new Date(today);
  arrival.setDate(arrival.getDate() + (DELIVERY_DAYS[deliveryType] ?? 4));

  if (isNaN(target.getTime())) {
    return { canDeliver: false, message: "Enter a valid date to confirm delivery." };
  }
  if (arrival <= target) {
    return { canDeliver: true, message: `Can deliver before ${target.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}.` };
  }

  return {
    canDeliver: false,
    message: `Low confidence: this option may miss your ${preference === "event" ? "event" : "gift"} date. Choose express or a different address.`,
  };
};

const computeDeliveryConfidence = (deliveryType, dateStr) => {
  if (!dateStr) return 0;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return 0;
  const today = new Date();
  const arrival = new Date(today);
  arrival.setDate(arrival.getDate() + (DELIVERY_DAYS[deliveryType] ?? 4));
  const diff = Math.ceil((target - arrival) / (1000 * 60 * 60 * 24));
  // buffer days impacts confidence: more buffer -> higher confidence
  const base = 60;
  const conf = Math.min(98, Math.max(20, base + diff * 8));
  return conf;
};

const computeBuyReadyConfidence = (cart) => {
  if (!cart || cart.length === 0) return 60;
  const base = 86;
  const bonus = Math.min(10, cart.length * 2);
  return Math.min(98, base + bonus);
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { state: routeState } = useLocation();
  const { user } = useAuth();
  const { cart, clearCart } = useShop();
  const persistedCheckoutState = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(sessionStorage.getItem("checkoutRouteState") || "null");
    } catch {
      return null;
    }
  }, []);
  const [addressList, setAddressList] = useState(user?.addresses || []);
  const [addressId, setAddressId] = useState(routeState?.addressId || persistedCheckoutState?.addressId || user?.addresses?.find((a) => a.default)?.id || user?.addresses?.[0]?.id);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: "Home", receiver: "", phone: "", line1: "", city: "", state: "", pin: "" });
  const [delivery, setDelivery] = useState(routeState?.deliveryType || persistedCheckoutState?.deliveryType || "standard");
  const [deliveryPreference, setDeliveryPreference] = useState(routeState?.deliveryPreference || persistedCheckoutState?.deliveryPreference || "normal");
  const [preferredDeliveryDate, setPreferredDeliveryDate] = useState(routeState?.preferredDeliveryDate || persistedCheckoutState?.preferredDeliveryDate || "");
  const [giftWrap, setGiftWrap] = useState(routeState?.giftWrap ?? persistedCheckoutState?.giftWrap ?? false);
  const [giftMessage, setGiftMessage] = useState(routeState?.giftMessage || persistedCheckoutState?.giftMessage || "");
  const [showDeliveryEditor, setShowDeliveryEditor] = useState(false);
  const [payment, setPayment] = useState("cod");
  const [busy, setBusy] = useState(false);

  const subtotal = cart.reduce((n, i) => n + i.product.price * i.qty, 0);
  const fee = DELIVERY.find((d) => d.v === delivery)?.fee || 0;
  const selectedAddress = useMemo(() => addressList.find((a) => a.id === addressId) || addressList[0] || null, [addressId, addressList]);
  const eventResult = getEventDeliveryResult(delivery, deliveryPreference, preferredDeliveryDate);

  useEffect(() => {
    if (deliveryPreference === "normal") {
      setShowDeliveryEditor(false);
      return;
    }
    if (!preferredDeliveryDate) {
      setShowDeliveryEditor(true);
      return;
    }
    setShowDeliveryEditor(false);
  }, [deliveryPreference, preferredDeliveryDate]);

  useEffect(() => {
    setAddressList(user?.addresses || []);
    if (!addressId && (user?.addresses?.length || 0) > 0) {
      setAddressId(user.addresses.find((a) => a.default)?.id || user.addresses[0].id);
    }
  }, [addressId, user?.addresses]);

  const saveNewAddress = async () => {
    if (!newAddress.receiver || !newAddress.phone || !newAddress.line1 || !newAddress.city || !newAddress.state || !newAddress.pin) {
      toast.error("Please fill all address fields");
      return;
    }
    try {
      const { data } = await api.post("/me/addresses", newAddress);
      const nextList = [...addressList, data];
      setAddressList(nextList);
      setAddressId(data.id);
      setShowAddressForm(false);
      setAddressModalOpen(true);
      toast.success("Address saved as your default delivery address");
    } catch (e) {
      toast.error(apiError(e));
    }
  };
  const placeOrder = async () => {
    if (cart.length === 0) return toast.error("Your bag is empty");
    setBusy(true);
    try {
      const { data } = await api.post("/orders", {
        items: cart.map((i) => ({ product_id: i.product_id, size: i.size, qty: i.qty })),
        address_id: addressId,
        payment_method: payment,
        coupon: routeState?.coupon || null,
        purpose: deliveryPreference === "gift" ? "Gift" : deliveryPreference === "event" ? "Event" : "Casual",
        event_date: preferredDeliveryDate || null,
        delivery_preference: deliveryPreference,
        preferred_delivery_date: preferredDeliveryDate || null,
        gift_wrap: giftWrap,
        gift_message: giftMessage || null,
      });
      clearCart();
      navigate(`/order-success/${data.id}`);
      toast.error(apiError(e));
    } finally {
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-28">
        <h1 className="font-heading font-bold text-xl text-[#282C3F] mb-6">Checkout</h1>

        <section className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-[#535766] mb-3 flex items-center gap-1.5"><MapPin size={14} /> Delivery Address</p>
          {selectedAddress ? (
            <div className="rounded-xl p-3 bg-white border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#282C3F]">📍 {selectedAddress.label} {selectedAddress.default ? "(Default)" : ""}</p>
                  <p className="text-xs text-[#7E818C] mt-1">{selectedAddress.receiver} • PIN {selectedAddress.pin}</p>
                </div>
                <button onClick={() => setAddressModalOpen(true)} className="text-xs font-bold text-[#FF3E6C]">Change ▼</button>
              </div>
            </div>
          ) : (
          )}

          {addressModalOpen && (
            <div className="fixed inset-0 z-60 flex">
              <div className="flex-1 bg-black/40" onClick={() => setAddressModalOpen(false)} />
              <div className="w-full max-w-sm bg-white h-full p-6 shadow-2xl overflow-auto">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-sm font-bold text-[#282C3F]">Deliver to</p>
                    <p className="text-xs text-[#7E818C]">Select an address and confirm delivery availability</p>
                  </div>
                  <button onClick={() => setAddressModalOpen(false)} className="text-[#FF3E6C] font-bold text-sm">Close</button>
                </div>
                <div className="space-y-3">
                  {addressList.map((a) => (
                    <button key={a.id} onClick={() => { setAddressId(a.id); setAddressModalOpen(false); }}
                      className={`w-full text-left rounded-2xl border px-4 py-4 transition-colors ${addressId === a.id ? "border-[#FF3E6C] bg-[#FF3E6C]/[0.08]" : "border-gray-200 hover:border-[#FF3E6C]/60"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm">{a.label} {a.default ? "• Default" : ""}</p>
                          <p className="text-[11px] text-[#7e7e7e] mt-1">{a.receiver}, {a.phone}</p>
                        </div>
                        {addressId === a.id && <Check size={16} className="text-[#03A685]" />}
                      </div>
                      <p className="mt-2 text-[11px] text-[#7e7e7e]">{a.line1}, {a.city}, {a.state} — {a.pin}</p>
                    </button>
                  ))}

                  <div className="rounded-xl border border-gray-200 p-3 bg-white">
                    <p className="text-xs font-bold">Delivery selection</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm">{deliveryPreference === 'gift' ? 'Gift Delivery 🎁' : deliveryPreference === 'event' ? 'Event Delivery 🎉' : 'Normal Delivery'}</div>
                        <div className="text-xs text-[#7E818C] mt-1">{preferredDeliveryDate ? new Date(preferredDeliveryDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : 'No date selected'}</div>
                      </div>
                      <div>
                        <button onClick={() => setShowDeliveryEditor(true)} className="text-sm font-semibold text-[#FF3E6C]">Edit</button>
                      </div>
                    </div>

                    {showDeliveryEditor && (
                      <div className="mt-3 space-y-2">
                        <input type="date" value={preferredDeliveryDate} onChange={(e) => setPreferredDeliveryDate(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
                        {deliveryPreference === 'gift' && (
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} className="accent-[#FF3E6C]" /> Add gift wrap</label>
                            <textarea value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} rows={2} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" placeholder="Gift message (optional)" />
                          </div>
                        )}
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setShowDeliveryEditor(false)} className="text-sm text-[#7E818C]">Done</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-5">
                  <button onClick={() => { setShowAddressForm(true); setAddressModalOpen(false); }}
                    className="w-full rounded-xl border border-[#FF3E6C] px-4 py-3 text-sm font-bold text-[#FF3E6C]">Add New Address</button>
                </div>
              </div>
            </div>
          )}
        </section>

        {showAddressForm && (
          <div className="mt-3 rounded-xl border border-gray-200 p-4 space-y-2">
            <input placeholder="Label (Home/Office)" value={newAddress.label} onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF3E6C]" />
            <input placeholder="Receiver name" value={newAddress.receiver} onChange={(e) => setNewAddress({ ...newAddress, receiver: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF3E6C]" />
            <input placeholder="Phone number" value={newAddress.phone} onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF3E6C]" />
            <input placeholder="Address line" value={newAddress.line1} onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF3E6C]" />
            <div className="grid gap-2 sm:grid-cols-3">
              <input placeholder="City" value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF3E6C]" />
              <input placeholder="State" value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF3E6C]" />
              <input placeholder="PIN code" value={newAddress.pin} onChange={(e) => setNewAddress({ ...newAddress, pin: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF3E6C]" />
            </div>
            <button onClick={saveNewAddress} className="w-full bg-[#282C3F] text-white font-bold py-2.5 rounded-lg text-sm">Save as default address</button>
          </div>
        )}

        <section className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-[#535766] mb-3">Delivery Preference</p>
          <div className="grid gap-3 md:grid-cols-3">
            {DELIVERY_PREFERENCES.map(({ v, l, d, icon: Icon }) => (
              <button key={v} onClick={() => setDeliveryPreference(v)}
                className={`relative border rounded-xl p-4 text-left transition-colors ${deliveryPreference === v ? "border-[#FF3E6C] bg-[#FF3E6C]/[0.03]" : "border-gray-200"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{v === 'gift' ? '🎁' : v === 'event' ? '🎉' : '📦'}</span>
                  <div>
                    <p className="text-sm font-bold mt-0">{l}</p>
                    <p className="text-xs text-[#7E818C] mt-1">{d}</p>
                  </div>
                </div>
                {deliveryPreference === v && <Check size={16} className="absolute right-4 top-4 text-[#03A685]" />}
              </button>
            ))}
          </div>
          {(deliveryPreference === "gift" || deliveryPreference === "event") && (
            <div className="mt-4 rounded-xl border border-gray-200 p-4">
              {!showDeliveryEditor ? (
                <div className="flex flex-col gap-3 rounded-xl border border-[#FF3E6C]/30 bg-[#fff5f7] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#282C3F]">{deliveryPreference === "gift" ? "Gift delivery" : "Event delivery"}</p>
                      <p className="text-xs text-[#7E818C] mt-1">
                        {preferredDeliveryDate ? `Deliver by ${new Date(preferredDeliveryDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}` : "No date selected yet."}
                      </p>
                    </div>
                    <button type="button" onClick={() => setShowDeliveryEditor(true)} className="text-[#FF3E6C] text-sm font-semibold">
                      Edit
                    </button>
                  </div>
                  <p className={`text-xs font-semibold ${eventResult.canDeliver ? "text-[#03A685]" : "text-[#e07a00]"}`}>{eventResult.message}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm text-[#282C3F] font-semibold">
                      <CalendarDays size={15} className="text-[#FF3E6C]" />
                      Preferred delivery date
                    </label>
                    <input
                      type="date"
                      value={preferredDeliveryDate}
                      onChange={(e) => setPreferredDeliveryDate(e.target.value)}
                      className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF3E6C]"
                    />
                  </div>
                  {deliveryPreference === "gift" && (
                    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3">
                      <label className="flex items-center gap-2 text-sm text-[#282C3F]">
                        <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} className="accent-[#FF3E6C]" />
                        Add gift wrapping
                      </label>
                      <textarea
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        rows="2"
                        placeholder="Optional gift message"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF3E6C] resize-none"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <button type="button" onClick={() => setShowDeliveryEditor(false)} className="text-[#FF3E6C] text-sm font-semibold">
                      Done
                    </button>
                    <p className={`text-xs font-semibold ${eventResult.canDeliver ? "text-[#03A685]" : "text-[#e07a00]"}`}>{eventResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-[#535766] mb-3">Delivery Speed</p>
          <div className="grid grid-cols-2 gap-3">
            {DELIVERY.map(({ v, l, d, icon: Icon }) => (
              <button key={v} data-testid={`delivery-${v}`} onClick={() => setDelivery(v)}
                className={`relative border rounded-xl p-4 text-left transition-colors ${delivery === v ? "border-[#FF3E6C] bg-[#FF3E6C]/[0.03]" : "border-gray-200"}`}>
                <Icon size={18} className={delivery === v ? "text-[#FF3E6C]" : "text-[#535766]"} />
                <p className="text-sm font-bold mt-2">{l}</p>
                <p className="text-xs text-[#7E818C]">{d}</p>
                {delivery === v && <Check size={16} className="absolute right-4 top-4 text-[#03A685]" />}
              </button>
          </div>
        </section>

        <section className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-[#535766] mb-3">Payment Method</p>
          <div className="space-y-3">
            {PAYMENTS.map(({ v, l, icon: Icon }) => (
              <label key={v} data-testid={`payment-${v}`}
                className={`flex items-center gap-3 border rounded-xl p-4 cursor-pointer transition-colors ${payment === v ? "border-[#FF3E6C] bg-[#FF3E6C]/[0.03]" : "border-gray-200"}`}>
                <input type="radio" checked={payment === v} onChange={() => setPayment(v)} className="accent-[#FF3E6C]" />
                <span className="text-xl">{v === 'cod' ? '💵' : v === 'upi' ? '📱' : '💳'}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#535766] mb-3">Order Summary ({cart.length} items)</p>
            <div className="flex justify-between text-[#535766]"><span>Items total</span><span>₹{subtotal}</span></div>
            <div className="flex justify-between text-[#535766]"><span>Delivery fee</span><span>{fee ? `₹${fee}` : "FREE"}</span></div>
            {deliveryPreference !== "normal" && <div className="flex justify-between text-[#03A685]"><span>Special handling</span><span>Included</span></div>}
            {routeState?.coupon && <div className="flex justify-between text-[#03A685]"><span>Coupon {routeState.coupon}</span><span>applied at order</span></div>}
            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold"><span>Payable</span><span data-testid="checkout-total">₹{subtotal + fee}</span></div>
        </section>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 p-4 z-50">
        <div className="max-w-3xl mx-auto">
          {/** Event/Gift info card with confidence and recommendation */}
          {(deliveryPreference === "event" || deliveryPreference === "gift") && (
            <div className="mb-3 grid gap-3">
              <div className="rounded-xl border p-3 bg-white shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#282C3F]">{deliveryPreference === "event" ? "Event" : "Gift"}: {routeState?.purpose || (deliveryPreference === "event" ? "Your event" : "Gift")}</p>
                  <p className="text-xs text-[#7E818C] mt-1">{preferredDeliveryDate ? new Date(preferredDeliveryDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "No date selected"}</p>
                </div>
                  <p className="text-lg font-bold text-[#03A685]">{computeDeliveryConfidence(delivery, preferredDeliveryDate)}%</p>
              </div>
              <div className="rounded-xl border p-3 bg-[#fffaf0]">
                <p className="text-xs font-semibold text-[#282C3F]">Recommended</p>
                <p className="text-sm font-bold text-[#03A685] mt-1">{!eventResult.canDeliver && delivery !== 'express' ? '✅ Express Delivery' : '✅ Standard Delivery'}</p>
                {!eventResult.canDeliver && <p className="text-xs text-[#7E818C] mt-1">Low confidence for current option — try express or change address.</p>}
              </div>
            </div>
          )}

          {/** Packaging preview */}
          <div className="mb-3 rounded-xl border p-3 bg-white">
            <p className="text-sm font-bold text-[#282C3F]">📦 Your package will look like</p>
              <div className="w-20 h-20 rounded-lg bg-[#f5f5f6] flex items-center justify-center">3D</div>
              <div>
                <p className="text-sm font-semibold">Includes</p>
                <ul className="text-xs text-[#7E818C] mt-2 space-y-1">
                  {cart.slice(0, 4).map((i) => (
                    <li key={i.product_id}>✓ {i.product?.name || i.product_id}</li>
                  <li>✓ Invoice</li>
                  {giftWrap && <li>✓ Gift Card</li>}
              </div>
            </div>
          </div>

          {/** BuyReady final check */}
          <div className="mb-3 rounded-xl border p-3 bg-[#F9FAFB]">
            <div className="mt-2 text-xs text-[#7E818C]">
              <div>✓ Perfect Size</div>
              <div>✓ Trusted Seller</div>
              <div>✓ On-time Delivery</div>
              <div>✓ Easy Returns</div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-[#7E818C]">Confidence Score</p>
                <p className="text-lg font-bold text-[#03A685]">{computeBuyReadyConfidence(cart)}%</p>
              </div>
              <button onClick={() => { /* visual only - call placeOrder when user presses Place Order */ }} className="bg-[#03A685] text-white px-3 py-2 rounded-md text-sm font-semibold">Proceed with Confidence</button>
            </div>
          </div>
          <button data-testid="confirm-order-btn" onClick={placeOrder} disabled={busy || (deliveryPreference !== "normal" && !eventResult.canDeliver)}
            className="w-full bg-[#FF3E6C] hover:bg-[#E6355F] text-white font-bold py-3.5 rounded-md text-sm uppercase tracking-wide transition-colors disabled:opacity-60">
            {busy ? "Placing Order..." : `Place Order • ₹${subtotal + fee}`}
          </button>
        </div>
      </div>
    </div>
  );
}
}
}
