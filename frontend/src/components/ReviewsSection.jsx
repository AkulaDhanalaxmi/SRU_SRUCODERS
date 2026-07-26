import { useEffect, useState } from "react";
import { Star, ThumbsUp, ThumbsDown, AlertCircle, MapPin } from "lucide-react";
import api from "../lib/api";

export const ReviewsSection = ({ productId }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/products/${productId}/reviews`).then(({ data }) => setData(data));
  }, [productId]);

  if (!data) return <div className="h-40 bg-gray-50 rounded-xl animate-pulse mt-8" />;

  return (
    <section data-testid="reviews-section" className="mt-10">
      <h2 className="font-heading font-bold text-lg text-[#282C3F] mb-4">Customer Reviews ({data.reviews.length})</h2>

      <div className="border border-gray-200 rounded-xl p-4 mb-5 bg-[#F5F5F6]/50">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7E818C] mb-3">AI Review Summary</p>
        <div className="space-y-2.5">
          <div className="flex items-start gap-2"><ThumbsUp size={14} className="text-[#03A685] shrink-0 mt-0.5" /><p className="text-xs text-[#282C3F]">{data.summary.positive}</p></div>
          <div className="flex items-start gap-2"><ThumbsDown size={14} className="text-[#FF3E6C] shrink-0 mt-0.5" /><p className="text-xs text-[#282C3F]">{data.summary.negative}</p></div>
          {data.summary.complaints.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-[#535766]">Common mentions: {data.summary.complaints.join(" • ")}</p>
            </div>
          )}
        </div>
        <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-[#03A685] rounded-full" style={{ width: `${data.summary.positive_percent}%` }} />
        </div>
        <p className="text-[10px] text-[#7E818C] mt-1.5">{data.summary.positive_percent}% positive sentiment</p>
      </div>

      <div className="space-y-4">
        {data.reviews.slice(0, 6).map((r) => (
          <div key={r.id} data-testid={`review-${r.id}`} className="border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-0.5 text-[10px] font-bold text-white rounded px-1.5 py-0.5 ${r.rating >= 4 ? "bg-[#03A685]" : "bg-amber-500"}`}>
                {r.rating} <Star size={8} className="fill-white" />
              </span>
              <span className="text-xs font-semibold text-[#282C3F]">{r.reviewer}</span>
              <span className="text-[10px] text-[#7E818C] flex items-center gap-0.5"><MapPin size={9} /> {r.region}</span>
              {r.size_bought && <span className="text-[10px] text-[#7E818C]">• Bought size {r.size_bought}</span>}
            </div>
            <p className="text-xs text-[#535766] mt-1.5 leading-relaxed">{r.text}</p>
            {r.photos.length > 0 && (
              <div className="flex gap-2 mt-2">
                {r.photos.map((p, i) => <img key={i} src={p} alt="review" className="w-14 h-14 rounded-lg object-cover bg-[#F5F5F6]" />)}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
