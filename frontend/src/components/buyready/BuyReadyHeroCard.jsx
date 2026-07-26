import { motion } from "framer-motion";
import { ShieldCheck, Lock, Sparkles, HelpCircle, ArrowRightLeft } from "lucide-react";

const Bar = ({ label, value, testId }) => (
  <div data-testid={testId}>
    <div className="flex justify-between text-xs mb-1">
      <span className="font-semibold text-[#535766]">{label}</span>
      <span className="font-bold text-[#282C3F]">{value}%</span>
    </div>
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
        className={`h-full rounded-full ${value >= 80 ? "bg-[#03A685]" : value >= 60 ? "bg-amber-400" : "bg-[#FF3E6C]"}`} />
    </div>
  </div>
);

export const BuyReadyHeroCard = ({ evaluation, onBuy, onWhy, onBetterChoice }) => {
  if (!evaluation?.unlocked) {
    return (
      <div data-testid="buyready-locked" className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center">
        <Lock size={24} className="mx-auto text-gray-400" />
        <p className="font-heading font-bold text-sm text-[#282C3F] mt-2">BuyReady Score Locked</p>
        <p className="text-xs text-[#7E818C] mt-1">Complete Steps 1–3 (fit profile, address & purpose) to unlock your personalised buying decision.</p>
      </div>
    );
  }

  const ev = evaluation;
  return (
    <motion.div
      data-testid="buyready-hero-card"
      initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", damping: 15, stiffness: 180 }}
      className="rounded-2xl border-2 border-[#03A685] bg-white shadow-[0_8px_24px_rgba(3,166,133,0.15)] overflow-hidden">
      <div className="bg-[#03A685] px-5 py-3 flex items-center justify-between">
        <p className="text-white font-heading font-bold text-sm flex items-center gap-2"><ShieldCheck size={16} /> BuyReady Verdict</p>
        <span data-testid="buyready-verdict" className="bg-white text-[#03A685] text-xs font-extrabold rounded-full px-3 py-1">{ev.verdict} • {ev.overall_score}%</span>
      </div>
      <div className="p-5 space-y-4">
        <Bar label={`Fit Confidence${ev.recommended_size ? ` (Size ${ev.recommended_size})` : ""}`} value={ev.fit_confidence} testId="bar-fit" />
        <Bar label="Occasion Readiness" value={ev.occasion_readiness} testId="bar-occasion" />
        <Bar label="Trust Signals" value={ev.trust_score} testId="bar-trust" />
        <Bar label="Worth Buying" value={ev.value_score} testId="bar-value" />

        <button data-testid="buy-with-confidence-btn" onClick={onBuy}
          className="w-full bg-[#FF3E6C] hover:bg-[#E6355F] text-white font-bold py-3.5 rounded-md text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-colors">
          <Sparkles size={16} /> Buy With Confidence
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button data-testid="why-recommended-btn" onClick={onWhy}
            className="border border-gray-300 text-[#282C3F] font-bold py-2.5 rounded-md text-xs uppercase flex items-center justify-center gap-1.5 hover:border-[#FF3E6C] hover:text-[#FF3E6C] transition-colors">
            <HelpCircle size={14} /> Why Recommended
          </button>
          <button data-testid="better-choice-btn" onClick={onBetterChoice}
            className="border border-gray-300 text-[#282C3F] font-bold py-2.5 rounded-md text-xs uppercase flex items-center justify-center gap-1.5 hover:border-[#FF3E6C] hover:text-[#FF3E6C] transition-colors">
            <ArrowRightLeft size={14} /> Better Choice
          </button>
        </div>
      </div>
    </motion.div>
  );
};
