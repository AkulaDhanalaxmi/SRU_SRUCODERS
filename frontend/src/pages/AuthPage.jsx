import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, ShieldCheck, Truck, Ruler } from "lucide-react";
import api, { apiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const HERO = "https://images.unsplash.com/photo-1607189200597-4d0923ef98c6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzl8MHwxfHNlYXJjaHw0fHxpbmRpYW4lMjB3b21hbiUyMGZhc2hpb24lMjBwb3J0cmFpdCUyMGNhc3VhbHxlbnwwfHx8fDE3ODQwNDU3NTh8MA&ixlib=rb-4.1.0&q=85";

export default function AuthPage() {
  const navigate = useNavigate();
  const { loginSuccess } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { data } = await api.post("/auth/forgot-password", { email: form.email });
        toast.success(data.message);
        setMode("login");
      } else if (mode === "signup") {
        const { data } = await api.post("/auth/register", form);
        loginSuccess(data.token, data.user, true);
        navigate("/fit-setup");
      } else {
        const { data } = await api.post("/auth/login", { email: form.email, password: form.password, remember });
        loginSuccess(data.token, data.user, remember);
        navigate(data.user.fit_profile_done ? "/" : "/fit-setup");
      }
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const demoLogin = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/auth/demo");
      loginSuccess(data.token, data.user, true);
      toast.success(`Welcome back, ${data.user.name.split(" ")[0]}!`);
      navigate("/");
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white md:grid md:grid-cols-2">
      <div className="relative h-52 md:h-screen md:sticky md:top-0 overflow-hidden">
        <img src={HERO} alt="BuyReady fashion" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#282C3F]/80 via-transparent to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 text-white">
          <h1 className="font-heading font-extrabold text-3xl md:text-4xl tracking-tight">
            Buy<span className="text-[#FF3E6C]">Ready</span>
          </h1>
          <p className="text-sm md:text-base mt-1 opacity-90">The Pre-Purchase Decision Layer — shop with total confidence.</p>
          <div className="hidden md:flex gap-5 mt-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5"><Ruler size={14} /> Perfect Fit</span>
            <span className="flex items-center gap-1.5"><Truck size={14} /> On-time Delivery</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> Trusted Sellers</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <h2 className="font-heading font-bold text-2xl text-[#282C3F]">
            {mode === "login" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset password"}
          </h2>
          <p className="text-sm text-[#7E818C] mt-1 mb-6">
            {mode === "forgot" ? "Enter your email and we'll send a reset link." : "Fit • Delivery • Trust • Value — in one decision."}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <input data-testid="auth-name-input" required value={form.name} onChange={set("name")} placeholder="Full name"
                className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm outline-none focus:border-[#FF3E6C]" />
            )}
            <input data-testid="auth-email-input" required type="email" value={form.email} onChange={set("email")} placeholder="Email address"
              className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm outline-none focus:border-[#FF3E6C]" />
            {mode !== "forgot" && (
              <input data-testid="auth-password-input" required type="password" value={form.password} onChange={set("password")} placeholder="Password"
                className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm outline-none focus:border-[#FF3E6C]" />
            )}
            {mode === "login" && (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-[#535766] cursor-pointer">
                  <input data-testid="remember-me-checkbox" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-[#FF3E6C]" />
                  Remember me
                </label>
                <button type="button" data-testid="forgot-password-link" onClick={() => setMode("forgot")} className="text-[#FF3E6C] font-semibold">Forgot password?</button>
              </div>
            )}
            <button data-testid="auth-submit-btn" disabled={busy} type="submit"
              className="w-full bg-[#FF3E6C] hover:bg-[#E6355F] text-white font-bold py-3 rounded-md text-sm uppercase tracking-wide transition-colors disabled:opacity-60">
              {busy ? "Please wait..." : mode === "login" ? "Login" : mode === "signup" ? "Sign Up" : "Send Reset Link"}
            </button>
          </form>

          {mode !== "forgot" && (
            <button data-testid="demo-login-btn" onClick={demoLogin} disabled={busy}
              className="w-full mt-3 border-2 border-[#FF3E6C] text-[#FF3E6C] font-bold py-3 rounded-md text-sm uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-[#FF3E6C]/5 transition-colors disabled:opacity-60">
              <Sparkles size={16} /> Demo Login (Priya)
            </button>
          )}

          <p className="text-sm text-[#535766] mt-6 text-center">
            {mode === "login" ? (
              <>New to BuyReady? <button data-testid="switch-to-signup" onClick={() => setMode("signup")} className="text-[#FF3E6C] font-bold">Create account</button></>
            ) : (
              <>Already have an account? <button data-testid="switch-to-login" onClick={() => setMode("login")} className="text-[#FF3E6C] font-bold">Login</button></>
            )}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
