import { motion } from "framer-motion";
import { CheckCircle2, PackageCheck, RotateCcw, Star, Lock } from "lucide-react";

export const BuyReadyHeroCard = ({ evaluation, product, onViewDetails }) => {
  const goodFit = (evaluation?.fit_confidence || 0) >= 70;
  const properQuality = (evaluation?.trust_score ?? product?.size_accuracy ?? 0) >= 70;
  const easyReturns = (product?.return_percent ?? 100) <= 15;
  const unlocked = !!evaluation?.unlocked;

  const Cell = ({ icon: Icon, active, title, sub }) => (
    <div className="flex items-start gap-2">
      <Icon size={17} className={`shrink-0 mt-0.5 ${active ? "text-[#03A685]" : "text-gray-300"}`} />
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-[#282C3F] leading-tight">{title}</p>
        <p className="text-[10px] text-[#7E818C] leading-tight mt-0.5">{sub}</p>
      </div>
    </div>
  );

  return (
    <motion.div
      data-testid="buyready-summary"
      initial={false}
      animate={unlocked ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 0.4, ease: "easeOut" }}
<<<<<<< HEAD
      onClick={onViewDetails}
      className={`border rounded-xl p-4 mt-4 transition-colors cursor-pointer hover:border-[#FF3E6C]/50 ${unlocked ? "border-[#03A685]/40" : "border-gray-200"}`}
    >
      <div className="flex items-center justify-between mb-3.5">
        <span className="bg-[#03A685] text-white text-[9px] font-extrabold uppercase tracking-wider rounded px-2 py-1">BuyReady</span>
        <button data-testid="buyready-view-details-btn" onClick={(e) => { e.stopPropagation(); onViewDetails(); }} className="text-xs font-bold text-[#FF3E6C] hover:text-[#E6355F] transition-colors">View Details</button>
=======
      className={`border rounded-xl p-4 mt-4 transition-colors ${unlocked ? "border-[#03A685]/40" : "border-gray-200"}`}
    >
      <div className="flex items-center justify-between mb-3.5">
        <span className="bg-[#03A685] text-white text-[9px] font-extrabold uppercase tracking-wider rounded px-2 py-1">BuyReady</span>
        <button data-testid="buyready-view-details-btn" onClick={onViewDetails} className="text-xs font-bold text-[#FF3E6C] hover:text-[#E6355F] transition-colors">View Details</button>
>>>>>>> 43bbf1f2989109a305f4da47781247b00b7a32b8
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
        <Cell icon={CheckCircle2} active={goodFit} title="Good Fit" sub="Recommended based on your profile" />
        <Cell icon={PackageCheck} active={properQuality} title="Proper Quality" sub="Based on reviews and buyer feedback" />
        <Cell icon={RotateCcw} active={easyReturns} title="Easy Returns" sub="15 days return window" />
        <div className="flex items-start gap-2">
          <Star size={17} className="shrink-0 mt-0.5 fill-amber-400 text-amber-400" />
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-[#282C3F] leading-tight">{product?.rating}★ Ratings</p>
            <p className="text-[10px] text-[#7E818C] leading-tight mt-0.5">
              {product?.rating_count?.toLocaleString("en-IN")} ratings{product?.recommend_percent ? ` · ${product.recommend_percent}% recommend` : ""}
            </p>
          </div>
        </div>
      </div>
      {!unlocked && (
        <p className="flex items-center gap-1.5 text-[10px] text-[#7E818C] mt-3 pt-3 border-t border-gray-100">
          <Lock size={11} className="shrink-0" /> Complete your fit profile, address & purpose above to unlock your full BuyReady score.
        </p>
      )}
    </motion.div>
  );
};
