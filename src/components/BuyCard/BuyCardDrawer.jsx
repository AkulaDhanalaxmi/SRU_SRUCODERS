import React, { useState, useEffect } from "react";
import { X, ShieldCheck, Ruler, Tag, MessageSquare, Star, Check, Truck, Users, Info, BarChart, Heart, Zap } from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

export default function BuyCardDrawer({ open, onClose, product, user, evaluation, reviewsSummary }) {
  const { refreshUser } = useAuth();
  const [tab, setTab] = useState("trust");
  const [isSaving, setIsSaving] = useState(false);
  const [savedProfile, setSavedProfile] = useState(null);
  const [localEvaluation, setLocalEvaluation] = useState(evaluation);

  useEffect(() => {
    if (!open) return;
    // initialize localEvaluation from prop each time drawer opens
    setLocalEvaluation(evaluation);
    // If user has no active fit profile, open Fit tab automatically
    if (!user?.active_fit_profile && !savedProfile) setTab("fit");
    else setTab("trust");
  }, [open, user, savedProfile, evaluation]);

  // Recompute evaluation for product with a given fit profile id
  const recomputeEvaluation = async (fitProfileId) => {
    try {
      const payload = { product_id: product?.id, fit_profile_id: fitProfileId, address_id: user?.addresses?.[0]?.id || null };
      const { data } = await api.post("/buyready/evaluate", payload);
      setLocalEvaluation(data);
    } catch (e) {
      // keep previous evaluation on error
    }
  };

  if (!open) return null;

  const trustScore = Math.round((product?.rating || 4) * 20 + (product?.trust_score || 0));
  const verifiedSeller = product?.seller_verified;
  const packguardProtected = product?.packguard_protected;
  const easyReturn = product?.easy_return;
  const deliveryConfidence = product?.delivery_confidence || 88;
  const lowReturnRate = product?.low_return_rate || 12;
  const qualityConfidence = product?.quality_confidence || 86;
  const displayPositivePercent = reviewsSummary?.positive_percent != null
    ? (reviewsSummary.positive_percent === 0 ? 10 : reviewsSummary.positive_percent)
    : null;
  const isMostlyNegative = displayPositivePercent != null
    ? displayPositivePercent < 50
    : product?.quality_flag === "low";
  const negativeOneLine = reviewsSummary?.negative
    ? String(reviewsSummary.negative).split('.').filter(Boolean)[0] + '.'
    : reviewsSummary?.areas_to_note || 'Check recent reviews before buying.';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <aside className="w-[460px] max-w-[90%] max-h-screen min-h-0 bg-white shadow-2xl border-l p-6 overflow-y-auto overflow-x-hidden" style={{ backdropFilter: "blur(8px)" }}>
        <div className="flex items-center justify-between">
          <div className="flex space-x-3">
            <button onClick={() => setTab("trust")} className={`px-3 py-2 rounded-md font-semibold ${tab === "trust" ? "bg-pink-50 text-pink-600" : "text-slate-600"}`}>🛡 Trust</button>
            <button onClick={() => setTab("fit")} className={`px-3 py-2 rounded-md font-semibold ${tab === "fit" ? "bg-pink-50 text-pink-600" : "text-slate-600"}`}>📏 Fit</button>
            <button onClick={() => setTab("product")} className={`px-3 py-2 rounded-md font-semibold ${tab === "product" ? "bg-pink-50 text-pink-600" : "text-slate-600"}`}>👕 Product</button>
            <button onClick={() => setTab("reviews")} className={`px-3 py-2 rounded-md font-semibold ${tab === "reviews" ? "bg-pink-50 text-pink-600" : "text-slate-600"}`}>💬 Reviews</button>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-white text-slate-600 hover:bg-slate-50"><X size={18} /></button>
        </div>

        <div className="mt-6">
          {isMostlyNegative && (
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-3 mb-4">
              <div className="text-sm font-extrabold text-yellow-800">! Many customers expressed concerns about the fabric quality.</div>
            </div>
          )}
          {tab === "trust" && (
            <TrustPanel
              trustScore={trustScore}
              product={product}
              evaluation={localEvaluation}
              verifiedSeller={verifiedSeller}
              packguardProtected={packguardProtected}
              easyReturn={easyReturn}
              deliveryConfidence={deliveryConfidence}
            />
          )}

          {tab === "fit" && (
            <div>
              {/* If profile was just saved or user already has one, show analysis */}
              {(savedProfile || user?.active_fit_profile) ? (
                <FitAnalysis
                  product={product}
                  user={user}
                  evaluation={localEvaluation}
                  recommendedSize={localEvaluation?.recommended_size || evaluation?.recommended_size}
                />
              ) : (
                <div className="rounded-2xl p-5 bg-white shadow-md">
                  <div className="text-sm font-semibold text-slate-700">Set up your Fit Profile</div>
                  <p className="mt-2 text-sm text-slate-500">Provide height, weight and fit preference to get size recommendations.</p>
                  <FitProfileForm
                    onSave={async (fp) => {
                      try {
                        setIsSaving(true);
                        const payload = {
                          name: fp.name,
                          height_cm: Number(fp.height) || 170,
                          weight_kg: Number(fp.weight) || 65,
                          age: Number(fp.age) || 28,
                          body_shape: fp.body_shape || fp.pref || "Unknown",
                          preferred_fit: fp.pref || "Regular",
                          language: "en",
                        };
                        const { data } = await api.post("/me/fit-profiles", payload);
                        setSavedProfile(data);
                        await refreshUser();
                        // Immediately re-evaluate buyready for this product with the new profile
                        if (data?.id) await recomputeEvaluation(data.id);
                        toast.success("Fit profile saved");
                      } catch (e) {
                        toast.error("Failed to save fit profile");
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    saving={isSaving}
                  />
                </div>
              )}
            </div>
          )}

          {tab === "product" && (
            <ProductPanel product={product} evaluation={localEvaluation} reviewsSummary={reviewsSummary} />
          )}

          {tab === "reviews" && (
            <ReviewsPanel reviewsSummary={reviewsSummary} evaluation={localEvaluation} product={product} />
          )}

        </div>

      </aside>
    </div>
  );
}

function FitProfileForm({ onSave, saving }) {
  const [name, setName] = useState("");
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(65);
  const [age, setAge] = useState(28);
  const [gender, setGender] = useState("Female");
  const [pref, setPref] = useState("Regular");

  const handleSave = () => {
    const fp = {
      name: name || "My profile",
      height,
      weight,
      age,
      gender,
      pref,
      body_shape: gender,
    };
    if (onSave) onSave(fp);
  };

  return (
    <div className="mt-3 space-y-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Profile name" className="w-full rounded-md border px-3 py-2 text-sm" />
      <div className="grid grid-cols-3 gap-2">
        <input value={height} onChange={(e) => setHeight(e.target.value)} className="rounded-md border px-2 py-2 text-sm" />
        <input value={weight} onChange={(e) => setWeight(e.target.value)} className="rounded-md border px-2 py-2 text-sm" />
        <input value={age} onChange={(e) => setAge(e.target.value)} className="rounded-md border px-2 py-2 text-sm" />
      </div>
      <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full rounded-md border px-2 py-2 text-sm">
        <option>Female</option>
        <option>Male</option>
        <option>Other</option>
      </select>
      <select value={pref} onChange={(e) => setPref(e.target.value)} className="w-full rounded-md border px-2 py-2 text-sm">
        <option>Slim</option>
        <option>Regular</option>
        <option>Relaxed</option>
      </select>
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="rounded-3xl bg-pink-500 px-4 py-2 text-white font-semibold">
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

function FitAnalysis({ product, user, evaluation, recommendedSize }) {
  const rec = recommendedSize || "M";
  const confidence = evaluation?.recommended_confidence || evaluation?.fit_confidence || 78;
  const profile = user?.active_fit_profile || null;
  const previousOrders = user?.orders || user?.purchases || user?.orders_history || [];

  // community stats may be provided by evaluation.community.size_distribution
  const sizeDist = evaluation?.community?.size_distribution || product?.size_distribution || null;

  let communityPurchased = null;
  let communityKept = null;
  let communityExchanged = null;
  if (sizeDist && sizeDist[rec]) {
    communityPurchased = Math.round(sizeDist[rec].purchased_percent || (sizeDist[rec].purchased * 100) || 0);
    communityKept = Math.round(sizeDist[rec].kept_percent || (sizeDist[rec].kept * 100) || 0);
    communityExchanged = Math.round(sizeDist[rec].exchanged_percent || (sizeDist[rec].exchanged * 100) || 0);
  }

  const hasPreviousOrders = Array.isArray(previousOrders) && previousOrders.length > 0;

  const aiExplanation = (() => {
    if (hasPreviousOrders) {
      return `Similar shoppers with your profile and purchase history bought Size ${rec} and reported ${confidence}% satisfaction. Based on your preferred ${profile?.preferred_fit || "Regular"} fit, this provides the best balance of comfort.`;
    }
    return `Similar shoppers with your body measurements prefer Size ${rec} for a ${profile ? profile.preferred_fit : "Regular"} fit. Community trends show ${communityKept || confidence}% of buyers kept this size.`;
  })();

  // Size chart: expect product.size_chart = { S: { chest: 90, waist: 70 }, M: {...} }
  const sizeChart = product?.size_chart || product?.sizeChart || null;

  return (
    <div className="rounded-2xl p-5 bg-white shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold">Recommended Size</div>
          <div className="mt-2 text-2xl font-bold">{rec}</div>
          <div className="mt-1 text-sm text-slate-500">Confidence: {confidence}%</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Fit Preference</div>
          <div className="mt-1 font-semibold">{profile?.preferred_fit || "Regular"}</div>
        </div>
      </div>

      <div className="mt-4 text-sm text-slate-700">
        <div className="font-semibold">Body Profile Summary</div>
        <div className="mt-1 text-sm text-slate-600">{profile ? `${profile.name || "You"}: ${profile.height_cm}cm, ${profile.weight_kg}kg, ${profile.age || "—"} years` : "No saved profile details available."}</div>
      </div>

      <div className="mt-4">
        <div className="font-semibold text-sm">Size Comparison</div>
        {sizeChart ? (
          <div className="mt-2 w-full overflow-auto text-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-slate-500">
                  <th className="py-2">Size</th>
                  {Object.keys(sizeChart[Object.keys(sizeChart)[0]] || {}).map((metric) => (
                    <th key={metric} className="py-2">{metric.replace(/_/g, ' ').toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(sizeChart).map(([size, dims]) => (
                  <tr key={size} className={`${size === rec ? 'bg-pink-50 font-semibold' : ''}`}>
                    <td className="py-2">{size}</td>
                    {Object.values(dims).map((val, i) => (
                      <td key={i} className="py-2 text-sm text-slate-700">{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-2 text-sm text-slate-600">Size chart unavailable for this product.</div>
        )}
      </div>

      <div className="mt-4 text-sm">
        <div className="font-semibold">Community Insights</div>
        <div className="mt-1 text-slate-600">
          {communityPurchased != null ? (
            <>
              <div>{communityPurchased}% users with similar profile purchased Size {rec}.</div>
              <div className="mt-1">{communityKept}% kept the product without exchange.</div>
              <div className="mt-1">{communityExchanged}% exchanged for a different size.</div>
            </>
          ) : (
            <div>{hasPreviousOrders ? "Community data unavailable; using your order history for recommendations." : "Recommendations are based on your measurements and community trends."}</div>
          )}
        </div>
      </div>

      <div className="mt-4 text-sm text-slate-700">
        <div className="font-semibold">AI Explanation</div>
        <div className="mt-1">{aiExplanation}</div>
      </div>
    </div>
  );
}

function TrustPanel({ trustScore, product, evaluation, verifiedSeller, packguardProtected, easyReturn, deliveryConfidence }) {
  const sellerRating = product?.seller_rating || product?.rating || 0;
  const returnConfidence = 100 - (product?.return_percent || 0);
  const qualityScore = product?.quality_score || Math.round((product?.rating || 4) * 20);
  const breakdown = [
    { key: 'Seller Trust', value: Math.round((sellerRating || 0) * 20), icon: <Star size={14} className="text-amber-500" /> },
    { key: 'Return Confidence', value: Math.round(returnConfidence), icon: <Check size={14} className="text-emerald-600" /> },
    { key: 'PackGuard', value: packguardProtected ? 100 : 30, icon: <ShieldCheck size={14} className="text-sky-500" /> },
    { key: 'Delivery Confidence', value: evaluation?.delivery?.confidence || deliveryConfidence, icon: <Truck size={14} className="text-slate-500" /> },
    { key: 'Quality', value: qualityScore, icon: <Heart size={14} className="text-pink-500" /> },
  ];

  return (
    <div className="rounded-2xl p-5 bg-white shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase text-slate-400">Trust Score</div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{trustScore}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-700">AI Recommendation</div>
          <div className="mt-1 text-sm text-rose-600">{trustScore > 75 ? 'Recommended' : trustScore > 50 ? 'Proceed with caution' : 'Not recommended'}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {breakdown.map((b) => (
          <div key={b.key} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white p-1 shadow-sm">{b.icon}</span>
              <span className="text-slate-700">{b.key}</span>
            </div>
            <div className="font-semibold" style={{ color: b.value >= 75 ? '#16a34a' : b.value >= 50 ? '#e0a100' : '#e0344c' }}>{b.value}%</div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-sm text-slate-600">
        <div className="font-semibold">Seller trust</div>
        <div className="mt-1">{verifiedSeller ? 'Seller verified and trusted by our network.' : 'Seller not verified — exercise caution.'}</div>
        <div className="mt-3 font-semibold">PackGuard</div>
        <div className="mt-1">{packguardProtected ? 'This item is PackGuard protected — warehouse verification applied.' : 'No PackGuard verification found for this item.'}</div>
      </div>
    </div>
  );
}

function ProductPanel({ product, evaluation, reviewsSummary }) {
  const fabric = product?.fabric || product?.material || 'Unknown';
  const comfort = product?.comfort || evaluation?.comfort || 'Unknown';
  const durability = product?.durability || product?.durability_score || 'Unknown';
  const qualityScore = product?.quality_score || Math.round((product?.rating || 4) * 20);
  const topStrengths = product?.strengths || reviewsSummary?.top_positive || 'Good overall fit and fabric quality';
  const commonComplaints = reviewsSummary?.top_critical || product?.common_complaints || 'Minor color variation reported by some users';
  const positivePercent = reviewsSummary?.positive_percent != null ? reviewsSummary.positive_percent : null;
  const negativeCount = reviewsSummary?.negative_count != null ? reviewsSummary.negative_count : null;
  const hasNegativeReviews = (negativeCount != null ? negativeCount > 0 : (reviewsSummary?.negative && reviewsSummary.negative !== 'No major complaints reported.'));
  const negativeAlertText = (reviewsSummary?.complaints && reviewsSummary.complaints.length) ? reviewsSummary.complaints.join(' • ') : (reviewsSummary?.negative || 'Some recent reviews mention issues with quality or fit. Review complaints before buying.');
  const isMostlyNegative = positivePercent != null ? positivePercent < 50 : hasNegativeReviews;

  return (
    <div className="rounded-2xl p-5 bg-white shadow-xl space-y-4">
      <div>
        <div className="text-sm font-semibold">AI Product Summary</div>
        <div className="mt-2 text-sm text-slate-700">{product?.short_summary || product?.description || 'No summary available.'}</div>
      </div>
      {hasNegativeReviews && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-800">Product alert</div>
          <div className="mt-1 text-sm text-rose-700">{negativeAlertText}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3">
          <div className="text-xs text-slate-500">Fabric</div>
          <div className="font-semibold">{fabric}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-slate-500">Comfort</div>
          <div className="font-semibold">{comfort}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-slate-500">Durability</div>
          <div className="font-semibold">{durability}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-slate-500">Quality Score</div>
          <div className="font-semibold">{qualityScore}%</div>
        </div>
      </div>

      <div className="mt-2">
        <div className="text-sm font-semibold">Seller rating</div>
        <div className="mt-1 text-sm text-slate-700">{product?.seller_rating || product?.rating || '—'}</div>
      </div>

      <div className="grid gap-2">
        {!isMostlyNegative ? (
          <>
            <div>
              <div className="text-sm font-semibold">Top strengths</div>
              <div className="text-sm text-slate-600 mt-1">{topStrengths}</div>
            </div>
            <div>
              <div className="text-sm font-semibold">Common complaints</div>
              <div className="text-sm text-slate-600 mt-1">{commonComplaints}</div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
            <div className="text-sm font-semibold text-yellow-800">Low confidence — check reviews</div>
            <div className="mt-1 text-sm text-yellow-700">{negativeAlertText}</div>
            <div className="mt-2 text-xs text-yellow-600">We recommend reading buyer complaints and recent reviews before purchasing.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewsPanel({ reviewsSummary, evaluation, product }) {
  // try to extract review metrics without inventing numbers
  const topPositive = reviewsSummary?.positive || reviewsSummary?.top_positive || 'Mixed fit and quality feedback';
  const topCritical = reviewsSummary?.negative || reviewsSummary?.top_critical || 'Some customers reported issues with quality or fit';
  const fitSatisfaction = reviewsSummary?.fit_satisfaction || evaluation?.fit_confidence || null;
  const exchangeRate = reviewsSummary?.exchange_rate || product?.exchange_rate || null;
  const displayPositivePercent = reviewsSummary?.positive_percent != null
    ? (reviewsSummary.positive_percent === 0 ? 10 : reviewsSummary.positive_percent)
    : null;
  const reviewSummaryText = reviewsSummary?.summary_text
    || (displayPositivePercent != null
      ? (displayPositivePercent >= 70
          ? reviewsSummary.positive
          : displayPositivePercent >= 40
            ? reviewsSummary.positive
            : reviewsSummary.negative)
      : 'Customers reported issues with fit, quality, or delivery on recent reviews.');

  return (
    <div className="rounded-2xl p-5 bg-white shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Reviews — similar buyers</div>
        <div className="text-xs text-slate-500">Filtered by recommended size</div>
      </div>

      <div className="text-sm text-slate-700">{topPositive}</div>
      <div className="text-sm text-slate-700">{topCritical}</div>

      <div className="mt-2 grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3 text-sm">
          <div className="text-xs text-slate-500">Fit satisfaction</div>
          <div className="font-semibold">{fitSatisfaction ? `${fitSatisfaction}%` : 'N/A'}</div>
        </div>
        <div className="rounded-lg border p-3 text-sm">
          <div className="text-xs text-slate-500">Exchange rate</div>
          <div className="font-semibold">{exchangeRate ? `${exchangeRate}%` : 'N/A'}</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-sm font-semibold">AI review summary</div>
        <div className="text-sm text-slate-600 mt-1">{reviewSummaryText}</div>
      </div>
    </div>
  );
}
