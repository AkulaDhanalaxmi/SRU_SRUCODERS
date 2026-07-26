import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles,
  ShieldCheck,
  Truck,
  Ruler,
  ArrowRight,
  ArrowLeft,
  User,
  Heart,
  ShoppingBag,
  Smartphone,
  Lock,
  Eye,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import api, { apiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = ["Men", "Women", "Kids", "Home & Living", "Beauty", "Studio"];

const LANDING_FEATURES = [
  { icon: ShieldCheck, title: "AI BuyReady Analysis", subtitle: "Get trust, quality, fit & delivery insights" },
  { icon: Sparkles, title: "FitCheck AI", subtitle: "See how it looks on you before you buy" },
  { icon: Truck, title: "Trusted Delivery", subtitle: "Know your delivery date, always" },
  { icon: Ruler, title: "Easy Returns", subtitle: "Hassle free returns & exchanges" },
];

const ONBOARDING_STEPS = [
  {
    key: 2,
    label: "2/4",
    title: "FitCheck AI",
    subtitle: "See yourself before you buy.",
    bulletTitle: "AI Outfit Preview",
    bullets: [
      "See how the outfit looks on you",
      "Get the perfect size for your body",
      "Outfits that suit your unique shape",
      "Colours that match your tone",
      "Personalised style suggestions",
    ],
    heroLabel: "AI Outfit Preview",
    heroItems: [
      { label: "Fit Score", value: "92%", note: "Great Fit!" },
      { label: "Recommended Size", value: "M", note: "Regular Fit" },
      { label: "Stretch", value: "Medium", note: "" },
      { label: "Length", value: "Above Knee", note: "" },
    ],
  },
  {
    key: 3,
    label: "3/4",
    title: "Delivery You Can Trust",
    subtitle: "Know exactly when your order arrives.",
    bulletItems: [
      { title: "Reliable ETA", subtitle: "AI-predicted delivery date you can count on" },
      { title: "Fast Delivery", subtitle: "Faster options from nearby warehouses" },
      { title: "Nearby Warehouse", subtitle: "Shipped from the closest possible location" },
      { title: "Real-time Tracking", subtitle: "Track every step of your order journey" },
    ],
    heroLabel: "Your Delivery Journey",
    heroItems: [
      { status: "Order Confirmed", time: "10 July, 10:30 AM", subtitle: "Your order has been confirmed." },
      { status: "Packed", time: "10 July, 04:15 PM", subtitle: "Your order is packed and ready." },
      { status: "Shipped", time: "11 July, 09:20 AM", subtitle: "Your order has been shipped." },
      { status: "Out for Delivery", time: "15 July, 08:45 AM", subtitle: "Your order is out for delivery." },
    ],
  },
  {
    key: 4,
    label: "4/4",
    title: "Verified Before It Ships",
    subtitle: "We use AI to verify every order before it leaves the warehouse.",
    bulletItems: [
      { title: "AI Dispatch Verification", subtitle: "AI checks product, size, colour & brand before shipping" },
      { title: "Reduced Wrong Deliveries", subtitle: "Ensures you receive exactly what you ordered" },
      { title: "Better Customer Trust", subtitle: "Building trust with every verified order" },
      { title: "Lower Returns", subtitle: "Accurate orders mean fewer returns and a better experience" },
    ],
    heroLabel: "PackSure AI Verification",
    heroItems: [
      { title: "Scan & Identify", subtitle: "Seller scans the product QR code" },
      { title: "AI Product Check", subtitle: "AI verifies the product, colour, size & brand" },
      { title: "Tag & Quality Check", subtitle: "Brand tags, price tags & quality are validated" },
      { title: "Dispatch Approved", subtitle: "Order is verified and approved for shipping" },
    ],
  },
];

const LOGIN_FEATURES = [
  { title: "FitCheck AI", subtitle: "See how it fits you before you buy." },
  { title: "Delivery You Can Trust", subtitle: "Get accurate delivery dates and real-time tracking." },
  { title: "PackSure AI", subtitle: "Every order verified before it ships to reduce wrong deliveries." },
  { title: "Myntra Promise", subtitle: "Genuine products, easy returns and secure shopping." },
];

export default function AuthPage() {
  const navigate = useNavigate();
  const { loginSuccess } = useAuth();
  const [step, setStep] = useState(5);
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loginPersona, setLoginPersona] = useState("customer");

  const handleChange = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const goNext = () => setStep((current) => Math.min(5, current + 1));
  const goBack = () => setStep((current) => Math.max(1, current - 1));
  const goLoginPage = () => {
    setStep(5);
    setMode("login");
  };
  const goSignupPage = () => {
    setStep(5);
    setMode("signup");
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { data } = await api.post("/auth/forgot-password", { email: form.email });
        toast.success(data.message);
        setMode("login");
      } else if (mode === "signup") {
        const { data } = await api.post("/auth/register", form);
        loginSuccess(data.token, data.user, true);
        navigate("/onboarding");
      } else {
        const roleHint = loginPersona === "admin" ? "operator" : "customer";
        const { data } = await api.post("/auth/login", { email: form.email, password: form.password, remember, role_hint: roleHint });
        loginSuccess(data.token, data.user, remember);
        if (data.user.role && ["operator", "manager"].includes(data.user.role)) {
          navigate("/admin-landing");
        } else {
          navigate(data.user.fit_profile_done ? "/" : "/onboarding");
        }
      }
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setBusy(false);
    }
  };

  const isLanding = step === 1;
  const isOnboarding = step > 1 && step < 5;
  const isLogin = step === 5;

  const currentOnboarding = ONBOARDING_STEPS.find((item) => item.key === step);

  return (
    <div className="min-h-screen bg-[#fff8fb] text-slate-900">
      <main
        className={
          isLogin
            ? "flex min-h-screen w-full flex-col"
            : "mx-auto flex min-h-screen max-w-7xl flex-col px-4 sm:px-6 lg:px-8"
        }
      >
        {isOnboarding && currentOnboarding && (
          <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-8 rounded-[40px] bg-white/95 p-8 shadow-[0_30px_75px_rgba(252,229,244,0.55)]">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold uppercase tracking-[0.35em] text-[#FF3E6C]">{currentOnboarding.label}</div>
                <button type="button" onClick={goLoginPage} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-slate-900">
                  Skip <ArrowRight size={16} />
                </button>
              </div>
              <div className="space-y-4">
                <h1 className="text-5xl font-extrabold tracking-tight text-slate-950">{currentOnboarding.title}</h1>
                <p className="max-w-xl text-base leading-8 text-slate-600">{currentOnboarding.subtitle}</p>
              </div>

              {currentOnboarding.bullets ? (
                <div className="grid gap-4">
                  {currentOnboarding.bullets.map((item) => (
                    <div key={item} className="rounded-3xl border border-slate-200 bg-[#FFF5F9] p-5 text-slate-700 shadow-sm">
                      <div className="flex items-center gap-3 text-sm font-semibold text-slate-900">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFEBF4] text-[#D72D64]">•</span>
                        {item}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {currentOnboarding.bulletItems.map(({ title, subtitle }) => (
                    <div key={title} className="rounded-3xl border border-slate-200 bg-[#FFF5F9] p-5 shadow-sm">
                      <p className="font-semibold text-slate-900">{title}</p>
                      <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-8">
              <div className="rounded-[40px] bg-white p-6 shadow-[0_30px_70px_rgba(244,221,238,0.65)]">
                <div className="flex items-center justify-between pb-4">
                  <div>
                    <div className="inline-flex rounded-full bg-[#FFE8F3] px-3 py-2 text-sm font-semibold text-[#D72C73]">{currentOnboarding.heroLabel}</div>
                    <div className="mt-3 text-sm text-slate-600">Your Photo and AI Preview side-by-side.</div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#F8F1F7] px-4 py-3 text-sm font-semibold text-[#8E3E85] shadow-sm">
                    <ChevronRight size={18} />
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div className="rounded-[32px] border border-slate-200 bg-[#F8F5F8] p-4">
                    <p className="text-sm font-semibold text-slate-700">Your Photo</p>
                    <div className="mt-4 overflow-hidden rounded-[28px] bg-white p-3 shadow-sm">
                      <div className="relative">
                        <img src="/products/second.png" alt="Your photo" className="h-[320px] w-full object-cover" />
                        <button
                          aria-label="Onboarding left overlay"
                          type="button"
                          onClick={goBack}
                          className="absolute left-4 top-1/2 z-20 -translate-y-1/2 h-16 w-16 cursor-pointer rounded-full bg-transparent focus:outline-none"
                          style={{ opacity: 0 }}
                        />
                        <button
                          aria-label="Onboarding right overlay"
                          type="button"
                          onClick={step === 4 ? goLoginPage : goNext}
                          className="absolute right-4 top-1/2 z-20 -translate-y-1/2 h-16 w-16 cursor-pointer rounded-full bg-transparent focus:outline-none"
                          style={{ opacity: 0 }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[32px] border border-slate-200 bg-[#F8F5F8] p-4">
                    <p className="text-sm font-semibold text-slate-700">AI Preview</p>
                    <div className="mt-4 overflow-hidden rounded-[28px] bg-white p-3 shadow-sm">
                      <div className="relative">
                        <img src="/products/third.png" alt="AI preview" className="h-[320px] w-full object-cover" />
                        <button
                          aria-label="Onboarding left overlay"
                          type="button"
                          onClick={goBack}
                          className="absolute left-4 top-1/2 z-20 -translate-y-1/2 h-16 w-16 cursor-pointer rounded-full bg-transparent focus:outline-none"
                          style={{ opacity: 0 }}
                        />
                        <button
                          aria-label="Onboarding right overlay"
                          type="button"
                          onClick={step === 4 ? goLoginPage : goNext}
                          className="absolute right-4 top-1/2 z-20 -translate-y-1/2 h-16 w-16 cursor-pointer rounded-full bg-transparent focus:outline-none"
                          style={{ opacity: 0 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {step === 2 && (
                  <div className="mt-6 grid gap-3 rounded-[32px] border border-slate-200 bg-[#FEF5F8] p-5 sm:grid-cols-2">
                    {currentOnboarding.heroItems.map(({ label, value, note }) => (
                      <div key={label} className="rounded-3xl bg-white p-4 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
                        <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
                        {note && <p className="mt-1 text-sm text-emerald-600">{note}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {step > 2 && (
                  <div className="mt-6 grid gap-3 rounded-[32px] border border-slate-200 bg-[#FEF5F8] p-5">
                    {currentOnboarding.heroItems.map(({ title, subtitle }) => (
                      <div key={title} className="flex items-start gap-4 rounded-3xl bg-white p-4 shadow-sm">
                        <div className="mt-1 h-9 w-9 rounded-2xl bg-[#FFE8F4] text-[#D7005B] flex items-center justify-center font-semibold">✓</div>
                        <div>
                          <p className="font-semibold text-slate-900">{title}</p>
                          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_0.85fr]">
                <div className="rounded-[40px] bg-white p-6 shadow-[0_30px_70px_rgba(244,221,238,0.45)]">
                  <div className="flex items-center gap-3 text-sm font-semibold text-[#FF3E6C]"><span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF0F4] text-[#FF3E6C]">★</span> Why you&apos;ll love it</div>
                  <ul className="mt-4 space-y-3 text-sm text-slate-600">
                    <li>Lightweight fabric</li>
                    <li>Perfect for summer</li>
                    <li>Flattering fit</li>
                    <li>Trendy & stylish</li>
                  </ul>
                </div>
                <div className="rounded-[40px] bg-white p-6 shadow-[0_30px_70px_rgba(244,221,238,0.45)]">
                  <div className="text-sm font-semibold text-slate-900">Why BuyReady?</div>
                  <div className="mt-4 grid gap-4">
                    <div className="rounded-3xl border border-slate-200 bg-[#FFF7F9] p-4">
                      <p className="font-semibold text-slate-900">100% Privacy Guaranteed</p>
                      <p className="mt-2 text-sm text-slate-600">Your photos are safe and secure with us.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
                >
                  <ArrowLeft size={18} /> Back
                </button>
                <button
                  type="button"
                  onClick={step === 4 ? goLoginPage : goNext}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF3E6C] to-[#FF7C5E] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-200/60"
                >
                  {step === 4 ? "Get Started" : "Next"}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </section>
        )}

        {isLogin && (
          <section className="flex min-h-screen w-full flex-col lg:flex-row bg-gradient-to-br from-[#FFF8FB] via-[#FFF3F7] to-white">
            {/* LEFT: image, ~65% width on desktop, full width on mobile */}
            <div className="flex w-full lg:w-[65%] h-[320px] lg:h-screen items-center justify-center overflow-hidden">
              <img
                src="/products/login.png"
                alt="Myntra login"
                className="h-full w-full object-contain"
              />
            </div>

            {/* RIGHT: login card, ~35% width on desktop, full width on mobile */}
            <div className="flex w-full lg:w-[35%] min-h-[640px] lg:min-h-screen items-center justify-center p-8 lg:p-10">
              <div className="w-full max-w-[550px] rounded-[34px] bg-[#FFF8FB] p-14 shadow-2xl">
                <div className="flex flex-wrap items-center gap-3 rounded-full bg-[#FEF0F7] px-5 py-3.5 text-base font-semibold text-[#BF2868]">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className={`rounded-full px-4 py-2 ${mode === "login" ? "bg-[#FF3E6C] text-white" : "bg-white text-[#BF2868]"}`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className={`rounded-full px-4 py-2 ${mode === "signup" ? "bg-[#FF3E6C] text-white" : "bg-white text-[#6B7280]"}`}
                  >
                    Create Account
                  </button>
                  <div className="ml-1 flex rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200">
                    <button
                      type="button"
                      onClick={() => setLoginPersona("customer")}
                      className={`rounded-full px-3 py-2 text-sm ${loginPersona === "customer" ? "bg-[#FF3E6C] text-white" : "text-[#6B7280]"}`}
                    >
                      User
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginPersona("admin")}
                      className={`rounded-full px-3 py-2 text-sm ${loginPersona === "admin" ? "bg-[#FF3E6C] text-white" : "text-[#6B7280]"}`}
                    >
                      Admin
                    </button>
                  </div>
                </div>

                <form onSubmit={submit} className="mt-8 space-y-6">
                  {mode === "signup" && (
                    <label className="block text-base text-slate-600">
                      <span className="mb-2 block text-base font-semibold text-slate-900">Full Name</span>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={handleChange("name")}
                        className="w-full rounded-2xl bg-white px-5 py-4 text-base text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#FF3E6C]"
                        placeholder="John Doe"
                      />
                    </label>
                  )}
                  <label className="block text-base text-slate-600">
                    <span className="mb-2 block text-base font-semibold text-slate-900">Mobile Number or Email</span>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-5 inline-flex items-center text-slate-400"><Smartphone size={19} /></span>
                      <input
                        type="text"
                        required
                        value={form.email}
                        onChange={handleChange("email")}
                        className="w-full rounded-2xl bg-white px-14 py-4 text-base text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#FF3E6C]"
                        placeholder="Enter mobile number or email"
                      />
                    </div>
                  </label>
                  <label className="block text-base text-slate-600">
                    <span className="mb-2 block text-base font-semibold text-slate-900">Password</span>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-5 inline-flex items-center text-slate-400"><Lock size={19} /></span>
                      <input
                        type="password"
                        required={mode !== "forgot"}
                        value={form.password}
                        onChange={handleChange("password")}
                        className="w-full rounded-2xl bg-white px-14 py-4 text-base text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#FF3E6C]"
                        placeholder="Enter your password"
                      />
                      <button type="button" className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Eye size={19} />
                      </button>
                    </div>
                  </label>

                  {mode === "login" && (
                    <div className="flex items-center justify-between text-base text-slate-600">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#FF3E6C] focus:ring-[#FF3E6C]" />
                        Remember me
                      </label>
                      <button type="button" onClick={() => setMode("forgot")} className="text-[#FF3E6C] font-semibold">Forgot Password?</button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-2xl bg-gradient-to-r from-[#FF3E6C] to-[#FF7C5E] px-5 py-4 text-base font-semibold text-white shadow-lg shadow-pink-200/50 transition hover:opacity-95 disabled:opacity-60"
                  >
                    {busy ? "Please wait..." : mode === "login" ? "Login" : mode === "signup" ? "Create Account" : "Send Reset Link"}
                  </button>
                </form>

                <div className="mt-6 text-base text-slate-500">
                  Enter your email/phone and password to continue.
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}