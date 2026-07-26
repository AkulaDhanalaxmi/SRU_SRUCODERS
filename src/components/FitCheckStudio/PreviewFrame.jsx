import React from "react";
import { Zap } from "lucide-react";

const ANALYSIS_KEY_MAP = {
  fit: ["Fit Analysis", "Fit"],
};

const resolveAnalysis = (analysis, keys) => {
  if (!analysis) return null;
  return keys.reduce((value, key) => value || analysis[key], null);
};

const getFitLabel = (score) => {
  if (score === null || score === undefined) return "No score";
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Great";
  if (score >= 50) return "Good";
  return "Needs Review";
};

const occasionCards = [
  { title: "Casual", subtitle: "Weekend outings & brunch", icon: "☀️", accent: "bg-[#fff7ed] text-[#c2410c]" },
  { title: "Office", subtitle: "Smart yet comfortable", icon: "💼", accent: "bg-[#eff6ff] text-[#2563eb]" },
  { title: "Party", subtitle: "Stylish and standout", icon: "🎉", accent: "bg-[#fdf2f8] text-[#9d174d]" },
  { title: "Vacation", subtitle: "Easy & holiday ready", icon: "🌴", accent: "bg-[#ecfdf5] text-[#047857]" },
];

const styleSuggestions = [
  { title: "Sling Bag", icon: "👜" },
  { title: "Gold Earrings", icon: "💍" },
  { title: "Strappy Heels", icon: "👠" },
  { title: "Denim Jacket", icon: "🧥" },
];

const colorSwatches = ["#f9a8d4", "#fbcfe8", "#fde68a", "#bbf7d0", "#ddd6fe"];

export default function PreviewFrame({
  generatedImage,
  originalThumbnail,
  isLoading,
  elapsedSeconds,
  fitResult,
  thumbnails = [],
  activeThumbnailIndex = 0,
  onSelectThumbnail,
  onSave,
  onTryAgain,
  onShop,
}) {
  const analysis = fitResult?.analysis || {};
  const overallScore = fitResult?.confidence ?? null;
  const fitDescription =
    resolveAnalysis(analysis, ANALYSIS_KEY_MAP.fit) ||
    "This outfit looks perfect on you! The fit, length and style suit your body type really well.";

  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const progress = overallScore !== null ? Math.min(Math.max(overallScore, 0), 100) : 0;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="rounded-[20px] border border-[#e6e6e6] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] overflow-hidden w-full">
      <div className="grid gap-6 lg:grid-cols-[2.2fr_minmax(580px,840px)] bg-[#f7f4f8] p-5">
        <div className="rounded-[22px] bg-white p-5">
          <div className="relative overflow-hidden rounded-[20px] bg-white p-5">
            <div className="absolute left-5 top-5 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold text-[#111827] shadow-sm">
              ✨ AI Generated
            </div>
            <div className="absolute right-5 top-5 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold text-[#111827] shadow-sm">
              🟢 {overallScore ?? 0}% Match
            </div>
            {isLoading ? (
              <div className="flex h-[520px] w-full flex-col items-center justify-center gap-3 rounded-[20px] bg-gradient-to-br from-[#eef2ff] to-[#fdf0f6] p-5 text-center text-[#4b4f6f]">
                <Zap size={44} className="mx-auto mb-2 text-[#7c3aed] opacity-60" />
                <div>
                  <h3 className="text-[18px] font-bold">Generating your AI preview...</h3>
                  <p className="mt-2 text-[13px] text-[#6b7280]">Please wait — this may take a few seconds.</p>
                  {elapsedSeconds > 0 && (
                    <p className="mt-2 text-[12px] text-[#9ca3af]">Elapsed: {elapsedSeconds}s</p>
                  )}
                </div>
              </div>
            ) : generatedImage ? (
              <div className="flex justify-center bg-white">
                <img
                  src={generatedImage}
                  alt="AI-generated preview"
                  loading="eager"
                  className="h-[520px] w-full max-w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-[360px] w-full flex-col items-center justify-center gap-3 rounded-[20px] bg-gradient-to-br from-[#eef2ff] to-[#fdf0f6] p-5 text-center text-[#4b4f6f]">
                <div className="text-[40px]">⚡</div>
                <div className="max-w-xs">
                  <h3 className="text-[18px] font-bold">Upload an image to start</h3>
                  <p className="mt-2 text-[13px] text-[#6b7280]">Your AI try-on preview appears here once the generation is complete.</p>
                </div>
              </div>
            )}
          </div>

          {generatedImage && thumbnails.length > 0 && (
            <div className="border-t border-[#f2f2f5] bg-white px-4 py-4">
              <div className="flex items-center gap-3 overflow-x-auto">
                {thumbnails.map((thumb, index) => (
                  <button
                    key={`${thumb}-${index}`}
                    type="button"
                    onClick={() => onSelectThumbnail?.(index)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-[14px] border-2 transition ${
                      index === activeThumbnailIndex
                        ? "border-[#ff3f6c]"
                        : "border-transparent hover:border-[#e5e7eb]"
                    }`}
                  >
                    <img src={thumb} alt={`Preview thumbnail ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[20px] border border-[#f2f4f7] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[#111827]">FitCheck Summary</h3>
              <span className="inline-flex items-center rounded-full bg-[#ecfdf5] px-3 py-1 text-[12px] font-semibold text-[#047857]">
                {getFitLabel(overallScore)}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">Overall Fit Score</p>
                <p className="mt-1 text-[34px] font-extrabold text-[#059669]">
                  {overallScore !== null ? `${overallScore}/100` : "--/100"}
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-[#6b7280]">{fitDescription}</p>
              </div>
              <svg width="72" height="72" viewBox="0 0 64 64" className="shrink-0 -rotate-90">
                <circle cx="32" cy="32" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="7" />
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                />
              </svg>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#f2f4f7] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[#111827]">When to Wear</h3>
              <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-[11px] font-semibold text-[#2563eb]">AI Picks</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {occasionCards.map((card) => (
                <div key={card.title} className={`min-h-[90px] rounded-[18px] border border-[#f2f4f7] p-3 ${card.accent}`}>
                  <p className="text-[13px] font-semibold">
                    <span className="mr-2 text-[16px]">{card.icon}</span>
                    {card.title}
                  </p>
                  <p className="mt-2 text-[11px] leading-tight text-[#374151]">{card.subtitle}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-[#f2f4f7] bg-white p-5">
            <div className="mb-4">
              <h3 className="text-[15px] font-bold text-[#111827]">Style Suggestions</h3>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {styleSuggestions.map((item) => (
                <div
                  key={item.title}
                  className="flex h-[110px] flex-col items-center justify-center gap-3 rounded-[24px] border border-[#f2f4f7] bg-[#f9fafb] p-3 text-center shadow-sm"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[28px]">
                    {item.icon}
                  </div>
                  <p className="text-[12px] font-semibold leading-tight text-[#374151]">{item.title}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-[#f2f4f7] bg-white p-5">
            <h3 className="mb-3 text-[15px] font-bold text-[#111827]">Color Harmony</h3>
            <p className="mb-4 text-[12px] text-[#6b7280]">This color looks amazing on you!</p>
            <div className="flex gap-3">
              {colorSwatches.map((color) => (
                <span
                  key={color}
                  className="h-8 w-8 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-[#e5e7eb] bg-white px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSave}
            className="inline-flex items-center justify-center rounded-[18px] border border-[#f3f4f6] bg-white px-5 py-3 text-[14px] font-semibold text-[#111827] shadow-sm hover:border-[#ff3f6c] transition"
          >
            ❤️ Save
          </button>
          <button
            type="button"
            onClick={onTryAgain}
            className="inline-flex items-center justify-center rounded-[18px] border border-[#f3f4f6] bg-white px-5 py-3 text-[14px] font-semibold text-[#111827] shadow-sm hover:border-[#ff3f6c] transition"
          >
            🔄 Try Again
          </button>
          <button
            type="button"
            onClick={onShop}
            className="inline-flex items-center justify-center rounded-[18px] bg-[#ff3f6c] px-5 py-3 text-[14px] font-semibold text-white shadow-sm hover:bg-[#ff5a7f] transition"
          >
            🛍 Shop This Look
          </button>
        </div>
      </div>
    </div>
  );
}
