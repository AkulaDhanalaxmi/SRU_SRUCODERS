import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Heart, Star, ShoppingBag } from "lucide-react";
import api, { apiError } from "../lib/api";
import { Header } from "../components/Header";
import { TrustStrip } from "../components/TrustStrip";
import { ReviewsSection } from "../components/ReviewsSection";
import { DecisionSteps } from "../components/buyready/DecisionSteps";
import { BuyReadyHeroCard } from "../components/buyready/BuyReadyHeroCard";
import { WhySheet } from "../components/buyready/WhySheet";
import { BetterChoiceSheet } from "../components/buyready/BetterChoiceSheet";
import { useAuth } from "../context/AuthContext";
import { useShop } from "../context/ShopContext";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wishlist, toggleWishlist, addToCart } = useShop();

  const [product, setProduct] = useState(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [state, setState] = useState({
    fitProfileId: user?.active_fit_profile || user?.fit_profiles?.[0]?.id || null,
    addressId: user?.addresses?.find((a) => a.default)?.id || user?.addresses?.[0]?.id || null,
    purpose: null,
    eventDate: null,
  });
  const [deliveryType, setDeliveryType] = useState("standard");
  const [evaluation, setEvaluation] = useState(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [betterOpen, setBetterOpen] = useState(false);
  const [betterData, setBetterData] = useState(null);

  useEffect(() => {
    setProduct(null);
    setImgIdx(0);
    window.scrollTo(0, 0);
    api.get(`/products/${id}`).then(({ data }) => {
      setProduct(data);
      setColor(data.colors?.[0]);
    });
  }, [id]);

  const evaluate = useCallback(() => {
    api.post("/buyready/evaluate", {
      product_id: id,
      fit_profile_id: state.fitProfileId,
      address_id: state.addressId,
      purpose: state.purpose,
      event_date: state.eventDate,
      selected_size: size,
    }).then(({ data }) => {
      setEvaluation(data);
      if (data.recommended_size && !size) setSize(data.recommended_size);
    }).catch(() => {});
  }, [id, state, size]);

  useEffect(() => { evaluate(); }, [id, state, size]); // eslint-disable-line react-hooks/exhaustive-deps

  // Local analysis generator so UI updates meaningfully on size change
  const generateAnalysis = ({ selectedSize, product, evaluation, reviewsSummary }) => {
    const base = evaluation?.overall_score != null ? evaluation.overall_score : 90;
    const sizeAccuracy = evaluation?.size_accuracy != null ? evaluation.size_accuracy : (product?.size_accuracy || 90);
    let fit_confidence = evaluation?.fit_confidence != null ? evaluation.fit_confidence : Math.round(sizeAccuracy);
    const recommended = evaluation?.recommended_size || null;
    if (selectedSize && recommended && selectedSize !== recommended) fit_confidence = Math.max(20, fit_confidence - 20);
    const stock = (product?.size_stock && selectedSize) ? (product.size_stock[selectedSize] || 0) : null;
    if (stock === 0) fit_confidence = Math.max(5, fit_confidence - 15);
    let return_risk = evaluation?.return_risk != null ? evaluation.return_risk : (product?.return_percent != null ? product.return_percent : 8);
    if (sizeAccuracy < 70) return_risk = Math.min(99, return_risk + 6);
    if (stock === 0) return_risk = Math.min(99, return_risk + 12);
    let quality_score = reviewsSummary?.positive_percent != null ? reviewsSummary.positive_percent : Math.round((product?.rating || 4) * 20);
    let score = base + (fit_confidence - 85) * 0.3 - (return_risk - 5) * 0.35 + (quality_score - 80) * 0.2;
    score = Math.max(0, Math.min(100, Math.round(score)));
    const confidenceMessage = fit_confidence >= 80 ? "High confidence in fit" : (fit_confidence >= 60 ? "Moderate confidence" : "Low confidence — double check sizing");
    const fitRecommendation = selectedSize && recommended && selectedSize !== recommended ? `We recommend ${recommended} for a better fit.` : (selectedSize ? `Selected ${selectedSize} looks appropriate.` : `Choose a size to get a tailored recommendation.`);
    const reviewSummaryText = reviewsSummary?.positive_percent != null ? `${reviewsSummary.positive_percent}% of recent reviewers rated this item positively.` : `Customer feedback indicates generally positive experiences.`;
    const qualityInsight = product?.quality_description || (product?.rating && product.rating < 3.5 ? `Quality concerns reported — check reviews.` : `Good quality reported by buyers.`);
    const fitPhrase = selectedSize && recommended && selectedSize !== recommended ? `You selected ${selectedSize}, but ${recommended} is recommended.` : selectedSize ? `Selected size: ${selectedSize}.` : `No size selected.`;
    const explanation = [fitPhrase, confidenceMessage + ".", qualityInsight, `Estimated return risk: ${return_risk}%.`].join(" ");
    return { verdict: evaluation?.verdict || (score >= 80 ? 'Buy with Confidence' : score >= 65 ? 'Good Choice' : score >= 55 ? 'Worth Considering' : 'Think Twice'), overall_score: score, fit_confidence, return_risk, confidenceMessage, fitRecommendation, reviewSummary: reviewSummaryText, qualityInsight, explanation, recommended };
  };

  const derivedEvaluation = (() => {
    const analysis = generateAnalysis({ selectedSize: size, product, evaluation, reviewsSummary: { positive_percent: (evaluation?.why && evaluation.why.trust && evaluation.why.trust.en) ? evaluation.why.trust.en : undefined } });
    return { ...(evaluation || {}), ...analysis };
  })();

  const openBetterChoice = async () => {
    try {
      const { data } = await api.post("/buyready/better-choice", {
        product_id: id, fit_profile_id: state.fitProfileId, address_id: state.addressId,
        purpose: state.purpose, event_date: state.eventDate,
      });
      setBetterData(data);
      setBetterOpen(true);
    } catch (e) { toast.error(apiError(e)); }
  };

  const handleAddToBag = async (goCheckout = false) => {
    if (product.sizes?.length && !size) return toast.error("Please select a size");
    try {
      await addToCart(product.id, size, 1);
      if (goCheckout) navigate("/bag");
      else toast.success("Added to bag!");
    } catch (e) { toast.error(apiError(e)); }
  };

  const productDetails = (() => {
    if (!product) return [];
    if (Array.isArray(product.details) && product.details.length) return product.details;
    const details = [];
    if (product.fabric) details.push(`${product.fabric} material`);
    if (product.fit_type) details.push(`${product.fit_type} fit`);
    if (product.size_accuracy != null) details.push(`${product.size_accuracy}% true to size`);
    if (product.return_rate != null) details.push(`${product.return_rate}% return rate`);
    if (product.seller?.rating != null) details.push(`Seller rating ${product.seller.rating}/5`);
    if (product.quality_flag === "low") details.push("Quality concerns reported");
    return details;
  })();

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-8">
          <div className="aspect-[3/4] bg-gray-100 rounded-2xl animate-pulse" />
          <div className="space-y-4"><div className="h-6 bg-gray-100 rounded w-1/2 animate-pulse" /><div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" /><div className="h-32 bg-gray-100 rounded-xl animate-pulse" /></div>
        </div>
      </div>
    );
  }

  const wished = wishlist.includes(product.id);

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-0">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-[minmax(0,560px)_minmax(320px,420px)] gap-6">
          <div>
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#F5F5F6]">
              <img data-testid="pdp-main-image" src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
              <button data-testid="pdp-wishlist-btn" onClick={() => toggleWishlist(product.id)}
                className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow hover:scale-110 transition-transform">
                <Heart size={18} className={wished ? "fill-[#FF3E6C] text-[#FF3E6C]" : "text-[#535766]"} />
              </button>
            </div>

            <div className="mt-2 rounded-3xl bg-white p-5 text-sm text-[#374151] shadow-sm">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">Price</p>
                    <p className="mt-0 text-2xl font-heading font-extrabold text-[#282C3F]">₹{product.price ?? "NA"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">Rating</p>
                    <p className="mt-0 text-sm font-semibold text-[#282C3F] flex items-center justify-end gap-1">
                      {product.rating} <Star size={12} className="fill-[#03A685] text-[#03A685]" />
                    </p>
                  </div>
                </div>
                <p className="text-xs text-[#7E818C]">MRP ₹{product.mrp} • {product.discount}% OFF</p>
              </div>
            </div>

            <div className="mt-3 rounded-3xl bg-white p-5 text-sm text-[#374151]">
              <p className="text-sm font-bold text-[#111827]">Product details</p>
              <div className="mt-3 space-y-2">
                <p>{product.description || product.quality_description || "Fresh from the warehouse, this product is described by its fabric, fit and delivery readiness."}</p>
                {productDetails.map((detail, idx) => (
                  <p key={idx} className="text-[13px] text-[#4b5563]">• {detail}</p>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h1 data-testid="pdp-brand" className="font-heading font-extrabold text-xl text-[#282C3F]">{product.brand}</h1>
            <p data-testid="pdp-name" className="text-sm text-[#7E818C] mt-0.5">{product.name}</p>
            <div className="flex items-center gap-1.5 mt-2 border border-gray-200 rounded w-fit px-2 py-1 text-xs font-semibold">
              {product.rating} <Star size={11} className="fill-[#03A685] text-[#03A685]" />
              <span className="text-[#7E818C] font-normal border-l border-gray-200 pl-1.5">{product.rating_count} ratings</span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span data-testid="pdp-price" className="font-heading font-extrabold text-2xl text-[#282C3F]">₹{product.price}</span>
              <span className="text-sm text-[#7E818C] line-through">MRP ₹{product.mrp}</span>
              <span className="text-sm font-bold text-[#FF905A]">({product.discount}% OFF)</span>
            </div>
            <p className="text-xs font-bold text-[#03A685] mt-1">inclusive of all taxes • {product.fabric} • {product.fit_type} fit</p>

            <div className="mt-5">
              <p className="font-heading font-bold text-sm text-[#282C3F] mb-3 flex items-center gap-2">
                <span className="bg-[#FF3E6C] text-white text-[9px] font-extrabold uppercase tracking-wider rounded px-2 py-0.5">BuyReady</span>
                Your Pre-Purchase Decision
              </p>
              <DecisionSteps state={state} setState={setState} evaluation={derivedEvaluation} />
              <div className="mt-3">
                <BuyReadyHeroCard evaluation={derivedEvaluation}
                  onBuy={() => handleAddToBag(true)}
                  onWhy={() => setWhyOpen(true)}
                  onBetterChoice={openBetterChoice} />
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#535766] mb-2">Color: <span className="text-[#282C3F]">{color}</span></p>
              <div className="flex gap-2">
                {product.colors.map((c) => (
                  <button key={c} data-testid={`color-${c.replace(/\s/g, "-").toLowerCase()}`} onClick={() => setColor(c)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${color === c ? "bg-[#282C3F] text-white border-[#282C3F]" : "border-gray-300 text-[#535766]"}`}>{c}</button>
                ))}
              </div>
            </div>

            {product.sizes.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#535766] mb-2">
                  Select Size {derivedEvaluation?.recommended && <span className="text-[#03A685] normal-case">• {derivedEvaluation.recommended} recommended for you</span>}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {product.sizes.map((s) => {
                    const stockCount = product.size_stock?.[s];
                    const out = stockCount === 0;
                    const rec = derivedEvaluation?.recommended === s;
                    return (
                      <button key={s} data-testid={`size-${s}`} disabled={out} onClick={() => setSize(s)}
                        className={`relative w-11 h-11 rounded-full text-xs font-bold border transition-colors ${out ? "border-gray-200 text-gray-300 line-through" : size === s ? "border-[#FF3E6C] bg-[#FF3E6C] text-white" : rec ? "border-[#03A685] text-[#03A685]" : "border-gray-300 text-[#282C3F] hover:border-[#FF3E6C]"}`}>
                        {s}
                        {rec && !out && size !== s && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#03A685] rounded-full" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {derivedEvaluation?.delivery?.options?.[0] && (
              <div className="mt-5 rounded-3xl border border-[#D1FAE5] bg-[#ECFDF5] p-4 text-[#065F46] shadow-sm">
                <p className="text-xs uppercase tracking-wider font-semibold text-[#065F46]/90 mb-2">
                  Deliver to {user?.addresses?.find((a) => a.id === state.addressId)?.pin || "506001"}
                </p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#065F46]/80 mb-1">Expected Delivery</p>
                <p className="text-lg font-bold">{(() => {
                  const option = derivedEvaluation.delivery.options[0];
                  if (option?.arrival_iso) {
                    const parsed = new Date(option.arrival_iso);
                    if (!Number.isNaN(parsed.getTime())) {
                      return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                    }
                  }
                  return option?.date || derivedEvaluation.delivery.estimated_label || "Delivery date unavailable";
                })()}</p>
                <p className="text-xs mt-1 text-[#065F46]/90">Calculated from nearby warehouse availability and PIN-based delivery ETA.</p>
              </div>
            )}

            <div className="hidden md:flex gap-3 mt-6">
              <button data-testid="add-to-bag-btn" onClick={() => handleAddToBag(false)}
                className="flex-1 bg-[#FF3E6C] hover:bg-[#E6355F] text-white font-bold py-3.5 rounded-md text-sm uppercase flex items-center justify-center gap-2 transition-colors">
                <ShoppingBag size={16} /> Add to Bag
              </button>
              <button data-testid="pdp-wishlist-btn-2" onClick={() => toggleWishlist(product.id)}
                className="px-6 border border-gray-300 rounded-md font-bold text-sm uppercase text-[#535766] flex items-center gap-2 hover:border-[#FF3E6C] transition-colors">
                <Heart size={16} className={wished ? "fill-[#FF3E6C] text-[#FF3E6C]" : ""} /> Wishlist
              </button>
            </div>

            <div className="mt-6 text-xs text-[#535766] space-y-1.5 border-t border-gray-100 pt-4">
              <p><b>Seller:</b> {product.seller.name} ({product.seller.rating}★ • {product.seller.years} yrs on platform)</p>
              <p><b>Return rate:</b> only {product.seller.return_rate}% • <b>Size accuracy:</b> {product.size_accuracy}% buyers said true to size</p>
            </div>
          </div>
        </div>

        <ReviewsSection productId={id} />
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 p-3 z-50 flex gap-2">
        <button data-testid="mobile-wishlist-btn" onClick={() => toggleWishlist(product.id)}
          className="px-4 border border-gray-300 rounded-md text-[#535766]">
          <Heart size={18} className={wished ? "fill-[#FF3E6C] text-[#FF3E6C]" : ""} />
        </button>
        <button data-testid="mobile-add-to-bag-btn" onClick={() => handleAddToBag(false)}
          className="flex-1 bg-[#FF3E6C] text-white font-bold py-3 rounded-md text-sm uppercase flex items-center justify-center gap-2">
          <ShoppingBag size={16} /> Add to Bag
        </button>
      </div>

      <WhySheet open={whyOpen} onClose={() => setWhyOpen(false)} evaluation={derivedEvaluation} />
      <BetterChoiceSheet open={betterOpen} onClose={() => setBetterOpen(false)} data={betterData} />
      <TrustStrip />
    </div>
  );
}
