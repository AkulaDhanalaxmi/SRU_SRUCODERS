import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Volume2, Square } from "lucide-react";
import { BottomSheet } from "../BottomSheet";

const TABS = [{ v: "fit", l: "Fit" }, { v: "delivery", l: "Delivery" }, { v: "trust", l: "Trust" }, { v: "value", l: "Worth Buying" }];
const LANGS = [{ v: "en", l: "EN", code: "en-IN" }, { v: "hi", l: "हिं", code: "hi-IN" }, { v: "te", l: "తె", code: "te-IN" }];

export const WhySheet = ({ open, onClose, evaluation }) => {
  const [tab, setTab] = useState("fit");
  const [lang, setLang] = useState("en");
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef(null);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  useEffect(() => { if (!open) { window.speechSynthesis?.cancel(); setSpeaking(false); } }, [open]);

  if (!evaluation) return null;
  const text = evaluation.why?.[tab]?.[lang] || "";

  const speak = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANGS.find((l) => l.v === lang)?.code || "en-IN";
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Why Is This Recommended?" testId="why-sheet">
      <div className="flex border-b border-gray-200 mb-4">
        {TABS.map((t) => (
          <button key={t.v} data-testid={`why-tab-${t.v}`} onClick={() => setTab(t.v)}
            className={`relative flex-1 pb-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${tab === t.v ? "text-[#FF3E6C]" : "text-[#7E818C]"}`}>
            {t.l}
            {tab === t.v && <motion.div layoutId="why-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF3E6C]" />}
          </button>
        ))}
      </div>

      <motion.p key={tab + lang} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        data-testid="why-summary-text" className="text-sm text-[#282C3F] leading-relaxed min-h-[80px]">
        {text}
      </motion.p>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        <div className="flex gap-1.5">
          {LANGS.map((l) => (
            <button key={l.v} data-testid={`voice-lang-${l.v}`} onClick={() => { setLang(l.v); window.speechSynthesis?.cancel(); setSpeaking(false); }}
              className={`w-9 h-9 rounded-full text-xs font-bold border transition-colors ${lang === l.v ? "bg-[#282C3F] text-white border-[#282C3F]" : "border-gray-300 text-[#535766]"}`}>
              {l.l}
            </button>
          ))}
        </div>
        <button data-testid="voice-play-btn" onClick={speak}
          className={`flex items-center gap-2 font-bold text-xs uppercase rounded-full px-5 py-2.5 transition-colors ${speaking ? "bg-[#282C3F] text-white" : "bg-[#FF3E6C] text-white hover:bg-[#E6355F]"}`}>
          {speaking ? <><Square size={13} /> Stop</> : <><Volume2 size={14} /> Listen</>}
        </button>
      </div>
    </BottomSheet>
  );
};
