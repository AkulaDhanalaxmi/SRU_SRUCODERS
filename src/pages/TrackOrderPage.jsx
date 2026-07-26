import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, Bike, Warehouse, Home, Zap, MapPin, Clock, FastForward,
  ShieldAlert, Sparkles, Repeat, Shirt, Headphones, RotateCcw, MessageCircle,
  Phone, HelpCircle, Wallet, ArrowLeft, Download, ShieldCheck, PackageCheck, Truck,
  Hourglass, Cloud, User,
} from "lucide-react";
import api, { apiError } from "../lib/api";
import { Header } from "../components/Header";
import { TrustStrip } from "../components/TrustStrip";
import { BottomSheet } from "../components/BottomSheet";

const OPTION_ICONS = { zap: Zap, "map-pin": MapPin, clock: Clock };
const RETURN_ICONS = { sparkles: Sparkles, repeat: Repeat, shirt: Shirt, headphones: Headphones };
const STAGE_ICONS = {
  "Order Placed": PackageCheck,
  "Packed": Warehouse,
  "Shipped": Truck,
  "Out for Delivery": Bike,
  "Delivered": Home,
};
const MONITOR_ICONS = { Weather: Cloud, Warehouse: Warehouse, "Courier Network": Truck, Seller: User };

export default function TrackOrderPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [monitor, setMonitor] = useState(null);
  const [returnSheet, setReturnSheet] = useState(false);
  const [returnOptions, setReturnOptions] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [qrVerificationStep, setQrVerificationStep] = useState(false);
  const [qrImage, setQrImage] = useState(null);
  const [qrVerifying, setQrVerifying] = useState(false);
  const [qrVerified, setQrVerified] = useState(null);
  const [qrVerificationDetails, setQrVerificationDetails] = useState(null);
  const [returnReasonStep, setReturnReasonStep] = useState(false);
  const [returnReason, setReturnReason] = useState(null);
  const [returnNotes, setReturnNotes] = useState("");
  const [canceling, setCanceling] = useState(false);

  const load = useCallback(() => {
    api.get(`/orders/${id}`).then(({ data }) => {
      setOrder(data);
      setFeedbackGiven(data.fit_feedback);
    });
    api.get(`/orders/${id}/monitor`).then(({ data }) => setMonitor(data));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const advance = async () => {
    const { data } = await api.post(`/orders/${id}/advance`);
    setOrder(data);
    toast.success(`Order status: ${data.status.replace(/_/g, " ")}`);
  };

  const resolveDelay = async (action) => {
    try {
      const { data } = await api.post(`/orders/${id}/monitor/resolve`, { action });
      toast.success(data.message);
      setMonitor((m) => ({ ...m, delayed: false, options: [], message: "Resolved — your order is back on track.", checks: m.checks.map((c) => ({ ...c, status: "clear" })) }));
    } catch (e) { toast.error(apiError(e)); }
  };

  const sendFeedback = async (fit) => {
    const { data } = await api.post(`/orders/${id}/feedback`, { fit });
    setFeedbackGiven(fit);
    setSuggestion(data.suggestion);
    toast.success("Thanks for your feedback!");
  };

  const openReturn = async () => {
    setQrVerificationStep(true);
    setQrVerified(null);
    setQrImage(null);
    setReturnSheet(true);
  };

  const handleQrImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setQrImage(file);
    setQrVerifying(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("order_id", id);

      const { data } = await api.post("/verify-product-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setQrVerified(data.verified);
      setQrVerificationDetails(data);
      if (data.verified) {
        toast.success(data.message);
        setTimeout(() => {
          setQrVerificationStep(false);
          setReturnReasonStep(true);
        }, 1500);
      } else {
        toast.error(`${data.message}${data.similarity != null ? ` (${data.similarity}% similarity)` : ""}`);
        setQrVerified(false);
      }
    } catch (err) {
      toast.error(apiError(err) || "Product verification failed");
      setQrVerified(false);
      setQrVerificationDetails(null);
    } finally {
      setQrVerifying(false);
    }
  };

  const submitReturn = async () => {
    if (!returnReason) {
      toast.error("Please select a return reason");
      return;
    }

    try {
      await api.post(`/orders/${id}/return`, new URLSearchParams({
        issue_type: returnReason,
        notes: returnNotes,
      }), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      setReturnSheet(false);
      toast.success("Return confirmed! Pickup within 2 days.");
      load();
    } catch (err) {
      toast.error(apiError(err) || "Return submission failed");
    }
  };

  const openReturnOptions = async () => {
    const { data } = await api.get(`/orders/${id}/return-options`);
    setReturnOptions(data.options);
  };

  const chatSupport = () => {
    toast.success("Opening chat with BuyReady support...");
    window.open("https://buyready.com/support", "_blank");
  };

  const cancelOrder = async () => {
    if (!order) return;
    const cancelled = order.status === "canceled" || order.status === "cancelled";
    if (cancelled) {
      toast.error("This order is already cancelled.");
      return;
    }

    setCanceling(true);
    try {
      const { data } = await api.post(`/orders/${id}/cancel`);
      setOrder(data);
      toast.success("Order cancellation requested. We'll follow up with confirmation.");
    } catch (err) {
      toast.error(apiError(err) || "Cancel request failed");
    } finally {
      setCanceling(false);
    }
  };

  const callUs = () => {
    window.location.href = "tel:18001234567";
  };

  const openFaq = () => {
    window.open("https://buyready.com/faq", "_blank");
  };

  const confirmReturn = async () => {
    await api.post(`/orders/${id}/return`);
    setReturnSheet(false);
    toast.success("Return initiated. Pickup within 2 days.");
    load();
  };

  const downloadInvoice = () => {
    toast.success("Downloading invoice...");
  };

  if (!order) {
    return <div className="min-h-screen bg-white"><Header /><div className="max-w-6xl mx-auto px-6 py-10"><div className="h-80 bg-gray-100 rounded-3xl animate-pulse" /></div></div>;
  }

  const delivered = order.status === "delivered";
  const doneCount = order.timeline.filter((t) => t.done).length;
  const progress = (doneCount - 1) / (order.timeline.length - 1);
  const lastDoneStep = [...order.timeline].reverse().find((t) => t.done);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-6">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} aria-label="Go back"
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
              <ArrowLeft size={16} className="text-[#282C3F]" />
            </button>
            <div>
              <h1 className="font-heading font-bold text-xl text-[#282C3F]">Track Order</h1>
              <p className="text-xs text-[#7E818C] mt-0.5">Stay updated with your order journey</p>
              {order.packguard?.final_status === "AI_VERIFIED" && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
                  <ShieldCheck size={14} />
                  Verified by PackGuard
                </div>
              )}
              {(order.status === "canceled" || order.status === "cancelled") && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#FEE2E7] px-3 py-2 text-[11px] font-semibold text-[#B91C1C]">
                  <ShieldAlert size={14} />
                  Order cancelled — we will notify you if anything changes.
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-2 rounded-xl border border-[#03A685]/30 bg-[#ECFDF5] px-3 py-2">
              <Sparkles size={14} className="text-[#03A685]" />
              <span className="leading-tight">
                <span className="block text-[11px] font-bold text-[#047857]">AI Order Monitor</span>
                <span className="block text-[9px] text-[#059669]">Real-time delivery insights</span>
              </span>
            </span>
            <button onClick={downloadInvoice}
              className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold text-[#282C3F] hover:bg-gray-50 transition-colors">
              <Download size={13} /> Download Invoice
            </button>
            <button onClick={chatSupport}
              className="flex items-center gap-1.5 border border-[#FF3E6C] text-[#FF3E6C] rounded-lg px-3 py-2 text-xs font-semibold hover:bg-[#FF3E6C]/5 transition-colors">
              <MessageCircle size={13} /> Need Help?
            </button>
          </div>
        </div>

        <p className="text-xs text-[#7E818C] mb-4 -mt-2">{order.id} • {order.items.length} item{order.items.length > 1 ? "s" : ""} • ₹{order.total}</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5 items-stretch">

          {/* LEFT: order summary + compact vertical checklist */}
          <div className="lg:col-span-1 border border-gray-200 rounded-2xl p-5">
            <div className="flex gap-3 mb-4 pb-4 border-b border-gray-100">
              <img src={order.items[0].image} alt="" className="w-16 h-20 rounded-lg object-cover bg-[#F5F5F6]" />
              <div>
                <p className="text-sm font-bold">{order.items[0].brand}</p>
                <p className="text-xs text-[#7E818C]">{order.items[0].name}</p>
                <p className="text-xs text-[#64748B] mt-1">Size: {order.items[0].size || "N/A"} · Color: {order.items[0].color || "N/A"}</p>
              </div>
            </div>

            <p className="text-xs text-[#7E818C]">
              Order ID: <span className="font-semibold text-[#282C3F]">{order.id}</span>
            </p>
            <p className="text-xs text-[#7E818C] mt-1">
              Placed on {new Date(order.ordered_at || order.created_at || order.placed_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-xs text-[#03A685] font-semibold mt-2 flex items-center gap-1">
              <ShieldCheck size={13} /> BuyReady Confidence: High
            </p>

            <div className="mt-5 space-y-3" data-testid="order-timeline">
              {order.timeline.map((t, i) => {
                const isActive = !t.done && i === doneCount;
                return (
                  <div key={t.stage} className="flex items-center gap-3">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${t.done ? "bg-[#ECFDF5] text-[#047857]" : isActive ? "bg-[#FFE4E6] text-[#BE123C]" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
                      {t.done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    </div>
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <p className={`text-xs font-semibold ${t.done ? "text-[#111827]" : isActive ? "text-[#BE123C]" : "text-[#9CA3AF]"}`}>{t.label}</p>
                      {t.at ? (
                        <p className="text-[10px] text-[#9CA3AF] whitespace-nowrap">
                          {new Date(t.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      ) : (
                        <span className={`text-[10px] font-semibold ${isActive ? "text-[#BE123C]" : "text-[#9CA3AF]"}`}>{isActive ? "In progress" : "Pending"}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!delivered && order.status !== "canceled" && order.status !== "cancelled" && (
              <button data-testid="simulate-progress-btn" onClick={advance}
                className="w-full mt-5 border border-[#FF3E6C] text-[#FF3E6C] font-bold py-2.5 rounded-md text-xs uppercase flex items-center justify-center gap-1.5 hover:bg-[#FF3E6C]/5 transition-colors">
                <FastForward size={14} /> Simulate Next Step (Demo)
              </button>
            )}
          </div>

          {/* RIGHT: expected delivery + horizontal stepper + map */}
          <div className="lg:col-span-2 border border-gray-200 rounded-2xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#64748B]">Expected Delivery</p>
                <p className="text-sm font-bold text-[#03A685] mt-0.5">
                  {delivered
                    ? `Delivered ${lastDoneStep?.at ? new Date(lastDoneStep.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}`
                    : `${new Date(order.eta).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} by 8:00 PM`}
                </p>
              </div>
              {!delivered && (
                <span className="bg-[#ECFDF5] text-[#047857] text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                  <Bike size={11} /> On the way
                </span>
              )}
            </div>

            {/* horizontal stepper */}
            <div className="flex items-start mb-5">
              {order.timeline.map((t, i) => {
                const Icon = STAGE_ICONS[t.label] || Circle;
                const isActive = !t.done && i === doneCount;
                return (
                  <div key={t.stage} className="flex items-start flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1.5 min-w-[64px]">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${t.done ? "bg-[#03A685] border-[#03A685] text-white" : isActive ? "bg-white border-[#FF3E6C] text-[#FF3E6C]" : "bg-white border-gray-200 text-gray-300"}`}>
                        <Icon size={14} />
                      </div>
                      <div className="text-center">
                        <p className={`text-[10px] font-semibold leading-tight ${t.done ? "text-[#03A685]" : isActive ? "text-[#FF3E6C]" : "text-[#9CA3AF]"}`}>{t.label}</p>
                        {t.at && (
                          <p className="text-[9px] text-[#9CA3AF] mt-0.5 leading-tight">
                            {new Date(t.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}<br />
                            {new Date(t.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    </div>
                    {i < order.timeline.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-1 mt-4 ${order.timeline[i + 1].done ? "bg-[#03A685]" : "bg-gray-200"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* map / delivered state */}
            {!delivered ? (
              <div data-testid="live-map" className="relative border border-gray-100 rounded-xl overflow-hidden flex-1 min-h-[176px] bg-[#EAF3EE]">
                <svg viewBox="0 0 400 190" className="w-full h-full" preserveAspectRatio="none">
                  <rect width="400" height="190" fill="#E8F0E8" />
                  <path d="M0 60 H400 M0 130 H400 M80 0 V190 M200 0 V190 M320 0 V190" stroke="#fff" strokeWidth="8" />
                  <path d="M60 150 Q140 100 200 95 T340 45" stroke="#FF3E6C" strokeWidth="3" strokeDasharray="7 5" fill="none" />
                  <circle cx="60" cy="150" r="6" fill="#282C3F" />
                  <circle cx="340" cy="45" r="6" fill="#03A685" />
                </svg>
                <div className="absolute left-[9%] bottom-[12%] flex items-center gap-1 bg-white rounded-full px-2 py-1 shadow text-[9px] font-bold text-[#282C3F]"><Warehouse size={10} /> {order.items[0].warehouse}</div>
                <div className="absolute right-[6%] top-[14%] flex items-center gap-1 bg-white rounded-full px-2 py-1 shadow text-[9px] font-bold text-[#03A685]"><Home size={10} /> {order.address.city}</div>
                <motion.div
                  className="absolute"
                  initial={false}
                  animate={{ left: `${12 + progress * 65}%`, top: `${68 - progress * 45}%` }}
                  transition={{ type: "spring", damping: 20 }}>
                  <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}
                    className="bg-[#FF3E6C] text-white rounded-full p-2 shadow-lg">
                    <Bike size={16} />
                  </motion.div>
                </motion.div>
                <button className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm shadow rounded-lg px-3 py-1.5 text-[10px] font-bold text-[#282C3F] flex items-center gap-1 hover:bg-white transition-colors">
                  <MapPin size={11} className="text-[#FF3E6C]" /> Live Tracking
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-[#ECFDF5] border border-[#03A685]/20 flex-1 min-h-[176px] flex items-center justify-center text-center px-6">
                <div>
                  <CheckCircle2 size={22} className="text-[#03A685] mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#047857]">Your order has been delivered</p>
                  <p className="text-xs text-[#7E818C] mt-1">We hope you love it!</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* trust strip row */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 justify-center border border-gray-100 rounded-2xl py-3 px-4 mb-5 bg-[#FAFAFA]">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#535766]"><CheckCircle2 size={12} className="text-[#03A685]" /> Size &amp; Quality as described</span>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#535766]"><Clock size={12} className="text-[#03A685]" /> On-time Delivery</span>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#535766]"><RotateCcw size={12} className="text-[#03A685]" /> Easy Returns</span>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#535766]"><ShieldAlert size={12} className="text-[#03A685]" /> Secure Payment</span>
        </div>

        {/* 3-column status grid: Order Details / PackGuard / AI Order Monitor */}
        <div className="grid gap-5 lg:grid-cols-3 mb-5 items-stretch">
          {/* Order & Delivery Details */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
            <p className="text-sm font-bold text-[#111827] mb-4">Order &amp; Delivery Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2.5 rounded-xl bg-[#F8FAFC] p-3">
                <MapPin size={16} className="text-[#03A685] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#64748B]">Delivery Address</p>
                  <p className="text-xs text-[#111827] mt-1">{order.address.line1}, {order.address.city}, {order.address.state} — {order.address.pin}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl bg-[#F8FAFC] p-3">
                <Wallet size={16} className="text-[#03A685] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#64748B]">Payment Method</p>
                  <p className="text-xs text-[#111827] mt-1">{order.payment_method ? order.payment_method.replace(/_/g, " ") : "Cash on Delivery"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl bg-[#F8FAFC] p-3">
                <Warehouse size={16} className="text-[#03A685] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#64748B]">Delivery Partner</p>
                  <p className="text-xs text-[#111827] mt-1">{order.delivery_partner || "Ekart Logistics"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl bg-[#F8FAFC] p-3">
                <FastForward size={16} className="text-[#03A685] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#64748B]">Tracking ID</p>
                  <p className="text-xs text-[#111827] mt-1">{order.tracking_id || order.trackingId || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* PackGuard Status (compact) */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 flex flex-col">
            <p className="text-xs font-bold uppercase tracking-wider text-[#7C3AED] mb-4">PackGuard Status</p>
            {order.packguard?.final_status ? (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-2">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ECFDF5] text-[#047857]">
                    <ShieldCheck size={22} />
                  </span>
                  <p className="text-sm font-bold text-[#111827]">{order.packguard.final_status === "AI_VERIFIED" ? "PackGuard verified" : "PackGuard review"}</p>
                  <p className="text-xs text-[#6B7280]">{order.packguard.final_status === "AI_VERIFIED" ? "This order passed verification and is cleared for dispatch." : "Verification is pending or held for review."}</p>
                </div>
                {order.packguard.final_status === "AI_VERIFIED" && (
                  <div className="mt-4 space-y-3 rounded-2xl border border-[#D1FAE5] bg-[#ECFDF5] p-4 text-sm text-[#065F46]">
                    {order.packguard.verified_at && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold">Verified on</span>
                        <span>{new Date(order.packguard.verified_at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">Product match</span>
                      <span>{typeof order.packguard.product_match === "number" ? `${order.packguard.product_match}%` : order.packguard.product_match ?? "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">Color match</span>
                      <span>{order.packguard.color_match === true ? "Matched" : order.packguard.color_match === false ? "Mismatch" : "—"}</span>
                    </div>
                    {order.packguard.expected_color && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold">Expected color</span>
                        <span>{order.packguard.expected_color}</span>
                      </div>
                    )}
                  </div>
                )}
                {order.packguard.qr_code_url && (
                  <button onClick={() => window.open(order.packguard.qr_code_url.startsWith("http") ? order.packguard.qr_code_url : window.location.origin + order.packguard.qr_code_url, "_blank")}
                    className="w-full rounded-full bg-[#10B981] px-4 py-2 text-xs font-semibold text-white hover:bg-[#059669] transition-colors mt-4">
                    View QR
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-2">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                    <Hourglass size={22} />
                  </span>
                  <p className="text-sm font-bold text-[#111827]">Waiting for Delivery Completion</p>
                  <p className="text-xs text-[#7E818C]">PackGuard verification will be available after the package is delivered and a return is initiated.</p>
                </div>
                <div className="flex items-center gap-1.5 justify-center rounded-full bg-[#F5F3FF] text-[#6D28D9] text-[10px] font-semibold px-3 py-2 mt-2">
                  <ShieldCheck size={12} /> We'll keep your purchase safe with AI verification
                </div>
              </div>
            )}
          </div>

          {/* AI Order Monitor (compact) */}
          <div className={`rounded-2xl border p-5 flex flex-col ${monitor?.delayed ? "border-amber-300 bg-amber-50/40" : "border-[#E5E7EB] bg-white"}`}>
            <p className="text-xs font-bold uppercase tracking-wider text-[#EA580C] mb-4 flex items-center gap-1.5">
              <ShieldAlert size={14} /> AI Order Monitor
            </p>
            {monitor ? (
              <>
                <div className="space-y-2 mb-3">
                  {monitor.checks.map((c) => {
                    const Icon = MONITOR_ICONS[c.factor] || Zap;
                    return (
                      <div key={c.factor} className="flex items-center justify-between gap-2 bg-[#F8FAFC] rounded-lg px-3 py-2">
                        <span className="flex items-center gap-2 text-xs font-semibold text-[#111827]">
                          <Icon size={13} className="text-[#7E818C]" /> {c.factor}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-[#7E818C]">
                          <span className={`w-1.5 h-1.5 rounded-full ${c.status === "clear" ? "bg-[#03A685]" : "bg-amber-500"}`} />
                          {c.status === "clear" ? "Normal" : c.detail}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {monitor.options.length > 0 ? (
                  <div className="space-y-2">
                    {monitor.options.map((o) => {
                      const Icon = OPTION_ICONS[o.icon] || Clock;
                      return (
                        <button key={o.id} data-testid={`monitor-option-${o.id}`} onClick={() => resolveDelay(o.id)}
                          className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3 text-left hover:border-[#FF3E6C]/60 transition-colors">
                          <Icon size={15} className="text-[#FF3E6C]" />
                          <div><p className="text-xs font-bold">{o.label}</p><p className="text-[10px] text-[#7E818C]">{o.detail}</p></div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  !delivered && (
                    <div className="mt-auto rounded-xl bg-[#FFEDD5] border border-[#FDBA74] px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-[#9A3412] font-semibold">Predicted Delivery</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs font-bold text-[#7C2D12]">
                          {new Date(order.eta).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} by 8:00 PM
                        </p>
                        <span className="text-[10px] font-bold text-[#EA580C]">On time</span>
                      </div>
                    </div>
                  )
                )}
              </>
            ) : (
              <p className="text-xs text-[#7E818C]">Loading order monitor…</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 mb-5">
          <p className="text-sm font-bold text-[#111827] mb-4">Need Help?</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <button onClick={chatSupport} className="flex items-center gap-2.5 rounded-xl border border-[#E5E7EB] px-3 py-3 text-left hover:border-[#FF3E6C]/60 transition-colors">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FEE9F0] text-[#D92D56]"><MessageCircle size={15} /></span>
              <p className="text-xs font-semibold text-[#111827]">Chat with Us</p>
            </button>
            {!delivered && order.status !== "canceled" && order.status !== "cancelled" && (
              <button onClick={cancelOrder} disabled={canceling}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition-colors ${canceling ? "border-gray-200 bg-gray-50 text-[#9CA3AF] cursor-not-allowed" : "border-[#E5E7EB] hover:border-[#F97316]/60 text-[#111827]"}`}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#B45309]"><ShieldAlert size={15} /></span>
                <p className="text-xs font-semibold text-[#111827]">Cancel Order</p>
              </button>
            )}
            <button onClick={callUs} className="flex items-center gap-2.5 rounded-xl border border-[#E5E7EB] px-3 py-3 text-left hover:border-[#22C55E]/60 transition-colors">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#16A34A]"><Phone size={15} /></span>
              <p className="text-xs font-semibold text-[#111827]">Call Us</p>
            </button>
            <button onClick={openFaq} className="flex items-center gap-2.5 rounded-xl border border-[#E5E7EB] px-3 py-3 text-left hover:border-[#3B82F6]/60 transition-colors">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#0C4A6E]"><HelpCircle size={15} /></span>
              <p className="text-xs font-semibold text-[#111827]">FAQs</p>
            </button>
          </div>
        </div>

        {delivered && (
          <div data-testid="fit-feedback-card" className="border border-gray-200 rounded-2xl p-5 mb-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#535766] mb-1">How was the fit?</p>
            <p className="text-xs text-[#7E818C] mb-4">Your feedback improves size recommendations for you and millions of shoppers.</p>
            <div className="grid grid-cols-3 gap-2">
              {[{ v: "perfect", l: "Perfect 🎯" }, { v: "loose", l: "Loose" }, { v: "tight", l: "Tight" }].map((f) => (
                <button key={f.v} data-testid={`fit-feedback-${f.v}`} onClick={() => sendFeedback(f.v)}
                  className={`py-2.5 rounded-lg text-xs font-bold border transition-colors ${feedbackGiven === f.v ? "bg-[#282C3F] text-white border-[#282C3F]" : "border-gray-300 text-[#535766] hover:border-[#282C3F]"}`}>
                  {f.l}
                </button>
              ))}
            </div>
            {suggestion && (
              <div data-testid="fit-suggestion" className="mt-3 bg-[#FF3E6C]/5 border border-[#FF3E6C]/30 rounded-lg p-3 text-xs text-[#282C3F]">
                <b className="text-[#FF3E6C]">Smart suggestion:</b> {suggestion}
              </div>
            )}
            {order.return_status ? (
              <p data-testid="return-status" className="text-xs font-bold text-amber-600 mt-4">Return requested — pickup scheduled within 2 days.</p>
            ) : (
              <button data-testid="return-btn" onClick={openReturn}
                className="w-full mt-4 border border-gray-300 text-[#535766] font-bold py-2.5 rounded-md text-xs uppercase flex items-center justify-center gap-1.5 hover:border-[#FF3E6C] hover:text-[#FF3E6C] transition-colors">
                <RotateCcw size={13} /> Return
              </button>
            )}
          </div>
        )}
      </main>

      <BottomSheet open={returnSheet} onClose={() => setReturnSheet(false)} title={qrVerificationStep ? "Verify Product" : returnReasonStep ? "Return Reason" : "Before you return — try these"} testId="return-sheet">
        {qrVerificationStep ? (
          // PRODUCT VERIFICATION STEP
          <div>
            <p className="text-xs text-[#7E818C] mb-4">
              Upload a photo of the product you received to verify it matches our records.
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center mb-4">
              {qrImage ? (
                <div className="space-y-3">
                  <img
                    src={URL.createObjectURL(qrImage)}
                    alt="Product"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  {qrVerified === true && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-[#03A685] font-semibold text-sm">
                        <CheckCircle2 size={16} /> Verified!
                      </div>
                      <p className="text-xs text-[#03A685]">✓ Return Confirmed - Images match!</p>
                      <p className="text-xs text-[#7E818C]">Your product matches our records.</p>
                    </div>
                  )}
                  {qrVerified === false && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-[#FF3E6C] font-semibold text-sm">
                        <ShieldAlert size={16} /> Not Matched
                      </div>
                      <p className="text-xs text-[#FF3E6C]">We will reach out to verify</p>
                      <p className="text-xs text-[#7E818C]">{qrVerificationDetails?.detail || "The image doesn't match our records."}</p>
                      {qrVerificationDetails?.similarity != null && (
                        <p className="text-[11px] text-[#6B7280]">Similarity: {qrVerificationDetails.similarity}%</p>
                      )}
                      {qrVerificationDetails?.mismatch_analysis?.mismatch_reasons?.length ? (
                        <div className="text-[11px] text-[#6B7280] space-y-1">
                          <p className="font-semibold text-[#4B5563]">Mismatch reasons:</p>
                          <ul className="list-disc ml-4">
                            {qrVerificationDetails.mismatch_analysis.mismatch_reasons.map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Shirt size={24} className="text-gray-400" />
                    <p className="text-sm font-semibold text-[#282C3F]">Upload Product Photo</p>
                    <p className="text-xs text-[#7E818C]">Click or drag to select</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrImageUpload}
                    disabled={qrVerifying}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            {qrImage && !qrVerifying && qrVerified === null && (
              <label className="block w-full">
                <span className="block w-full text-white font-semibold py-2.5 rounded-lg text-sm bg-[#FF3E6C] hover:bg-[#e11d48] transition-colors text-center cursor-pointer">
                  Verify Product
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrImageUpload}
                  disabled={qrVerifying}
                  className="hidden"
                />
              </label>
            )}
            {qrVerifying && (
              <div className="flex items-center justify-center gap-2 text-[#FF3E6C] font-semibold text-sm">
                <div className="animate-spin">
                  <ShieldAlert size={16} />
                </div>
                Verifying...
              </div>
            )}
            {qrVerified !== null && (
              <button
                onClick={() => {
                  if (qrVerified) {
                    setQrVerificationStep(false);
                    setReturnReasonStep(true);
                  } else {
                    setQrImage(null);
                    setQrVerified(null);
                    setQrVerificationDetails(null);
                  }
                }}
                className="w-full text-[#7E818C] font-semibold text-xs underline underline-offset-2 mt-4"
              >
                {qrVerified ? "Proceed to reason" : "Try another image"}
              </button>
            )}
          </div>
        ) : returnReasonStep ? (
          // RETURN REASON SELECTION STEP
          <div>
            <p className="text-xs text-[#7E818C] mb-4">Why do you want to return this item?</p>
            <div className="space-y-2 mb-4">
              {[
                { id: "size", label: "Size Issue", icon: "📏" },
                { id: "color", label: "Color Mismatch", icon: "🎨" },
                { id: "damaged", label: "Damaged/Defective", icon: "💔" },
                { id: "not_as_described", label: "Not as Described", icon: "❌" },
                { id: "changed_mind", label: "Changed Mind", icon: "🤔" },
                { id: "quality", label: "Quality Issue", icon: "⭐" },
              ].map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setReturnReason(reason.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                    returnReason === reason.id
                      ? "border-[#FF3E6C] bg-[#FF3E6C]/5"
                      : "border-gray-200 hover:border-[#FF3E6C]/50"
                  }`}
                >
                  <span className="text-lg">{reason.icon}</span>
                  <span className={`text-sm font-semibold ${returnReason === reason.id ? "text-[#FF3E6C]" : "text-[#282C3F]"}`}>
                    {reason.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-[#282C3F] mb-2 block">Additional Details (Optional)</label>
              <textarea
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Tell us more about your concern..."
                className="w-full p-2.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#FF3E6C]"
                rows={3}
              />
            </div>

            <button
              onClick={submitReturn}
              disabled={!returnReason}
              className={`w-full font-semibold py-2.5 rounded-lg text-sm transition-colors ${
                returnReason
                  ? "bg-[#FF3E6C] text-white hover:bg-[#e11d48]"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Confirm Return
            </button>

            <button
              onClick={() => {
                setReturnReasonStep(false);
                setQrVerificationStep(true);
                setQrVerified(null);
              }}
              className="w-full text-[#7E818C] font-semibold text-xs underline underline-offset-2 mt-3"
            >
              Back to verification
            </button>
          </div>
        ) : (
          // RETURN OPTIONS STEP
          <>
            <p className="text-xs text-[#7E818C] mb-4 -mt-2">Most fit and fabric issues can be solved without the hassle of a return.</p>
            <div className="space-y-2">
              {returnOptions?.map((o) => {
                const Icon = RETURN_ICONS[o.icon] || Sparkles;
                return (
                  <button key={o.id} data-testid={`return-option-${o.id}`}
                    onClick={() => { setReturnSheet(false); toast.success(`${o.title} — our team will reach out shortly!`); }}
                    className="w-full flex items-start gap-3 border border-gray-200 rounded-xl p-4 text-left hover:border-[#03A685]/60 transition-colors">
                    <div className="bg-[#03A685]/10 rounded-full p-2"><Icon size={15} className="text-[#03A685]" /></div>
                    <div><p className="text-sm font-bold">{o.title}</p><p className="text-xs text-[#7E818C] mt-0.5">{o.detail}</p></div>
                  </button>
                );
              })}
            </div>
            <button data-testid="confirm-return-btn" onClick={() => { setQrVerificationStep(true); setReturnSheet(true); }}
              className="w-full mt-5 text-[#7E818C] font-semibold text-xs underline underline-offset-2">
              No thanks, I still want to return
            </button>
          </>
        )}
      </BottomSheet>
      <TrustStrip />
    </div>
  );
}