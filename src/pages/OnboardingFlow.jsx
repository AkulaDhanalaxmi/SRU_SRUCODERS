import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ChevronLeft, Clock3, Plus, LocateFixed, ArrowRight, Ruler, Shirt, Truck, UserRound } from "lucide-react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import api, { apiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import OnboardingAvatar from "../components/onboarding/OnboardingAvatar";

const STEPS = ["welcome", "height", "weight", "details", "address"];
const FIT_STEPS = ["height", "weight", "details"]; // the "X of 3" sub-flow

const SHAPES = ["Pear", "Hourglass", "Rectangle", "Apple", "Athletic"];
const FITS = ["Fitted", "Regular", "Relaxed", "Comfort"];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const STATES = ["Karnataka", "Maharashtra", "Delhi", "Telangana", "Tamil Nadu", "West Bengal", "Gujarat", "Uttar Pradesh"];

function Chip({ active, onClick, children, testId }) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${
        active
          ? "bg-[#FF3E6C] text-white border-[#FF3E6C] shadow-[0_4px_14px_rgba(255,62,108,0.35)] scale-[1.03]"
          : "border-gray-300 text-[#535766] hover:border-[#FF3E6C] hover:text-[#FF3E6C]"
      }`}
    >
      {children}
    </button>
  );
}

/* ---- Visual-only: slim gradient progress bar + percentage label ---- */
function ProgressBar({ step }) {
  const idx = FIT_STEPS.indexOf(step);
  if (idx < 0) return null;
  const pct = Math.round(((idx + 1) / FIT_STEPS.length) * 100);
  return (
    <div className="w-full max-w-xs mx-auto mt-3">
      <div className="flex items-center justify-center mb-1.5">
        <span className="text-[11px] font-bold text-[#282C3F] tracking-wide">Step {idx + 1} of {FIT_STEPS.length}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#FF3E6C] to-[#FF8FAB]"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>
      <div className="text-center mt-1">
        <span className="text-[10px] font-semibold text-[#FF3E6C]">{pct}% Complete</span>
      </div>
    </div>
  );
}

function TopBar({ step, onBack, onSkip }) {
  const showBack = step !== "welcome";
  return (
    <div className="flex items-center justify-between px-5 pt-6">
      {showBack ? (
        <button
          type="button"
          data-testid="onboarding-back-btn"
          onClick={onBack}
          className="h-9 w-9 rounded-full flex items-center justify-center bg-white/70 backdrop-blur-sm shadow-sm transition-opacity opacity-100"
        >
          <ChevronLeft size={20} className="text-[#282C3F]" />
        </button>
      ) : (
        /* Brand-neutral logo placeholder — swap "YourApp" for your real name/logo */
        <div className="flex items-center gap-1.5">
          <div className="h-7 w-7 rounded-lg bg-[#FF3E6C] flex items-center justify-center text-white font-extrabold text-xs">A</div>
          <span className="font-heading font-extrabold text-sm text-[#282C3F] tracking-tight">YourApp</span>
        </div>
      )}
      <div className="flex-1" />
      <button
        type="button"
        data-testid="onboarding-skip-btn"
        onClick={onSkip}
        className="text-sm font-bold text-[#3F424D] hover:text-[#FF3E6C] transition-colors"
      >
        Skip
      </button>
    </div>
  );
}

function BrSlider({ value, onChange, min, max, unit, testId }) {
  return (
    <div className="w-full">
      <SliderPrimitive.Root
        data-testid={testId}
        className="relative flex w-full touch-none select-none items-center h-8"
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200">
          <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-[#FF3E6C] to-[#FF8FAB]" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-7 w-7 rounded-full bg-white border-4 border-[#FF3E6C] shadow-[0_2px_8px_rgba(40,44,63,0.25)] focus-visible:outline-none cursor-grab active:cursor-grabbing" />
      </SliderPrimitive.Root>
      <div className="flex justify-between mt-1 text-xs text-[#7E818C] font-medium">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

const screenVariants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

/* ---- Visual-only: decorative sparkle/star icon ---- */
function Sparkle({ className, opacity = 0.5 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={{ opacity }}>
      <path
        d="M12 2c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6z"
        fill="#FF3E6C"
      />
    </svg>
  );
}

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState("welcome");
  const [busy, setBusy] = useState(false);

  const [fit, setFit] = useState({
    height_cm: 168,
    weight_kg: 60,
    body_shape: "",
    preferred_fit: "",
    clothing_size: "",
  });

  const [addr, setAddr] = useState({
    receiver: "",
    phone: "",
    pin: "",
    line1: "",
    city: "Bengaluru",
    state: "Karnataka",
    makeDefault: true,
  });

  const goHome = () => navigate("/");

  const skipEverything = async () => {
    setBusy(true);
    try {
      await api.post("/me/skip-fit-profile").catch(() => {});
      await refreshUser();
      goHome();
    } finally {
      setBusy(false);
    }
  };

  const skipAddressOnly = async () => {
    await refreshUser();
    goHome();
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const goToWeight = () => setStep("weight");
  const goToDetails = () => setStep("details");

  const saveFitProfile = async () => {
    if (!fit.body_shape || !fit.preferred_fit || !fit.clothing_size) {
      toast.error("Please select all three options to continue");
      return;
    }
    setBusy(true);
    try {
      await api.post("/me/fit-profiles", {
        name: "My Fit",
        height_cm: fit.height_cm,
        weight_kg: fit.weight_kg,
        body_shape: fit.body_shape,
        preferred_fit: fit.preferred_fit,
        clothing_size: fit.clothing_size,
        language: "en",
      });
      await refreshUser();
      toast.success("Fit profile saved!");
      setStep("address");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location services are not available on this device");
      return;
    }
    toast.info("Detecting your location...");
    navigator.geolocation.getCurrentPosition(
      () => toast.success("Location detected. Please confirm your PIN code."),
      () => toast.error("Couldn't detect location — enter your PIN code manually")
    );
  };

  const saveAddress = async () => {
    if (!addr.receiver || !addr.phone || !addr.pin || !addr.line1 || !addr.city || !addr.state) {
      toast.error("Please fill in all address fields");
      return;
    }
    setBusy(true);
    try {
      await api.post("/me/addresses", {
        label: "Home",
        receiver: addr.receiver,
        phone: addr.phone,
        line1: addr.line1,
        city: addr.city,
        state: addr.state,
        pin: addr.pin,
      });
      await refreshUser();
      toast.success("Address saved!");
      goHome();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-white flex flex-col overflow-hidden">
      {/* ---- Decorative background layer (visual only, non-interactive) ---- */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFF7FA] via-[#FFEAF2] to-white" />

        {/* large curved glow behind hero content */}
        <div className="absolute left-1/2 top-16 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[#FFBCD8] opacity-25 blur-3xl" />
        <div className="absolute left-1/2 top-24 h-[380px] w-[380px] -translate-x-1/2 rounded-full border border-[#FFD0E0] opacity-40" />

        {/* fashion line-art illustrations */}
        <svg className="absolute top-6 left-4 h-28 w-20 opacity-[0.15]" viewBox="0 0 64 96" fill="none" stroke="#FF3E6C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 16c0-6 4-10 8-10s8 4 8 10v16l12 28-8 8-12-14-12 14-8-8 12-28V16z" />
          <path d="M16 16h24" />
        </svg>
        <svg className="absolute top-10 right-6 h-20 w-20 opacity-[0.15]" viewBox="0 0 64 64" fill="none" stroke="#FF3E6C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 22h36v20a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6V22z" />
          <path d="M20 22V16a8 8 0 0 1 16 0v6" />
          <path d="M26 32h12" />
        </svg>
        <svg className="absolute left-6 bottom-24 h-20 w-20 opacity-[0.15]" viewBox="0 0 64 64" fill="none" stroke="#FF3E6C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="10" y="18" width="44" height="30" rx="6" />
          <path d="M18 18V12a6 6 0 0 1 12 0v6" />
          <path d="M36 18V12a6 6 0 0 1 12 0v6" />
          <path d="M16 26h32" />
        </svg>
        <svg className="absolute right-8 bottom-32 h-[72px] w-[72px] opacity-[0.15]" viewBox="0 0 64 64" fill="none" stroke="#FF3E6C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 34c0 8 6 14 14 14s14-6 14-14" />
          <path d="M22 34l4-10h12l4 10" />
          <path d="M26 24V16a6 6 0 0 1 12 0v8" />
        </svg>
        <svg className="absolute left-20 top-40 h-14 w-14 opacity-[0.15]" viewBox="0 0 32 32" fill="none" stroke="#FF3E6C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 2l3 6h-6l3-6z" />
          <path d="M8 10h16l-2 14H10L8 10z" />
          <path d="M10 10l2-2" />
          <path d="M22 10l-2-2" />
        </svg>
        <svg className="absolute right-20 top-36 h-16 w-16 opacity-[0.15]" viewBox="0 0 32 32" fill="none" stroke="#FF3E6C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 22l4-10h12l4 10" />
          <path d="M10 22V12h12v10" />
          <path d="M8 12l8-6 8 6" />
        </svg>
        {/* hanger, top center-left */}
        <svg className="absolute left-1/3 top-8 h-12 w-12 opacity-[0.13]" viewBox="0 0 32 32" fill="none" stroke="#FF3E6C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="16" cy="6" r="2" />
          <path d="M16 8v3" />
          <path d="M16 11L4 22h24L16 11z" />
          <path d="M9 22h14" />
        </svg>
        {/* heels, bottom right corner */}
        <svg className="absolute right-4 bottom-10 h-14 w-14 opacity-[0.13]" viewBox="0 0 32 32" fill="none" stroke="#FF3E6C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 20c0-4 3-8 8-8 3 0 4 2 6 2s3-1 4-1l2 3-2 8H8l-2-4z" />
          <path d="M8 24l-2 4h20l-1-3" />
        </svg>

        {/* scattered sparkles/stars */}
        <Sparkle className="absolute top-20 left-[38%] h-3 w-3" opacity={0.35} />
        <Sparkle className="absolute top-44 right-[30%] h-2.5 w-2.5" opacity={0.3} />
        <Sparkle className="absolute bottom-40 left-[20%] h-3.5 w-3.5" opacity={0.3} />
        <Sparkle className="absolute top-32 right-14 h-2 w-2" opacity={0.4} />
        <Sparkle className="absolute bottom-52 right-[22%] h-2.5 w-2.5" opacity={0.25} />

        <div className="absolute top-24 left-40 h-1.5 w-1.5 rounded-full bg-white opacity-50 shadow-[0_0_18px_rgba(255,255,255,0.6)]" />
        <div className="absolute top-40 right-32 h-1.5 w-1.5 rounded-full bg-white opacity-50 shadow-[0_0_18px_rgba(255,255,255,0.6)]" />
        <div className="absolute left-24 bottom-20 h-1.5 w-1.5 rounded-full bg-white opacity-50 shadow-[0_0_18px_rgba(255,255,255,0.6)]" />
        <div className="absolute right-16 top-14 h-1.5 w-1.5 rounded-full bg-white opacity-50 shadow-[0_0_18px_rgba(255,255,255,0.6)]" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 min-h-screen">
        <TopBar step={step} onBack={goBack} onSkip={skipEverything} />
        <ProgressBar step={step} />

        <div className="flex-1 flex flex-col px-6 pb-8 pt-4 max-w-3xl w-full mx-auto">
        <AnimatePresence mode="wait">
          {step === "welcome" && (
            <motion.div
              key="welcome"
              variants={screenVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col items-center justify-center text-center"
            >
              <div className="relative mb-9">
                <div className="absolute inset-0 m-auto h-72 w-72 rounded-full bg-[#FFBCD8] opacity-25 blur-3xl" />
                <div className="absolute inset-x-0 top-10 mx-auto h-36 w-36 rounded-full bg-white opacity-70 blur-2xl" />
                <div className="absolute inset-0 m-auto h-60 w-60 rounded-full border border-[#FFD0E0]" />
                <OnboardingAvatar className="relative mx-auto w-64 h-64 drop-shadow-[0_12px_24px_rgba(255,62,108,0.18)]" />
              </div>
              <h1 className="font-heading font-extrabold text-4xl text-[#282C3F] leading-snug max-w-xl">
                Create Your <span className="text-[#FF3E6C]">AI Fit Profile</span>
              </h1>
              <p className="text-base text-[#7E818C] mt-4 max-w-lg">
                Get personalized size recommendations and see how outfits look on you before you buy.
              </p>
              <p className="flex items-center justify-center gap-2 text-sm font-semibold text-[#FF3E6C] mt-4">
                <Clock3 size={15} /> Takes less than 60 seconds
              </p>
              <div className="mt-9 grid w-full gap-4 sm:grid-cols-3">
                <div className="rounded-[22px] border border-[#FFCFDF] bg-white/90 px-4 py-5 text-left shadow-[0_14px_30px_rgba(255,62,108,0.14)] hover:shadow-[0_18px_36px_rgba(255,62,108,0.2)] transition-shadow">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFDCE8] to-[#FF9EBE] text-[#FF3E6C] shadow-inner">
                    <Ruler size={20} strokeWidth={2.5} />
                  </div>
                  <p className="font-semibold text-sm text-[#282C3F] whitespace-nowrap">Perfect Size</p>
                  <p className="text-[15px] text-[#5B5E6B] mt-2 leading-relaxed">AI recommends your best fit based on your profile.</p>
                </div>
                <div className="rounded-[22px] border border-[#FFCFDF] bg-white/90 px-4 py-5 text-left shadow-[0_14px_30px_rgba(255,62,108,0.14)] hover:shadow-[0_18px_36px_rgba(255,62,108,0.2)] transition-shadow">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFDCE8] to-[#FF9EBE] text-[#FF3E6C] shadow-inner">
                    <Shirt size={20} fill="currentColor" strokeWidth={1.2} className="text-[#FF3E6C]" />
                  </div>
                  <p className="font-semibold text-sm text-[#282C3F] whitespace-nowrap">Virtual Try-On</p>
                  <p className="text-[15px] text-[#5B5E6B] mt-2 leading-relaxed">See how any outfit looks on you using AI try-on.</p>
                </div>
                <div className="rounded-[22px] border border-[#FFCFDF] bg-white/90 px-4 py-5 text-left shadow-[0_14px_30px_rgba(255,62,108,0.14)] hover:shadow-[0_18px_36px_rgba(255,62,108,0.2)] transition-shadow">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFDCE8] to-[#FF9EBE] text-[#FF3E6C] shadow-inner">
                    <Truck size={20} fill="currentColor" strokeWidth={1.2} className="text-[#FF3E6C]" />
                  </div>
                  <p className="font-semibold text-sm text-[#282C3F] whitespace-nowrap">BuyReady Confidence</p>
                  <p className="text-[15px] text-[#5B5E6B] mt-2 leading-relaxed">Get confidence with fit, product trust and delivery insights — all in one score.</p>
                </div>
              </div>
              <button
                data-testid="onboarding-get-started-btn"
                onClick={() => setStep("height")}
                className="group w-full max-w-sm mt-9 h-14 bg-[#FF3E6C] hover:bg-[#E6355F] text-white font-bold rounded-full text-base uppercase tracking-wide transition-all duration-200 shadow-[0_10px_24px_rgba(255,62,108,0.35)] hover:shadow-[0_16px_34px_rgba(255,62,108,0.5)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Create My Fit Profile
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
              <p className="text-[13px] text-[#7E818C] mt-3">🔒 Your data is private and secure with us.</p>
            </motion.div>
          )}

          {step === "height" && (
            <motion.div
              key="height"
              variants={screenVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col max-w-md mx-auto w-full"
            >
              <h1 className="font-heading font-extrabold text-2xl text-[#282C3F] mt-6 text-center">What is your height?</h1>
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="text-6xl font-heading font-extrabold text-[#FF3E6C] mb-10">
                  {fit.height_cm}
                  <span className="text-2xl align-top ml-1">cm</span>
                </div>
                <BrSlider
                  testId="onboarding-height-slider"
                  value={fit.height_cm}
                  onChange={(v) => setFit((f) => ({ ...f, height_cm: v }))}
                  min={140}
                  max={210}
                  unit="cm"
                />
              </div>
              <button
                data-testid="onboarding-height-next-btn"
                onClick={goToWeight}
                className="w-full bg-[#FF3E6C] hover:bg-[#E6355F] text-white font-bold py-3.5 rounded-full text-sm uppercase tracking-wide transition-colors shadow-[0_10px_24px_rgba(255,62,108,0.3)]"
              >
                Next
              </button>
            </motion.div>
          )}

          {step === "weight" && (
            <motion.div
              key="weight"
              variants={screenVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col max-w-md mx-auto w-full"
            >
              <h1 className="font-heading font-extrabold text-2xl text-[#282C3F] mt-6 text-center">What is your weight?</h1>
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="text-6xl font-heading font-extrabold text-[#FF3E6C] mb-10">
                  {fit.weight_kg}
                  <span className="text-2xl align-top ml-1">kg</span>
                </div>
                <BrSlider
                  testId="onboarding-weight-slider"
                  value={fit.weight_kg}
                  onChange={(v) => setFit((f) => ({ ...f, weight_kg: v }))}
                  min={35}
                  max={150}
                  unit="kg"
                />
              </div>
              <button
                data-testid="onboarding-weight-next-btn"
                onClick={goToDetails}
                className="w-full bg-[#FF3E6C] hover:bg-[#E6355F] text-white font-bold py-3.5 rounded-full text-sm uppercase tracking-wide transition-colors shadow-[0_10px_24px_rgba(255,62,108,0.3)]"
              >
                Next
              </button>
            </motion.div>
          )}

          {step === "details" && (
            <motion.div
              key="details"
              variants={screenVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col max-w-md mx-auto w-full"
            >
              <h1 className="font-heading font-extrabold text-2xl text-[#282C3F] mt-6 text-center">A little more about you</h1>
              <p className="text-sm text-[#7E818C] mt-2 mb-6 text-center">This helps us recommend your best size, every time.</p>

              <div className="flex-1 space-y-5 overflow-y-auto">
                <div className="rounded-2xl bg-white/85 border border-[#FFCFDF] p-6 shadow-[0_10px_26px_rgba(255,62,108,0.08)]">
                  <div className="flex items-center gap-2.5 mb-4">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FFE0EA] text-[#FF4F87]">
                      <UserRound size={16} strokeWidth={2} color="#FF4F87" />
                    </span>
                    <label className="text-sm font-bold text-[#282C3F] uppercase tracking-wider">Body type</label>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {SHAPES.map((s) => (
                      <Chip key={s} testId={`onboarding-shape-${s.toLowerCase()}`} active={fit.body_shape === s} onClick={() => setFit((f) => ({ ...f, body_shape: s }))}>
                        {s}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/85 border border-[#FFCFDF] p-6 shadow-[0_10px_26px_rgba(255,62,108,0.08)]">
                  <div className="flex items-center gap-2.5 mb-4">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FFE0EA] text-[#FF4F87]">
                      <Shirt size={16} strokeWidth={2} color="#FF4F87" />
                    </span>
                    <label className="text-sm font-bold text-[#282C3F] uppercase tracking-wider">Preferred fit</label>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {FITS.map((f2) => (
                      <Chip key={f2} testId={`onboarding-fit-${f2.toLowerCase()}`} active={fit.preferred_fit === f2} onClick={() => setFit((f) => ({ ...f, preferred_fit: f2 }))}>
                        {f2}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/85 border border-[#FFCFDF] p-6 shadow-[0_10px_26px_rgba(255,62,108,0.08)]">
                  <div className="flex items-center gap-2.5 mb-4">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FFE0EA] text-[#FF4F87]">
                      <Ruler size={16} strokeWidth={2} color="#FF4F87" />
                    </span>
                    <label className="text-sm font-bold text-[#282C3F] uppercase tracking-wider">Usual clothing size</label>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {SIZES.map((s) => (
                      <Chip key={s} testId={`onboarding-size-${s.toLowerCase()}`} active={fit.clothing_size === s} onClick={() => setFit((f) => ({ ...f, clothing_size: s }))}>
                        {s}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>

              <button
                data-testid="onboarding-details-next-btn"
                onClick={saveFitProfile}
                disabled={busy}
                className="group w-full mt-6 h-14 bg-[#FF3E6C] hover:bg-[#E6355F] text-white font-bold rounded-full text-sm uppercase tracking-wide transition-all disabled:opacity-60 shadow-[0_10px_24px_rgba(255,62,108,0.3)] hover:shadow-[0_16px_34px_rgba(255,62,108,0.45)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {busy ? "Saving..." : "Next"}
                {!busy && <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}
              </button>
            </motion.div>
          )}

          {step === "address" && (
            <motion.div
              key="address"
              variants={screenVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col max-w-md mx-auto w-full"
            >
              <h1 className="flex items-center gap-2 font-heading font-extrabold text-2xl text-[#282C3F] mt-6">
                <span className="bg-[#FF3E6C]/10 text-[#FF3E6C] rounded-full p-1.5"><Plus size={18} /></span>
                Add Delivery Address
              </h1>
              <p className="text-sm text-[#7E818C] mt-2 mb-6">So we can predict accurate delivery dates for you.</p>

              <div className="flex-1 space-y-4 overflow-y-auto">
                <input
                  data-testid="onboarding-address-name-input"
                  value={addr.receiver}
                  onChange={(e) => setAddr((a) => ({ ...a, receiver: e.target.value }))}
                  placeholder="Full Name"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#FF3E6C] focus:ring-2 focus:ring-[#FF3E6C]/15 bg-white/90 transition-all"
                />
                <input
                  data-testid="onboarding-address-phone-input"
                  value={addr.phone}
                  onChange={(e) => setAddr((a) => ({ ...a, phone: e.target.value }))}
                  placeholder="Mobile Number"
                  inputMode="numeric"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#FF3E6C] focus:ring-2 focus:ring-[#FF3E6C]/15 bg-white/90 transition-all"
                />
                <div>
                  <div className="flex gap-2">
                    <input
                      data-testid="onboarding-address-pin-input"
                      value={addr.pin}
                      onChange={(e) => setAddr((a) => ({ ...a, pin: e.target.value }))}
                      placeholder="PIN Code"
                      inputMode="numeric"
                      className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#FF3E6C] focus:ring-2 focus:ring-[#FF3E6C]/15 bg-white/90 transition-all"
                    />
                    <button
                      type="button"
                      data-testid="onboarding-detect-location-btn"
                      onClick={detectLocation}
                      className="flex items-center gap-1.5 px-3 text-xs font-semibold text-[#FF3E6C] whitespace-nowrap hover:bg-[#FF3E6C]/5 rounded-lg transition-colors"
                    >
                      <LocateFixed size={14} /> Detect Location
                    </button>
                  </div>
                </div>
                <textarea
                  data-testid="onboarding-address-line1-input"
                  value={addr.line1}
                  onChange={(e) => setAddr((a) => ({ ...a, line1: e.target.value }))}
                  placeholder="Address (House No., Building, Street)"
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#FF3E6C] focus:ring-2 focus:ring-[#FF3E6C]/15 bg-white/90 resize-none transition-all"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    data-testid="onboarding-address-city-input"
                    value={addr.city}
                    onChange={(e) => setAddr((a) => ({ ...a, city: e.target.value }))}
                    placeholder="City"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#FF3E6C] focus:ring-2 focus:ring-[#FF3E6C]/15 bg-white/90 transition-all"
                  />
                  <select
                    data-testid="onboarding-address-state-select"
                    value={addr.state}
                    onChange={(e) => setAddr((a) => ({ ...a, state: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#FF3E6C] focus:ring-2 focus:ring-[#FF3E6C]/15 bg-white/90 transition-all"
                  >
                    {STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-[#535766] cursor-pointer pt-1">
                  <input
                    data-testid="onboarding-address-default-checkbox"
                    type="checkbox"
                    checked={addr.makeDefault}
                    onChange={(e) => setAddr((a) => ({ ...a, makeDefault: e.target.checked }))}
                    className="accent-[#FF3E6C]"
                  />
                  Make this my default address
                </label>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  data-testid="onboarding-save-address-btn"
                  onClick={saveAddress}
                  disabled={busy}
                  className="w-full bg-[#FF3E6C] hover:bg-[#E6355F] text-white font-bold py-3.5 rounded-full text-sm uppercase tracking-wide transition-colors disabled:opacity-60 shadow-[0_10px_24px_rgba(255,62,108,0.3)]"
                >
                  {busy ? "Saving..." : "Save Address"}
                </button>
                <button
                  type="button"
                  data-testid="onboarding-skip-address-btn"
                  onClick={skipAddressOnly}
                  className="w-full text-sm font-semibold text-[#7E818C] hover:text-[#FF3E6C] py-1 transition-colors"
                >
                  I'll add this later
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}