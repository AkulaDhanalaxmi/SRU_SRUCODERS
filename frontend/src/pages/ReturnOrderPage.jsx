import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Camera, FileText, RotateCcw, ShieldAlert, ShieldCheck, X } from "lucide-react";
import api, { apiError } from "../lib/api";
import { Header } from "../components/Header";
import { TrustStrip } from "../components/TrustStrip";

export default function ReturnOrderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [issueType, setIssueType] = useState("misproduct");
  const [reason, setReason] = useState("");
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const loadOrder = useCallback(() => {
    api.get(`/orders/${id}`).then(({ data }) => setOrder(data)).catch(() => setOrder(null));
  }, [id]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const submitReturn = async () => {
    setError(null);
    if (issueType === "misproduct" && !photo) {
      setError("Please upload a photo of the product you received so we can verify the return.");
      return;
    }

    const form = new FormData();
    form.append("issue_type", issueType);
    if (reason) form.append("reason", reason);
    if (photo) form.append("user_image", photo);

    try {
      setSubmitting(true);
      const { data } = await api.post(`/orders/${id}/return`, form);
      setResult(data);
      loadOrder();
      toast.success(data.accepted ? "Return request submitted." : "Return request was rejected.");
    } catch (e) {
      setError(apiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <button type="button" onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-[#535766] text-xs font-semibold mb-6">
          <ArrowLeft size={14} /> Back to order
        </button>

        <div className="border border-gray-200 rounded-3xl p-5 mb-6">
          <div className="flex items-start gap-4">
            <img src={order.items[0].image} alt="Ordered item" className="w-20 h-24 rounded-2xl object-cover bg-[#F5F5F6]" />
            <div className="flex-1">
              <p className="text-sm font-bold">{order.items[0].brand}</p>
              <p className="text-xs text-[#7E818C] mt-1">{order.items[0].name}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#535766] mt-3">Order ID {order.id}</p>
              <p className="text-[11px] text-[#7E818C] mt-1">Delivered on {new Date(order.timeline.find((t) => t.stage === "delivered")?.at || order.ordered_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>
        </div>

        <div className="border border-[#FF3E6C]/20 bg-[#FFF1F5] rounded-3xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <ShieldAlert size={18} className="text-[#FF3E6C]" />
            <p className="text-sm font-semibold text-[#282C3F]">Return verification powered by PackGuard</p>
          </div>
          <p className="text-xs text-[#7E818C]">Upload an image of the item you received. We will compare it with the packed order/QR verification data and tell you whether the return is accepted.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#535766]">Why are you returning?</p>
            {[
              { value: "size", label: "Size issue" },
              { value: "misproduct", label: "Wrong product delivered" },
            ].map((option) => (
              <button key={option.value} type="button" onClick={() => setIssueType(option.value)}
                className={`w-full text-left rounded-2xl border p-4 ${issueType === option.value ? "border-[#FF3E6C] bg-[#FFEBF0]" : "border-gray-200 bg-white"}`}>
                <p className="text-sm font-semibold">{option.label}</p>
                <p className="text-[11px] text-[#7E818C] mt-1">{option.value === "size" ? "Accepted automatically if item is otherwise correct." : "Upload a photo so we can verify the delivered item."}</p>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#535766] mb-2">Tell us more</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Example: delivered the wrong color or the fit is too tight"
              className="w-full min-h-[120px] rounded-3xl border border-gray-200 p-4 text-sm text-[#282C3F]" />
          </div>

          {issueType === "misproduct" && (
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#535766]">Upload a photo</label>
              <div className="rounded-3xl border border-dashed border-gray-200 p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Upload item image</p>
                  <p className="text-[11px] text-[#7E818C] mt-1">We compare this with the QR-verified packed order.</p>
                </div>
                <label className="inline-flex items-center gap-2 rounded-full bg-[#FF3E6C] px-4 py-2 text-xs font-semibold text-white cursor-pointer">
                  <Camera size={14} /> Browse
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
                </label>
              </div>
              {photo && <p className="text-[11px] text-[#03A685]">Selected: {photo.name}</p>}
            </div>
          )}

          {error && <p className="text-[12px] text-rose-600">{error}</p>}

          <div className="grid gap-3">
            <button type="button" onClick={submitReturn} disabled={submitting}
              className="w-full rounded-3xl bg-[#FF3E6C] py-3 text-xs font-semibold uppercase text-white disabled:opacity-60">
              {submitting ? "Submitting..." : "Submit return request"}
            </button>
            <button type="button" onClick={() => navigate(-1)}
              className="w-full rounded-3xl border border-gray-200 py-3 text-xs font-semibold uppercase text-[#535766]">
              Cancel
            </button>
          </div>

          {result && (
            <div className={`rounded-3xl p-5 ${result.accepted ? "bg-[#ECFDF5] border border-[#A7F3D0]" : "bg-[#FEF3F2] border border-[#FEB2B2]"}`}>
              <div className="flex items-center gap-2 mb-3">
                {result.accepted ? <ShieldCheck size={18} className="text-[#059669]" /> : <X size={18} className="text-[#B91C1C]" />}
                <p className="text-sm font-semibold">{result.accepted ? "Return available" : "Return not available"}</p>
              </div>
              <p className="text-xs text-[#334155]">{result.accepted ? "Your return has been accepted and pickup will be scheduled." : (result.verification_result?.reason || "The item does not match the packed order.")}</p>
              {result.verification_result?.mismatchReasons?.length > 0 && (
                <p className="text-[11px] text-[#475569] mt-3">Mismatch detected: {result.verification_result.mismatchReasons.join(", ")}</p>
              )}
            </div>
          )}
        </div>
      </main>
      <TrustStrip />
    </div>
  );
}
