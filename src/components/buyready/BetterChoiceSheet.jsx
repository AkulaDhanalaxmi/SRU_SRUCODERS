import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Truck, RotateCcw, BadgePercent, Ruler, X, Star } from "lucide-react";

const REASON_ICONS = { "Better Fit": Ruler, "Earlier Delivery": Truck, "Lower Return Risk": RotateCcw, "Better Value": BadgePercent };

export const BetterChoiceSheet = ({ open, onClose, data }) => {
  const navigate = useNavigate();
  if (!data) return null;
  const all = [data.current, ...data.alternatives];
  
  // Group alternatives by score
  const topPicks = data.alternatives.filter(r => r.score >= 85);
  const greatOptions = data.alternatives.filter(r => r.score >= 70 && r.score < 85);
  const goodAlternatives = data.alternatives.filter(r => r.score < 70);

  const renderProductCard = (r, i, isBest, isCurrent) => (
    <div
      key={r.product.id}
      data-testid={`compare-item-${r.product.id}`}
      onClick={() => {
        if (!isCurrent) {
          onClose();
          navigate(`/product/${r.product.id}`);
        }
      }}
      className={`relative flex gap-3 rounded-xl border px-3 py-3 ${isBest ? "border-[#03A685] bg-[#03A685]/[0.04]" : "border-slate-200 bg-white"} ${!isCurrent ? "cursor-pointer hover:border-[#FF3E6C]/60" : ""}`}
    >
      {isBest && (
        <span className="absolute -top-2.5 left-3 bg-[#03A685] text-white text-[9px] font-extrabold uppercase tracking-wide rounded-full px-2.5 py-0.5 flex items-center gap-1">
          <Crown size={10} /> BuyReady Pick
        </span>
      )}
      {isCurrent && !isBest && (
        <span className="absolute -top-2.5 left-3 bg-[#535766] text-white text-[9px] font-bold uppercase rounded-full px-2.5 py-0.5">Viewing now</span>
      )}
      {isCurrent && isBest && (
        <span className="absolute -top-2.5 right-3 bg-[#535766] text-white text-[9px] font-bold uppercase rounded-full px-2.5 py-0.5">Viewing now</span>
      )}
      <img src={r.product.images[0]} alt={r.product.name} className="w-16 h-20 rounded-lg object-cover bg-[#F5F5F6] shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{r.product.brand}</p>
        <p className="text-xs text-[#7E818C] truncate">{r.product.name}</p>
        <p className="text-sm font-bold mt-0.5">₹{r.product.price} <span className="text-[10px] text-[#FF905A]">({r.product.discount}% OFF)</span></p>
        <div className="flex items-center gap-1 mt-1">
          <div className="flex items-center gap-0.5">
            <Star size={12} className="fill-[#FFA500] text-[#FFA500]" />
            <span className="text-[10px] font-semibold">{r.review_rating}</span>
          </div>
          <span className="text-[10px] text-[#7E818C]">• {r.positive_percent}% positive</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {r.reasons.map((reason) => {
            const Icon = REASON_ICONS[reason];
            return (
              <span key={reason} className="flex items-center gap-1 rounded-full bg-[#03A685]/10 px-2 py-0.5 text-[9px] font-bold text-[#03A685]">
                {Icon && <Icon size={9} />} {reason}
              </span>
            );
          })}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className={`font-heading font-extrabold text-lg ${isBest ? "text-[#03A685]" : "text-[#282C3F]"}`}>{r.score}%</p>
        <p className="text-[9px] uppercase font-bold text-[#7E818C]">Score</p>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed top-0 right-0 bottom-0 z-[71] w-full max-w-[420px] bg-white shadow-2xl border-l border-slate-200 overflow-y-auto"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
          >
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-base font-bold text-slate-900">Faster-arriving options</h2>
                <p className="text-xs text-slate-500 mt-1">These {all.length} products were compared for faster delivery, fit, reviews and value.</p>
              </div>
              <button onClick={onClose} className="rounded-full p-2 text-slate-600 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              {/* Current Product */}
              <div>
                {renderProductCard(data.current, 0, data.current.product.id === data.recommended_id, true)}
              </div>

              {/* Top Picks */}
              {topPicks.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-[#282C3F] uppercase tracking-wide mb-2">🌟 Top Picks ({topPicks.length})</h3>
                  <div className="space-y-2">
                    {topPicks.map((r) => renderProductCard(r, 0, r.product.id === data.recommended_id, false))}
                  </div>
                </div>
              )}

              {/* Great Options */}
              {greatOptions.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-[#282C3F] uppercase tracking-wide mb-2">✓ Great Options ({greatOptions.length})</h3>
                  <div className="space-y-2">
                    {greatOptions.map((r) => renderProductCard(r, 0, r.product.id === data.recommended_id, false))}
                  </div>
                </div>
              )}

              {/* Good Alternatives */}
              {goodAlternatives.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-[#282C3F] uppercase tracking-wide mb-2">≈ Also Worth Checking ({goodAlternatives.length})</h3>
                  <div className="space-y-2">
                    {goodAlternatives.map((r) => renderProductCard(r, 0, r.product.id === data.recommended_id, false))}
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
