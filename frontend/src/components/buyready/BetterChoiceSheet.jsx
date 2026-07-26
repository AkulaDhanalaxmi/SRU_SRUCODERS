import { useNavigate } from "react-router-dom";
import { Crown, Truck, RotateCcw, BadgePercent, Ruler, Star } from "lucide-react";
import { BottomSheet } from "../BottomSheet";

const REASON_ICONS = { "Better Fit": Ruler, "Earlier Delivery": Truck, "Lower Return Risk": RotateCcw, "Better Value": BadgePercent };

export const BetterChoiceSheet = ({ open, onClose, data }) => {
  const navigate = useNavigate();
  if (!data) return null;
  const all = [data.current, ...data.alternatives];
  const sortedAlternatives = [...data.alternatives].sort((a, b) => b.score - a.score);

  // Group alternatives by score
  const topPicks = sortedAlternatives.filter(r => r.score >= 85);
  const greatOptions = sortedAlternatives.filter(r => r.score >= 70 && r.score < 85);
  const goodAlternatives = sortedAlternatives.filter(r => r.score < 70);

  const renderProductCard = (r, isBest, isCurrent) => (
    <div key={r.product.id} data-testid={`compare-item-${r.product.id}`}
      onClick={() => { if (!isCurrent) { onClose(); navigate(`/product/${r.product.id}`); } }}
      className={`relative flex gap-3 border rounded-xl p-3 ${isBest ? "border-[#03A685] bg-[#03A685]/[0.04]" : "border-gray-200"} ${!isCurrent ? "cursor-pointer hover:border-[#FF3E6C]/60" : ""}`}>
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
              <span key={reason} className="flex items-center gap-1 text-[9px] font-bold text-[#03A685] bg-[#03A685]/10 rounded-full px-2 py-0.5">
                {Icon && <Icon size={9} />} {reason}
              </span>
            );
          })}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`font-heading font-extrabold text-lg ${isBest ? "text-[#03A685]" : "text-[#282C3F]"}`}>{r.score}%</p>
        <p className="text-[9px] text-[#7E818C] uppercase font-bold">Score</p>
      </div>
    </div>
  );

  return (
    <BottomSheet open={open} onClose={onClose} title="Better Choice For You" testId="better-choice-sheet">
      <p className="text-xs text-[#7E818C] mb-4 -mt-2">Compared {all.length} products on fit, delivery, reviews and value.</p>
      <div className="space-y-4">
        {/* Current Product */}
        <div>
          {renderProductCard(data.current, data.current.product.id === data.recommended_id, true)}
        </div>

        {/* Top Picks */}
        {topPicks.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-[#282C3F] uppercase tracking-wide mb-2">🌟 Top Picks ({topPicks.length})</h3>
            <div className="space-y-2">
              {topPicks.map((r) => renderProductCard(r, r.product.id === data.recommended_id, false))}
            </div>
          </div>
        )}

        {/* Great Options */}
        {greatOptions.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-[#282C3F] uppercase tracking-wide mb-2">✓ Great Options ({greatOptions.length})</h3>
            <div className="space-y-2">
              {greatOptions.map((r) => renderProductCard(r, r.product.id === data.recommended_id, false))}
            </div>
          </div>
        )}

        {/* Good Alternatives */}
        {goodAlternatives.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-[#282C3F] uppercase tracking-wide mb-2">≈ Also Worth Checking ({goodAlternatives.length})</h3>
            <div className="space-y-2">
              {goodAlternatives.map((r) => renderProductCard(r, r.product.id === data.recommended_id, false))}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
