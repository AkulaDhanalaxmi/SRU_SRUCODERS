import { motion } from "framer-motion";
import { Truck, Zap, Rocket, AlertTriangle, PartyPopper } from "lucide-react";

const ICONS = { standard: Truck, express: Zap, same_day: Rocket };

export const DeliveryPrediction = ({ delivery, selected, onSelect, onSearchAlternative }) => {
  if (!delivery) return null;
  return (
    <div data-testid="delivery-prediction" className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7E818C]">Delivery Prediction</p>
        <span className="text-[10px] font-bold text-[#03A685] rounded-full px-2.5 py-1">{delivery.confidence}% on-time confidence</span>
      </div>
      <div className="space-y-2">
        {delivery.options.map((o) => {
          const Icon = ICONS[o.type] || Truck;
          const textColor = o.color === "green" ? "text-[#16a34a]" : o.color === "yellow" ? "text-amber-700" : "text-[#7E818C]";
          const arriveText = o.days === 0 ? "Arrives today" : (o.arrival_iso ? new Date(o.arrival_iso).toLocaleDateString() : `Arrives ${o.date}`);
          return (
            <button key={o.type} data-testid={`delivery-option-${o.type}`} onClick={() => onSelect?.(o.type)}
              className={`w-full flex items-center gap-3 border rounded-lg p-3 text-left transition-colors ${selected === o.type ? "border-[#FF3E6C] bg-[#FF3E6C]/[0.03]" : "border-gray-200"}`}>
              <Icon size={16} className={selected === o.type ? "text-[#FF3E6C]" : "text-[#535766]"} />
              <div className="flex-1">
                <p className="text-sm font-semibold">{o.label}</p>
                <p className={`text-xs ${textColor}`}>{arriveText}</p>
              </div>
              <span className="text-xs font-bold">{o.fee ? `₹${o.fee}` : "FREE"}</span>
            </button>
          );
        })}
      </div>

      {delivery.arrives_early_text && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          data-testid="arrives-early-badge"
          className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2.5">
          <PartyPopper size={15} className="text-[#03A685]" />
          <p className="text-xs font-bold text-[#03A685]">{delivery.arrives_early_text} — safety buffer included</p>
        </motion.div>
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
            className="w-full text-left text-sm font-semibold text-[#FF3E6C]">🔍 Search alternatives that arrive sooner</button>
        </div>
      )}

      <p className="text-[10px] text-[#7E818C] mt-3">Ships from {delivery.warehouse} warehouse</p>
    </div>
  );
};
