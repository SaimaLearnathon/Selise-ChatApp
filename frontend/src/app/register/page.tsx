"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

const strengthConfig = [
  { label: "Weak", color: "bg-red-400" },
  { label: "Fair", color: "bg-amber-400" },
  { label: "Good", color: "bg-blue-400" },
  { label: "Strong", color: "bg-emerald-400" },
];

function getStrength(password: string): number {
  if (!password) return 0;
  let s = 0;
  if (password.length >= 8) s++;
  if (/[A-Z]/.test(password)) s++;
  if (/[0-9]/.test(password)) s++;
  if (/[^A-Za-z0-9]/.test(password)) s++;
  return s;
}

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const strength = getStrength(form.password);
  const strengthInfo = strengthConfig[strength - 1];
  const passwordMismatch = form.confirm.length > 0 && form.confirm !== form.password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (step === 1) { setStep(2); return; }
    setLoading(true);
    
    try {
      const response = await api.post('auth/register', { 
        name: form.name, 
        email: form.email, 
        password: form.password 
      });
      const data = response.data;
      
      if (data.success || data.data) {
        const token = data.data?.accessToken || data.accessToken;
        const user = data.data?.user || data.user;
        if (token && user) {
          setToken(token);
          setUser(user);
          router.push('/chat');
        } else {
          router.push('/');
        }
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err: unknown) {
      console.error(err);
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Server error during registration.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex relative overflow-hidden">

      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 px-16 py-12 border-r border-white/5 bg-slate-950/60 backdrop-blur-sm relative z-10">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9">
            <svg viewBox="0 0 40 40" fill="none">
              <rect x="4" y="4" width="14" height="14" rx="3" fill="#6EE7B7" />
              <rect x="22" y="4" width="14" height="14" rx="3" fill="#6EE7B7" opacity="0.5" />
              <rect x="4" y="22" width="14" height="14" rx="3" fill="#6EE7B7" opacity="0.3" />
              <rect x="22" y="22" width="14" height="14" rx="3" fill="#6EE7B7" />
            </svg>
          </div>
          <span className="text-xl font-black tracking-tight">Nexus</span>
        </div>

        {/* Hero */}
        <div className="flex-1 flex flex-col justify-center py-12">
          <h1 className="text-6xl font-black tracking-tighter leading-none mb-6">
            Start your<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              journey.
            </span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-xs">
            Create your free account and unlock everything Nexus has to offer.
          </p>
        </div>

        {/* Features */}
        <div className="flex flex-col gap-3">
          {[
            { icon: "🔒", title: "Bank-grade Security", desc: "Your data encrypted at rest and in transit" },
            { icon: "⚡", title: "Lightning Fast", desc: "Sub-100ms response times globally" },
            { icon: "🌍", title: "Global Access", desc: "Available in 150+ countries worldwide" },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-4 p-4 bg-slate-900 border border-white/5 rounded-2xl">
              <span className="text-xl">{f.icon}</span>
              <div>
                <div className="font-semibold text-sm mb-0.5">{f.title}</div>
                <div className="text-slate-500 text-xs">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-md bg-slate-900 border border-white/5 rounded-3xl p-8 shadow-2xl">

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-7">
            {[
              { n: 1, label: "Your Info" },
              { n: 2, label: "Security" },
            ].map((s, i) => (
              <div key={s.n} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 transition-all ${
                  step > s.n
                    ? "bg-emerald-400/20 text-emerald-400 border border-emerald-500/40"
                    : step === s.n
                    ? "bg-emerald-400 text-slate-950"
                    : "bg-slate-800 text-slate-500 border border-white/5"
                }`}>
                  {step > s.n ? (
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : s.n}
                </div>
                <span className={`text-xs font-medium ${step >= s.n ? "text-slate-300" : "text-slate-600"}`}>
                  {s.label}
                </span>
                {i < 1 && (
                  <div className="flex-1 h-px mx-1 bg-white/5 relative overflow-hidden">
                    <div className={`absolute inset-y-0 left-0 bg-emerald-400 transition-all duration-500 ${step > 1 ? "w-full" : "w-0"}`} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight mb-1">
              {step === 1 ? "Create Account" : "Set Password"}
            </h2>
            <p className="text-slate-400 text-sm">
              {step === 1 ? (
                <>Already have an account?{" "}<Link href="/" className="text-emerald-400 font-semibold hover:underline">Sign in</Link></>
              ) : (
                "Choose a strong password to protect your account."
              )}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {step === 1 ? (
              <>
                {/* Full Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
                  <div className="flex items-center bg-slate-800 border border-white/5 rounded-xl focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                    <span className="pl-3 text-slate-500">
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="10" cy="7" r="3" strokeLinecap="round" />
                        <path d="M3 17c0-3.3 3.1-6 7-6s7 2.7 7 6" strokeLinecap="round" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      required
                      className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder-slate-600 text-sm px-3 py-3"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
                  <div className="flex items-center bg-slate-800 border border-white/5 rounded-xl focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                    <span className="pl-3 text-slate-500">
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2.5 6.5l7.5 5 7.5-5M3 5h14a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      required
                      className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder-slate-600 text-sm px-3 py-3"
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 text-slate-600 text-xs">
                  <div className="flex-1 h-px bg-white/5" />
                  or sign up with
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                {/* Social */}
                <div className="flex gap-3">
                  <button type="button" className="flex-1 flex items-center justify-center gap-2 bg-slate-800 border border-white/5 hover:border-emerald-500/40 hover:bg-emerald-500/5 text-slate-300 text-sm rounded-xl py-2.5 transition-all">
                    <svg viewBox="0 0 24 24" className="w-4 h-4">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google
                  </button>
                  <button type="button" className="flex-1 flex items-center justify-center gap-2 bg-slate-800 border border-white/5 hover:border-emerald-500/40 hover:bg-emerald-500/5 text-slate-300 text-sm rounded-xl py-2.5 transition-all">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    GitHub
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                  <div className="flex items-center bg-slate-800 border border-white/5 rounded-xl focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                    <span className="pl-3 text-slate-500">
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="4" y="8" width="12" height="9" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M7 8V6a3 3 0 016 0v2" strokeLinecap="round" />
                      </svg>
                    </span>
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      required
                      className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder-slate-600 text-sm px-3 py-3"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="pr-3 text-slate-500 hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M1.5 10s2.5-6 8.5-6 8.5 6 8.5 6-2.5 6-8.5 6-8.5-6-8.5-6z" strokeLinecap="round" />
                        <circle cx="10" cy="10" r="2.5" />
                      </svg>
                    </button>
                  </div>

                  {/* Strength bar */}
                  {form.password && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-1 flex-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                              i <= strength ? strengthInfo?.color : "bg-slate-800"
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`text-xs font-semibold min-w-[40px] ${
                        strength === 1 ? "text-red-400"
                        : strength === 2 ? "text-amber-400"
                        : strength === 3 ? "text-blue-400"
                        : "text-emerald-400"
                      }`}>
                        {strengthInfo?.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirm Password</label>
                  <div className={`flex items-center bg-slate-800 border rounded-xl focus-within:ring-2 transition-all ${
                    passwordMismatch
                      ? "border-red-500/60 focus-within:ring-red-500/20"
                      : "border-white/5 focus-within:border-emerald-500 focus-within:ring-emerald-500/20"
                  }`}>
                    <span className="pl-3 text-slate-500">
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                        <rect x="4" y="8" width="12" height="9" rx="2" strokeLinecap="round" />
                        <path d="M7 8V6a3 3 0 016 0v2" strokeLinecap="round" />
                      </svg>
                    </span>
                    <input
                      type="password"
                      placeholder="Repeat password"
                      value={form.confirm}
                      onChange={(e) => update("confirm", e.target.value)}
                      required
                      className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder-slate-600 text-sm px-3 py-3"
                    />
                  </div>
                  {passwordMismatch && (
                    <p className="text-red-400 text-xs mt-0.5">Passwords don&apos;t match</p>
                  )}
                </div>

                {/* Terms */}
                <label className="flex items-start gap-2.5 text-sm text-slate-400 cursor-pointer leading-relaxed">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="accent-emerald-400 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                  />
                  I agree to the{" "}
                  <Link href="#" className="text-emerald-400 hover:underline">Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="#" className="text-emerald-400 hover:underline">Privacy Policy</Link>
                </label>
              </>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || (step === 2 && (!agreed || passwordMismatch || !form.password))}
              className="flex items-center justify-center gap-2 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-base rounded-xl py-3 mt-1 transition-all group"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <>
                  {step === 1 ? "Continue" : "Create Account"}
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 10h12M10 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>

            {/* Back */}
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-slate-500 hover:text-slate-300 text-sm text-center transition-colors py-1"
              >
                ← Back to previous step
              </button>
            )}

          </form>
        </div>
      </div>
    </div>
  );
}