import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, Circle, Bike, Warehouse, Home, Zap, MapPin, Clock, FastForward, ShieldAlert, Sparkles, Repeat, Shirt, Headphones, RotateCcw } from "lucide-react";
import api, { apiError } from "../lib/api";
import { Header } from "../components/Header";
import { TrustStrip } from "../components/TrustStrip";
import { BottomSheet } from "../components/BottomSheet";

const OPTION_ICONS = { zap: Zap, "map-pin": MapPin, clock: Clock };
const RETURN_ICONS = { sparkles: Sparkles, repeat: Repeat, shirt: Shirt, headphones: Headphones };

export default function TrackOrderPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [monitor, setMonitor] = useState(null);
  const [returnSheet, setReturnSheet] = useState(false);
  const [returnFormOpen, setReturnFormOpen] = useState(false);
  const [returnOptions, setReturnOptions] = useState(null);
  const [returnIssue, setReturnIssue] = useState("size");
  const [returnReason, setReturnReason] = useState("");
  const [returnPhoto, setReturnPhoto] = useState(null);
  const [returnError, setReturnError] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data);
      setFeedbackGiven(data.fit_feedback);
    } catch (error) {
      const message = apiError(error);
      setLoadError(message);
      toast.error(message);
      return;
    }

    try {
      const { data } = await api.get(`/orders/${id}/monitor`);
      setMonitor(data);
    } catch (error) {
      setMonitor(null);
      toast.error(apiError(error));
    }
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
    setReturnError(null);
    setReturnIssue("size");
    setReturnReason("");
    setReturnPhoto(null);
    setReturnFormOpen(true);
    const { data } = await api.get(`/orders/${id}/return-options`);
    setReturnOptions(data.options);
    setReturnSheet(true);
  };

  const confirmReturn = async () => {
    setReturnError(null);
    if (returnIssue === "misproduct" && !returnPhoto) {
      setReturnError("Please attach a photo of the returned item so we can verify the match.");
      return;
    }

    const form = new FormData();
    form.append("issue_type", returnIssue);
    if (returnReason) {
      form.append("reason", returnReason);
    }
    if (returnPhoto) {
      form.append("user_image", returnPhoto);
    }

    try {
      const { data } = await api.post(`/orders/${id}/return`, form);
      setReturnSheet(false);
      setReturnFormOpen(false);
      load();
      if (data.accepted) {
        toast.success("Return accepted. Pickup will be scheduled.");
      } else {
        toast.error(data.verification_result?.reason || "Return rejected. Our team will review your submission.");
      }
    } catch (e) {
      setReturnError(apiError(e));
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-[#FEE2E2] text-[#B91C1C] mx-auto">
            <PackageCheck size={28} />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-[#111827]">Unable to load order</h1>
          <p className="mt-3 text-sm text-[#6B7280]">{loadError}</p>
          <button onClick={load} className="mt-8 rounded-3xl bg-[#FF3E6C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#E11D48] transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return <div className="min-h-screen bg-white"><Header /><div className="max-w-2xl mx-auto px-4 py-10"><div className="h-64 bg-gray-100 rounded-2xl animate-pulse" /></div></div>;
  }

  const delivered = order.status === "delivered";
  const doneCount = order.timeline.filter((t) => t.done).length;
  const progress = (doneCount - 1) / (order.timeline.length - 1);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="font-heading font-bold text-xl text-[#282C3F]">Track Order</h1>
        <p className="text-xs text-[#7E818C] mt-0.5 mb-6">{order.id} • {order.items.length} item{order.items.length > 1 ? "s" : ""} • ₹{order.total}</p>

        <div className="border border-gray-200 rounded-2xl p-5 mb-5">
          <div className="flex gap-3 mb-5">
            <img src={order.items[0].image} alt="" className="w-14 h-18 rounded-lg object-cover bg-[#F5F5F6]" />
            <div>
              <p className="text-sm font-bold">{order.items[0].brand}</p>
              <p className="text-xs text-[#7E818C]">{order.items[0].name}</p>
              <p className="text-xs font-bold text-[#03A685] mt-1">
                {delivered ? "Delivered" : `ETA: ${new Date(order.eta).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}`}
              </p>
            </div>
          </div>

          <div className="space-y-0" data-testid="order-timeline">
            {order.timeline.map((t, i) => (
              <div key={t.stage} className="flex gap-3">
                <div className="flex flex-col items-center">
                  {t.done ? <CheckCircle2 size={20} className="text-[#03A685]" /> : <Circle size={20} className="text-gray-300" />}
                  {i < order.timeline.length - 1 && <div className={`w-0.5 h-8 ${order.timeline[i + 1].done ? "bg-[#03A685]" : "bg-gray-200"}`} />}
                </div>
                <div className="pb-2">
                  <p className={`text-sm font-semibold ${t.done ? "text-[#282C3F]" : "text-[#7E818C]"}`}>{t.label}</p>
                  {t.at && <p className="text-[10px] text-[#7E818C]">{new Date(t.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>}
                </div>
              </div>
            ))}
          </div>

          {!delivered && (
            <button data-testid="simulate-progress-btn" onClick={advance}
              className="w-full mt-4 border border-[#FF3E6C] text-[#FF3E6C] font-bold py-2.5 rounded-md text-xs uppercase flex items-center justify-center gap-1.5 hover:bg-[#FF3E6C]/5 transition-colors">
              <FastForward size={14} /> Simulate Next Step (Demo)
            </button>
          )}
        </div>

        {!delivered && (
          <div data-testid="live-map" className="relative border border-gray-200 rounded-2xl overflow-hidden mb-5 h-48 bg-[#EAF3EE]">
            <svg viewBox="0 0 400 190" className="w-full h-full">
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
            <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-[10px] font-bold text-[#282C3F]">
              Live • Courier en route
            </div>
          </div>
        )}

        {monitor && !delivered && (
          <div data-testid="ai-monitor" className={`border rounded-2xl p-5 mb-5 ${monitor.delayed ? "border-amber-300 bg-amber-50/50" : "border-[#03A685]/30 bg-[#03A685]/[0.04]"}`}>
            <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-3 text-[#282C3F]">
              <ShieldAlert size={14} className={monitor.delayed ? "text-amber-600" : "text-[#03A685]"} /> AI Order Monitor
            </p>
            <p className={`text-xs font-semibold mb-3 ${monitor.delayed ? "text-amber-700" : "text-[#03A685]"}`}>{monitor.message}</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {monitor.checks.map((c) => (
                <div key={c.factor} className="bg-white border border-gray-100 rounded-lg p-2.5">
                  <p className="text-[10px] font-bold flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${c.status === "clear" ? "bg-[#03A685]" : "bg-amber-500"}`} /> {c.factor}
                  </p>
                  <p className="text-[9px] text-[#7E818C] mt-0.5 leading-snug">{c.detail}</p>
                </div>
              ))}
            </div>
            {monitor.options.length > 0 && (
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
            )}
          </div>
        )}

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
              <div data-testid="return-status" className="mt-4 text-xs font-bold">
                {order.return_status === "accepted" ? (
                  <p className="text-[#03A685]">Return accepted — pickup scheduled within 2 days.</p>
                ) : order.return_status === "rejected" ? (
                  <p className="text-amber-600">Return rejected — our team will contact you with next steps.</p>
                ) : (
                  <p className="text-amber-600">Return requested — pickup scheduled within 2 days.</p>
                )}
                {order.return_request?.verification_result?.mismatchReasons?.length > 0 && (
                  <p className="text-[10px] text-[#7E818C] mt-2">Mismatched details: {order.return_request.verification_result.mismatchReasons.join(", ")}</p>
                )}
              </div>
            ) : (
              <button data-testid="return-btn" onClick={() => navigate(`/track/${id}/return`)}
                className="w-full mt-4 border border-gray-300 text-[#535766] font-bold py-2.5 rounded-md text-xs uppercase flex items-center justify-center gap-1.5 hover:border-[#FF3E6C] hover:text-[#FF3E6C] transition-colors">
                <RotateCcw size={13} /> Return this item
              </button>
            )}
          </div>
        )}
      </main>

      <BottomSheet open={returnSheet} onClose={() => { setReturnSheet(false); setReturnFormOpen(false); }} title="Return this item" testId="return-sheet">
        <div className="space-y-4">
          <p className="text-xs text-[#7E818C]">Select the issue and upload a photo if the wrong product was delivered.</p>
          <div className="space-y-2">
            {[
              { value: "size", label: "Size issue" },
              { value: "misproduct", label: "Wrong product delivered" },
            ].map((option) => (
              <button key={option.value} type="button" onClick={() => setReturnIssue(option.value)}
                className={`w-full text-left rounded-xl border p-4 ${returnIssue === option.value ? "border-[#FF3E6C] bg-[#FFEBF0]" : "border-gray-200 bg-white"}`}>
                <p className="text-sm font-semibold">{option.label}</p>
              </button>
            ))}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#535766] uppercase tracking-[0.12em] mb-2">Tell us more</label>
            <textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="Example: delivered the wrong color or fit is too small"
              className="w-full min-h-[100px] rounded-xl border border-gray-200 p-3 text-sm text-[#282C3F]" />
          </div>
          {returnIssue === "misproduct" && (
            <div>
              <label className="block text-[11px] font-bold text-[#535766] uppercase tracking-[0.12em] mb-2">Upload a photo</label>
              <input type="file" accept="image/*" onChange={(e) => setReturnPhoto(e.target.files?.[0] || null)}
                className="w-full text-sm text-[#282C3F]" />
              {returnPhoto && <p className="text-[11px] text-[#7E818C] mt-2">Selected: {returnPhoto.name}</p>}
            </div>
          )}
          {returnError && <p className="text-[11px] text-rose-600">{returnError}</p>}
          <button data-testid="confirm-return-btn" onClick={confirmReturn}
            className="w-full mt-2 bg-[#FF3E6C] text-white font-semibold rounded-md py-3 text-xs uppercase">
            Submit return request
          </button>
          <button type="button" onClick={() => { setReturnSheet(false); setReturnFormOpen(false); }}
            className="w-full mt-2 text-[#7E818C] font-semibold text-xs underline underline-offset-2">
            Cancel return
          </button>
        </div>
      </BottomSheet>
      <TrustStrip />
    </div>
  );
}
