import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, AlertTriangle, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import api, { apiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { getVerificationMismatchState } from "./opsDashboardMismatch";

const backendBase = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";
const resolveBackendUploadUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("http")) return url;
  return `${backendBase}${url}`;
};

export default function OpsDashboardPage() {
  const navigate = useNavigate();
  const { orderId: routeOrderId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState({ pending_verification: [], disputes: [], total_orders: 0 });
  const [selectedTab, setSelectedTab] = useState("packguard");
  const [warehouseUploads, setWarehouseUploads] = useState({});
  const [warehousePreviews, setWarehousePreviews] = useState({});
  const [verificationResults, setVerificationResults] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const chooseInputRefs = useRef({});
  const captureInputRefs = useRef({});
  const [reviewForm, setReviewForm] = useState({ dispute_reason: "", observed_brand: "", observed_color: "", damage_reported: false, notes: "" });
  const [message, setMessage] = useState("");
  const [orderViewMode, setOrderViewMode] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewMode, setViewMode] = useState("landing");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const setOrderOption = (orderId, option) => {
    setOrderViewMode((prev) => ({ ...prev, [orderId]: option }));
  };

  const isVerificationPage = Boolean(routeOrderId);
  const routeOrder = useMemo(() => {
    if (!routeOrderId) return null;
    return (dashboard.pending_verification || []).find((item) => item.id === routeOrderId) || null;
  }, [dashboard.pending_verification, routeOrderId]);

  useEffect(() => {
    if (!routeOrderId) {
      setSelectedOrder(null);
      return;
    }
    if (routeOrder) setSelectedOrder(routeOrder);
  }, [routeOrderId, routeOrder]);

  const handleStartVerification = async (orderId) => {
    setSubmitting(true);
    try {
      await submitPackguard(orderId);
    } finally {
      setSubmitting(false);
    }
  };

  const refreshDashboard = async () => {
    try {
      const { data } = await api.get("/ops/dashboard");
      const nextDashboard = {
        pending_verification: Array.isArray(data?.pending_verification) ? [...data.pending_verification] : [],
        disputes: Array.isArray(data?.disputes) ? [...data.disputes] : [],
        total_orders: data?.total_orders ?? 0,
        kpis: data?.kpis ?? {},
      };
      console.info("[OpsDashboard] dashboard refresh", {
        total: nextDashboard.total_orders,
        pending: nextDashboard.kpis?.pending ?? nextDashboard.kpis?.pending_packguard ?? 0,
        verified: nextDashboard.kpis?.verified ?? nextDashboard.kpis?.verified_today ?? 0,
        rejected: nextDashboard.kpis?.rejected ?? nextDashboard.kpis?.dispatch_blocked ?? 0,
        ordersLength: nextDashboard.pending_verification.length,
        tableSource: "dashboard.pending_verification",
      });
      setDashboard(nextDashboard);
    } catch (error) {
      setMessage(apiError(error));
    }
  };

  const handlePrintLabel = (order, qrCodeUrl) => {
    const qrSrc = qrCodeUrl ? resolveBackendUploadUrl(qrCodeUrl) : "";
    const html = `
      <html>
        <head>
          <title>Print Packing Label</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; }
            .label { max-width: 520px; border: 1px solid #e5e7eb; border-radius: 24px; padding: 24px; }
            .header { margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 22px; }
            .section { margin-bottom: 18px; }
            .section h2 { margin: 0 0 8px; font-size: 14px; letter-spacing: 0.12em; text-transform: uppercase; color: #6b7280; }
            .section p { margin: 4px 0; font-size: 14px; color: #111827; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .badge { display: inline-block; padding: 6px 12px; background: #dcfce7; color: #166534; border-radius: 9999px; font-size: 12px; font-weight: 700; }
            .qr { margin-top: 18px; display: block; width: 180px; height: 180px; object-fit: contain; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header">
              <div class="badge">Packing Label</div>
              <h1>Order #${order.id}</h1>
            </div>
            <div class="section">
              <p style="font-weight:700;">${order.product_name || order.item || "Unknown product"}</p>
              <p>SKU: ${order.product_sku || order.sku || "N/A"}</p>
              <p>Size: ${order.ordered_size || "—"}</p>
              <p>Quantity: ${order.quantity || 1}</p>
            </div>
            <div class="section">
              <p style="font-weight:700;">Customer</p>
              <p>${order.customer_name || "—"}</p>
              <p>${order.delivery_address || "—"}</p>
            </div>
            <div class="section">
              <p style="font-weight:700;">Warehouse</p>
              <p>${order.warehouse_name || order.warehouse_location || "—"}</p>
            </div>
            ${qrSrc ? `<div class="section"><p style="font-weight:700;">Verification QR</p><img src="${qrSrc}" class="qr" alt="Verification QR" /></div>` : ""}
          </div>
        </body>
      </html>
    `;
    const printWindow = window.open("", "_blank", "width=700,height=900");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const handleMarkReady = async () => {
    setSubmitting(true);
    try {
      await refreshDashboard();
      returnToDashboard("Order marked ready to pack.");
    } finally {
      setSubmitting(false);
    }
  };

  const clearVerificationUpload = (orderId) => {
    setWarehouseUploads((prev) => ({ ...prev, [orderId]: null }));
    setWarehousePreviews((prev) => ({ ...prev, [orderId]: null }));
    setVerificationResults((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    setMessage("");
  };

  const returnToDashboard = (note) => {
    if (note) setMessage(note);
    setSelectedOrder(null);
    navigate("/ops");
  };

  const savedPackguard = routeOrder?.packguard || null;
  const verificationResult = verificationResults[routeOrderId] || savedPackguard;
  const verificationStatus = verificationResult?.final_status || verificationResult?.status || "pending";
  const verificationMatch = verificationStatus === "AI_VERIFIED" || verificationResult?.status === "verified";
  const verificationMismatch = verificationStatus?.toLowerCase().includes("mismatch") || verificationResult?.status === "verification_failed" || verificationStatus === "verification_failed";
  const verificationComplete = verificationMatch || verificationMismatch;
  const verificationUnknown = Boolean(verificationStatus && !verificationMatch && !verificationMismatch && verificationStatus !== "pending");
  const { mismatchColorOnly, mismatchProduct } = getVerificationMismatchState({
    verificationComplete,
    verificationMatch,
    verificationResult,
  });
  const mismatchSummaryClasses = mismatchProduct
    ? "rounded-[32px] border border-[#FEE2E8] bg-white p-6 shadow-[0_25px_90px_rgba(15,23,42,0.06)]"
    : "rounded-[32px] border border-[#FEF3C7] bg-white p-6 shadow-[0_25px_90px_rgba(15,23,42,0.06)]";
  const mismatchSummaryBadgeClasses = mismatchProduct
    ? "inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
    : "inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700";
  const mismatchSummaryTextClass = mismatchProduct ? "text-rose-950" : "text-amber-950";
  const orderCatalogImage = routeOrder?.product_image || routeOrder?.items_summary?.[0]?.image || routeOrder?.product_image;
  const orderName = routeOrder?.product_name || routeOrder?.item || routeOrder?.items_summary?.[0]?.name || "Unknown product";
  const orderSku = routeOrder?.product_sku || routeOrder?.sku || routeOrder?.items_summary?.[0]?.sku || "—";
  const orderBrand = routeOrder?.product_brand || routeOrder?.brand || routeOrder?.merchant || "—";
  const orderColor = routeOrder?.product_color || routeOrder?.ordered_color || routeOrder?.color || routeOrder?.colour || "—";
  const orderCategory = routeOrder?.product_category || routeOrder?.category || "—";
  const orderDate = routeOrder?.created_at || routeOrder?.order_date || routeOrder?.ordered_at || "—";
  const orderPrice = routeOrder?.product_price || routeOrder?.price || routeOrder?.item_price || routeOrder?.amount || null;
  const canStartVerification = Boolean(warehouseUploads[routeOrderId]);
  const previewImage = warehousePreviews[routeOrderId];

  const verificationSummaryPanel = !verificationResult || !verificationComplete ? (
    <div className="flex flex-col items-center text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Upload image</p>
      <h3 className="mt-3 text-2xl font-bold text-slate-950">Ask AI to verify</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500">Upload a photo of the packed item, then ask AI to validate it.</p>

      {!previewImage ? (
        <label
          className="group mt-8 flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-[#fff5f9] transition hover:border-pink-300"
          style={{ width: 280, height: 220 }}
        >
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleWarehouseImageChange(routeOrderId, e.target.files?.[0] || null)}
            className="hidden"
          />
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#FF3E6C] shadow-sm">
            <ShieldCheck size={26} />
          </div>
          <p className="mt-4 text-base font-semibold text-slate-950">📷 Upload Image</p>
          <div className="mt-4 inline-flex items-center justify-center rounded-full border border-pink-200 bg-pink-50 px-5 py-2 text-sm font-semibold text-[#be185d]">
            Choose file
          </div>
        </label>
      ) : (
        <div className="mt-8 flex flex-col items-center">
          <div className="overflow-hidden rounded-[24px] border border-slate-200 shadow-sm" style={{ width: 280, height: 220 }}>
            <img src={previewImage} alt="Warehouse upload preview" className="h-full w-full object-cover" />
          </div>
          <button
            onClick={() => clearVerificationUpload(routeOrderId)}
            className="mt-3 text-xs font-semibold text-slate-400 underline underline-offset-2 hover:text-slate-600"
          >
            Change image
          </button>
          <button
            onClick={() => handleStartVerification(routeOrderId)}
            disabled={!canStartVerification || submitting}
            className="mt-6 w-full max-w-[280px] rounded-3xl bg-[#FF3E6C] px-6 py-4 text-sm font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Verifying package..." : "🤖 Ask AI"}
          </button>
        </div>
      )}
    </div>
  ) : verificationMatch ? (
    <div className="rounded-[32px] border border-[#E7F6EF] bg-white p-6 shadow-[0_25px_90px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">AI Verification Summary</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">AI verified the package</h3>
          <p className="mt-2 text-sm text-slate-600">The package image matches the catalog product.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 size={16} /> Verified
        </span>
      </div>

      <div className="mt-6 rounded-[28px] border border-emerald-100 bg-emerald-50/70 p-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.32em] text-emerald-700">Verification Result</p>
        <p className="mt-3 flex items-center justify-center gap-2 text-lg font-semibold text-[#047857]">
          <ShieldCheck size={20} /> Package Verified
        </p>
        <p className="mt-1 text-sm text-emerald-700/80">Image successfully matched with the catalog reference.</p>
        {verificationResult.qr_code_url ? (
          <div className="mx-auto mt-6 inline-flex items-center justify-center rounded-[24px] border border-emerald-200 bg-white p-4" style={{ width: 200, height: 200 }}>
            <img src={resolveBackendUploadUrl(verificationResult.qr_code_url)} alt="Verification QR" className="h-full w-full object-contain" />
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-500">No QR code is available.</p>
        )}
      </div>

      <div className="mt-6 divide-y divide-slate-100 rounded-[20px] border border-slate-200 bg-[#F8FAFC] px-5">
        <div className="flex items-center justify-between py-3 text-sm">
          <span className="flex items-center gap-2 text-slate-600"><CheckCircle2 size={14} className="text-emerald-600" /> Confidence</span>
          <span className="font-semibold text-emerald-700">{verificationResult.confidence ? `${verificationResult.confidence}%` : "—"}</span>
        </div>
        <div className="flex items-center justify-between py-3 text-sm">
          <span className="flex items-center gap-2 text-slate-600"><CheckCircle2 size={14} className="text-emerald-600" /> Product Match</span>
          <span className="font-semibold text-emerald-700">{verificationResult.product_match ? `${verificationResult.product_match}%` : "—"}</span>
        </div>
        <div className="flex items-center justify-between py-3 text-sm">
          <span className="flex items-center gap-2 text-slate-600"><CheckCircle2 size={14} className="text-emerald-600" /> Expected Color</span>
          <span className="font-semibold text-slate-950">{verificationResult.expected_color || orderColor || "—"}</span>
        </div>
        <div className="flex items-center justify-between py-3 text-sm">
          <span className="flex items-center gap-2 text-slate-600"><CheckCircle2 size={14} className="text-emerald-600" /> Color Match</span>
          <span className="font-semibold text-emerald-700">{verificationResult.color_match ? "Matched" : "Mismatch"}</span>
        </div>
        <div className="flex items-center justify-between py-3 text-sm">
          <span className="text-slate-500">SKU / Order ID</span>
          <span className="font-semibold text-slate-950">#{routeOrder.id}</span>
        </div>
        <div className="flex items-center justify-between py-3 text-sm">
          <span className="text-slate-500">Verification Time</span>
          <span className="font-semibold text-slate-950">{orderDate}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button onClick={() => handlePrintLabel(routeOrder, verificationResult.qr_code_url)} className="rounded-3xl border border-[#FF4E7A] bg-white px-6 py-4 text-sm font-semibold text-[#FF4E7A] shadow-sm transition hover:bg-[#ffebf3]">Print QR Label</button>
        <button onClick={handleMarkReady} className="rounded-3xl bg-[#10b981] px-6 py-4 text-sm font-semibold text-white shadow-lg">Approve & Dispatch</button>
      </div>
    </div>
  ) : (
    <div className={mismatchSummaryClasses}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-amber-500">AI Verification Summary</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">Verification mismatch detected</h3>
          <p className="mt-2 text-sm text-slate-600">AI detected a mismatch in the packed item. Review the mismatch details below.</p>
        </div>
        <span className={mismatchSummaryBadgeClasses}>
          <AlertTriangle size={16} /> {mismatchProduct ? "Product Mismatch" : "Color Mismatch"}
        </span>
      </div>

      <div className={`mt-6 rounded-[28px] border ${mismatchProduct ? "border-[#FEE2E8] bg-rose-50/70" : "border-amber-100 bg-amber-50/70"} p-6 text-center`}>
        <p className={`text-[10px] uppercase tracking-[0.32em] ${mismatchProduct ? "text-rose-700" : "text-amber-700"}`}>Verification Result</p>
        <p className={`mt-3 flex items-center justify-center gap-2 text-lg font-semibold ${mismatchSummaryTextClass}`}>
          <AlertTriangle size={20} /> {mismatchProduct ? "Product mismatch detected" : "Color mismatch detected"}
        </p>
        <p className={`mt-1 text-sm ${mismatchProduct ? "text-rose-700/80" : "text-amber-700/80"}`}>Please inspect the package and update the order if needed before dispatch.</p>
      </div>

      <div className="mt-6 divide-y divide-slate-100 rounded-[20px] border border-slate-200 bg-[#F8FAFC] px-5">
        <div className="flex items-center justify-between py-3 text-sm">
          <span className="flex items-center gap-2 text-slate-600"><CheckCircle2 size={14} className="text-emerald-600" /> Confidence</span>
          <span className="font-semibold text-emerald-700">{verificationResult.confidence ? `${verificationResult.confidence}%` : "—"}</span>
        </div>
        <div className="flex items-center justify-between py-3 text-sm">
          <span className="flex items-center gap-2 text-slate-600"><CheckCircle2 size={14} className="text-emerald-600" /> Product Match</span>
          <span className="font-semibold text-emerald-700">{verificationResult.product_match ? `${verificationResult.product_match}%` : "—"}</span>
        </div>
        <div className="flex items-center justify-between py-3 text-sm">
          <span className="flex items-center gap-2 text-slate-600"><CheckCircle2 size={14} className="text-emerald-600" /> Expected Color</span>
          <span className="font-semibold text-slate-950">{verificationResult.expected_color || orderColor || "—"}</span>
        </div>
        <div className="flex items-center justify-between py-3 text-sm">
          <span className="flex items-center gap-2 text-slate-600"><CheckCircle2 size={14} className="text-emerald-600" /> Color Match</span>
          <span className="font-semibold text-emerald-700">{verificationResult.color_match ? "Matched" : "Mismatch"}</span>
        </div>
        <div className="flex items-center justify-between py-3 text-sm">
          <span className="text-slate-500">SKU / Order ID</span>
          <span className="font-semibold text-slate-950">#{routeOrder.id}</span>
        </div>
        <div className="flex items-center justify-between py-3 text-sm">
          <span className="text-slate-500">Verification Time</span>
          <span className="font-semibold text-slate-950">{orderDate}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button onClick={() => handlePrintLabel(routeOrder, verificationResult.qr_code_url)} className="rounded-3xl border border-[#FF4E7A] bg-white px-6 py-4 text-sm font-semibold text-[#FF4E7A] shadow-sm transition hover:bg-[#ffebf3]">Print QR Label</button>
      </div>
    </div>
  );

  // Check if order status is pending/unverified
  const orderStatus = (routeOrder?.dispatch_status || routeOrder?.packguard?.status || routeOrder?.status || "pending")?.toLowerCase();
  const isPending = orderStatus.includes("pending") || orderStatus === "placed";

  // Dynamic status badge for the Product Details panel (reflects verification outcome)
  const dispatchStatusLabel = verificationComplete
    ? (verificationMatch ? "Verified for Dispatch" : mismatchProduct ? "Rejected - Product Mismatch" : mismatchColorOnly ? "Rejected - Color Mismatch" : "Rejected - Mismatch")
    : "Pending Verification";
  const dispatchStatusClasses = verificationComplete
    ? (verificationMatch ? "bg-emerald-50 text-emerald-700" : mismatchProduct ? "bg-rose-50 text-rose-700" : mismatchColorOnly ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700")
    : "bg-[#ffecf1] text-[#be185d]";

  const openQrLink = () => {
    if (verificationResult?.qr_code_url) {
      window.open(resolveBackendUploadUrl(verificationResult.qr_code_url), "_blank");
    }
  };

  const handleReject = () => {
    setMessage("Item rejected and held for manual review.");
    returnToDashboard();
  };

  const handleManualReview = () => {
    setMessage("Manual review requested. Please escalate this order to the review queue.");
  };

  useEffect(() => {
    if (!user) return;
    if (user?.role && !["operator", "manager"].includes(user.role)) {
      navigate("/");
      return;
    }
    loadDashboard();
  }, [user, navigate]);

  useEffect(() => {
    const handleOrderCreated = async (event) => {
      const createdOrder = event?.detail;
      console.info("[OpsDashboard] order-created event", { orderId: createdOrder?.id, source: "checkout", createdOrder });

      // Immediately optimistically insert the created order into the dashboard state
      if (createdOrder && createdOrder.id) {
        setDashboard((prev) => {
          const prevList = Array.isArray(prev.pending_verification) ? prev.pending_verification : [];
          if (prevList.some((o) => o.id === createdOrder.id)) {
            return prev;
          }
          // Minimal mapping to the display shape expected by the table
          const mapped = {
            id: createdOrder.id,
            user_id: createdOrder.user_id,
            status: createdOrder.status,
            customer_name: (createdOrder.address || {}).name || (createdOrder.user || {}).name || "",
            product_image: (createdOrder.items || [])[0]?.image || (createdOrder.items || [])[0]?.image_url,
            product_name: (createdOrder.items || [])[0]?.name,
            items_summary: (createdOrder.items || []).map((it) => ({ name: it.name, sku: it.sku, qty: it.qty, image: it.image })),
            packguard: createdOrder.packguard || null,
            dispatch_blocked: createdOrder.dispatch_blocked || false,
          };
          const nextPending = [mapped, ...prevList];
          const nextKpis = Object.assign({}, prev.kpis || {});
          nextKpis.total = (nextKpis.total || prev.total_orders || 0) + 1;
          nextKpis.pending = (nextKpis.pending || 0) + 1;
          return { ...prev, pending_verification: nextPending, total_orders: (prev.total_orders || 0) + 1, kpis: nextKpis };
        });
      }

      // Then refresh from server to reconcile authoritative state
      try {
        await refreshDashboard();
      } catch (e) {
        console.warn('[OpsDashboard] refreshDashboard failed after order-created event', e);
      }
    };

    window.addEventListener("buyready:order-created", handleOrderCreated);
    return () => window.removeEventListener("buyready:order-created", handleOrderCreated);
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/ops/dashboard");
      const nextDashboard = {
        pending_verification: Array.isArray(data?.pending_verification) ? [...data.pending_verification] : [],
        disputes: Array.isArray(data?.disputes) ? [...data.disputes] : [],
        total_orders: data?.total_orders ?? 0,
        kpis: data?.kpis ?? {},
      };
      console.info("[OpsDashboard] loadDashboard", {
        total: nextDashboard.total_orders,
        pending: nextDashboard.kpis?.pending ?? nextDashboard.kpis?.pending_packguard ?? 0,
        verified: nextDashboard.kpis?.verified ?? nextDashboard.kpis?.verified_today ?? 0,
        rejected: nextDashboard.kpis?.rejected ?? nextDashboard.kpis?.dispatch_blocked ?? 0,
        ordersLength: nextDashboard.pending_verification.length,
        tableSource: "dashboard.pending_verification",
      });
      setDashboard(nextDashboard);
    } catch (error) {
      setMessage(apiError(error));
    } finally {
      setLoading(false);
    }
  };

  const relevantOrders = useMemo(() => {
    if (selectedTab === "packguard") return dashboard.pending_verification || [];
    return dashboard.disputes || [];
  }, [dashboard, selectedTab]);

  const filteredOrders = useMemo(() => {
    return relevantOrders.filter((order) => {
      const query = searchQuery.trim().toLowerCase();
      const label = ((order.packguard?.final_status || order.status || order.dispatch_status || "pending") + "").toLowerCase();
      const matchesStatus = statusFilter === "All" || (statusFilter === "Verified" && (label.includes("verified") || label.includes("packed") || label.includes("ai_verified"))) || (statusFilter === "Pending" && !label.includes("verified") && !label.includes("packed") && !label.includes("mismatch") && !label.includes("reject")) || (statusFilter === "Rejected" && (label.includes("mismatch") || label.includes("reject")));
      if (!matchesStatus) return false;
      if (!query) return true;
      const customer = (order.customer_name || "").toLowerCase();
      const orderId = (order.id || "").toLowerCase();
      const sku = (order.items_summary?.[0]?.sku || order.sku || order.product_sku || "").toLowerCase();
      return customer.includes(query) || orderId.includes(query) || sku.includes(query);
    });
  }, [relevantOrders, searchQuery, statusFilter]);

  const packguardStats = useMemo(() => {
    const orders = dashboard.pending_verification || [];
    const stats = { total: orders.length, verified: 0, mismatch: 0, pending: 0 };
    orders.forEach((order) => {
      const label = ((order.packguard?.final_status || order.status || order.dispatch_status || "pending") + "").toLowerCase();
      if (["ai_verified", "verified", "packed"].some((value) => label.includes(value))) {
        stats.verified += 1;
      } else if (label.includes("mismatch") || label.includes("reject")) {
        stats.mismatch += 1;
      } else {
        stats.pending += 1;
      }
    });
    return stats;
  }, [dashboard.pending_verification]);

  const handleWarehouseImageChange = (orderId, file) => {
    setWarehouseUploads((prev) => ({ ...prev, [orderId]: file }));
    if (!file) {
      setWarehousePreviews((prev) => ({ ...prev, [orderId]: null }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setWarehousePreviews((prev) => ({ ...prev, [orderId]: reader.result }));
    reader.readAsDataURL(file);
  };

  const openFilePicker = (orderId, capture = false) => {
    const input = capture ? captureInputRefs.current[orderId] : chooseInputRefs.current[orderId];
    input?.click();
  };

  const submitPackguard = async (orderId) => {
    const file = warehouseUploads[orderId];
    if (!file) {
      setMessage("Please choose a warehouse package image before checking with AI.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("warehouse_image", file);
      formData.append("scanned_sku", "");
      console.info("[OpsDashboard] submitting packguard", { orderId, fileName: file.name, size: file.size });
      const { data } = await api.post(`/ops/packguard/${orderId}/verify`, formData);
      setVerificationResults((prev) => ({ ...prev, [orderId]: data.packguard }));
      setMessage(data.packguard?.final_status === "AI_VERIFIED" ? "AI verified the package successfully." : "AI flagged a mismatch and blocked dispatch.");
      await loadDashboard();
    } catch (error) {
      setMessage(apiError(error));
    }
  };

  const submitTrustReview = async (orderId) => {
    try {
      const payload = { ...reviewForm, damage_reported: reviewForm.damage_reported };
      const { data } = await api.post(`/ops/trust-recovery/${orderId}/submit`, payload);
      setMessage(data.trust_recovery?.match_level || "Review submitted");
      await loadDashboard();
    } catch (error) {
      setMessage(apiError(error));
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#fff8fb]"> <div className="w-10 h-10 border-4 border-[#FF3E6C] border-t-transparent rounded-full animate-spin" /> </div>;
  }

  if (isVerificationPage) {
    if (!routeOrder) {
      return (
        <div className="min-h-screen bg-[#fff8fb] text-slate-900">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-[32px] border border-[#f6dce7] bg-white p-8 shadow-[0_20px_60px_rgba(247,220,235,0.35)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-pink-600">Verification</p>
                  <h1 className="mt-2 text-3xl font-bold text-slate-950">Order not found</h1>
                  <p className="mt-2 text-sm text-slate-600">The requested order could not be loaded. Return to your dashboard and try again.</p>
                </div>
                <button onClick={() => navigate("/ops")} className="rounded-3xl bg-[#FF3E6C] px-5 py-3 text-sm font-semibold text-white shadow-lg">Back to dashboard</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#fff8fb] text-slate-900">
        <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10 xl:px-12">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[34px] border border-[#f6dce7] bg-white p-6 shadow-[0_30px_80px_rgba(247,220,235,0.55)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-pink-600">Pre-Pack Verification</p>
                <h1 className="mt-3 text-3xl font-extrabold text-slate-950">Order #{routeOrder.id}</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">Verify the package image against the catalog item before packing and dispatch.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => returnToDashboard()} className="rounded-full border border-[#FF3E6C] px-5 py-3 text-sm font-semibold text-[#FF3E6C]">Back to dashboard</button>
              </div>
            </div>

            <div className="mt-8 grid gap-8 xl:grid-cols-[39%_61%] xl:items-start">
              <div className="space-y-5">
                <div className="overflow-hidden rounded-[28px] border border-[#f6dce7] bg-white p-6 shadow-[0_20px_60px_rgba(247,220,235,0.3)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-pink-600">Product Details</p>
                  <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr] lg:items-start">
                    <div className="space-y-5">
                      <div className="overflow-hidden rounded-[24px] bg-slate-100">
                        <img
                          src={orderCatalogImage || "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80"}
                          alt="Product"
                          className="h-full w-full object-cover"
                          style={{ minHeight: 320 }}
                        />
                      </div>
                      <div className="text-sm text-slate-700">
                        <div className="grid gap-3">
                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                            <span className="font-semibold text-slate-950">Name:</span>
                            <span className="text-slate-500">{routeOrder.customer_name || "—"}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                            <span className="font-semibold text-slate-950">Order ID:</span>
                            <span className="text-slate-500">#{routeOrder.id}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                            <span className="font-semibold text-slate-950">Delivery:</span>
                            <span className="text-slate-500">{routeOrder.delivery_address || "Address not provided"}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-950">Status</p>
                            <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${dispatchStatusClasses}`}>
                              {verificationComplete && verificationMatch && <CheckCircle2 size={12} />}
                              {dispatchStatusLabel}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-950">Assigned Team</p>
                            <p className="mt-1 text-sm text-slate-500">{routeOrder.warehouse_team || "Warehouse Operations"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-semibold text-slate-950">{orderName}</h2>
                      </div>

                      <div className="grid gap-3 text-sm text-slate-700">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-950">Size:</span>
                          <span className="text-slate-500">{routeOrder.product_size || routeOrder.ordered_size || "—"}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-950">Cost:</span>
                          <span className="text-slate-500">{orderPrice ? `₹${orderPrice}` : "—"}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-950">Brand:</span>
                          <span className="text-slate-500">{orderBrand}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-950">Category:</span>
                          <span className="text-slate-500">{orderCategory}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-950">Order Date:</span>
                          <span className="text-slate-500">{orderDate}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-950">Color:</span>
                          <span className="text-slate-500">{routeOrder.product_color || routeOrder.ordered_color || "—"}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-950">Qty:</span>
                          <span className="text-slate-500">{routeOrder.quantity || routeOrder.product_quantity || 1}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <section className="rounded-[32px] bg-white p-8 shadow-[0_25px_90px_rgba(15,23,42,0.08)] xl:min-w-0">
                  {verificationSummaryPanel}
                </section>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#fef3f5] text-slate-900">
      <div className="mx-auto max-w-[1700px] px-6 py-10 lg:px-10 lg:py-12">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="rounded-[24px] border border-[#ffe4ec] bg-white p-8 shadow-[0_40px_120px_rgba(255,177,205,0.15)]">
            <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#df0f66]">PackGuard Operations Dashboard</p>
                <h1 className="mt-4 text-4xl font-bold text-[#111827]">Verify & Protect Orders</h1>
                <p className="mt-4 max-w-2xl text-base text-[#52525b]">AI-powered pre-pack verification and quality assurance for every fulfillment order.</p>
              </div>
              <div className="rounded-[28px] border border-[#ffe4ec] bg-[#ffedf4] p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#be185d]">PackGuard</p>
                <h2 className="mt-3 text-xl font-semibold text-[#111827]">Verify & Protect Orders</h2>
                <p className="mt-2 text-sm text-[#52525b]">All-powered pre-pack verification & quality assurance.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-4">
            <div className="rounded-[24px] border border-white bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.32em] text-[#888fa5]">Total Orders</p>
              <p className="mt-4 text-4xl font-bold text-[#111827]">{dashboard.total_orders ?? 0}</p>
              <p className="mt-2 text-sm text-[#64748b]">All orders in the dashboard</p>
            </div>
            <div className="rounded-[24px] border border-white bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.32em] text-[#888fa5]">Verified Orders</p>
              <p className="mt-4 text-4xl font-bold text-[#15803d]">{dashboard.kpis?.verified ?? dashboard.kpis?.verified_today ?? 0}</p>
              <p className="mt-2 text-sm text-[#64748b]">Successfully verified by PackGuard</p>
            </div>
            <div className="rounded-[24px] border border-white bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.32em] text-[#888fa5]">Awaiting Verification</p>
              <p className="mt-4 text-4xl font-bold text-[#c2410c]">{dashboard.kpis?.pending_packguard ?? dashboard.kpis?.pending ?? 0}</p>
              <p className="mt-2 text-sm text-[#64748b]">Orders waiting for AI review</p>
            </div>
            <div className="rounded-[24px] border border-white bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.32em] text-[#888fa5]">Need Attention</p>
              <p className="mt-4 text-4xl font-bold text-[#b91c1c]">{dashboard.kpis?.dispatch_blocked ?? dashboard.kpis?.rejected ?? 0}</p>
              <p className="mt-2 text-sm text-[#64748b]">Flagged orders requiring review</p>
            </div>
          </div>

          <div className="rounded-[24px] bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-[#be185d]">Orders to Review</p>
                <h2 className="mt-3 text-3xl font-semibold text-[#111827]">Latest fulfillment orders</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Order ID, Customer, or SKU"
                    className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-900 outline-none transition focus:border-[#ff7ba3] focus:ring-4 focus:ring-[#ffe4ec]"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#ff7ba3] focus:ring-4 focus:ring-[#ffe4ec]"
                >
                  <option>All</option>
                  <option>Verified</option>
                  <option>Pending</option>
                  <option>Rejected</option>
                </select>
                <button className="inline-flex items-center justify-center rounded-[20px] bg-gradient-to-r from-[#FF4E7A] to-[#FF7BA3] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110">
                  Export
                </button>
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-[24px] border border-slate-200 bg-[#faf5f8]">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-sm">
                  <thead className="bg-[#fff0f5] text-left text-slate-600">
                    <tr>
                      <th className="px-6 py-4 text-xs uppercase tracking-[0.28em]">Order ID</th>
                      <th className="px-6 py-4 text-xs uppercase tracking-[0.28em]">Customer</th>
                      <th className="px-6 py-4 text-xs uppercase tracking-[0.28em]">Product Image</th>
                      <th className="px-6 py-4 text-xs uppercase tracking-[0.28em]">Product Name</th>
                      <th className="px-6 py-4 text-xs uppercase tracking-[0.28em]">Size</th>
                      <th className="px-6 py-4 text-xs uppercase tracking-[0.28em]">Qty</th>
                      <th className="px-6 py-4 text-xs uppercase tracking-[0.28em]">Status</th>
                      <th className="px-6 py-4 text-xs uppercase tracking-[0.28em]">Order Date</th>
                      <th className="px-6 py-4 text-xs uppercase tracking-[0.28em]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredOrders || []).map((order) => {
                      const primary = (order.items_summary || [])[0] || {};
                      const statusRaw = (order.packguard?.final_status || order.status || order.dispatch_status || "pending") + "";
                      const status = statusRaw.toLowerCase().includes("verified") || statusRaw.toLowerCase().includes("packed") ? "Verified" : statusRaw.toLowerCase().includes("mismatch") || statusRaw.toLowerCase().includes("reject") ? "Rejected" : "Pending";
                      const statusColors = status === "Verified" ? "bg-emerald-50 text-emerald-700" : status === "Rejected" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700";
                      return (
                        <tr key={order.id} className="border-b border-slate-200 hover:bg-[#ffe4f2] transition">
                          <td className="px-6 py-5 font-semibold text-slate-900">{order.id}</td>
                          <td className="px-6 py-5 text-slate-700">{order.customer_name || "—"}</td>
                          <td className="px-6 py-5">
                            <div className="h-14 w-14 overflow-hidden rounded-3xl bg-slate-100">
                              <img src={primary.image || order.product_image || "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=200&q=80"} alt={primary.name || order.product_name || "Product"} className="h-full w-full object-cover" />
                            </div>
                          </td>
                          <td className="px-6 py-5 text-slate-800">{primary.name || order.product_name || "—"}</td>
                          <td className="px-6 py-5 text-slate-700">{primary.size || order.ordered_size || "—"}</td>
                          <td className="px-6 py-5 text-slate-700">{order.quantity || primary.qty || 1}</td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColors}`}>{status}</span>
                          </td>
                          <td className="px-6 py-5 text-slate-500">{order.order_date ? new Date(order.order_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                          <td className="px-6 py-5">
                            <button onClick={() => navigate(`/ops/verify/${order.id}`)} className="inline-flex items-center rounded-full bg-gradient-to-r from-[#FF4E7A] to-[#FF7BA3] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110">
                              Verify <ArrowRight size={16} className="ml-2" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}