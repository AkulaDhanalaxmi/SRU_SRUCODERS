import React from "react";

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

export default function AnalysisPanel({ isLoading, fitResult }) {
  const analysis = fitResult?.analysis || {};
  const overallScore = fitResult?.confidence ?? null;
  const fitDescription =
    resolveAnalysis(analysis, ANALYSIS_KEY_MAP.fit) ||
    "This outfit looks perfect on you! The fit, length and style suit your body type really well.";

  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const progress = overallScore !== null ? Math.min(Math.max(overallScore, 0), 100) : 0;
  const dashOffset = circumference - (progress / 100) * circumference;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-[22px] bg-gradient-to-r from-[#f3f4f6] to-[#fafafb] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-[#e6e6e6] bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="text-[18px] font-extrabold text-[#111827]">FitCheck Summary</h3>
          <span className="inline-flex items-center rounded-full bg-[#ecfdf5] px-3 py-1 text-[12px] font-semibold text-[#047857]">
            {getFitLabel(overallScore)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">Overall Fit Score</p>
            <p className="mt-1 text-[32px] font-extrabold text-[#059669]">
              {overallScore !== null ? `${overallScore}/100` : "--/100"}
            </p>
            <p className="mt-2 max-w-[220px] text-[13px] leading-relaxed text-[#6b7280]">{fitDescription}</p>
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

      <div className="rounded-[24px] border border-[#e6e6e6] bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-[15px] font-bold text-[#111827]">Style Suggestions</h4>
          <button type="button" className="text-[12px] font-semibold text-[#ff3f6c] hover:underline">
            View all
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {styleSuggestions.map((item) => (
            <div key={item.title} className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f9fafb] text-[20px]">
                {item.icon}
              </div>
              <p className="text-[11px] font-medium leading-tight text-[#374151]">{item.title}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-[#e6e6e6] bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
        <h4 className="mb-1 text-[15px] font-bold text-[#111827]">Color Harmony</h4>
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
  );
}
