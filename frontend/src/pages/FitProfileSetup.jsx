import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Ruler } from "lucide-react";
import api, { apiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const SHAPES = ["Pear", "Hourglass", "Rectangle", "Apple", "Athletic"];
const FITS = ["Fitted", "Regular", "Relaxed", "Comfort"];
const LANGS = [{ v: "en", l: "English" }, { v: "hi", l: "हिंदी" }, { v: "te", l: "తెలుగు" }];

export default function FitProfileSetup() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [form, setForm] = useState({ name: "My Fit", height_cm: 160, weight_kg: 55, body_shape: "Pear", preferred_fit: "Regular", language: "en" });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api.post("/me/fit-profiles", form);
      await refreshUser();
      toast.success("Fit profile saved! You'll get personalised size recommendations.");
      navigate("/");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    await api.post("/me/skip-fit-profile").catch(() => {});
    await refreshUser();
    navigate("/");
  };

  const Chip = ({ active, onClick, children, testId }) => (
    <button data-testid={testId} onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${active ? "bg-[#FF3E6C] text-white border-[#FF3E6C]" : "border-gray-300 text-[#535766] hover:border-[#FF3E6C]"}`}>
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-[#FF3E6C]/10 p-2.5 rounded-full"><Ruler className="text-[#FF3E6C]" size={22} /></div>
          <h1 className="font-heading font-bold text-2xl text-[#282C3F]">Set up your Fit Profile</h1>
        </div>
        <p className="text-sm text-[#7E818C] mb-8">2 minutes now = perfect sizes forever. We use this to recommend your best size on every product.</p>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#535766] uppercase tracking-wider">Height (cm)</label>
              <input data-testid="fit-height-input" type="number" value={form.height_cm}
                onChange={(e) => setForm({ ...form, height_cm: +e.target.value })}
                className="w-full mt-1.5 border border-gray-300 rounded-md px-4 py-3 text-sm outline-none focus:border-[#FF3E6C]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#535766] uppercase tracking-wider">Weight (kg)</label>
              <input data-testid="fit-weight-input" type="number" value={form.weight_kg}
                onChange={(e) => setForm({ ...form, weight_kg: +e.target.value })}
                className="w-full mt-1.5 border border-gray-300 rounded-md px-4 py-3 text-sm outline-none focus:border-[#FF3E6C]" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#535766] uppercase tracking-wider">Body shape</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SHAPES.map((s) => <Chip key={s} testId={`shape-${s.toLowerCase()}`} active={form.body_shape === s} onClick={() => setForm({ ...form, body_shape: s })}>{s}</Chip>)}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#535766] uppercase tracking-wider">Preferred fit</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {FITS.map((f) => <Chip key={f} testId={`fit-${f.toLowerCase()}`} active={form.preferred_fit === f} onClick={() => setForm({ ...form, preferred_fit: f })}>{f}</Chip>)}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#535766] uppercase tracking-wider">Voice language</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {LANGS.map((l) => <Chip key={l.v} testId={`lang-${l.v}`} active={form.language === l.v} onClick={() => setForm({ ...form, language: l.v })}>{l.l}</Chip>)}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-10">
          <button data-testid="fit-skip-btn" onClick={skip} className="flex-1 border border-gray-300 text-[#535766] font-bold py-3 rounded-md text-sm uppercase hover:bg-gray-50 transition-colors">Skip for now</button>
          <button data-testid="fit-save-btn" onClick={save} disabled={busy} className="flex-1 bg-[#FF3E6C] hover:bg-[#E6355F] text-white font-bold py-3 rounded-md text-sm uppercase transition-colors disabled:opacity-60">
            {busy ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
