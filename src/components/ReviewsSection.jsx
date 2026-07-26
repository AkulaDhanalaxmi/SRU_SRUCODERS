import { useEffect, useState } from "react";
import { Star, ThumbsUp, ThumbsDown, AlertCircle, MapPin } from "lucide-react";
import api from "../lib/api";

export const ReviewsSection = ({ productId }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/products/${productId}/reviews`).then(({ data }) => setData(data));
  }, [productId]);

  if (!data) return <div className="h-44 rounded-[28px] bg-[#f8fafc] animate-pulse mt-8" />;

  return (
    <section data-testid="reviews-section" className="mt-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#52606D]">Customer reviews</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#111827]">Trusted by shoppers</h2>
          <p className="mt-1 max-w-2xl text-sm text-[#525962]">Real buyer feedback, ratings, and photos to help you decide with confidence.</p>
        </div>
        <div className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-sm sm:w-[280px]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6b7280]">Sentiment</p>
              <p className="mt-2 text-3xl font-extrabold text-[#047857]">{data.summary.positive_percent}%</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ecfdf5] text-[#047857]">
              <ThumbsUp size={20} />
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-[#f8faf9] p-3 text-sm text-[#334155]">
            {data.summary.positive}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[28px] border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#ecfdf5] text-[#047857]">
              <ThumbsUp size={16} />
            </span>
            Positive highlights
          </div>
          <p className="mt-3 text-sm leading-6 text-[#475569]">{data.summary.positive}</p>
        </div>
        <div className="rounded-[28px] border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#fff1f2] text-[#d92d20]">
              <ThumbsDown size={16} />
            </span>
            Areas to note
          </div>
          <p className="mt-3 text-sm leading-6 text-[#475569]">{data.summary.negative}</p>
          {data.summary.complaints.length > 0 && (
            <p className="mt-3 text-sm text-[#6b7280]">Common mentions: {data.summary.complaints.join(" • ")}</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-[#e5e7eb] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#111827]">Review highlights</p>
            <p className="text-xs text-[#64748b]">Latest verified buyer experiences</p>
          </div>
          <div className="text-right text-xs text-[#64748b]">{data.reviews.length} reviews</div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-[#e2e8f0]">
          <div className="h-full rounded-full bg-[#34d399]" style={{ width: `${data.summary.positive_percent}%` }} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {data.reviews.slice(0, 6).map((r) => (
          <article key={r.id} data-testid={`review-${r.id}`} className="rounded-[28px] border border-[#e5e7eb] bg-[#fff] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${r.rating >= 4 ? "bg-[#dcfce7] text-[#047857]" : "bg-[#fef3c7] text-[#b45309]"}`}>
                {r.rating} <Star size={10} className="text-current" />
              </span>
              <span className="text-sm font-semibold text-[#111827]">{r.reviewer}</span>
              <span className="text-xs text-[#64748b] flex items-center gap-1"><MapPin size={10} />{r.region}</span>
              {r.size_bought && <span className="text-xs text-[#64748b]">• Size {r.size_bought}</span>}
            </div>
            <p className="mt-3 text-sm leading-6 text-[#475569]">{r.text}</p>
            {r.photos.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {r.photos.map((p, i) => (
                  <img key={i} src={p} alt={`review photo ${i + 1}`} className="h-20 w-full rounded-2xl object-cover bg-[#f8fafc]" />
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};
