import { motion } from "framer-motion";
import { Truck, Zap, Rocket, AlertTriangle, PartyPopper } from "lucide-react";

const ICONS = { standard: Truck, express: Zap, same_day: Rocket };
const NAMES = { standard: "FREE Delivery", express: "Express Delivery", same_day: "Same Day Delivery" };

export const DeliveryPrediction = ({ delivery, selected, onSelect, onSearchAlternative }) => {
  if (!delivery) return null;

  const confidenceLabel = String(delivery.confidence_label || "High");
  const confidencePillClass = confidenceLabel === "High"
    ? "bg-emerald-100 text-emerald-800"
    : confidenceLabel === "Medium"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-rose-100 text-rose-800";

  return (
    <div data-testid="delivery-prediction" className="border border-gray-200 rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7E818C]">Delivery Prediction</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#03A685] bg-[#03A685]/10 rounded-full px-2.5 py-1">{delivery.confidence}% on-time</span>
          <span className={`text-[10px] font-bold rounded-full px-2.5 py-1 ${confidencePillClass}`}>{confidenceLabel} confidence</span>
        </div>
      </div>
      <div className="space-y-2">
        {delivery.options.filter((o) => o.type !== "same_day").map((o) => {
          const Icon = ICONS[o.type] || Truck;
          const textColor = o.color === "green" ? "text-[#16a34a]" : o.color === "yellow" ? "text-amber-700" : "text-[#7E818C]";
          const arriveText = o.date
            ? o.date
            : (o.arrival_iso ? new Date(o.arrival_iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : (o.days === 0 ? "Arrives today" : `Arrives ${o.date}`));
          return (
            <button key={o.type} data-testid={`delivery-option-${o.type}`} onClick={() => onSelect?.(o.type)}
              className={`w-full flex items-center gap-3 border rounded-lg p-3 text-left transition-colors ${selected === o.type ? "border-[#FF3E6C] bg-[#FF3E6C]/[0.03]" : "border-gray-200"}`}>
              <Icon size={16} className={selected === o.type ? "text-[#FF3E6C]" : "text-[#535766]"} />
              <div className="flex-1">
                <p className="text-sm font-semibold">{NAMES[o.type] || o.label}</p>
                <p className={`text-xs ${textColor}`}>{o.days === 0 ? "Arrives today" : `Arrives by ${arriveText}`}</p>
              </div>
              <span className="text-xs font-bold">{o.fee ? `₹${o.fee}` : "FREE"}</span>
            </button>
          );
        })}
      </div>

      {delivery.arrives_early_text && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          data-testid="arrives-early-badge"
          className="mt-3 flex items-center gap-2 bg-[#03A685]/10 border border-[#03A685]/30 rounded-lg px-3 py-2.5">
          <PartyPopper size={15} className="text-[#03A685]" />
          <p className="text-xs font-bold text-[#03A685]">{delivery.arrives_early_text} — safety buffer included</p>
        </motion.div>
      )}

      {delivery.event_notice && (
        <div className="mt-3 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-amber-800">{delivery.event_notice}</p>
        </div>
      )}

      {delivery.alternative && (
        <div data-testid="delivery-alternative" className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-amber-700">{delivery.alternative}</p>
        </div>
      )}

      {delivery.both_miss_event && (
        <div className="mt-3">
          <button data-testid="search-alternative-btn" onClick={onSearchAlternative}
            className="w-full text-left text-sm font-semibold text-[#FF3E6C]">
            🔍 Search alternatives that arrive sooner
          </button>
        </div>
      )}

      <p className="text-[10px] text-[#7E818C] mt-3">Ships from {delivery.warehouse} warehouse • based on your PIN code and nearest warehouse availability</p>
    </div>
  );
};
