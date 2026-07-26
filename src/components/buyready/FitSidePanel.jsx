import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Ruler, User } from "lucide-react";

// Dot color reflects how good that zone's fit is — green (good),
// amber/yellow (borderline), red (needs attention).
function dotColor(value) {
  if (value >= 70) return "#16a34a";
  if (value >= 50) return "#e0a100";
  return "#e0344c";
}

// Small illustrative avatar with colored dots marking chest / waist / length
// fit — a quick at-a-glance summary before the detailed list below it.
function FitAvatarDots({ metrics }) {
  const chest = metrics.find((m) => m.label === "Chest Fit")?.value ?? 70;
  const waist = metrics.find((m) => m.label === "Waist Fit")?.value ?? 70;
  const length = metrics.find((m) => m.label === "Length")?.value ?? 70;

  return (
    <svg viewBox="0 0 120 180" className="mx-auto h-[150px] w-auto">
      <circle cx="60" cy="24" r="16" fill="#f0d9c4" />
      <rect x="34" y="42" width="52" height="62" rx="14" fill="#e5e7eb" />
      <rect x="40" y="104" width="40" height="34" rx="10" fill="#e5e7eb" />
      <rect x="38" y="138" width="18" height="34" rx="8" fill="#d8d8dc" />
      <rect x="64" y="138" width="18" height="34" rx="8" fill="#d8d8dc" />
      <circle cx="60" cy="58" r="7" fill={dotColor(chest)} stroke="white" strokeWidth="2" />
      <circle cx="60" cy="90" r="7" fill={dotColor(waist)} stroke="white" strokeWidth="2" />
      <circle cx="60" cy="120" r="7" fill={dotColor(length)} stroke="white" strokeWidth="2" />
    </svg>
  );
}

export default function FitSidePanel({ open, onClose, product, evaluation, fitProfile, size }) {
  const navigate = useNavigate();

  const recommendedSize = evaluation?.recommended_size || size || product?.sizes?.[0] || null;
  const fitConfidence = evaluation?.fit_confidence ?? 60;
  const fp = fitProfile;

  if (!product) return null;

  const whyText = evaluation?.why?.fit?.en
    || (fp ? `Based on your fit profile (${fp.height_cm}cm, ${fp.weight_kg}kg, ${fp.body_shape} shape, ${fp.preferred_fit} fit), size ${recommendedSize} is our best pick for you.` : "Save a fit profile to get a personalised size recommendation.");

  const fitMetrics = [
    { label: "Chest Fit", value: Math.min(100, fitConfidence + 4), note: "Likely comfortable" },
    { label: "Waist Fit", value: Math.min(100, fitConfidence), note: "True to size" },
    { label: "Length", value: Math.max(65, fitConfidence - 8), note: "Expected mid-thigh" },
    { label: "Fabric Stretch", value: Math.min(100, fitConfidence + 6), note: "Medium stretch" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            data-testid="buyready-side-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed top-0 right-0 bottom-0 z-[61] w-full sm:w-[420px] bg-white shadow-[-8px_0_24px_rgba(40,44,63,0.15)] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="bg-[#03A685] text-white text-[9px] font-extrabold uppercase tracking-wider rounded px-2 py-1">BuyReady</span>
                <h2 className="font-heading font-bold text-sm text-[#282C3F]">Fit Analysis</h2>
              </div>
              <button data-testid="buyready-panel-close-btn" onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                <X size={19} className="text-[#535766]" />
              </button>
            </div>

            {/* Body — sized to fit without scrolling on a normal viewport */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Recommended size hero */}
              <section>
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#535766] mb-2">
                  <Ruler size={12} /> Why this size?
                </p>
                <div className="rounded-[22px] border border-[#e5e7eb] bg-[#f8fafc] p-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#475569]">Recommended size</p>
                      <p className="mt-1.5 text-[26px] font-extrabold text-[#111827] leading-none">{recommendedSize || "N/A"}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-3.5 py-2.5 text-[11px] font-bold text-[#0f172a] shadow-sm">
                      <p className="text-[#64748b]">Fit confidence</p>
                      <p className="mt-1 text-[16px] font-extrabold text-[#03A685]">{fitConfidence}%</p>
                    </div>
                  </div>
                  <p className="mt-2.5 text-[12.5px] leading-relaxed text-[#334155]">This size is most likely to give you the best fit and comfort.</p>
                  <div className="mt-2.5 rounded-2xl border border-[#d1d5db] bg-white p-3">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#64748b]">Why this size</p>
                    <p className="mt-1.5 text-[12.5px] text-[#282c3f] leading-relaxed">{whyText}</p>
                  </div>
                </div>
              </section>

              {/* Fit avatar — quick visual summary via colored dots */}
              <section>
                <FitAvatarDots metrics={fitMetrics} />
                <div className="mt-2 flex items-center justify-center gap-4 text-[10.5px] font-semibold text-[#535766]">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#16a34a]" /> Good fit</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#e0a100]" /> Borderline</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#e0344c]" /> Check size</span>
                </div>
              </section>

              {/* Fit confidence — single list, no individual card boxes */}
              <section>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#535766] mb-1.5">Fit confidence</p>
                <div className="rounded-[22px] border border-[#e5e7eb] bg-white divide-y divide-[#f0f0f0]">
                  {fitMetrics.map((metric) => (
                    <div key={metric.label} className="px-3.5 py-2.5">
                      <div className="flex items-center justify-between text-[12px] font-bold text-[#111827]">
                        <span>{metric.label}</span>
                        <span>{metric.value}%</span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#eef2ff]">
                        <div className="h-full rounded-full bg-[#2563eb]" style={{ width: `${metric.value}%` }} />
                      </div>
                      <p className="mt-1 text-[10.5px] text-[#64748b]">{metric.note}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="shrink-0 border-t border-gray-100 p-3.5 space-y-2 bg-white">
              <button
                data-testid="panel-edit-fit-profile-btn"
                onClick={() => navigate("/fit-setup")}
                className="w-full border border-gray-300 text-[#535766] font-bold py-2.5 rounded-md text-xs uppercase tracking-wide hover:border-[#FF3E6C] hover:text-[#FF3E6C] transition-colors flex items-center justify-center gap-1.5"
              >
                <User size={14} /> Edit Fit Profile
              </button>
              <button
                data-testid="panel-close-btn"
                onClick={onClose}
                className="w-full bg-[#FF3E6C] hover:bg-[#E6355F] text-white font-bold py-2.5 rounded-md text-xs uppercase tracking-wide transition-colors"
              >
                Close Panel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}