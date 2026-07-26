import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, Package, ArrowRight, ShieldCheck } from "lucide-react";
import api from "../lib/api";
import { Header } from "../components/Header";
import { TrustStrip } from "../components/TrustStrip";

const confettiPieces = [
  { key: "c1", left: "14%", top: "8%", delay: 0, color: "#FF6B81" },
  { key: "c2", left: "28%", top: "4%", delay: 0.1, color: "#4ADE80" },
  { key: "c3", left: "42%", top: "10%", delay: 0.15, color: "#60A5FA" },
  { key: "c4", left: "58%", top: "6%", delay: 0.08, color: "#FACC15" },
  { key: "c5", left: "72%", top: "10%", delay: 0.12, color: "#F472B6" },
  { key: "c6", left: "84%", top: "4%", delay: 0.2, color: "#22C55E" },
];

const benefits = [
  { icon: ShieldCheck, title: "Secure Payment", detail: "Your payment is safe with us" },
  { icon: Package, title: "Easy Returns", detail: "Hassle-free returns & refunds" },
  { icon: CheckCircle2, title: "Original Products", detail: "100% authentic & quality checked" },
];

export default function OrderSuccessPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    api.get(`/orders/${id}`).then(({ data }) => setOrder(data));
  }, [id]);

  useEffect(() => {
    if (!order) return;
    setShowConfetti(true);
    setShowSuccessPopup(true);
    const timer = window.setTimeout(() => setShowConfetti(false), 2000);
    return () => window.clearTimeout(timer);
  }, [order]);

  const etaLabel = order?.eta
    ? new Date(order.eta).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
    : "Soon";

  const primaryItem = order?.items?.[0] || null;
  const orderEmail = order?.email || order?.customer_email || "your email";
  const orderPhone = order?.phone || order?.customer_phone || "your phone number";

  const copyOrderId = async () => {
    if (!order?.id) return;
    try {
      await navigator.clipboard.writeText(order.id);
      toast.success("Order ID copied");
    } catch {
      toast.error("Unable to copy order number");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-14">
        <div className="text-center">
          <div className="relative mx-auto inline-flex h-24 w-24 items-center justify-center rounded-full bg-[#ECFDF5] shadow-sm">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.15, 1] }}
              transition={{ type: "spring", damping: 14, stiffness: 120 }}
              className="text-[#16A34A]"
            >
              <CheckCircle2 size={56} />
            </motion.div>
            {showConfetti && (
              <div className="pointer-events-none absolute inset-0">
                {confettiPieces.map(({ key, left, top, delay, color }) => (
                  <motion.span
                    key={key}
                    initial={{ opacity: 0, y: -16, scale: 0.8 }}
                    animate={{ opacity: [0, 1, 0], y: [0, -28, -52], rotate: 360 }}
                    transition={{ delay, duration: 1.5, ease: "easeOut" }}
                    className="absolute h-2.5 w-2.5 rounded-full"
                    style={{ left, top, backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>
          <h1 data-testid="order-success-title" className="font-heading font-extrabold text-3xl text-[#111827] mt-6">
            Order Placed Successfully!
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-[#64748B] mt-3">
            Thank you for shopping with confidence. You bought BuyReady-verified items.
          </p>
        </div>

        {order && (
          <div className="mt-10 space-y-6">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[28px] border border-[#D1FAE5] bg-[#ECFDF5] p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-[#16A34A]">Delivery promise</p>
                <p className="mt-4 text-lg font-bold text-[#111827]">Your order is confirmed and reserved for fast dispatch.</p>
                <p className="mt-3 text-sm text-[#475569]">
                  Expected delivery by <span className="font-semibold text-[#111827]">{etaLabel}</span> from the nearest warehouse.
                </p>
                <div className="mt-5 flex flex-col gap-3 rounded-3xl border border-[#D1FAE5] bg-white p-4 text-sm text-[#065F46]">
                  <div className="inline-flex items-center gap-2 font-semibold">
                    <CheckCircle2 size={16} /> 100% original products
                  </div>
                  <div className="inline-flex items-center gap-2 font-semibold">
                    <CheckCircle2 size={16} /> easy returns
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-[#16A34A]">Order summary</p>
                    <p className="mt-3 text-sm font-semibold text-[#111827]">Order {order.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={copyOrderId}
                    className="rounded-full border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2 text-[11px] font-semibold text-[#0F172A] transition hover:bg-[#E2E8F0]"
                  >
                    Copy
                  </button>
                </div>
                <p className="mt-4 text-sm text-[#475569]">
                  {order.items.length} item{order.items.length > 1 ? "s" : ""} • ₹{order.total} • {order.payment_method.toUpperCase()}
                </p>
                {order.buyready_score != null && (
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#ECFDF5] px-3 py-2 text-[11px] font-semibold text-[#065F46]">
                    <ShieldCheck size={14} /> BuyReady Confidence {order.buyready_score}%
                  </div>
                )}
                <p className="mt-4 text-xs leading-6 text-[#64748B]">
                  Orders with strong BuyReady confidence are more likely to fit well, arrive quickly, and feel right first time.
                </p>
              </div>
            </div>

            {primaryItem && (
              <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-[#94A3B8]">Item in this order</p>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <img src={primaryItem.image} alt={primaryItem.name} className="h-24 w-24 rounded-3xl object-cover bg-[#F8FAFC]" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-[#111827]">{primaryItem.brand || primaryItem.name}</p>
                    <p className="mt-1 text-sm text-[#475569]">{primaryItem.name}</p>
                    <p className="mt-3 text-sm text-[#475569]">Size: {primaryItem.size || "M"} • Qty: {primaryItem.qty || 1}</p>
                    <p className="mt-3 text-lg font-semibold text-[#111827]">₹{primaryItem.price}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              {benefits.map(({ icon: Icon, title, detail }) => (
                <div key={title} className="rounded-[24px] border border-[#E5E7EB] bg-white p-4 text-left shadow-sm">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#0F172A]">
                    <Icon size={18} />
                  </div>
                  <p className="mt-4 font-semibold text-[#111827]">{title}</p>
                  <p className="mt-2 text-sm text-[#64748B]">{detail}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                to={`/track/${id}`}
                data-testid="track-order-btn"
                className="inline-flex items-center justify-center gap-2 rounded-3xl bg-[#FF3E6C] px-6 py-4 text-sm font-semibold uppercase text-white transition hover:bg-[#E11D48]"
              >
                Track Order <ArrowRight size={16} />
              </Link>
              <Link
                to="/"
                data-testid="continue-shopping-btn"
                className="inline-flex items-center justify-center gap-2 rounded-3xl border border-[#D1D5DB] bg-white px-6 py-4 text-sm font-semibold uppercase text-[#0F172A] transition hover:bg-[#F8FAFC]"
              >
                Continue Shopping
              </Link>
            </div>

            <p className="text-center text-xs text-[#64748B]">
              We&apos;ll send order details to {orderEmail} and {orderPhone}
            </p>
          </div>
        )}
      </main>
      <TrustStrip />
      {showSuccessPopup && order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="relative w-full max-w-xl min-h-[28rem] rounded-[32px] bg-white px-10 py-10 text-center shadow-2xl">
            <button
              type="button"
              onClick={() => setShowSuccessPopup(false)}
              className="absolute right-5 top-5 text-[#6B7280] hover:text-[#111827]"
              aria-label="Close popup"
            >
              ×
            </button>
            <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-[#DCFCE7] text-[#16A34A]">
              {primaryItem?.image ? (
                <img src={primaryItem.image} alt={primaryItem.name} className="h-24 w-24 rounded-full object-cover" />
              ) : (
                <CheckCircle2 size={40} />
              )}
            </div>
            <h2 className="text-2xl font-bold text-[#111827]">Order Delivered</h2>
            <p className="mt-3 text-sm text-[#6B7280]">We hope you love your purchase.</p>
            <Link
              to="/"
              onClick={() => setShowSuccessPopup(false)}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[#FF3E6C] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#E11D48]"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
