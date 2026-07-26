





import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Heart,
  ShoppingBag,
  Star,
  Share2,
  CreditCard,
  MapPin,
  ShieldCheck,
  RotateCcw,
  BadgeCheck,
  Check,
  ChevronRight,
  Shirt,
  Truck,
  Lock,
  Users,
  Sparkles,
  Layers,
  Feather,
  User,
  X,
  TrendingUp,
  Award,
  Ruler,
  PackageCheck,
  Zap,
  ThumbsUp,
  Calendar,
  RefreshCw,
  PackageOpen,
  Clock,
  Tag,
  HelpCircle,
  MessageSquareText,
  UploadCloud,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import api, { apiError } from "../lib/api";
import BuyCardDrawer from "../components/BuyCard/BuyCardDrawer";
import { Header } from "../components/Header";
import { TrustStrip } from "../components/TrustStrip";
import FitSidePanel from "../components/buyready/FitSidePanel";
import { BetterChoiceSheet } from "../components/buyready/BetterChoiceSheet";
import { BottomSheet } from "../components/BottomSheet";
import { useAuth } from "../context/AuthContext";
import { useShop } from "../context/ShopContext";
import { computeBuyReady } from "./productDetailUtils";

function formatDeliveryDate(option) {
  if (!option) return null;
  if (option.arrival_iso) {
    const parsed = new Date(option.arrival_iso);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    }
  }
  return option.date || option.label || null;
}

function getExpressDeliveryDate(deliveryOptions) {
  if (!Array.isArray(deliveryOptions) || !deliveryOptions.length) return null;
  const expressOption = deliveryOptions.find((option) => option.type === "express") || deliveryOptions[1];
  if (!expressOption?.arrival_iso) return null;
  const parsed = new Date(expressOption.arrival_iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

const STATUS_CONFIG = {
  ready: {
    title: "READY TO BUY",
    legend: "Ready to buy!",
    emoji: "🎉",
    sub: "Everything looks good for your purchase",
    color: "#03a685",
    bg: "#eafaf3",
    cardBg: "#f3fbf7",
    cardBorder: "#d7f3e6",
  },
  almost: {
    title: "ALMOST READY",
    legend: "Almost ready to buy",
    emoji: "👍",
    sub: "One small thing to double-check before you buy",
    color: "#e0a100",
    bg: "#fff8e6",
    cardBg: "#fffaf0",
    cardBorder: "#ffe6a8",
  },
  review: {
    title: "REVIEW BEFORE BUYING",
    legend: "Review before buying",
    emoji: "⚠️",
    sub: "A couple of things need your attention",
    color: "#e07a00",
    bg: "#fff2e6",
    cardBg: "#fff8f2",
    cardBorder: "#ffd8ad",
  },
  risk: {
    title: "HIGH RISK",
    legend: "High risk purchase",
    emoji: "⚠️",
    sub: "This purchase may not go smoothly — check details",
    color: "#e0344c",
    bg: "#fdecef",
    cardBg: "#fef5f6",
    cardBorder: "#f8c9d1",
  },
};

const ITEM_META = {
  fit: {
    label: "Fit",
    icon: Shirt,
    okColor: "#22a06b",
    okText: "Recommended",
    warnText: "Check size",
    badText: "Not recommended",
  },
  delivery: {
    label: "Delivery",
    icon: Truck,
    okColor: "#4a90d9",
    okText: "On time",
    warnText: "May run late",
    badText: "Delayed",
  },
  quality: {
    label: "Quality",
    icon: Star,
    okColor: "#f5a623",
    okText: "Highly rated",
    warnText: "Mixed reviews",
    badText: "Low rated",
  },
  returns: {
    label: "Returns",
    icon: RotateCcw,
    okColor: "#9b6bce",
    okText: "15-day easy",
    warnText: "Limited returns",
    badText: "Non-returnable",
  },
};

const ITEM_STATUS_COLOR = { ok: "#03a685", warn: "#e0a100", bad: "#e0344c" };

// Static reference chart (inches) used by the Size Guide modal.
const SIZE_CHART = [
  { size: "S", chest: "34-36", waist: "28-30", hip: "36-38" },
  { size: "M", chest: "38-40", waist: "32-34", hip: "40-42" },
  { size: "L", chest: "42-44", waist: "36-38", hip: "44-46" },
  { size: "XL", chest: "46-48", waist: "40-42", hip: "48-50" },
  { size: "XXL", chest: "50-52", waist: "44-46", hip: "52-54" },
];

// Generic centered dialog — used for Size Guide and Switch Fit Profile so
// they open as a modal in the middle of the page instead of a bottom sheet.
function CenteredModal({ open, onClose, title, children, maxWidth = "480px" }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-[24px] bg-white shadow-2xl"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#f0f0f0] px-5 py-4">
          <h3 className="text-[15px] font-bold text-[#282c3f]">{title}</h3>
          <button onClick={onClose} className="text-[#9aa0ab] hover:text-[#282c3f]" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function BuyReadyCard({
  product,
  evaluation,
  reviewsSummary,
  reviewsData,
  status,
  buyReady,
  issueReasons,
  handleAddToBag,
  wished,
  toggleWishlist,
  addr,
  size,
  evaluationPending,
  onOpenInsight,
  onEditSize, // optional — falls back to onOpenInsight?.("fit") if not passed
  onCheckFitWithAI,
  onWhy,
  onBetterChoice,
}) {
  const [sizeAlert, setSizeAlert] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const score = evaluation?.overall_score != null ? evaluation.overall_score : 90;

  const BEAUTY_CATEGORIES = ["Beauty", "Makeup", "Skincare", "Haircare"];
  const isSaree = product?.category === "Sarees";
  const isBeauty = BEAUTY_CATEGORIES.includes(product?.category);
  const isKids = product?.category === "Kids Clothing" || product?.gender === "Kids";
  const KIDS_AGE_SIZES = ["2–3Y", "4–5Y", "6–7Y", "8–9Y"];
  const effectiveSizes = isKids ? KIDS_AGE_SIZES : (product?.sizes || []);
  const showSizeControls = product && !isBeauty && !isSaree && effectiveSizes.length > 0;
  const needsSize = showSizeControls && effectiveSizes.length > 0 && !size;
  const recommendedSize = evaluation?.recommended_size || null;
  const selectedSize = size || evaluation?.selected_size || null;
  const evaluationStale = size && evaluation?.selected_size && evaluation.selected_size !== size;
  const returnRisk = evaluation?.return_risk != null ? evaluation.return_risk : null;

  useEffect(() => {
    if (size) setSizeAlert(false);
  }, [size]);

  const fetchedReviews = Array.isArray(reviewsData?.reviews) ? reviewsData.reviews : null;
  const fetchedReviewCounts = fetchedReviews
    ? fetchedReviews.reduce(
        (acc, r) => {
          const rating = r.rating || 0;
          if (rating >= 4) acc.pos += 1;
          if (rating <= 2) acc.neg += 1;
          acc.total += 1;
          return acc;
        },
        { pos: 0, neg: 0, total: 0 }
      )
    : { pos: 0, neg: 0, total: 0 };
  const actualPositivePercent = fetchedReviewCounts.total
    ? Math.round((fetchedReviewCounts.pos / fetchedReviewCounts.total) * 100)
    : null;
  const resolvedPositivePercent = (reviewsSummary?.positive_percent != null && !(reviewsSummary.positive_percent === 0 && fetchedReviewCounts.total > 0))
    ? reviewsSummary.positive_percent
    : actualPositivePercent;
  const displayPositivePercent = resolvedPositivePercent === 0 ? 10 : resolvedPositivePercent;
  const normalizedReviewsSummary = reviewsSummary
    ? { ...reviewsSummary, positive_percent: resolvedPositivePercent ?? reviewsSummary.positive_percent }
    : reviewsSummary;

  const analysis = useMemo(
    () => generateAnalysis({ selectedSize, product, evaluation, reviewsSummary: normalizedReviewsSummary }),
    [selectedSize, product, evaluation, normalizedReviewsSummary]
  );
  const verdict = getAIVerdict(analysis.score);

  const handleCtaClick = (goCheckout) => {
    if (needsSize || wrongSizeChosen) {
      setSizeAlert(true);
      return;
    }
    setSizeAlert(false);
    handleAddToBag?.(goCheckout);
  };

  const handleEditClick = () => {
    if (onEditSize) onEditSize();
    else onOpenInsight?.("fit");
  };

  const signals = {
    fit: analysis.fit_confidence != null ? analysis.fit_confidence : 90,
    delivery: analysis.delivery_conf != null ? analysis.delivery_conf : 90,
    quality: analysis.quality_score != null ? analysis.quality_score : Math.round((product.rating || 4) * 20),
    returns: analysis.return_risk != null ? Math.max(0, 100 - analysis.return_risk) : (product.return_percent != null ? Math.max(0, 100 - product.return_percent) : 90),
  };

  // Per-row badges — presentational only, derived from the same analysis
  // numbers already computed above. No new business logic.
  const fitGood = signals.fit >= 70;
  const qualityGood = signals.quality >= 70;
  const returnsGood = (analysis.return_risk ?? 8) <= 15;
  const isMostlyNegativeLocal = displayPositivePercent != null
    ? displayPositivePercent < 50
    : product?.quality_flag === "low";
  const negativeOneLine = reviewsSummary?.negative
    ? String(reviewsSummary.negative).split('.').filter(Boolean)[0] + '.'
    : reviewsSummary?.areas_to_note || 'Check recent reviews before buying.';

  // Dynamic fit chip label: when the selected size matches the AI recommendation
  // show one of three affirmative labels based on recommendation confidence.
  const recommendedSizeLocal = evaluation?.recommended_size || null;
  const selectedSizeLocal = size || evaluation?.selected_size || null;
  const recConf = analysis?.recommendationConfidence != null ? analysis.recommendationConfidence : analysis?.fit_confidence != null ? analysis.fit_confidence : 90;
  let fitChipLabel = fitGood ? "Great Fit" : "Check Size";
  let fitChipBg = fitGood ? "#e6f7ed" : "#fff2e6";
  let fitChipColor = fitGood ? "#03a685" : "#c2410c";
  if (selectedSizeLocal && recommendedSizeLocal && selectedSizeLocal === recommendedSizeLocal) {
    if (recConf >= 80) fitChipLabel = "✅ Best Match";
    else if (recConf >= 60) fitChipLabel = "✅ AI Verified";
    else fitChipLabel = "✅ Size Verified";
    fitChipBg = "#e6f7ed";
    fitChipColor = "#03a685";
  }

  // Low confidence in the currently selected size == wrong size chosen.
  // Surface this as a warning banner near the top of the card so it can't
  // be missed before the shopper hits Buy.
  const wrongSizeChosen = !!(
    selectedSize &&
    recommendedSize &&
    selectedSize !== recommendedSize &&
    !evaluationPending &&
    !evaluationStale
  );
  // Only treat 'low fit confidence' as a user-visible size-warning when
  // the user has explicitly selected a size that differs from the
  // recommended size. We avoid showing a generic low-confidence banner
  // when the selected size equals the recommended size.
  const lowFitConfidence = !!wrongSizeChosen;
  const productIsNegativeReview = isMostlyNegativeLocal;
  const purchaseDisabled = needsSize || wrongSizeChosen || productIsNegativeReview;

  // Determine what status to display on the top card:
  // - If user explicitly chose a wrong size, show a yellow 'almost' card
  // - If user chose the recommended size and fit is good, show green 'ready' card
  // - Otherwise fall back to computed `status` from buyReady
  // Prefer green READY when shopper chose the recommended size and fit is good,
  // but avoid overriding if other categories are in a 'bad' state.
  const hasBadItem = buyReady && Object.values(buyReady.items || {}).some((v) => v === "bad");
  // If the user selected the recommended size and there are no 'bad' items,
  // show READY. Otherwise, if the overall buyReady is 'risk' show risk (red),
  // else show the yellow 'almost' card (issues). wrongSizeChosen still gets priority.
  const displayStatus = wrongSizeChosen
    ? STATUS_CONFIG.almost
    : isMostlyNegativeLocal
    ? STATUS_CONFIG.review
    : (selectedSize && recommendedSize && selectedSize === recommendedSize && !hasBadItem)
    ? STATUS_CONFIG.ready
    : (buyReady && buyReady.level === "risk")
    ? STATUS_CONFIG.risk
    : STATUS_CONFIG.almost;

  // Debug helpful values in dev console
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("BuyReady Debug:", { selectedSize, recommendedSize, fit_confidence: evaluation?.fit_confidence, buyReady, issueReasons });
  }

  // ---- data used by the top score block + quick stats row ----
  const fitSharePercent = analysis.fit_confidence != null ? analysis.fit_confidence : 92;
  const deliveryDate = formatDeliveryDate(evaluation?.delivery?.options?.[0]) || evaluation?.delivery?.estimated_label || "Delivery estimate unavailable";
  const deliveryOnTime = signals.delivery;
  const warehouse = evaluation?.delivery?.warehouse || "Hyderabad";
  const reviewCount = product?.rating_count != null ? product.rating_count.toLocaleString("en-IN") : "0";
  const kept = analysis.return_risk != null ? (100 - analysis.return_risk).toFixed(1) : "87.4";
  const sellerName = product?.seller?.name || "Verified Seller";
  const sellerRating = product?.seller?.rating != null ? product.seller.rating : 4.9;
  const sellerOrders = product?.seller?.orders_fulfilled != null ? `${Math.round(product.seller.orders_fulfilled / 1000)}K` : "12K";
  const sellerReturnRate = product?.return_percent != null ? product.return_percent : 0.8;
  const photos = (product?.images || []).slice(0, 4);
  const morePhotosCount = reviewsSummary?.photo_count != null ? Math.max(0, reviewsSummary.photo_count - photos.length) : 82;

  const quickStats = [
    { icon: Shirt, label: "Great Fit", color: "#16a34a", bg: "#dcfce7" },
    { icon: Truck, label: "On-Time Delivery", color: "#2563eb", bg: "#dbeafe" },
    { icon: Star, label: "Trusted Reviews", color: "#db2777", bg: "#fce7f3" },
    { icon: RotateCcw, label: "Easy Returns", color: "#9b6bce", bg: "#f3e8ff" },
  ];

  return (
    <div className="flex h-full flex-col rounded-[24px] border border-[#ececee] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f3e8ff] text-[#9333ea]">
              <ShieldCheck size={15} />
            </span>
            <p className="text-[14px] font-extrabold text-[#0f172a]">BuyReady</p>
          </div>
          <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#4a5fd9]">
            Beta
          </span>
        </div>
        <p className="mt-1 text-[11.5px] text-[#8b909c]">AI analysis of fit, quality, delivery, returns &amp; seller</p>

        {/* Big score block — score/100, title, "Recommended for you", quick stats row */}
        <motion.div
          key={`${verdict.label}-${selectedSize}-${score}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mt-3 rounded-2xl px-4 py-4"
            style={{ backgroundColor: displayStatus.bg, border: `1px solid ${displayStatus.cardBorder}` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
                <span
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: displayStatus.color }}
                >
                  <Check size={20} className="text-white" strokeWidth={3} />
                </span>
                <div className="min-w-0">
                  <p className="mt-1 text-[13px] font-extrabold tracking-wide" style={{ color: displayStatus.color }}>
                    {displayStatus.title}
                  </p>
                  <p className="mt-0.5 text-[11.5px] font-semibold text-[#6b7280]">
                    {wrongSizeChosen ? (
                      <span className="text-[#b45309]">Choose correct size</span>
                    ) : (
                      "Recommended for you"
                    )}
                  </p>
                </div>
              </div>
            <button
              type="button"
              onClick={() => onWhy?.()}
              className="rounded-full border border-[#d1d5db] bg-white px-3 py-1 text-[11px] font-semibold text-[#0f172a] shadow-sm transition hover:bg-[#f8fafc]"
            >
              Why?
            </button>
          </div>

          {/* Quick stat icons row */}
          <div className="mt-3.5 grid grid-cols-4 gap-2 border-t border-white/60 pt-3">
            {quickStats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex flex-col items-center gap-1 text-center">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: s.bg, color: s.color }}
                  >
                    <Icon size={14} />
                  </span>
                  <p className="text-[9.5px] font-semibold leading-tight text-[#535766]">{s.label}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Show explicit reasons when overall buy-ready is high risk (but not when we're showing the
            'wrong size chosen' ALMOST READY banner) */}
        {buyReady.level === "risk" && !wrongSizeChosen && issueReasons && issueReasons.length > 0 && (
          <div className="mt-2 rounded-2xl border border-[#fdecef] bg-[#fff1f2] px-3.5 py-2 text-[12px] text-[#b71c1c]">
            <strong>Why High Risk:</strong> {issueReasons.join(" • ")}
          </div>
        )}

        {/* Priority banner order:
            1) If user chose wrong size -> yellow warning about size
            2) Else if overall buyReady level is 'risk' and there are issueReasons -> show concise issueReasons in yellow
            3) Else if low fit confidence -> generic low-fit warning */}
        {wrongSizeChosen ? (
          <div className="mt-2.5 flex items-start gap-2 rounded-2xl border border-[#fcd34d] bg-[#fffbeb] px-3.5 py-2.5 text-[12px] font-semibold text-[#b45309]">
            <span className="mt-[1px]">⚠️</span>
            <div>
              <p className="font-semibold">Reason:</p>
              <p className="mt-1">You selected <span className="font-extrabold">{selectedSize || (evaluation?.selected_size) || "selected size"}</span>, but <span className="font-extrabold">{recommendedSize}</span> is recommended for your fit profile.</p>
            </div>
          </div>
        ) : isMostlyNegativeLocal ? (
          <div className="mt-2.5 flex items-start gap-2 rounded-2xl border border-[#fcd34d] bg-[#fffbeb] px-3.5 py-2.5 text-[12px] font-semibold text-[#b45309]">
            <span className="mt-[1px]">⚠️</span>
            <span>Fabric quality concerns were frequently mentioned in customer reviews.</span>
          </div>
        ) : buyReady && buyReady.level === "risk" && issueReasons && issueReasons.length > 0 ? (
          <div className="mt-2.5 flex items-start gap-2 rounded-2xl border border-[#fcd34d] bg-[#fffbeb] px-3.5 py-2.5 text-[12px] font-semibold text-[#b45309]">
            <span className="mt-[1px]">⚠️</span>
            <span>
              {issueReasons.join(" • ")}
            </span>
          </div>
        ) : lowFitConfidence ? (
          <div className="mt-2.5 flex items-start gap-2 rounded-2xl border border-[#fcd34d] bg-[#fffbeb] px-3.5 py-2.5 text-[12px] font-semibold text-[#b45309]">
            <span className="mt-[1px]">⚠️</span>
            <span>Fit confidence is low for this selection — please double-check your size before buying.</span>
          </div>
        ) : null}

        <div className="mt-2.5 flex items-center justify-between lg:hidden">
          <button
            type="button"
            onClick={() => setMobileExpanded((open) => !open)}
            className="rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-[13px] font-bold text-[#0f172a] shadow-sm transition hover:border-[#cbd5e1]"
          >
            {mobileExpanded ? "Hide AI Analysis" : "View AI Analysis"}
          </button>
          <span className="text-[12px] font-semibold text-[#6b7280]">{displayStatus.legend}</span>
        </div>
      </div>

      {/* Insight cards — order: Fit, Product & Reviews, Delivery, Returns, Seller */}
      <div className={`${mobileExpanded ? "block" : "hidden"} lg:block lg:flex-1 lg:min-h-0`}>
          <div className="flex flex-col gap-2 px-5 py-3 lg:h-full">
          {/* FIT */}
          {(!isBeauty && !isSaree) && (
          <div className="flex-1 rounded-2xl border border-[#ececee] bg-white px-3.5 py-2.5">
            <div className="flex items-start gap-2.5">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#dcfce7] text-[#16a34a]">
                <Shirt size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] font-extrabold tracking-[0.02em] text-[#0f172a]">FIT</p>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: fitChipBg, color: fitChipColor }}>
                    {fitChipLabel}
                  </span>
                </div>
                {recommendedSize ? (
                  <>
                    <p className="mt-1 text-[11.5px] leading-4 text-[#6b7280]">
                      {analysis.recommendationLabel}: <span className="font-bold text-[#282c3f]">{recommendedSize}</span>
                    </p>
                    {selectedSize && selectedSize === recommendedSize ? (
                      <div className="mt-1 text-[#059669]">
                        <p className="text-[13px] font-extrabold">
                          Your selected size (<span className="font-extrabold">{recommendedSize}</span>) matches your fit profile.
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-[12px]">
                          <Users size={14} />
                          Similar shoppers reported a great fit.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-1 text-[#b45309]">
                        <p className="text-[12px] font-semibold">Selected Size: <span className="font-extrabold text-[#282c3f]">{selectedSize || '—'}</span></p>
                        <p className="mt-2 flex items-center gap-2 text-[12px]">
                          <Users size={14} />
                          Users with a similar fit profile preferred <span className="font-extrabold">{recommendedSize}</span>.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-[11.5px] leading-4 text-[#6b7280]">
                    Create a fit profile to get personalized size recommendation.
                  </p>
                )}

                {/* AI Fit Studio CTA — same spacing/alignment rhythm as the
                    rest of the FIT card; sits right under the recommendation
                    copy, above the row's chevron affordance below. */}
                <button
                  type="button"
                  onClick={onCheckFitWithAI}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border-2 border-[#9333ea] bg-white px-3.5 py-1.5 text-[11.5px] font-bold text-[#9333ea] shadow-sm transition hover:bg-[#f3e8ff] hover:shadow-md active:scale-[0.98]"
                >
                  <Sparkles size={13} /> Check Fit with AI
                </button>
              </div>
              <button type="button" onClick={() => onOpenInsight?.("fit")} className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center text-[#9aa0ab] hover:text-[#535766]" aria-label="View fit analysis">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          )}

          {/* DELIVERY */}
          <div className="flex-1 rounded-2xl border border-[#ececee] bg-white px-3.5 py-2.5">
            <div className="flex items-start gap-2.5">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#dbeafe] text-[#2563eb]">
                <Truck size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] font-extrabold tracking-[0.02em] text-[#0f172a]">DELIVERY</p>
                  <span className="rounded-full bg-[#dbeafe] px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">
                    Reliable
                  </span>
                </div>
                <p className="mt-1 text-[11.5px] font-semibold text-[#282c3f]">Expected {deliveryDate}</p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                  <span className="text-[11px] font-medium text-[#535766]">{deliveryOnTime}% On-Time Delivery</span>
                  <span className="text-[11px] font-medium text-[#535766]">• Express available</span>
                </div>
              </div>
              <button type="button" onClick={() => onOpenInsight?.("delivery")} className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center text-[#9aa0ab] hover:text-[#535766]" aria-label="View delivery analysis">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* PRODUCT & REVIEWS (QUALITY) */}
          <div className="flex-1 rounded-2xl border border-[#ececee] bg-white px-3.5 py-2.5 relative">
            <div className="flex items-start gap-2.5">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#f3e8ff] text-[#9333ea]">
                <Star size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] font-extrabold tracking-[0.02em] text-[#0f172a]">PRODUCT &amp; REVIEWS ({reviewCount})</p>
                  <div className="flex items-center gap-2">
                    {!isMostlyNegativeLocal && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: qualityGood ? "#f3e8ff" : "#fff2e6", color: qualityGood ? "#9333ea" : "#c2410c" }}
                      >
                        {qualityGood ? "Loved by Buyers" : "Mixed Reviews"}
                      </span>
                    )}
                    {isMostlyNegativeLocal && (
                      <span className="rounded-full bg-[#ffedd5] px-2 py-0.5 text-[10px] font-bold text-[#b45309]">
                        check reviews
                      </span>
                    )}
                    <button type="button" onClick={() => onOpenInsight?.("quality")} className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-[#9aa0ab] hover:text-[#535766]" aria-label="View quality and reviews">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="flex items-center gap-1 text-[11.5px] font-bold text-[#282c3f]">
                    {product?.rating ?? "4.7"}
                    <span className="text-[#f5a623]">{"★".repeat(Math.round(product?.rating || 4.7))}</span>
                  </span>
                  <span className="text-[11px] font-medium text-[#535766]">{signals.quality}% recommend this product</span>
                </div>

                {isMostlyNegativeLocal ? (
                  <div className="mt-2">
                    <p className="text-[11px] font-semibold text-[#92400e]">
                      ! Many customers expressed concerns about the fabric quality.
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-nowrap gap-1.5 overflow-x-auto">
                    {[
                      { label: "Fabric Quality" },
                      { label: "Colour Accuracy" },
                      { label: "True to Size" },
                    ].map((tag) => (
                      <span
                        key={tag.label}
                        className="rounded-full bg-gradient-to-r from-[#f3e8ff] to-[#ede9fe] px-2.5 py-1 text-[10px] font-bold text-[#7c3aed]"
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Customer photos */}
                {photos.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5">
                    {photos.map((src, idx) => (
                      <img
                        key={idx}
                        src={src}
                        alt=""
                        className="h-9 w-9 rounded-lg object-cover bg-[#f3f4f6]"
                      />
                    ))}
                    {morePhotosCount > 0 && (
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f3f4f6] text-[10px] font-bold text-[#535766]">
                        +{morePhotosCount}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RETURNS */}
          <div className="flex-1 rounded-2xl border border-[#ececee] bg-white px-3.5 py-2.5">
            <div className="flex items-start gap-2.5">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#fef3c7] text-[#d97706]">
                <RotateCcw size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] font-extrabold tracking-[0.02em] text-[#0f172a]">RETURNS</p>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: returnsGood ? "#fef3c7" : "#fdecef", color: returnsGood ? "#d97706" : "#e0344c" }}
                  >
                    {returnsGood ? "Hassle-free" : "Return Risk"}
                  </span>
                </div>
                <div className="mt-1 flex flex-col gap-y-1.5">
                  <span className="text-[11px] font-medium text-[#535766]">15-Day Easy Returns</span>
                  <span className="text-[11px] font-medium text-[#535766]">Most shoppers kept this product after delivery</span>
                </div>
              </div>
              <button type="button" onClick={() => onOpenInsight?.("returns")} className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center text-[#9aa0ab] hover:text-[#535766]" aria-label="View returns analysis">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* SELLER (BEST SELLER) */}
          <div className="flex-1 rounded-2xl border border-[#ececee] bg-white px-3.5 py-2.5">
            <div className="flex items-start gap-2.5">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#fce7f3] text-[#db2777]">
                <BadgeCheck size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] font-extrabold tracking-[0.02em] text-[#0f172a]">SELLER</p>
                  <span className="rounded-full bg-[#fce7f3] px-2 py-0.5 text-[10px] font-bold text-[#db2777]">
                    Top Rated Seller
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-[#282c3f]">
                  {sellerName}
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#16a34a] text-white" title="Verified Seller">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="text-[10px] font-bold text-[#16a34a]">Verified</span>
                </p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                  <span className="text-[11px] font-medium text-[#535766]">{sellerRating}★ Seller Rating</span>
                  <span className="text-[11px] font-medium text-[#535766]">• {sellerOrders} Orders</span>
                  <span className="text-[11px] font-medium text-[#535766]">• {sellerReturnRate}% Return Rate</span>
                </div>
              </div>
              <button type="button" onClick={() => onOpenInsight?.("bestseller")} className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center text-[#9aa0ab] hover:text-[#535766]" aria-label="View sales and seller analysis">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CTA footer */}
      <div className="mt-auto bg-white px-5 pb-4 pt-2.5 border-t border-[#f0f0f0]">
        {(sizeAlert || needsSize) && (
          <div className={`mb-2.5 flex items-start gap-2 rounded-2xl border px-3 py-2 text-[12px] font-semibold ${
            needsSize 
              ? 'border-[#ffd1d9] bg-[#fff2f4] text-[#e0344c]'
              : 'border-[#fcd34d] bg-[#fffbeb] text-[#d97706]'
          }`}>
            <span className="mt-[1px]">⚠️</span>
            <span>
              {needsSize 
                ? 'Please select a size above before you continue.' 
                : 'Please check the recommended size before continuing.'
              }
            </span>
          </div>
        )}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => toggleWishlist?.(product.id)}
            className="flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-full border border-[#d1d5db] bg-white shadow-sm transition hover:border-[#cbd5e1]"
            aria-label="Wishlist"
          >
            <Heart size={17} className={wished ? "fill-[#ff3f6c] text-[#ff3f6c]" : "text-[#535766]"} />
          </button>
          <button
            type="button"
            onClick={() => handleCtaClick(false)}
            disabled={purchaseDisabled}
            className={`flex-1 h-11 rounded-full border-2 px-4 text-sm font-bold shadow-sm transition ${
              purchaseDisabled
                ? "cursor-not-allowed border-[#e5e7eb] bg-[#f5f5f6] text-[#b3b6bd]"
                : "border-[#ff3f6c] bg-white text-[#ff3f6c] hover:bg-[#fff1f4]"
            }`}
          >
            Add to Bag
          </button>
          <button
            type="button"
            onClick={() => handleCtaClick(true)}
            disabled={purchaseDisabled}
            className={`flex-1 h-[48px] rounded-full px-4 text-sm font-bold shadow-sm transition ${
              purchaseDisabled
                ? "cursor-not-allowed bg-[#f5f5f6] text-[#b3b6bd]"
                : "bg-[#ff3f6c] text-white hover:bg-[#e6355f]"
            }`}
          >
            Buy Now
          </button>
        </div>
        {productIsNegativeReview && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] text-[#92400e]">This product has poor review sentiment. We recommend alternatives with better buyer feedback.</p>
            <button
              type="button"
              onClick={onBetterChoice}
              className="rounded-full bg-[#ff3f6c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e6355f]"
            >
              View alternatives
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// A status counts as "good" (green accent) when the buyer can proceed with
// minimal friction; anything that needs a second look reads as "red".
function BuyReadyMiniBadge({ confidence, onOpen }) {
  const score = confidence != null ? confidence : 90;
  const isGood = score >= 70;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-[20px] border-2 border-[#03a685] bg-gradient-to-r from-[#f0fbf2] to-white p-4 flex items-center gap-3 hover:shadow-lg transition-all duration-200 group"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dff7e8] text-[#047857] group-hover:scale-110 transition-transform">
        <ShieldCheck size={20} />
      </span>
      <div className="flex-1 text-left">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#ff3f6c]">BuyReady</p>
        <p className="text-[13px] font-extrabold text-[#0f172a]">High Purchase Confidence</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-[18px] font-extrabold ${isGood ? 'text-[#03a685]' : 'text-[#b45309]'}`}>{score}%</span>
        <ChevronRight size={18} className="text-[#03a685] group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}

function buyReadyIsGood(status) {
  return status.color === STATUS_CONFIG.ready.color || status.color === STATUS_CONFIG.almost.color;
}

function getAIVerdict(score) {
  if (score >= 85) return { label: "Highly Recommended" };
  if (score >= 70) return { label: "Recommended" };
  if (score >= 55) return { label: "Worth Considering" };
  if (score >= 40) return { label: "Compare Before Buying" };
  if (score >= 25) return { label: "Proceed with Caution" };
  return { label: "Not Recommended" };
}

function sizesLabel(selectedSize, recommendedSize) {
  const order = ["XS", "S", "M", "L", "XL", "XXL"];
  const selectedIndex = order.indexOf(selectedSize);
  const recommendedIndex = order.indexOf(recommendedSize);
  if (selectedIndex === -1 || recommendedIndex === -1) {
    return selectedSize === "XS" || selectedSize === "S" ? "tighter" : "looser";
  }
  return selectedIndex < recommendedIndex ? "tighter" : selectedIndex > recommendedIndex ? "looser" : "similar";
}

function getAIExplanation(score, status, selectedSize, recommendedSize, returnRisk) {
  const fitNote = selectedSize && recommendedSize && selectedSize !== recommendedSize
    ? `You selected ${selectedSize}, but the recommendation is ${recommendedSize}. Expect a ${selectedSize === "XS" || selectedSize === "S" ? "tighter" : "looser"} fit.`
    : selectedSize ? `Size ${selectedSize} matches your current choice.` : "Select a size to refine this recommendation.";

  if (score >= 85) {
    return `${fitNote} Great fit for your preferences with consistently positive customer feedback and reliable delivery.`;
  }
  if (score >= 70) {
    return `${fitNote} Strong match for your style with dependable delivery and solid buyer reviews.`;
  }
  if (score >= 55) {
    return `${fitNote} A good choice overall — check fit details and review delivery timing before you buy.`;
  }
  if (score >= 40) {
    return `${fitNote} Review fit and delivery before purchasing; the product is acceptable but not ideal.`;
  }
  const returnMessage = returnRisk != null ? ` Return risk is ${returnRisk}%, higher than usual.` : "";
  return `${fitNote} This item may need closer review on fit, delivery, or returns before you buy.${returnMessage}`;
}

function generateAnalysis({ selectedSize, product, evaluation, reviewsSummary }) {
  const base = evaluation?.overall_score != null ? evaluation.overall_score : 90;
  const sizeAccuracy = evaluation?.size_accuracy != null ? evaluation.size_accuracy : (product?.size_accuracy || 90);
  let fit_confidence = evaluation?.fit_confidence != null ? evaluation.fit_confidence : Math.round(sizeAccuracy);
  const recommended = evaluation?.recommended_size || null;
  const recommendationConfidence = evaluation?.recommended_confidence ?? fit_confidence;
  const recommendationLabel = recommended && recommendationConfidence >= 60 ? "Recommended Size" : "Suggested Size";
  if (selectedSize && recommended && selectedSize !== recommended) {
    fit_confidence = Math.max(25, fit_confidence - 18);
  }
  // penalize if selected size has low stock
  const stock = (product?.size_stock && selectedSize) ? (product.size_stock[selectedSize] || 0) : null;
  if (stock === 0) fit_confidence = Math.max(10, fit_confidence - 12);

  const delivery_conf = evaluation?.delivery?.confidence != null ? evaluation.delivery.confidence : 90;
  const quality_score = reviewsSummary?.positive_percent != null ? reviewsSummary.positive_percent : Math.round((product?.rating || 4) * 20);

  // compute return risk
  let return_risk = evaluation?.return_risk != null ? evaluation.return_risk : (product?.return_percent != null ? product.return_percent : 8);
  if (sizeAccuracy < 70) return_risk = Math.min(99, return_risk + 6);
  if (stock === 0) return_risk = Math.min(99, return_risk + 12);

  // overall score: combine base with adjustments
  let score = base;
  score += (fit_confidence - 85) * 0.3; // reward better fit confidence
  score -= (return_risk - 5) * 0.35; // penalize return risk
  score += (quality_score - 80) * 0.2; // boost from reviews
  score = Math.max(0, Math.min(100, Math.round(score)));

  // confidence message
  let confidenceMessage = "High confidence";
  if (fit_confidence >= 80) confidenceMessage = "High confidence in fit";
  else if (fit_confidence >= 60) confidenceMessage = "Moderate confidence in fit";
  else confidenceMessage = "Fit recommendation is uncertain — double check sizing";

  // fit recommendation
  let fitRecommendation = null;
  if (selectedSize && recommended && selectedSize !== recommended) {
    fitRecommendation = `We recommend ${recommended} for a better fit.`;
  } else if (selectedSize && recommended && selectedSize === recommended && fit_confidence < 60) {
    fitRecommendation = `Your selected size ${selectedSize} is our best match, but confidence is low. Verify against brand measurements.`;
  } else if (selectedSize) {
    fitRecommendation = `Selected ${selectedSize} looks appropriate based on available data.`;
  } else {
    fitRecommendation = `Choose a size to get a tailored recommendation.`;
  }

  // review summary
  let reviewSummary = "";
  if (reviewsSummary?.positive_percent != null) {
    reviewSummary = `${reviewsSummary.positive_percent}% of recent reviewers rated this item positively.`;
    if (reviewsSummary.negative_mentions && selectedSize && reviewsSummary.negative_mentions[selectedSize]) {
      reviewSummary += ` ${reviewsSummary.negative_mentions[selectedSize]} reviewers mentioned sizing issues for ${selectedSize}.`;
    }
  } else {
    reviewSummary = `Customer feedback indicates generally positive experiences.`;
  }

  // quality insight
  let qualityInsight = product?.quality_description || "Good quality reported by buyers.";
  if (product?.rating && product.rating < 3.5) qualityInsight = `Quality concerns reported — check reviews before buying.`;

  // explanation: compose sentences based on computed values
  const fitPhrase = selectedSize && recommended && selectedSize !== recommended
    ? `You selected ${selectedSize}, but ${recommended} is recommended.`
    : selectedSize ? `Selected size: ${selectedSize}.` : `No size selected.`;
  const returnPhrase = return_risk != null ? `Estimated return risk: ${return_risk}%.` : "Return risk unknown.";
  const qualityPhrase = qualityInsight;
  const canonicalDeliveryDate = formatDeliveryDate(evaluation?.delivery?.options?.[0]);
  const deliveryPhrase = canonicalDeliveryDate ? `Expected by ${canonicalDeliveryDate}.` : `Delivery generally on time.`;
  const explanation = [fitPhrase, confidenceMessage + ".", qualityPhrase, returnPhrase, deliveryPhrase].join(" ");

  return {
    score,
    fit_confidence,
    recommendationConfidence,
    recommendationLabel,
    delivery_conf: delivery_conf,
    quality_score,
    return_risk,
    confidenceMessage,
    fitRecommendation,
    reviewSummary,
    qualityInsight,
    explanation,
    recommended,
  };
}

// Simple illustrated silhouette used in the Fit insight panel. Zones are
// tinted based on how well each area matches the shopper's profile — this
// is an illustrative stand-in for a true 3D body scan.
function FitAvatar({ zones }) {
  const colorFor = (key) => {
    const z = zones.find((zz) => zz.key === key);
    if (!z) return "#e5e7eb";
    if (z.status === "good") return "#8fd9bb";
    if (z.status === "warn") return "#f9d38b";
    return "#f3a9b4";
  };
  return (
    <svg viewBox="0 0 160 260" className="mx-auto h-[220px] w-auto">
      <circle cx="80" cy="34" r="24" fill="#f0d9c4" />
      <rect x="44" y="60" width="72" height="90" rx="18" fill={colorFor("shoulders")} />
      <rect x="50" y="130" width="60" height="50" rx="16" fill={colorFor("waist")} />
      <rect x="42" y="172" width="76" height="40" rx="18" fill={colorFor("hips")} />
      <rect x="30" y="66" width="18" height="70" rx="9" fill={colorFor("shoulders")} />
      <rect x="112" y="66" width="18" height="70" rx="9" fill={colorFor("shoulders")} />
      <rect x="55" y="208" width="20" height="46" rx="9" fill="#d8d8dc" />
      <rect x="85" y="208" width="20" height="46" rx="9" fill="#d8d8dc" />
    </svg>
  );
}

// Star rating breakdown bars (5★ down to 1★) — used in the Quality &
// Reviews insight panel. Falls back to a sensible default distribution
// derived from the overall rating if the backend hasn't provided one.
function normalizeRatingBreakdown(breakdown, reviewCount) {
  if (!breakdown) return null;
  const values = [5, 4, 3, 2, 1].reduce((acc, star) => {
    const raw = Number(breakdown?.[star] ?? 0);
    acc[star] = Number.isFinite(raw) ? raw : 0;
    return acc;
  }, {});
  const sum = [5, 4, 3, 2, 1].reduce((acc, star) => acc + values[star], 0);
  if (sum >= 90 && sum <= 110) {
    return values;
  }
  if (reviewCount > 0) {
    return [5, 4, 3, 2, 1].reduce((acc, star) => {
      acc[star] = Math.round((values[star] / reviewCount) * 100);
      return acc;
    }, {});
  }
  return values;
}

function ratingBreakdownFor(reviewsSummary, product) {
  if (reviewsSummary?.rating_breakdown) return reviewsSummary.rating_breakdown;
  const rating = product?.rating || 4.5;
  // Rough default distribution skewed toward the overall rating.
  if (rating >= 4.5) return { 5: 62, 4: 24, 3: 8, 2: 4, 1: 2 };
  if (rating >= 4) return { 5: 45, 4: 25, 3: 15, 2: 8, 1: 7 };
  if (rating >= 3.5) return { 5: 30, 4: 25, 3: 20, 2: 15, 1: 10 };
  return { 5: 20, 4: 20, 3: 20, 2: 20, 1: 20 };
}


// One consolidated side panel (slides in from the right) that renders a
// different analysis depending on `type`: fit, delivery, returns, quality
// (images + review summary + reviews), or bestseller (sales rank + seller).
function InsightSidePanel({ open, onClose, type, product, evaluation, reviewsSummary, reviewsData, fitProfile, addr, selectedSize: pageSelectedSize, onEditSize, issueReasons, whyFitConfidence, whyDeliveryConfidence, whyReviewConfidence, whyReturnRiskScore, whyAiSummary }) {
  if (!open || !type) return null;

  const titleMap = {
    why: "Why this recommendation",
    fit: "Fit analysis",
    delivery: "Delivery",
    returns: "Returns analysis",
    quality: "Quality & Reviews",
    bestseller: "Sales & Seller",
  };

  const recommendedSize = evaluation?.recommended_size || null;
  const selectedSize = pageSelectedSize || evaluation?.selected_size || null;
  const deliveryDate = evaluation?.delivery?.options?.[0]?.date || evaluation?.delivery?.estimated_label || "Delivery estimate unavailable";
  const fitProfileText = fitProfile ? `${fitProfile.name}'s profile (${fitProfile.height_cm}cm, ${fitProfile.weight_kg}kg)` : "your fit profile";
  const referenceImage = product?.images?.[0] || evaluation?.image || "";
  const whyTextFit = evaluation?.why?.fit?.en || "Fit recommendation details are not available.";
  const whyTextDelivery = evaluation?.why?.delivery?.en || "Delivery recommendation details are not available.";
  const whyTextTrust = evaluation?.why?.trust?.en || "Trust recommendation details are not available.";
  const whyTextValue = evaluation?.why?.value?.en || "Value recommendation details are not available.";
  // Compute a panel-specific analysis that uses the page's selected size so
  // the explanation and confidence numbers shown here reflect the shopper's
  // current choice. This prevents the panel from showing a low confidence
  // number when the shopper has already chosen the AI recommended size.
  const panelAnalysis = generateAnalysis({ selectedSize: selectedSize || recommendedSize, product, evaluation, reviewsSummary });
  const fitConfidence = panelAnalysis.fit_confidence != null ? panelAnalysis.fit_confidence : (evaluation?.fit_confidence != null ? evaluation.fit_confidence : 88);
  const fitZones = [
    { key: "shoulders", label: "Shoulders", status: fitConfidence >= 70 ? "good" : "warn" },
    { key: "waist", label: "Waist", status: fitConfidence >= 85 ? "good" : fitConfidence >= 60 ? "warn" : "bad" },
    { key: "hips", label: "Hips", status: fitConfidence >= 75 ? "good" : "warn" },
  ];

  const deliveryOption = evaluation?.delivery?.options?.[0];
  const pincode = addr ? addr.pin : "506001";
  const deliveryConfidence = panelAnalysis.delivery_conf != null
    ? panelAnalysis.delivery_conf
    : evaluation?.delivery?.confidence != null
      ? evaluation.delivery.confidence
      : 90;

  const returnPercent = product?.return_percent != null ? product.return_percent : 6;
  const keptPercent = Math.max(0, 100 - returnPercent);

  const images = product?.images?.length ? product.images : [];
  const fetchedReviews = Array.isArray(reviewsData?.reviews) ? reviewsData.reviews : null;
  const fetchedReviewCounts = fetchedReviews
    ? fetchedReviews.reduce(
        (acc, r) => {
          const rating = r.rating || 0;
          if (rating >= 4) acc.pos += 1;
          if (rating <= 2) acc.neg += 1;
          acc.total += 1;
          return acc;
        },
        { pos: 0, neg: 0, total: 0 }
      )
    : { pos: 0, neg: 0, total: 0 };
  const actualPositivePercent = fetchedReviewCounts.total
    ? Math.round((fetchedReviewCounts.pos / fetchedReviewCounts.total) * 100)
    : null;
  const hasFetchedReviewPercent = fetchedReviewCounts.total > 0;
  const positivePercent = (reviewsSummary?.positive_percent != null && !(reviewsSummary.positive_percent === 0 && hasFetchedReviewPercent))
    ? reviewsSummary.positive_percent
    : actualPositivePercent != null
      ? actualPositivePercent
      : 92;
  const displayPositivePercent = positivePercent === 0 ? 10 : positivePercent;
  const negativePercent = (reviewsSummary?.negative_percent != null && !(reviewsSummary.negative_percent === 0 && hasFetchedReviewPercent))
    ? reviewsSummary.negative_percent
    : fetchedReviewCounts.total
      ? Math.round((fetchedReviewCounts.neg / fetchedReviewCounts.total) * 100)
      : null;
  const avgRating = product?.rating != null ? product.rating : 3.8;
  const ratingCount = reviewsSummary?.rating_count ?? product?.rating_count ?? fetchedReviewCounts.total ?? 0;
  const breakdownBase = ratingBreakdownFor(reviewsSummary, product);
  const breakdown = normalizeRatingBreakdown(breakdownBase, ratingCount);
  const fivePlusFourPercent = (breakdown[5] || 0) + (breakdown[4] || 0);
  const isMostlyNegative = fetchedReviews
    ? fetchedReviewCounts.neg > fetchedReviewCounts.pos
    : displayPositivePercent < 50;
  const qualityReviewSummaryText = isMostlyNegative
    ? reviewsSummary?.negative || reviewsSummary?.areas_to_note || "Only a few buyers recommended this product; several complaints were reported."
    : reviewsSummary?.positive_percent != null
      ? reviewsSummary.positive_percent >= 70
        ? reviewsSummary?.positive || reviewsSummary?.positive_highlight || "Shoppers loved the fit, fabric quality and colour accuracy."
        : reviewsSummary.positive_percent >= 40
          ? reviewsSummary?.positive || "Mixed feedback: some reviewers liked the fit and some raised concerns."
          : reviewsSummary?.negative || reviewsSummary?.areas_to_note || "Only a few buyers recommended this product; several complaints were reported."
      : reviewsSummary?.positive_highlight || "Shoppers loved the fit, fabric quality and colour accuracy.";
  // Prefer full reviews from reviewsData when available. If all fetched reviews
  // are negative (our seeded 5 products), show negatives first. Otherwise
  // fall back to highlights or default demo reviews.
  const fullReviews = reviewsData?.reviews || null;
  const defaultReviews = [
    { id: "r1", name: "Sowmya V", location: "Guntur", size: "S", rating: 5, title: "Loved it!", comment: "Wore it for a family function and got so many compliments.", helpful: 28 },
    { id: "r2", name: "Divya T", location: "Lucknow", size: "XL", rating: 4, title: "Great quality", comment: "Great quality stitching, comfortable for all-day wear.", helpful: 16 },
    { id: "r3", name: "Ananya R", location: "Mumbai", size: "M", rating: 5, title: "Best for evenings!", comment: "The ruffle layers and sequin work look premium. Perfect for evenings.", helpful: 22 },
    { id: "r4", name: "Pooja S", location: "Delhi", size: "L", rating: 4, title: "Really pretty", comment: "Fit was just right and it looks exactly like the picture.", helpful: 9 },
  ];

  let panelReviews = null;
  if (fullReviews && Array.isArray(fullReviews) && fullReviews.length > 0) {
    const neg = fullReviews.filter((r) => r.sentiment === "negative");
    const pos = fullReviews.filter((r) => r.sentiment === "positive");
    // Only move negatives first when ALL reviews are negative (this applies
    // to the five seeded products). For mixed sets, keep backend ordering.
    if (neg.length === fullReviews.length) panelReviews = [...neg, ...pos];
    else panelReviews = fullReviews;
  } else if (reviewsSummary?.highlights?.length) {
    panelReviews = reviewsSummary.highlights;
  } else {
    panelReviews = defaultReviews;
  }
  // Keep the previous variable name `reviews` for existing JSX usage.
  const reviews = panelReviews;
  const avatarColors = ["#ff3f6c", "#4a5fd9", "#f5a623", "#9333ea", "#03a685"];

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl max-w-[420px]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#f0f0f0] bg-white px-5 py-4">
          <h3 className="text-[15px] font-bold text-[#282c3f]">{titleMap[type]}</h3>
          <button onClick={onClose} className="text-[#9aa0ab] hover:text-[#282c3f]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {type === "why" && (
            <div>
              <div className="flex items-center gap-3">
                {referenceImage ? (
                  <img
                    src={referenceImage}
                    alt="Reference product"
                    className="h-16 w-16 flex-shrink-0 rounded-3xl border border-[#e5e7eb] bg-[#f7f7f8] object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-3xl border border-[#e5e7eb] bg-[#f7f7f8]" />
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#64748b]">Reference Product</p>
                  <p className="mt-1 text-[13px] font-extrabold leading-tight text-[#111827] truncate">
                    {product?.brand} {product?.name}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[28px] border border-[#e5e7eb] bg-white px-4 py-4 shadow-sm">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#6b7280]">
                  BuyReady Score Breakdown
                </p>

                <div className="space-y-3">
                  {[
                    {
                      label: "Fit Confidence",
                      value: `${whyFitConfidence}%`,
                      icon: User,
                      color: "#03A685",
                      status: whyFitConfidence >= 75 ? "Excellent" : whyFitConfidence >= 50 ? "Good" : "Moderate",
                      barColor: "#03A685",
                    },
                    {
                      label: "Delivery Confidence",
                      value: `${whyDeliveryConfidence}%`,
                      icon: Truck,
                      color: "#03A685",
                      status: whyDeliveryConfidence >= 90 ? "Excellent" : whyDeliveryConfidence >= 70 ? "Good" : "Moderate",
                      barColor: "#03A685",
                    },
                    {
                      label: "Review Sentiment",
                      value: `${displayPositivePercent}%`,
                      icon: MessageSquareText,
                      color: displayPositivePercent >= 70 ? "#0B69FF" : displayPositivePercent >= 40 ? "#0B69FF" : "#0B69FF",
                      status: displayPositivePercent >= 70 ? "Excellent" : displayPositivePercent >= 40 ? "Moderate" : "Low",
                      barColor: "#0B69FF",
                    },
                    {
                      label: "Return Risk",
                      value: `${whyReturnRiskScore}%`,
                      icon: RotateCcw,
                      color: whyReturnRiskScore <= 25 ? "#047857" : whyReturnRiskScore <= 60 ? "#b45309" : "#dc2626",
                      status: whyReturnRiskScore <= 25 ? "Low risk" : whyReturnRiskScore <= 60 ? "Moderate risk" : "High risk",
                      barColor: whyReturnRiskScore <= 25 ? "#16a34a" : whyReturnRiskScore <= 60 ? "#ea580c" : "#ef4444",
                    },
                  ].map((row) => {
                    const Icon = row.icon;
                    return (
                      <div key={row.label} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ backgroundColor: `${row.color}1A`, color: row.color }}>
                              <Icon size={15} />
                            </span>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#475569]">{row.label}</p>
                              <p className="text-[12px] text-[#6b7280]">{row.status}</p>
                            </div>
                          </div>
                          <p className="text-[14px] font-extrabold text-[#111827]">{row.value}</p>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-[#eef2f6]">
                          <div className="h-full rounded-full" style={{ width: row.value, backgroundColor: row.barColor }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 rounded-[28px] border border-[#e5e7eb] bg-[#f8fbff] px-4 py-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#4338ca]">
                    <Sparkles size={20} />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#475569]">AI Recommendation</p>
                    <p className="mt-2 text-[13px] font-semibold leading-snug text-[#111827]">
                      {evaluation?.recommended_size ? (
                        <>Recommended Size: <span className="text-[#0f172a]">{evaluation.recommended_size}</span></>
                      ) : (
                        "AI recommendation is based on your current selection."
                      )}
                    </p>
                    <p className="mt-2 text-[12px] leading-relaxed text-[#475569]">{whyAiSummary}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-[28px] border border-[#e5e7eb] bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ecfdf5] text-[#047857]">
                      <User size={18} />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#64748b]">Fit insight</p>
                      <p className="mt-2 text-[13px] leading-snug text-[#111827]">
                        Based on {fitProfileText}, size <span className="font-extrabold text-[#0f172a]">{evaluation?.recommended_size || selectedSize || "recommended size"}</span> is recommended with <span className="font-extrabold text-[#047857]">{whyFitConfidence}% confidence</span>.
                      </p>
                      {selectedSize && selectedSize !== evaluation?.recommended_size ? (
                        <p className="mt-2 text-[12px] text-[#6b7280]">You selected <span className="font-semibold text-[#111827]">{selectedSize}</span>.</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#e5e7eb] bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#2563eb]">
                      <Truck size={18} />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#64748b]">Delivery insight</p>
                      <p className="mt-2 text-[13px] leading-snug text-[#111827]">
                        Ships from {evaluation?.delivery?.warehouse_name || "the nearest warehouse"} with <span className="font-extrabold text-[#047857]">{deliveryConfidence}% on-time confidence</span>.
                      </p>
                      <p className="mt-2 text-[12px] text-[#6b7280]">
                        {formatDeliveryDate(deliveryOption) ? `Standard delivery in ${formatDeliveryDate(deliveryOption)}.` : evaluation?.delivery?.estimated_label || "Standard delivery information is available."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#e5e7eb] bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#2563eb]">
                      <ShieldCheck size={18} />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#64748b]">Trust insight</p>
                      <div className="mt-2 space-y-2 text-[12px] text-[#111827]">
                        <p className="flex items-center gap-2"><Check size={14} className="text-[#047857]" /> Verified seller: {evaluation?.seller?.name || product?.seller_name || "RetailNet"}</p>
                        <p className="flex items-center gap-2"><Check size={14} className="text-[#047857]" /> {evaluation?.seller?.years_on_platform ? `${evaluation.seller.years_on_platform} years on platform` : "Established seller on platform"}</p>
                        <p className="flex items-center gap-2"><Check size={14} className="text-[#047857]" /> {evaluation?.seller?.rating ? `${evaluation.seller.rating} seller rating` : product?.rating_count ? `${Math.round(product.rating_count / 1000)}k+ seller rating` : "High seller rating"}</p>
                        <p className="flex items-center gap-2"><Check size={14} className="text-[#047857]" /> 100% Original products</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#e5e7eb] bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fef3c7] text-[#b45309]">
                      <Sparkles size={18} />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#64748b]">Value insight</p>
                      <p className="mt-2 text-[13px] leading-snug text-[#111827]">
                        At ₹{product?.price} ({product?.discount}% off MRP ₹{product?.mrp}), this is close to its best recorded price.
                      </p>
                      <p className="mt-2 text-[12px] text-[#6b7280]">Price trend is stable.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#e5e7eb] bg-[#f0fdf4] px-4 py-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#dcfce7] text-[#047857]">
                      <CheckCircle2 size={18} />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#047857]">BuyReady Promise</p>
                      <p className="mt-2 text-[13px] leading-snug text-[#111827]">
                        Better fit. On-time delivery. Happy returns.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {type === "fit" && (
            <div>
              <FitAvatar zones={fitZones} />
              <p className="mt-4 text-center text-[12px] text-[#8b909c]">
                Illustrative fit map based on {fitProfile?.name ? `${fitProfile.name}'s` : "your"} profile
                {fitProfile ? ` (${fitProfile.height_cm}cm • ${fitProfile.weight_kg}kg • ${fitProfile.body_shape})` : ""}.
              </p>
              <div className="mt-5 space-y-3 border-t border-[#f0f0f0] pt-4">
                {fitZones.map((z) => (
                  <div key={z.key} className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#282c3f]">{z.label}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        z.status === "good" ? "bg-[#e6f7ed] text-[#03a685]" : z.status === "warn" ? "bg-[#fff8e6] text-[#b45309]" : "bg-[#fdecef] text-[#e0344c]"
                      }`}
                    >
                      {z.status === "good" ? "Good fit" : z.status === "warn" ? "Slightly loose" : "Check size"}
                    </span>
                  </div>
                ))}
              </div>
              {recommendedSize && (
                <div className="mt-5 rounded-2xl bg-[#f0fbf2] px-4 py-3 text-[12.5px] font-semibold text-[#14532d]">
                  Recommended size for you: <span className="font-extrabold">{recommendedSize}</span>
                </div>
              )}
            </div>
          )}

          {type === "delivery" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[28px] border border-[#e2e8f0] bg-white px-5 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef9f4] text-[#047857] shadow-sm">
                    <ShieldCheck size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#64748b]">Delivery & BuyReady</p>
                    <p className="mt-2 text-[18px] font-extrabold text-[#111827]">Delivery details you can trust</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#e2e8f0] bg-white px-5 py-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ecfdf5] text-[#047857] shadow-sm">
                    <Truck size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#64748b]">Expected Delivery</p>
                    <p className="mt-2 text-[22px] font-extrabold text-[#111827]">
                      {formatDeliveryDate(deliveryOption) || evaluation?.delivery?.estimated_label || "Delivery estimate unavailable"}
                    </p>
                  </div>
                </div>
                <div className="mt-5 rounded-[20px] border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-[#334155]">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ecfdf5] text-[#047857]">
                        <MapPin size={14} />
                      </span>
                      <span>Delivering to {pincode}</span>
                    </div>
                    <button type="button" className="rounded-full border border-[#ff3f6c] px-3 py-1 text-[12px] font-bold text-[#ff3f6c]">Change</button>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#d1fae5] bg-[#ecfdf5] px-5 py-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#dcfce7] text-[#047857] shadow-sm">
                    <BadgeCheck size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#166534]">Delivery Confidence</p>
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <p className="text-[30px] font-extrabold leading-none text-[#047857]">{deliveryConfidence}%</p>
                      <p className="text-[13px] font-semibold text-[#047857]">On-Time Confidence</p>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-[13px] text-[#14532d]">High likelihood of on-time delivery based on:</p>
                <div className="mt-4 space-y-3">
                  {[
                    "Nearby warehouse stock",
                    "Reliable courier on your route",
                    "Fast dispatch (ships within 24 hrs)",
                    "High on-time delivery record to your area",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3 text-[13px] text-[#14532d]">
                      <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#dcfce7] text-[#047857]">
                        <Check size={14} />
                      </span>
                      <span className="leading-5">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-[#e2e8f5] bg-white px-5 py-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#334155]">AI Delivery Monitoring</p>
                    <p className="mt-2 text-[14px] font-semibold text-[#111827]">Live tracking and safety checks</p>
                  </div>
                  <span className="rounded-full bg-[#dcfce7] px-3 py-1 text-[11px] font-bold text-[#047857]">LIVE</span>
                </div>
                <div className="mt-4 space-y-3 text-[13px] text-[#334155]">
                  {[
                    "Package verified before dispatch",
                    "No delay risks detected",
                    "Live route monitoring enabled",
                    "You'll be notified if any delivery delay is predicted",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#ecfdf5] text-[#047857]">
                        <Check size={14} />
                      </span>
                      <span className="leading-5">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-[#e2e8f5] bg-white px-5 py-5 shadow-sm">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#334155]">Prepack Verification</p>
                </div>
                <div className="mt-4 space-y-3 text-[13px] text-[#334155]">
                  {[
                    "Product matched with order",
                    "Package quality verified",
                    "QR verification generated",
                    "Ready for dispatch",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#ecfdf5] text-[#047857]">
                        <Check size={14} />
                      </span>
                      <span className="leading-5">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#64748b]">
                  <PackageCheck size={14} className="text-[#db2777]" /> Package Protection
                </p>
                <div className="rounded-[22px] border border-[#e5e7eb] bg-white px-4 py-4">
                  {["Tamper-Sealed Package", "Damage Protection", "Easy Inspection"].map((item) => (
                    <p key={item} className="flex items-center gap-2 text-[12.5px] font-medium text-[#334155]">
                      <Check size={14} className="text-[#059669]" strokeWidth={3} /> {item}
                    </p>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#64748b]">
                  <Truck size={14} className="text-[#db2777]" /> Order Journey
                </p>
                <div className="rounded-[22px] border border-[#e5e7eb] bg-[#f8fafc] px-4 py-4">
                  <div className="flex items-center gap-3">
                    {["Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered"].map((step) => (
                      <div key={step} className="flex min-w-[0] flex-1 flex-col items-center gap-2 text-center">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ecfdf5] text-[#047857] shadow-sm">
                          <Check size={14} />
                        </span>
                        <p className="text-[9px] font-semibold leading-tight text-[#475569]">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] bg-[#f8fafc] px-4 py-4">
                <p className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#64748b]">
                  <ShieldCheck size={14} className="text-[#db2777]" /> BuyReady Promise
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Reliable Delivery", icon: Truck },
                    { label: "Easy Returns", icon: RotateCcw },
                    { label: "Secure Packaging", icon: Lock },
                  ].map((p) => {
                    const Icon = p.icon;
                    return (
                      <div key={p.label} className="flex flex-col items-center gap-2 rounded-3xl bg-white px-3 py-3 text-center shadow-sm">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ecfdf5] text-[#047857]">
                          <Icon size={15} />
                        </span>
                        <p className="text-[10px] font-semibold leading-tight text-[#475569]">{p.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {type === "returns" && (
            <div className="flex flex-col gap-5">
              {/* Easy Returns header card */}
              <div className="rounded-[24px] bg-[#f3e8ff] px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/70 text-[#9333ea]">
                    <RotateCcw size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-extrabold text-[#3b0764]">Easy Returns</p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-[#6b21a8]">
                      <Calendar size={13} /> 15-day return window
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-[#6b21a8]">
                      <Truck size={13} /> Free pickup at your doorstep
                    </p>
                  </div>
                </div>
              </div>

              {/* 1. Return checklist */}
              <div>
                <p className="flex items-center gap-2 text-[13px] font-extrabold text-[#282c3f]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e6f7ed] text-[#03a685]">
                    <PackageOpen size={13} />
                  </span>
                  1. Return checklist
                </p>
                <div className="mt-3 divide-y divide-[#f0f0f0] rounded-[20px] border border-[#ececec] bg-white px-4 py-3">
                  {[
                    "Original tags attached",
                    "Unused / unworn condition",
                    "Original packaging included",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5 py-3">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#e6f7ed] text-[#03a685]">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span className="text-[12.5px] font-medium text-[#282c3f]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Return process */}
              <div>
                <p className="flex items-center gap-2 text-[13px] font-extrabold text-[#282c3f]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f3e8ff] text-[#9333ea]">
                    <RefreshCw size={12} />
                  </span>
                  2. Return process
                </p>
                <div className="relative mt-4 grid grid-cols-3 gap-3">
                  <div className="absolute left-[12%] right-[12%] top-[26px] h-px border-t border-dashed border-[#e5d4f7]" />
                  {[
                    {
                      label: "Request Return",
                      sub: "Raise a return request from your orders page",
                      icon: PackageOpen,
                    },
                    {
                      label: "Pickup Scheduled",
                      sub: "We'll pick up the item from your address",
                      icon: Truck,
                    },
                    {
                      label: "Refund / Exchange",
                      sub: "Refund or exchange will be processed",
                      icon: CreditCard,
                    },
                  ].map((step) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.label} className="relative flex flex-col items-center text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f3e8ff] text-[#9333ea] shadow-sm">
                          <Icon size={18} />
                        </span>
                        <p className="mt-3 text-[11px] font-bold leading-tight text-[#282c3f]">{step.label}</p>
                        <p className="mt-1 text-[10px] leading-tight text-[#6b7280]">{step.sub}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Return verification */}
              <div>
                <div className="flex items-center gap-2 text-[13px] font-extrabold text-[#282c3f]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e6f7ed] text-[#03a685]">
                    <Cpu size={13} />
                  </span>
                  <span>3. Return verification (AI)</span>
                  <span className="rounded-full bg-[#f0fdf4] px-2 py-0.5 text-[10px] font-semibold text-[#15803d]">New</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      title: "Upload Image",
                      desc: "Upload clear photos of the product",
                      icon: UploadCloud,
                    },
                    {
                      title: "AI Verification",
                      desc: "Our AI checks product, packing & quality",
                      icon: Cpu,
                    },
                    {
                      title: "Flexibility Confirmed",
                      desc: "You'll know if your return is eligible",
                      icon: Sparkles,
                    },
                    {
                      title: "Pickup Approved",
                      desc: "We'll schedule a hassle-free doorstep pickup",
                      icon: CheckCircle2,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="rounded-[20px] border border-[#ececec] bg-white px-4 py-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ecfdf5] text-[#047857]">
                            <Icon size={18} />
                          </span>
                          <div>
                            <p className="text-[12px] font-bold text-[#111827]">{item.title}</p>
                            <p className="mt-1 text-[11px] leading-tight text-[#6b7280]">{item.desc}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. What you get */}
              <div>
                <p className="flex items-center gap-2 text-[13px] font-extrabold text-[#282c3f]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f3e8ff] text-[#9333ea]">
                    <PackageCheck size={13} />
                  </span>
                  4. What you get
                </p>
                <div className="mt-3 rounded-[20px] border border-[#ececec] bg-white px-4 py-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        label: "Free doorstep pickup",
                        icon: Truck,
                      },
                      {
                        label: "Refund or exchange as per your choice",
                        icon: RefreshCw,
                      },
                      {
                        label: "Safe & hassle-free experience",
                        icon: ShieldCheck,
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="flex items-start gap-3 rounded-2xl bg-[#f8fafc] p-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#f3e8ff] text-[#9333ea]">
                            <Icon size={16} />
                          </span>
                          <p className="text-[12.5px] font-semibold leading-tight text-[#282c3f]">{item.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* BuyReady Insight */}
              <div className="rounded-[20px] border border-[#d7f3e6] bg-[#f0fbf2] px-4 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-[#03a685]">
                    <ShieldCheck size={14} /> BuyReady Insight
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#03a685]">Great Choice!</span>
                  </p>
                  <ThumbsUp size={15} className="flex-shrink-0 text-[#03a685]" />
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[#14532d]">
                  This product is frequently kept by shoppers.
                </p>
                <p className="mt-0.5 text-[11.5px] font-semibold text-[#03a685]">
                  Very low return rate in this category.
                </p>
              </div>
            </div>
          )}

          {type === "quality" && (
            <div>
              {/* Product thumbnails row */}
              <div className="flex items-center gap-2.5">
                {images.slice(0, 1).map((src, idx) => (
                  <img key={idx} src={src} alt="product" className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover bg-[#f3f4f6]" />
                ))}
                {[2, 3].map((n) => (
                  <div
                    key={n}
                    className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-[#f3f4f6] text-[#9aa0ab]"
                  >
                    <ShoppingBag size={16} />
                    <span className="text-[10px] font-bold text-[#535766]">Product {n}</span>
                  </div>
                ))}
              </div>

              {/* Review summary card */}
              <div className="mt-5 rounded-[20px] border border-[#ececec] bg-white px-4 py-4">
                <p className="text-[13px] font-bold text-[#282c3f]">Review summary</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#535766]">
                  {qualityReviewSummaryText}
                </p>

                <div className="mt-4 flex items-center gap-4">
                  <div>
                    <p className="flex items-center gap-1 text-[24px] font-extrabold text-[#03a685]">
                      {avgRating} <Star size={16} className="fill-[#03a685] text-[#03a685]" />
                    </p>
                    <p className="text-[11px] text-[#8b909c]">{ratingCount.toLocaleString ? ratingCount.toLocaleString("en-IN") : ratingCount} Ratings</p>
                  </div>
                  <div className="h-9 w-px bg-[#f0f0f0]" />
                  <div>
                    <p className="text-[24px] font-extrabold text-[#03a685]">{displayPositivePercent}%</p>
                    <p className="flex items-center gap-1 text-[11px] text-[#8b909c]">
                      <ThumbsUp size={11} /> of buyers recommend this product
                    </p>
                  </div>
                </div>

                {/* Rating breakdown bars */}
                <div className="mt-4 space-y-2 border-t border-[#f0f0f0] pt-4">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center gap-2">
                      <span className="w-[26px] flex-shrink-0 text-[11px] font-semibold text-[#535766]">{star} ★</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f1f1f3]">
                        <div
                          className="h-full rounded-full bg-[#03a685]"
                          style={{ width: `${breakdown[star] || 0}%` }}
                        />
                      </div>
                      <span className="w-[30px] flex-shrink-0 text-right text-[11px] font-bold text-[#282c3f]">{breakdown[star] || 0}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review sentiment banner */}
              {!isMostlyNegative ? (
                <div className="mt-4 rounded-[20px] bg-[#e6f7ed] px-4 py-3.5">
                  <p className="flex items-center gap-2 text-[13px] font-extrabold text-[#03a685]">
                    <ThumbsUp size={15} className="fill-[#03a685] text-[#03a685]" /> Most shoppers are satisfied!
                  </p>
                  <p className="mt-1 text-[12px] font-semibold text-[#14532d]">
                    {fivePlusFourPercent}% of buyers gave 4 or 5 stars
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-[11.5px] font-bold text-[#14532d]">
                    <span>{breakdown[5] || 0}% gave 5★</span>
                    <span>{breakdown[4] || 0}% gave 4★</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[20px] border border-yellow-200 bg-yellow-50 px-4 py-3.5">
                  <p className="text-[13px] font-extrabold text-[#92400e]">Review Analysis</p>
                  <p className="mt-1 text-[12px] font-semibold text-[#78350f]">Fabric quality emerged as a recurring concern in customer reviews.</p>
                </div>
              )}

              {/* Top reviews */}
              <div className="mt-6 flex items-center justify-between">
                <p className="text-[13px] font-bold text-[#282c3f]">Top reviews</p>
                <span className="text-[11.5px] font-semibold text-[#8b909c]">Most recent</span>
              </div>
              <div className="mt-2 divide-y divide-[#f0f0f0]">
                {reviews.map((r, i) => (
                  <div key={r.id} className="flex items-start gap-3 py-4">
                    <span
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold text-white"
                      style={{ backgroundColor: avatarColors[i % avatarColors.length] }}
                    >
                      {r.name?.[0] || "S"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-bold text-[#282c3f]">{r.name}</p>
                      <p className="text-[11px] text-[#8b909c]">{r.location} • Size {r.size}</p>
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-[#03a685]">
                        {r.rating}★ {r.title && <span className="text-[#282c3f]">{r.title}</span>}
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-[#535766]">{r.comment}</p>
                      {r.helpful != null && (
                        <p className="mt-1.5 flex items-center gap-1 text-[10.5px] text-[#9aa0ab]">
                          <ThumbsUp size={11} /> {r.helpful}
                        </p>
                      )}
                    </div>
                    {(r.image || images[i]) && (
                      <div className="grid flex-shrink-0 grid-cols-1 gap-1">
                        <img
                          src={r.image || images[i]}
                          alt=""
                          className="h-16 w-14 rounded-lg object-cover bg-[#f3f4f6]"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === "bestseller" && (
            <div className="flex flex-col gap-5">
              {/* Trending this week */}
              <div className="flex items-start gap-3 rounded-[20px] bg-[#fdeef2] px-4 py-4">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/70 text-[#e0344c]">
                  <TrendingUp size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-bold text-[#e0344c]">Trending this week</p>
                  <p className="mt-0.5 text-[15px] font-extrabold text-[#3f0d16]">
                    #{product?.rank_in_category ?? 3} in {product?.category || "Premium Dresses"}
                  </p>
                  <p className="mt-0.5 text-[12px] font-semibold text-[#8a4552]">
                    {(product?.units_sold ?? 1200).toLocaleString("en-IN")}+ bought in the last 30 days
                  </p>
                </div>
              </div>

              {/* Seller Details */}
              <div className="rounded-[20px] border border-[#ececec] bg-white px-4 py-4">
                <p className="flex items-center gap-2 text-[13px] font-bold text-[#282c3f]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f3e8ff] text-[#9333ea]">
                    <Award size={14} />
                  </span>
                  Seller Details
                </p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-extrabold text-[#282c3f]">{product?.seller?.name || "Verified Seller"}</span>
                  <span className="flex items-center gap-1 rounded-full bg-[#fdeef2] px-2 py-0.5 text-[10px] font-bold text-[#e0344c]">
                    <BadgeCheck size={11} /> Preferred Seller
                  </span>
                </div>
                <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-[#535766]">
                  <Star size={12} className="fill-[#f5a623] text-[#f5a623]" />
                  {product?.seller?.rating != null ? product.seller.rating : 4.3}/5
                  <span className="text-[#d1d5db]">|</span>
                  {(product?.seller?.ratings_count ?? 37860).toLocaleString("en-IN")} Ratings
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-[#03a685]">
                  <Check size={13} strokeWidth={3} className="rounded-full bg-[#e6f7ed] p-0.5" />
                  Trusted on BuyReady since {product?.seller?.member_since || "Jan 2021"}
                </p>
              </div>

              {/* Stat mini-cards */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: Users, value: (product?.seller?.orders_fulfilled != null ? `${Math.round(product.seller.orders_fulfilled / 1000)},000+` : "48,000+"), label: "Orders Fulfilled" },
                  { icon: ThumbsUp, value: `${100 - returnPercent}%`, label: "Satisfaction Rate" },
                  { icon: Users, value: "15,000+", label: "Happy Customers" },
                  { icon: Clock, value: "7 Days", label: "Avg. Response" },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#ececec] bg-white px-2 py-3 text-center">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fdeef2] text-[#e0344c]">
                        <Icon size={13} />
                      </span>
                      <p className="text-[12px] font-extrabold text-[#282c3f]">{stat.value}</p>
                      <p className="text-[9px] font-semibold leading-tight text-[#8b909c]">{stat.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Why shop from this seller */}
              <div className="rounded-[20px] border border-[#ececec] bg-white px-4 py-4">
                <p className="text-[13px] font-bold text-[#282c3f]">Why shop from this seller?</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="space-y-2.5">
                    {["100% Original Products", "Secure Packaging", "On-time Delivery", "Hassle-free Returns"].map((item) => (
                      <p key={item} className="flex items-center gap-2 text-[12px] font-semibold text-[#282c3f]">
                        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#fdeef2] text-[#e0344c]">
                          <Check size={10} strokeWidth={3} />
                        </span>
                        {item}
                      </p>
                    ))}
                  </div>
                  <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-[#fdeef2] text-[#e0344c]">
                    <ShoppingBag size={26} />
                  </span>
                </div>
              </div>

              {/* Great Value for Money */}
              <div className="rounded-[20px] border border-[#d7f3e6] bg-[#f0fbf2] px-4 py-4">
                <p className="flex items-center gap-2 text-[13px] font-bold text-[#14532d]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#03a685]">
                    <Tag size={14} />
                  </span>
                  Great Value for Money
                </p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#3f6652]">
                  This product offers great quality at a competitive price.
                </p>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#d7f3e6] pt-3">
                  <div>
                    <p className="text-[10px] font-semibold text-[#6b8f7c]">Best Price</p>
                    <p className="text-[15px] font-extrabold text-[#03a685]">₹{product?.price ?? "2,899"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[#6b8f7c]">You Save</p>
                    <p className="text-[15px] font-extrabold text-[#e0344c]">
                      ₹{(product?.mrp && product?.price) ? product.mrp - product.price : "1,901"} ({product?.discount ?? 40}%)
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[#6b8f7c]">M.R.P</p>
                    <p className="text-[13px] font-bold text-[#9aa0ab] line-through">₹{product?.mrp ?? "4,800"}</p>
                  </div>
                </div>
              </div>

              {/* Buyer Protection */}
              <div className="rounded-[20px] border border-[#e5e0ff] bg-[#f6f4ff] px-4 py-4">
                <p className="flex items-center gap-2 text-[13px] font-bold text-[#3b2a8c]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#6d5bd0]">
                    <ShieldCheck size={14} />
                  </span>
                  Buyer Protection
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                  {[
                    { label: "Secure Payments", icon: Lock },
                    { label: "Easy Returns", icon: RefreshCw },
                    { label: "100% Authentic", icon: BadgeCheck },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <p key={item.label} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#4b3f9e]">
                        <Icon size={13} /> {item.label}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// A clean, self-contained replacement for the previous reviews block.
// Simple, list-style layout — no boxed cards, no grids. Everything reads
// top to bottom in plain rows separated by thin dividers.
function TrustedReviewsSection({ product, reviewsSummary }) {
  const positivePercent = reviewsSummary?.positive_percent != null
    ? (reviewsSummary.positive_percent === 0 ? 10 : reviewsSummary.positive_percent)
    : 92;

  const fitBreakdown = [
    { label: "Perfect Fit", percent: reviewsSummary?.fit_perfect_percent != null ? reviewsSummary.fit_perfect_percent : 82, color: "#03a685" },
    { label: "Runs Loose", percent: reviewsSummary?.fit_loose_percent != null ? reviewsSummary.fit_loose_percent : 11, color: "#f5a623" },
    { label: "Runs Tight", percent: reviewsSummary?.fit_tight_percent != null ? reviewsSummary.fit_tight_percent : 7, color: "#e0344c" },
  ];

  const reviews = reviewsSummary?.highlights?.length
    ? reviewsSummary.highlights
    : [
        {
          id: "r1",
          name: "Sowmya V",
          location: "Guntur",
          size: "S",
          rating: 5,
          comment: "Loved it! Wore it for a family function and got so many compliments.",
          image: null,
        },
        {
          id: "r2",
          name: "Divya T",
          location: "Lucknow",
          size: "XL",
          rating: 4,
          comment: "Great quality stitching, comfortable for all-day wear.",
          image: product?.images?.[1] || null,
        },
        {
          id: "r3",
          name: "Sowmya V",
          location: "Guntur",
          size: "XL",
          rating: 4,
          comment: "True to size, ordered M as per my usual and it fits perfectly.",
          image: product?.images?.[2] || null,
        },
      ];

  return (
    <section className="px-5 py-8 sm:px-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8b909c]">Customer Reviews</p>
      <h2 className="mt-1 text-[22px] font-extrabold text-[#282c3f]">Trusted by shoppers</h2>
      <p className="mt-1 text-[13px] text-[#7e838f]">
        Real buyer feedback, ratings, and photos to help you decide with confidence.
      </p>

      {/* Positive / Areas to note — plain rows, no boxes */}
      <div className="mt-6 divide-y divide-[#f0f0f0] border-t border-[#f0f0f0]">
        <div className="flex items-start gap-3 py-4">
          <span className="mt-0.5 text-[15px]">👍</span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#282c3f]">Positive highlights</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#535766]">
              {reviewsSummary?.positive_percent != null
                ? reviewsSummary.positive_percent >= 70
                  ? reviewsSummary?.positive || reviewsSummary?.positive_highlight || "Shoppers loved the fit, fabric quality and colour accuracy."
                  : reviewsSummary.positive || "Some buyers liked the style or fit, but many others reported issues."
                : reviewsSummary?.positive_highlight || "Shoppers loved the fit, fabric quality and colour accuracy."}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 py-4">
          <span className="mt-0.5 text-[15px]">👎</span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#282c3f]">Areas to note</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#535766]">
              {reviewsSummary?.negative || reviewsSummary?.areas_to_note || "No major complaints reported."}
            </p>
          </div>
        </div>
      </div>

      {/* Fit rating breakdown — plain, no box */}
      <div className="mt-6 border-t border-[#f0f0f0] pt-5">
        <p className="text-[13px] font-bold text-[#282c3f]">How this fits</p>
        <p className="text-[11.5px] text-[#8b909c]">
          Based on {(product?.rating_count?.toLocaleString("en-IN") != null ? product.rating_count.toLocaleString("en-IN") : "verified")} buyer ratings
        </p>
        <div className="mt-4 space-y-3">
          {fitBreakdown.map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="w-[84px] flex-shrink-0 text-[12px] font-semibold text-[#282c3f]">{row.label}</span>
              <div className="h-2 flex-shrink-0 overflow-hidden rounded-full bg-[#f1f1f3] w-[60%] max-w-[220px]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${row.percent}%`, backgroundColor: row.color }}
                />
              </div>
              <span className="w-[36px] flex-shrink-0 text-right text-[12px] font-bold text-[#282c3f]">{row.percent}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review highlights header */}
      <div className="mt-6 flex items-center justify-between border-t border-[#f0f0f0] pt-5">
        <div>
          <p className="text-[13px] font-bold text-[#282c3f]">Review highlights</p>
          <p className="text-[11.5px] text-[#8b909c]">Latest verified buyer experiences</p>
        </div>
        <span className="text-[12px] font-bold text-[#03a685]">{positivePercent}% recommend</span>
      </div>

      {/* Reviews — simple stacked list, one after another, no cards */}
      <div className="mt-2 divide-y divide-[#f0f0f0]">
        {reviews.map((r) => (
          <div key={r.id} className="py-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 rounded-full bg-[#e6f7ed] px-2 py-0.5 text-[11px] font-bold text-[#03a685]">
                {r.rating} <Star size={10} className="fill-[#03a685] text-[#03a685]" />
              </span>
              <span className="text-[13px] font-bold text-[#282c3f]">{r.name}</span>
              <span className="text-[11.5px] text-[#8b909c]">• {r.location} • Size {r.size}</span>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[#535766] break-words">{r.comment}</p>
            {r.image && (
              <img
                src={r.image}
                alt={`${r.name} review`}
                className="mt-3 h-32 w-full max-w-[280px] rounded-2xl object-cover bg-[#f3f4f6]"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { wishlist, toggleWishlist, addToCart } = useShop();

  const [product, setProduct] = useState(null);
  const [reviewsSummary, setReviewsSummary] = useState(null);
  const [reviewsData, setReviewsData] = useState(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [selectedDeliveryType, setSelectedDeliveryType] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [state, setState] = useState({
    fitProfileId: user?.active_fit_profile || user?.fit_profiles?.[0]?.id || null,
    addressId: user?.addresses?.find((a) => a.default)?.id || user?.addresses?.[0]?.id || null,
    purpose: null,
    eventDate: null,
  });
  const [evaluation, setEvaluation] = useState(null);
  const [evaluationPending, setEvaluationPending] = useState(false);
  const [fitSidePanelOpen, setFitSidePanelOpen] = useState(false);
  const [fitSidePanelSection, setFitSidePanelSection] = useState(null);
  const [buyCardOpen, setBuyCardOpen] = useState(false);
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [addressMenuOpen, setAddressMenuOpen] = useState(false);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [addressFormMode, setAddressFormMode] = useState("add");
  const [addressDraft, setAddressDraft] = useState({
    label: "Home",
    receiver: "",
    phone: "",
    line1: "",
    city: "",
    state: "",
    pin: "",
  });
  // Category-driven UI flags (frontend-only heuristics)
  const BEAUTY_CATEGORIES = ["Beauty", "Makeup", "Skincare", "Haircare"];
  const isSaree = product?.category === "Sarees";
  const isBeauty = BEAUTY_CATEGORIES.includes(product?.category);
  const isKids = product?.category === "Kids Clothing" || product?.gender === "Kids";
  const KIDS_AGE_SIZES = ["2–3Y", "4–5Y", "6–7Y", "8–9Y"];
  const effectiveSizes = isKids ? KIDS_AGE_SIZES : (product?.sizes || []);
  const showSizeControls = product && !isBeauty && !isSaree && effectiveSizes.length > 0;
  const needsSize = showSizeControls && effectiveSizes.length > 0 && !size;
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [newFp, setNewFp] = useState({
    name: "",
    height_cm: 160,
    weight_kg: 55,
    body_shape: "Pear",
    preferred_fit: "Regular",
    language: "en",
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [betterOpen, setBetterOpen] = useState(false);
  const [betterData, setBetterData] = useState(null);
  const [recommendedAlt, setRecommendedAlt] = useState(null);
  const [recommendedAltLoading, setRecommendedAltLoading] = useState(false);
  const [productDetailsExpanded, setProductDetailsExpanded] = useState(false);
  const [insightType, setInsightType] = useState(null);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const matchTimerRef = useRef(null);

  const activeFitProfile = useMemo(() => {
    if (!user?.fit_profiles?.length) return null;
    return user.fit_profiles.find((fp) => fp.id === state.fitProfileId) || user.fit_profiles[0] || null;
  }, [user?.fit_profiles, state.fitProfileId]);

  const addr = useMemo(() => {
    const addrs = user?.addresses || [];
    if (!addrs.length) return null;
    return addrs.find((a) => a.id === state.addressId) || addrs.find((a) => a.default) || addrs[0] || null;
  }, [user?.addresses, state.addressId]);

  const wished = useMemo(() => {
    try {
      return !!(wishlist && product && wishlist.includes(product.id));
    } catch (e) {
      return false;
    }
  }, [wishlist, product]);

  // Define evaluate first before any effects that use it
  const evaluate = useCallback(() => {
    setEvaluationPending(true);
    // Get the active fit profile ID
    const fitProfileId = state.fitProfileId || user?.active_fit_profile || user?.fit_profiles?.[0]?.id;

    console.log("DEBUG evaluate called:", {
      fitProfileId,
      addressId: state.addressId,
      userId: user?.id,
      userFitProfiles: user?.fit_profiles?.map(f => ({ id: f.id, name: f.name })),
      productId: id
    });

    api.post("/buyready/evaluate", {
      product_id: id,
      fit_profile_id: fitProfileId,  // Always send a fit profile ID if available
      address_id: state.addressId,
      purpose: state.purpose,
      event_date: state.eventDate,
      payment_method: paymentMethod,
      selected_size: size,
    }).then(({ data }) => {
      console.log("Evaluation data received:", data); // Debug log
      setEvaluation(data);
      if (data.recommended_size && !size) {
        setSize(data.recommended_size);
      }
    }).catch((err) => {
      console.error("Evaluate error details:", {
        status: err.response?.status,
        message: err.response?.data?.detail || err.message,
        fullError: err
      });
    }).finally(() => setEvaluationPending(false));
  }, [id, state, size, paymentMethod, user]);

  // Sync fit profile state when user profile changes (e.g., after creating new fit profile)
  useEffect(() => {
    const newFitProfileId = user?.active_fit_profile || user?.fit_profiles?.[0]?.id;
    if (newFitProfileId && newFitProfileId !== state.fitProfileId) {
      setState((prev) => ({
        ...prev,
        fitProfileId: newFitProfileId,
      }));
      // Immediately evaluate with the new fit profile
      setTimeout(() => evaluate(), 100);
    }
  }, [user?.active_fit_profile, user?.fit_profiles, state.fitProfileId, evaluate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkoutState = {
      addressId: state.addressId,
      deliveryPreference: state.purpose === "Gift" ? "gift" : state.purpose === "Event" ? "event" : "normal",
      preferredDeliveryDate: state.eventDate || "",
      giftWrap: false,
      giftMessage: "",
      deliveryType: selectedDeliveryType,
    };
    sessionStorage.setItem("checkoutRouteState", JSON.stringify(checkoutState));
  }, [state.addressId, state.purpose, state.eventDate, selectedDeliveryType]);

  useEffect(() => {
    setProduct(null);
    setImgIdx(0);
    window.scrollTo(0, 0);
    api.get(`/products/${id}`).then(({ data }) => {
      setProduct(data);
      setColor(data.colors?.[0]);
      // Automatically call evaluate after loading product
      setTimeout(() => evaluate(), 100);
    });
    api.get(`/products/${id}/reviews`).then(({ data }) => {
      setReviewsData(data);
      setReviewsSummary(data.summary);
    }).catch(() => {});

    // If user doesn't have a fit profile, prompt them to create one
    if (user && !user.fit_profiles?.length) {
      setTimeout(() => {
        setBuyCardOpen(true);
        toast.info("Create a Fit Profile to get personalized size recommendations!");
      }, 1000);
    }
  }, [id, user, evaluate]);

  useEffect(() => { evaluate(); }, [id, state, paymentMethod, size, evaluate]);

  useEffect(() => {
    return () => {
      if (matchTimerRef.current) {
        clearTimeout(matchTimerRef.current);
      }
    };
  }, []);

  const findBetterMatch = () => {
    matchTimerRef.current = setTimeout(() => {
      if (!product) return;
      const minPrice = Math.max(0, Math.round(product.price * 0.75));
      const maxPrice = Math.round(product.price * 1.25);
      const params = new URLSearchParams();
      if (product.category) params.set("category", product.category);
      if (product.gender) params.set("gender", product.gender);
      if (color || product.colors?.[0]) params.set("color", color || product.colors?.[0]);
      params.set("min_price", String(minPrice));
      params.set("max_price", String(maxPrice));
      if (state.purpose) params.set("occasion", state.purpose.toLowerCase());
      navigate(`/products?${params.toString()}`);
    }, 1400);
  };

  const openBetterChoice = async () => {
    try {
      const { data } = await api.post("/buyready/better-choice", {
        product_id: id,
        fit_profile_id: state.fitProfileId,
        address_id: state.addressId,
        purpose: state.purpose,
        event_date: state.eventDate,
        selected_size: size,
      });
      setBetterData(data);
      setBetterOpen(true);
    } catch (e) { toast.error(apiError(e)); }
  };

  const handleSearchAlternative = async () => {
    if (product?.sizes?.length && !size) {
      toast.error("Please select a size first to find faster alternatives.");
      return;
    }
    if (state.purpose && (state.purpose === "Event" || state.purpose === "Gift") && !state.eventDate) {
      toast.error("Please select the event/gift date first to search alternatives.");
      setCalendarOpen(true);
      return;
    }
    openBetterChoice();
  };

  const openAddressEditor = (mode = "add", address = null) => {
    setAddressMenuOpen(true);
    if (mode === "edit" && address) {
      setAddressFormMode("edit");
      setEditingAddressId(address.id);
      setAddressDraft({
        label: address.label || "Home",
        receiver: address.receiver || "",
        phone: address.phone || "",
        line1: address.line1 || "",
        city: address.city || "",
        state: address.state || "",
        pin: address.pin || "",
      });
    } else {
      setAddressFormMode("add");
      setEditingAddressId(null);
      setAddressDraft({
        label: "Home",
        receiver: "",
        phone: "",
        line1: "",
        city: "",
        state: "",
        pin: "",
      });
    }
    setAddressFormOpen(true);
  };

  const saveAddress = async () => {
    if (!addressDraft.receiver || !addressDraft.phone || !addressDraft.pin || !addressDraft.line1 || !addressDraft.city || !addressDraft.state) {
      toast.error("Please fill all address fields");
      return;
    }
    try {
      // BUG FIX: previously this always POSTed a new address, even in
      // "edit" mode, so edits never actually saved — it just silently
      // created a duplicate address instead of updating the existing one.
      // Now: edit mode calls PUT on the existing address id, add mode POSTs.
      const isEditing = addressFormMode === "edit" && editingAddressId;
      const { data } = isEditing
        ? await api.put(`/me/addresses/${editingAddressId}`, addressDraft)
        : await api.post("/me/addresses", addressDraft);
      await refreshUser();
      setState((s) => ({ ...s, addressId: data?.id || editingAddressId || s.addressId }));
      setAddressFormOpen(false);
      setAddressMenuOpen(false);
      setAddressFormMode("add");
      setEditingAddressId(null);
      setAddressDraft({
        label: "Home",
        receiver: "",
        phone: "",
        line1: "",
        city: "",
        state: "",
        pin: "",
      });
      toast.success(isEditing ? "Address updated" : "Address saved");
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const saveFitProfile = async () => {
    if (!newFp.name) {
      toast.error("Give this profile a name");
      return;
    }
    try {
      const { data } = await api.post("/me/fit-profiles", newFp);
      await refreshUser();
      setState((s) => ({ ...s, fitProfileId: data.id }));
      setProfilePanelOpen(false);
      setProfileFormOpen(false);
      setNewFp({
        name: "",
        height_cm: 160,
        weight_kg: 55,
        body_shape: "Pear",
        preferred_fit: "Regular",
        language: "en",
      });
      toast.success("Fit profile created");
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const hasEvent = !!(state.purpose && state.eventDate);
  const productIsNegativeReview = reviewsSummary?.positive_percent != null
    ? reviewsSummary.positive_percent < 50
    : product?.quality_flag === "low";

  const buyReady = useMemo(
    () => computeBuyReady({
      selectedSize: size || "M",
      selectedPref: state.purpose === "Gift" ? "gift" : state.purpose && state.purpose !== "Casual" ? "event" : "casual",
      selectedDeliveryType,
      hasEvent,
      eventDate: state.eventDate,
      deliveryData: evaluation?.delivery,
      evaluation,
    }),
    [size, state.purpose, selectedDeliveryType, hasEvent, state.eventDate, evaluation]
  );
  const status = STATUS_CONFIG[buyReady.level];

  const issueReasons = useMemo(() => {
    const reasons = [];
    if (buyReady.level === "review" || buyReady.level === "risk") {
      // Only warn about "selected size" fit issues when the user's
      // selected size differs from the AI-recommended size. If the
      // selected size matches the recommendation, do not surface the
      // "frequent fit issues" message here (avoids false positives).
      if (buyReady.items.fit !== "ok") {
        const recommendedSize = evaluation?.recommended_size || null;
        const selectedSizeLocal = size || evaluation?.selected_size || null;
        if (selectedSizeLocal && recommendedSize && selectedSizeLocal !== recommendedSize) {
          reasons.push("Your selected size has frequent fit issues.");
        }
      }
      if (buyReady.items.delivery !== "ok") {
        reasons.push("Delivery may not meet your selected event date.");
      }
      if (buyReady.items.quality !== "ok") {
        reasons.push("Recent buyers reported recurring quality concerns.");
      }
      if (buyReady.items.returns !== "ok") {
        reasons.push("This item has limited return flexibility.");
      }
    }
    return reasons.length ? reasons : ["A few aspects of this product need a closer look before you buy."];
  }, [buyReady.items, buyReady.level]);

  // Derived values used by the Why BottomSheet — compute using the same
  // analysis function as the BuyReady card, with sensible fallbacks.
  const whyAnalysis = useMemo(() => {
    try {
      return generateAnalysis({ selectedSize: size || "M", product, evaluation, reviewsSummary });
    } catch (e) {
      return { fit_confidence: 90, delivery_conf: 90, quality_score: 80, return_risk: 8, explanation: "" };
    }
  }, [size, product, evaluation, reviewsSummary]);

  const whyFitConfidence = Math.round(whyAnalysis.fit_confidence != null ? whyAnalysis.fit_confidence : (evaluation?.fit_confidence != null ? evaluation.fit_confidence : 90));
  const whyDeliveryConfidence = Math.round(whyAnalysis.delivery_conf != null ? whyAnalysis.delivery_conf : (evaluation?.delivery?.confidence != null ? evaluation.delivery.confidence : 90));
  const whyReviewConfidence = Math.round(whyAnalysis.quality_score != null ? whyAnalysis.quality_score : Math.round((product?.rating || 4) * 20));
  const whyReturnRiskScore = Math.round(whyAnalysis.return_risk != null ? Math.max(0, Math.min(100, whyAnalysis.return_risk)) : (evaluation?.return_risk != null ? evaluation.return_risk : (product?.return_percent != null ? product.return_percent : 8)));
  const whyAiSummary = evaluation?.why?.ai_summary?.en || whyAnalysis.explanation || "AI recommendation not available";

  const handleAddToBag = async (goCheckout = false) => {
    if (product?.sizes?.length && !size) return toast.error("Please select a size");
    try {
      await addToCart(product.id, size, 1);
      if (goCheckout) navigate("/bag");
      else toast.success("Added to bag!");
    } catch (e) { toast.error(apiError(e)); }
  };

  const handleOpenFitPanel = (section = null) => {
    setFitSidePanelSection(section);
    setFitSidePanelOpen(true);
  };
  const handleCloseFitPanel = () => {
    setFitSidePanelOpen(false);
    setFitSidePanelSection(null);
  };

  const highlightItems = useMemo(() => {
    if (!product) return [];
    return [
      { icon: Sparkles, label: product.embellishment || product.pattern || "Sequin Embellished" },
      { icon: Layers, label: product.design_detail || "Layered Ruffle Design" },
      { icon: Shirt, label: product.fit_type ? `Comfortable ${product.fit_type} Fit` : "Comfortable Regular Fit" },
      { icon: Heart, label: product.occasion || "Perfect for Evening Events" },
    ];
  }, [product]);

  const materialCareLabel = product?.fabric ? `Premium ${product.fabric}` : "Premium Polyester Blend";
  const fetchedReviews = Array.isArray(reviewsData?.reviews) ? reviewsData.reviews : null;
  const fetchedReviewCounts = fetchedReviews
    ? fetchedReviews.reduce(
        (acc, r) => {
          const rating = r.rating || 0;
          if (rating >= 4) acc.pos += 1;
          if (rating <= 2) acc.neg += 1;
          acc.total += 1;
          return acc;
        },
        { pos: 0, neg: 0, total: 0 }
      )
    : { pos: 0, neg: 0, total: 0 };
  const actualPositivePercent = fetchedReviewCounts.total
    ? Math.round((fetchedReviewCounts.pos / fetchedReviewCounts.total) * 100)
    : null;
  const resolvedPositivePercent = (reviewsSummary?.positive_percent != null && !(reviewsSummary.positive_percent === 0 && fetchedReviewCounts.total > 0))
    ? reviewsSummary.positive_percent
    : actualPositivePercent;
  const displayPositivePercent = resolvedPositivePercent === 0 ? 10 : resolvedPositivePercent;

  const reviewsRowCountLabel = (() => {
    const count = product?.rating_count || 0;
    return count >= 1000 ? `${Math.round(count / 1000)}K` : count || "0";
  })();
  const reviewsRowSubtitle = `${product?.rating != null ? product.rating : "4.5"} • ${displayPositivePercent != null ? displayPositivePercent : 90}% recommend`;

  // Navigates to BuyReadyAIStudio with the shopper's currently selected
  // size/color/image/fit-profile so the AI studio can pick up right where
  // the PDP left off, without re-deriving any of that state itself.
  const handleCheckFitWithAI = () => {
    navigate(`/buyready-ai-studio/${product?.id}`, {
      state: {
        product,
        selectedSize: size,
        selectedColor: color,
        selectedImage: product?.images?.[imgIdx] || product?.images?.[0] || null,
        fitProfile: activeFitProfile || user?.fit_profiles?.[0] || null,
      },
    });
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f5f5f6]">
        <Header />
        <div className="mx-auto max-w-[460px] px-4 py-6">
          <div className="h-[260px] rounded-lg bg-gray-100 animate-pulse" />
          <div className="mt-4 space-y-3">
            <div className="h-4 w-1/3 rounded bg-gray-100 animate-pulse" />
            <div className="h-6 w-2/3 rounded bg-gray-100 animate-pulse" />
            <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pdp-page min-h-screen bg-transparent pb-24 md:pb-10">
      <style>{`
        .pdp-page {
          /* Width of the docked BuyReady panel on the right (lg+ screens).
             Change this one value to make the panel wider or narrower. */
          --buyready-w: 460px;
          /* Height of the site header/nav bar — the panel starts right
             below it. Header is h-20 (5rem) plus its 1px border-bottom. */
          --header-h: calc(5rem + 1px);
        }
        .pdp-page button, .pdp-page a, .pdp-page input, .pdp-page select {
          outline: none;
        }
        .pdp-page button:focus, .pdp-page a:focus, .pdp-page input:focus, .pdp-page select:focus {
          outline: none;
          box-shadow: none;
        }
      `}</style>
      <Header />

      <main className="w-full px-0 py-8">
        <div>
          {/* ===== Two-column layout: image left, details right ===== */}
          <div className="sm:flex sm:items-start sm:gap-8 lg:grid lg:grid-cols-[1fr_460px_var(--buyready-w)] xl:grid-cols-[920px_460px_var(--buyready-w)] lg:gap-8 lg:items-start">
            {/* ---- Left column: image + thumbnails ---- */}
            <div className="sm:w-[920px] sm:flex-shrink-0">
              <div className="mt-6 sm:mt-6 sm:flex sm:items-start sm:gap-4">
                <div className="hidden sm:flex sm:flex-col sm:items-start sm:justify-start sm:gap-2">
                  <div className="h-20 w-20 overflow-hidden rounded-[18px] border border-[#e5e7eb] bg-[#f7f7f8] shadow-sm">
                    <img
                      src={product.images?.[imgIdx] || product.images?.[0]}
                      alt="Current product thumbnail"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                <div className="relative px-5 sm:px-0 w-full">
                  <img
                    data-testid="pdp-main-image"
                    src={product.images?.[imgIdx] || product.images?.[0]}
                    alt={product.name}
                    className="h-[360px] w-full rounded-lg bg-[#eee] object-cover sm:h-[680px]"
                  />
                  <span className="absolute left-5 top-2.5 z-10 rounded-[4px_0_4px_0] bg-[#ff3f6c] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white sm:left-0">
                    Bestseller
                  </span>
                  <span className="absolute right-5 top-2.5 z-10 flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[11px] font-bold text-[#282c3f] shadow sm:right-0">
                    {product.rating} <Star size={10} className="fill-[#03a685] text-[#03a685]" />
                  </span>
                </div>
              </div>


              <div className="mt-4 rounded-[20px] border border-[#f0f0f0] bg-white p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="flex flex-col items-center text-center gap-1">
                    <span className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#e8f2fc]">
                      <Lock size={15} className="text-[#2f8fd6]" strokeWidth={1.8} />
                    </span>
                    <p className="text-[11px] font-semibold text-[#282c3f]">100% Original</p>
                    <p className="text-[10px] text-[#6b7280]">Quality Products</p>
                  </div>
                  <div className="flex flex-col items-center text-center gap-1">
                    <span className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#f1ecfe]">
                      <RotateCcw size={15} className="text-[#7e5bef]" strokeWidth={1.8} />
                    </span>
                    <p className="text-[11px] font-semibold text-[#282c3f]">Easy Returns</p>
                    <p className="text-[10px] text-[#6b7280]">15 days easy</p>
                  </div>
                  <div className="flex flex-col items-center text-center gap-1">
                    <span className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#e3f8f0]">
                      <CreditCard size={15} className="text-[#03a685]" strokeWidth={1.8} />
                    </span>
                    <p className="text-[11px] font-semibold text-[#282c3f]">Secure Payment</p>
                    <p className="text-[10px] text-[#6b7280]">100% Safe</p>
                  </div>
                  <div className="flex flex-col items-center text-center gap-1">
                    <span className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#ffe9ef]">
                      <Users size={15} className="text-[#ff3f6c]" strokeWidth={1.8} />
                    </span>
                    <p className="text-[11px] font-semibold text-[#282c3f]">Trusted by Millions</p>
                    <p className="text-[10px] text-[#6b7280]">Loved by shoppers</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ---- Right column: details ---- */}
            <div className="sm:flex-1 sm:min-w-0 sm:max-w-[460px]">
              {/* ===== Title row ===== */}
              <div className="flex items-start justify-between px-5 pt-0 sm:px-0">
                <div>
                  <h1 data-testid="pdp-brand" className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#ff3f6c]">
                    {product.brand}
                  </h1>
                  <h2 data-testid="pdp-name" className="mt-0 text-[20px] font-extrabold leading-tight text-[#282c3f]">
                    {product.name}
                  </h2>
                </div>
                <button
                  className="text-[#535766] hover:text-[#ff3f6c]"
                  aria-label="Share"
                  onClick={() => toast.success("Link copied")}
                >
                  <Share2 size={18} strokeWidth={1.8} />
                </button>
              </div>

              {/* ===== Info block ===== */}
              <div className="px-5 pt-2.5 sm:px-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-0.5 rounded bg-[#1a1d29] px-[7px] py-1 text-[12px] font-bold leading-none text-white">
                    {product.rating}
                    <Star size={10} className="fill-white text-white" />
                  </span>
                  <span className="text-[11.5px] text-[#282c3f]">
                    {product.rating_count.toLocaleString("en-IN")} Ratings
                    <span className="mx-1 text-[#282c3f]">|</span>
                    <span className="font-extrabold text-[#282c3f]">
                      {displayPositivePercent != null ? displayPositivePercent : 92}% recommend
                    </span>{" "}
                    this product
                  </span>
                </div>
                <div className="mt-2 mb-3 inline-flex items-center gap-2">
                  {product?.packguard_protected && (
                    <span className="rounded-full bg-[#EFFAF6] px-2 py-1 text-[11px] font-semibold text-[#085C42]">
                      PackGuard
                    </span>
                  )}
                  {product?.easy_return && (
                    <span className="rounded-full bg-[#FFF0F6] px-2 py-1 text-[11px] font-semibold text-[#BE123C]">
                      Easy returns
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-3">
                  <span data-testid="pdp-price" className="text-[22px] font-extrabold text-[#282c3f]">₹{product.price}</span>
                  <div className="text-[12.5px] text-[#7e7e7e]">
                    <span className="text-[#999] line-through mr-2">₹{product.mrp}</span>
                    <span className="font-bold text-[#ff3f6c]">({product.discount}% OFF)</span>
                  </div>
                </div>
                <div className="mb-3.5 mt-1 text-[11px] text-[#999]">Inclusive of all taxes</div>

                <div className="mb-3 text-[13px] text-[#535766]">
                  <span className="font-bold text-[#282c3f]">Color:</span>
                  <span className="ml-2 font-bold text-[#282c3f]">{color || product.colors?.[0]}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      data-testid={`color-${c.replace(/\s/g, "-").toLowerCase()}`}
                      onClick={() => setColor(c)}
                      title={c}
                      className={`h-[28px] w-[28px] rounded-full border ${color === c ? "ring-2 ring-[#ff3f6c] ring-offset-2" : "border-[#ddd]"}`}
                      style={{ backgroundColor: COLOR_SWATCH[c] || "#D9D9D9" }}
                    />
                  ))}
                </div>

                {/* ===== Fit Profile + Recommended Size (merged) ===== */}
                <div className="mt-4 mb-4 rounded-[20px] border border-[#ececec] bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-[#6b7280]">
                        <User size={15} strokeWidth={2} />
                      </span>
                      <p className="text-[14px] font-semibold text-[#282c3f] truncate">
                        {(() => {
                          const name = user?.fit_profiles?.find((fp) => fp.id === state.fitProfileId)?.name || "Fit Profile";
                          if (name === "Fit Profile") return `Using ${name}`;
                          return `Using ${name}'s Fit Profile`;
                        })()}
                      </p>
                    </div>
                    <div
                      role="button"
                      onClick={() => setProfilePanelOpen(true)}
                      className="flex-shrink-0 cursor-pointer text-[13px] font-bold text-[#ff3f6c]"
                    >
                      Switch Profile &gt;
                    </div>
                  </div>

                  {showSizeControls && product.sizes?.length > 0 && (
                    <>
                      <div className="my-4 h-px bg-[#eee]" />
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="flex flex-wrap items-center gap-2 text-[14px] font-extrabold text-[#282c3f]">
                          Recommended Size: {evaluation?.recommended_size ? (<span className="font-extrabold text-[#059669]">{evaluation.recommended_size}</span>) : null}
                        </p>
                        <div className="flex flex-shrink-0 items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setSizeGuideOpen(true)}
                            className="text-[13px] font-bold text-[#ff3f6c] hover:text-[#d9335d]"
                          >
                            Size Guide →
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2.5">
                        {effectiveSizes.map((s) => {
                          const out = !product.size_stock?.[s];
                          const rec = evaluation?.recommended_size === s;
                          return (
                            <button
                              key={s}
                              data-testid={`size-${s}`}
                              disabled={out}
                              onClick={() => setSize(s)}
                              className={`flex h-[40px] min-w-[40px] items-center justify-center rounded-[10px] border-2 px-3 text-[12px] font-semibold ${
                                out
                                  ? "border-[#ececee] bg-[#fafafa] text-[#d2d4da] line-through"
                                  : size === s
                                  ? "border-[#1f2937] bg-[#1f2937] text-white"
                                  : rec
                                  ? "border-[#03a685] text-[#03a685]"
                                  : "border-[#d4d5d9] text-[#535766] hover:border-[#ff3f6c] hover:text-[#ff3f6c]"
                              }`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-[#059669]">
                        <Users size={14} strokeWidth={2.2} className="text-[#059669]" />
                        Most people with your fit profile chose{" "}
                        <span className="font-extrabold">{evaluation?.recommended_size || size || "this size"}</span>{" "}
                        and got the <span className="font-extrabold">best fit</span>
                      </p>
                    </>
                  )}
                  {!showSizeControls && (
                    <p className="mt-4 text-[13px] font-semibold text-[#282c3f]">Free Size</p>
                  )}
                </div>
              </div>

              {recommendedAlt && (
                <div className="mx-5 mt-4 rounded-[20px] border border-[#ffdce1] bg-[#fff4f6] p-4 text-sm sm:mx-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e0344c]">Recommended Alternative</p>
                      <h3 className="mt-1 text-sm font-bold text-[#282c3f]">Similar style, arrives earlier</h3>
                    </div>
                    <button
                      onClick={() => navigate(`/product/${recommendedAlt.product.id}`)}
                      className="rounded-full bg-[#ff3f6c] px-4 py-2 text-[12px] font-semibold text-white"
                    >
                      View Alternative
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2 text-[12px] text-[#535766]">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#03a685]" /> Similar style
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#03a685]" /> Arrives earlier
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#03a685]" /> Better fit consistency
                    </div>
                    <div className="rounded-2xl border border-[#ffd1d9] bg-white px-3 py-3">
                      <p className="text-[12px] text-[#7e7e7e]">Alternative product</p>
                      <p className="font-semibold text-[#282c3f] mt-1">{recommendedAlt.product.brand}</p>
                      <p className="text-[12px] text-[#535766]">{recommendedAlt.product.name}</p>
                      <p className="mt-2 text-[12px] font-semibold text-[#e0344c]">₹{recommendedAlt.product.price}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 h-2 bg-[#f2f2f2] sm:hidden" />

              {/* ===== Delivery card ===== */}
              <div className="px-5 pb-4 sm:px-0">
                <div className="rounded-[20px] border border-[#fdebef] bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffe9f0] text-[#e0344c]">
                          <MapPin size={16} />
                        </span>
                        <p className="text-sm font-semibold text-[#282c3f]">
                          Deliver to {addr ? addr.pin : "506001"}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-[12px] text-[#6b7280]">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#dbeafe] text-[#2563eb]">
                          <Truck size={16} />
                        </span>
                        <div>
                          <p className="font-semibold text-[#6b7280]">
                            Standard Delivery: Expected by <span className="font-bold text-[#6b7280]">{formatDeliveryDate(evaluation?.delivery?.options?.[0]) || evaluation?.delivery?.estimated_label || "Delivery date calculated from warehouse availability"}</span>
                          </p>
                          {evaluation?.delivery?.options?.length > 1 && (
                            <p className="mt-2 text-sm text-[#6b7280]">
                              Express Delivery: <span className="font-bold text-[#6b7280]">{getExpressDeliveryDate(evaluation.delivery.options) || "earlier than standard"}</span>{" "}
                              <span className="font-bold text-[#047857]">(High confidence)</span>
                            </p>
                          )}
                          <p className="mt-2 text-xs text-[#6b7280]">
                            Need it sooner? <button type="button" onClick={handleSearchAlternative} className="font-bold text-[#FF3E6C] underline decoration-[#FF3E6C] underline-offset-2">View alternatives</button>
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddressMenuOpen(true)}
                      className="text-[#ff3f6c] text-sm font-bold"
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>

              {/* ===== Product Details highlight row ===== */}
              {highlightItems.length > 0 && (
                <div className="px-5 pb-4 sm:px-0">
                  <div className="grid grid-cols-2 gap-3 border-t border-[#f0f0f0] pt-4 sm:grid-cols-4">
                    {highlightItems.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div key={i} className="flex flex-col items-center gap-2 text-center">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f7f7f8] text-[#535766]">
                            <Icon size={17} strokeWidth={1.8} />
                          </span>
                          <p className="text-[11px] font-semibold leading-tight text-[#282c3f]">{item.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ===== Material & Care (expandable) ===== */}
              <div className="px-5 pb-3 sm:px-0">
                <div className="rounded-[20px] border border-[#ececec] bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setProductDetailsExpanded((open) => !open)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[#4a5fd9]">
                      <Feather size={15} strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-[#282c3f]">Material &amp; Care</p>
                      <p className="truncate text-[11.5px] text-[#7e838f]">{materialCareLabel}</p>
                    </div>
                    <ChevronRight
                      size={17}
                      className={`flex-shrink-0 text-[#9aa0ab] transition-transform ${productDetailsExpanded ? "rotate-90" : ""}`}
                    />
                  </button>
                  {productDetailsExpanded && (
                    <div className="border-t border-[#f0f0f0] px-4 py-3 text-[12px] leading-relaxed text-[#535766]">
                      {materialCareLabel}. Hand wash cold with like colours. Do not bleach. Line dry in shade. Iron on low heat if needed.
                    </div>
                  )}
                </div>
              </div>

              {/* ===== Reviews row ===== */}
              <div className="px-5 pb-4 sm:px-0">
                <div className="rounded-[20px] border border-[#ececec] bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setInsightType("quality")}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#fff4e0] text-[#f5a623]">
                      <Star size={15} strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-[#282c3f]">Reviews ({reviewsRowCountLabel})</p>
                      <p className="truncate text-[11.5px] text-[#7e838f]">{reviewsRowSubtitle}</p>
                    </div>
                    <ChevronRight size={17} className="flex-shrink-0 text-[#9aa0ab]" />
                  </button>
                </div>
              </div>

            </div>

            <div className="w-full lg:w-[var(--buyready-w)] lg:flex-shrink-0">
              <div
                className="
                  space-y-4
                  lg:fixed lg:right-0 lg:top-[var(--header-h)] lg:z-30 lg:h-[calc(100vh-var(--header-h))] lg:w-[var(--buyready-w)]
                  lg:bg-white lg:border-l lg:border-[#e6f4ed]
                  lg:shadow-[-20px_0_60px_rgba(15,64,40,0.08)]
                  lg:[&>div:first-child]:h-full lg:[&>div:first-child]:rounded-none
                  lg:[&>div:first-child]:rounded-l-none lg:[&>div:first-child]:border-0
                  lg:[&>div:first-child]:shadow-none
                "
              >
                <BuyReadyCard
                  product={product}
                  evaluation={evaluation}
                  reviewsSummary={reviewsSummary}
                  reviewsData={reviewsData}
                  status={status}
                  buyReady={buyReady}
                  issueReasons={issueReasons}
                  handleAddToBag={handleAddToBag}
                  wished={wished}
                  toggleWishlist={toggleWishlist}
                  addr={addr}
                  size={size}
                  onOpenInsight={(type) => {
                    // "fit" keeps using the dedicated FitSidePanel (it has
                    // size selection built in). Every other row — delivery,
                    // quality, returns, bestseller — opens InsightSidePanel
                    // with the matching type.
                    if (type === "fit") handleOpenFitPanel();
                    else setInsightType(type);
                  }}
                  onEditSize={handleOpenFitPanel}
                  onCheckFitWithAI={handleCheckFitWithAI}
                  onWhy={() => setInsightType("why")}
                  onBetterChoice={openBetterChoice}
                />
              </div>
            </div>

          </div>

          <div id="pdp-reviews-section">
            <TrustedReviewsSection product={product} reviewsSummary={reviewsSummary} />
          </div>
        </div>
      </main>

      {/* ===== Sticky mobile CTA ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex gap-2 border-t border-gray-200 bg-white/90 p-4 backdrop-blur-xl sm:hidden rounded-t-[20px]">
        <button
          data-testid="mobile-wishlist-btn"
          onClick={() => toggleWishlist(product.id)}
          aria-label="Wishlist"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d4d5d9] text-[#535766]"
        >
          <Heart size={18} className={wished ? "fill-[#ff3f6c] text-[#ff3f6c]" : ""} />
        </button>
        {productIsNegativeReview ? (
          <button
            type="button"
            onClick={openBetterChoice}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#ff3f6c] py-3 text-[13px] font-extrabold uppercase tracking-[0.2em] text-white"
          >
            <ShoppingBag size={16} /> View alternatives
          </button>
        ) : (
          <button
            data-testid="mobile-buy-now-btn"
            onClick={() => handleAddToBag(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#ff3f6c] py-3 text-[13px] font-extrabold uppercase tracking-[0.2em] text-white"
          >
            <ShoppingBag size={16} /> Buy Now
          </button>
        )}
      </div>

      <BuyCardDrawer
        open={buyCardOpen}
        onClose={() => setBuyCardOpen(false)}
        product={product}
        user={user}
        evaluation={evaluation}
        evaluationPending={evaluationPending}
        reviewsSummary={reviewsSummary}
        reviewsData={reviewsData}
      />

      {betterData?.alternatives?.length > 0 && (
        <section className="mx-auto max-w-[1400px] px-8 pb-10 sm:px-8">
          <div className="rounded-[22px] border border-[#ececee] bg-white p-6 shadow-[0_4px_28px_rgba(0,0,0,0.04)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7e7e7e]">Similar picks</p>
                <h3 className="mt-2 text-lg font-bold text-[#282c3f]">Also worth considering</h3>
              </div>
              <button
                onClick={openBetterChoice}
                className="self-start rounded-full border border-[#ff3f6c] bg-[#fff1f4] px-4 py-2 text-[12px] font-semibold text-[#ff3f6c]"
              >
                Refresh recommendations
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {betterData.alternatives.map((item) => (
                <button
                  key={item.product.id}
                  onClick={() => navigate(`/product/${item.product.id}`)}
                  className="group rounded-[18px] border border-gray-200 p-4 text-left transition hover:border-[#ff3f6c]"
                >
                  <img src={item.product.images[0]} alt={item.product.name} className="h-44 w-full rounded-2xl object-cover bg-[#f7f7f7]" />
                  <p className="mt-3 text-sm font-bold text-[#282c3f] truncate">{item.product.brand}</p>
                  <p className="text-[12px] text-[#7e7e7e] truncate">{item.product.name}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-bold text-[#282c3f]">₹{item.product.price}</span>
                    <span className="rounded-full bg-[#e8f2fc] px-2 py-1 text-[11px] font-semibold text-[#2f8fd6]">{item.score}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <BetterChoiceSheet open={betterOpen} onClose={() => setBetterOpen(false)} data={betterData} />

      <CenteredModal open={profilePanelOpen} onClose={() => { setProfilePanelOpen(false); setProfileFormOpen(false); }} title="Switch fit profile">
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#282c3f]">Fit profile</h3>
                <p className="text-xs text-[#7E818C]">Choose a profile or create a new one</p>
              </div>
              <button
                type="button"
                onClick={() => setProfileFormOpen((open) => !open)}
                className="text-[#FF3F6C] text-sm font-semibold"
              >
                {profileFormOpen ? "Close" : "+ Create profile"}
              </button>
            </div>

            {user?.fit_profiles?.length ? (
              <div className="space-y-2">
                {user.fit_profiles.map((fp) => (
                  <button
                    key={fp.id}
                    onClick={() => { setState((s) => ({ ...s, fitProfileId: fp.id })); setProfilePanelOpen(false); setProfileFormOpen(false); }}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${state.fitProfileId === fp.id ? "border-[#ff3f6c] bg-[#fff1f4]" : "border-[#eaeaec] hover:border-[#ff3f6c]/80"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-[#282c3f]">{fp.name}</span>
                      {state.fitProfileId === fp.id && <span className="text-[11px] font-bold text-[#ff3f6c]">Active</span>}
                    </div>
                    <p className="mt-1 text-[12px] text-[#6b7280]">{fp.height_cm}cm • {fp.weight_kg}kg • {fp.body_shape} • {fp.preferred_fit}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-[#eaeaec] bg-[#fafafa] px-4 py-4 text-sm text-[#6b7280]">
                No fit profiles found. Create one to get personalised recommendations.
              </div>
            )}

            {profileFormOpen && (
              <div className="rounded-3xl border border-[#eaeaec] bg-[#fafafa] p-4 space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#282c3f]">Create new profile</p>
                  <p className="text-xs text-[#6b7280]">Add a profile to get customised size recommendations.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={newFp.name}
                    onChange={(e) => setNewFp((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Profile name"
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FF3F6C]"
                  />
                  <input
                    type="number"
                    value={newFp.height_cm}
                    onChange={(e) => setNewFp((prev) => ({ ...prev, height_cm: Number(e.target.value) }))}
                    placeholder="Height (cm)"
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FF3F6C]"
                  />
                  <input
                    type="number"
                    value={newFp.weight_kg}
                    onChange={(e) => setNewFp((prev) => ({ ...prev, weight_kg: Number(e.target.value) }))}
                    placeholder="Weight (kg)"
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FF3F6C]"
                  />
                  <select
                    value={newFp.body_shape}
                    onChange={(e) => setNewFp((prev) => ({ ...prev, body_shape: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                  >
                    {['Pear', 'Hourglass', 'Rectangle', 'Apple', 'Athletic'].map((shape) => (
                      <option key={shape}>{shape}</option>
                    ))}
                  </select>
                  <select
                    value={newFp.preferred_fit}
                    onChange={(e) => setNewFp((prev) => ({ ...prev, preferred_fit: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                  >
                    {['Fitted', 'Regular', 'Relaxed', 'Comfort'].map((fit) => (
                      <option key={fit}>{fit}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={saveFitProfile}
                  className="w-full rounded-2xl bg-[#282C3F] px-4 py-3 text-sm font-bold text-white"
                >
                  Save profile
                </button>
              </div>
            )}
          </section>
        </div>
      </CenteredModal>

      <BottomSheet
        open={addressMenuOpen}
        onClose={() => {
          setAddressMenuOpen(false);
          setAddressFormOpen(false);
          setAddressFormMode("add");
          setEditingAddressId(null);
        }}
        title="Switch delivery address"
        testId="buyready-address-sheet"
      >
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-[#282c3f]">Delivery address</h3>
            {user?.addresses?.length ? (
              <div className="space-y-3">
                {user.addresses.map((a) => (
                  <div key={a.id} className="rounded-2xl border border-[#eaeaec] bg-white">
                    <button
                      type="button"
                      onClick={() => { setState((s) => ({ ...s, addressId: a.id })); setAddressMenuOpen(false); setAddressFormOpen(false); }}
                      className={`w-full text-left rounded-2xl px-4 py-3 transition-colors ${state.addressId === a.id ? "bg-[#fff1f4]" : "hover:bg-[#fff6f8]"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-[#282c3f]">{a.label}</span>
                        {state.addressId === a.id && <span className="text-[11px] font-bold text-[#ff3f6c]">Selected</span>}
                      </div>
                      <p className="mt-1 text-[12px] text-[#6b7280]">{a.line1}, {a.city}, {a.state} — {a.pin}</p>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openAddressEditor("edit", a); }}
                      className="w-full rounded-b-2xl border-t border-[#eaeaec] bg-white px-4 py-3 text-left text-sm font-semibold text-[#ff3f6c]"
                    >
                      Edit this address
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openAddressEditor("add"); }}
                  className="w-full rounded-2xl border border-dashed border-[#ff3f6c] px-4 py-3 text-sm font-semibold text-[#ff3f6c]"
                >
                  + Add new address
                </button>
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-[#eaeaec] bg-[#fafafa] px-4 py-4 text-sm text-[#6b7280]">
                <div>No saved addresses found. Add one to continue.</div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openAddressEditor("add"); }}
                  className="w-full rounded-2xl border border-dashed border-[#ff3f6c] px-4 py-3 text-sm font-semibold text-[#ff3f6c]"
                >
                  + Add address
                </button>
              </div>
            )}
          </section>

          {addressFormOpen && (
            <section className="rounded-3xl border border-[#eaeaec] bg-[#fafafa] p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#282c3f]">{addressFormMode === "edit" ? "Edit delivery address" : "Add delivery address"}</p>
                  <p className="text-xs text-[#6b7280] mt-1">{addressFormMode === "edit" ? "Edit the selected address and save it to your profile." : "Add a new delivery address in the same modal."}</p>
                </div>
                <button type="button" onClick={() => setAddressFormOpen(false)} className="text-[#ff3f6c] text-sm font-semibold">Cancel</button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <select value={addressDraft.label} onChange={(e) => setAddressDraft((prev) => ({ ...prev, label: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
                  {['Home', 'Office', 'Hostel', 'Parents', 'Other'].map((label) => <option key={label}>{label}</option>)}
                </select>
                <input value={addressDraft.phone} onChange={(e) => setAddressDraft((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Phone" className="border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FF3F6C]" />
              </div>
              <input value={addressDraft.receiver} onChange={(e) => setAddressDraft((prev) => ({ ...prev, receiver: e.target.value }))} placeholder="Receiver name" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FF3F6C]" />
              <input value={addressDraft.line1} onChange={(e) => setAddressDraft((prev) => ({ ...prev, line1: e.target.value }))} placeholder="Address line" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FF3F6C]" />
              <div className="grid gap-2 sm:grid-cols-3">
                <input value={addressDraft.city} onChange={(e) => setAddressDraft((prev) => ({ ...prev, city: e.target.value }))} placeholder="City" className="border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FF3F6C]" />
                <input value={addressDraft.state} onChange={(e) => setAddressDraft((prev) => ({ ...prev, state: e.target.value }))} placeholder="State" className="border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FF3F6C]" />
                <input value={addressDraft.pin} onChange={(e) => setAddressDraft((prev) => ({ ...prev, pin: e.target.value }))} placeholder="PIN code" className="border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FF3F6C]" />
              </div>
              <button type="button" onClick={saveAddress} className="w-full rounded-2xl bg-[#282C3F] px-4 py-3 text-sm font-bold text-white">Save address</button>
            </section>
          )}
        </div>
      </BottomSheet>

      <BottomSheet open={calendarOpen} onClose={() => setCalendarOpen(false)} title={state.purpose === 'Gift' ? 'Choose gift delivery date' : 'Choose event delivery date'} testId="buyready-calendar-sheet">
        <div className="space-y-5">
          <p className="text-sm text-[#4b5563]">
            {state.purpose === 'Gift'
              ? 'Choose the date you want the gift to arrive by. We will prioritise delivery accordingly.'
              : 'Choose the date for your event. We will make sure the order is scheduled to arrive before then.'}
          </p>
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-[0.15em] text-[#6b7280] mb-2">Pick a date</label>
            <input
              type="date"
              value={state.eventDate || ''}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setState((s) => ({ ...s, eventDate: e.target.value }))}
              className="w-full rounded-2xl border border-[#eaeaec] bg-white px-4 py-3 text-sm outline-none focus:border-[#ff3f6c]"
            />
          </div>
          <button
            onClick={() => setCalendarOpen(false)}
            className="w-full rounded-2xl bg-[#ff3f6c] px-4 py-3 text-sm font-bold text-white"
          >
            Confirm date
          </button>
        </div>
      </BottomSheet>
      <CenteredModal open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} title="Size Guide" maxWidth="440px">
        <div className="flex items-center gap-2 text-[#4a5fd9]">
          <Ruler size={16} />
          <p className="text-[12px] font-semibold text-[#535766]">Measurements in inches</p>
        </div>
        <table className="mt-4 w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-[#f0f0f0] text-[#8b909c]">
              <th className="py-2 font-semibold">Size</th>
              <th className="py-2 font-semibold">Chest</th>
              <th className="py-2 font-semibold">Waist</th>
              <th className="py-2 font-semibold">Hip</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_CHART.map((row) => {
              const isRec = row.size === evaluation?.recommended_size;
              return (
                <tr key={row.size} className={`border-b border-[#f5f5f5] ${isRec ? "bg-[#f0fbf2]" : ""}`}>
                  <td className={`py-2 font-bold ${isRec ? "text-[#03a685]" : "text-[#282c3f]"}`}>{row.size}{isRec ? " ✓" : ""}</td>
                  <td className="py-2 text-[#535766]">{row.chest}</td>
                  <td className="py-2 text-[#535766]">{row.waist}</td>
                  <td className="py-2 text-[#535766]">{row.hip}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {evaluation?.recommended_size && (
          <div className="mt-4 rounded-2xl bg-[#f0fbf2] px-4 py-3 text-[12.5px] font-semibold text-[#14532d]">
            Based on {activeFitProfile?.name ? `${activeFitProfile.name}'s` : "your"} fit profile
            {activeFitProfile ? ` (${activeFitProfile.height_cm}cm, ${activeFitProfile.weight_kg}kg)` : ""}, size{" "}
            <span className="font-extrabold">{evaluation.recommended_size}</span> is the correct size for you.
          </div>
        )}
      </CenteredModal>

      <FitSidePanel
          open={fitSidePanelOpen}
          onClose={handleCloseFitPanel}
          product={product}
          evaluation={evaluation}
          fitProfile={activeFitProfile}
          size={size}
          onSelectSize={setSize}
        />
      <InsightSidePanel
        open={!!insightType}
        onClose={() => setInsightType(null)}
        type={insightType}
        product={product}
        evaluation={evaluation}
        reviewsSummary={reviewsSummary}
        reviewsData={reviewsData}
        fitProfile={activeFitProfile}
        addr={addr}
        selectedSize={size}
        issueReasons={issueReasons}
        whyFitConfidence={whyFitConfidence}
        whyDeliveryConfidence={whyDeliveryConfidence}
        whyReviewConfidence={whyReviewConfidence}
        whyReturnRiskScore={whyReturnRiskScore}
        whyAiSummary={whyAiSummary}
        onEditSize={() => {
          setInsightType(null);
          handleOpenFitPanel();
        }}
      />

      <TrustStrip />
    </div>
  );
}

const COLOR_SWATCH = {
  Maroon: "#7A1F2B", "Navy Blue": "#1F2A4A", Teal: "#1E7A6F", Mustard: "#D9A62E",
  Pink: "#E8879F", Black: "#22242B", "Off White": "#EFEAE0", Green: "#3F5A38",
  "Midnight Black": "#14161d",
};