"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMO_ACCOUNTS } from "@/lib/seed";
import { useStore } from "@/store/useStore";
import { Avatar, cn } from "@/components/ui";

const EASE = [0.22, 1, 0.36, 1] as const;
const HERO_IMG = "https://images.pexels.com/photos/5327649/pexels-photo-5327649.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, clinicians } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = () => {
    setError(null);
    setBusy(true);
    const res = signIn(email, password);
    if (!res.ok) {
      setBusy(false);
      setError(res.error ?? "Unable to sign in.");
      return;
    }
    /* Give the button a brief press beat, then enter */
    window.setTimeout(() => router.push("/app"), 120);
  };

  return (
    <div className="grid min-h-screen bg-slate-900 lg:grid-cols-[1.12fr_1fr]">
      {/* ------- Visual panel ------- */}
      <div className="relative hidden overflow-hidden lg:block">
        <motion.img
          initial={{ scale: 1.14, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: EASE }}
          src={HERO_IMG}
          alt="GPs coordinating their rota"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-slate-900/40 to-slate-950" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-950/45" />
        <div className="pointer-events-none absolute -left-24 bottom-24 size-[380px] rounded-full bg-teal-500/15 blur-[130px]" />

        <div className="relative flex h-full flex-col justify-between p-11">
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <Link href="/" className="inline-flex items-center gap-2.5 text-paper/75 transition hover:text-teal-300">
              <span className="inline-flex size-9 items-center justify-center rounded-xl border border-paper/20 backdrop-blur">
                <ArrowLeft className="size-4" />
              </span>
              <span className="text-[13px] font-semibold tracking-wide">Back to site</span>
            </Link>
          </motion.div>

          <div className="max-w-md">
            <motion.h1
              initial={{ opacity: 0, y: 34 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: EASE }}
              className="font-display text-5xl font-medium leading-[1.04] tracking-tight text-paper"
            >
              The whole rota,
              <br />
              <span className="italic text-teal-300">signed in</span> and
              <br />
              synchronised.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.4, ease: EASE }}
              className="mt-5 max-w-sm text-[14.5px] leading-relaxed text-paper/65"
            >
              Leave balances, rolling session quotas, cover radar and the locum ledger — one
              authenticated seat at a time.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.7 }}
              className="mt-9 flex flex-wrap gap-2.5"
            >
              {[
                ["On Track", "bg-emerald-400/15 text-emerald-300 border-emerald-300/20"],
                ["At Risk — Deficit", "bg-rose-500/20 text-[#FECDD3] border-[#FECDD3]/20"],
                ["Surplus — Overworking", "bg-teal-400/15 text-teal-300 border-teal-300/25"],
              ].map(([label, cls]) => (
                <span key={label} className={cn("rounded-full border px-3.5 py-1.5 text-[11px] font-bold", cls)}>
                  {label}
                </span>
              ))}
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 1 }}
            className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/35"
          >
            <span className="size-1.5 animate-pulse-slow rounded-full bg-emerald-400" />
            Tenant: Cotswold Vale PCN · 2 surgeries · synthetic demo data
          </motion.p>
        </div>
      </div>

      {/* ------- Form panel ------- */}
      <div className="texture-grain relative flex items-center justify-center bg-paper p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 42, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="w-full max-w-[480px]"
        >
          {/* mobile back link */}
          <Link href="/" className="mb-7 inline-flex items-center gap-2 text-[13px] font-semibold text-slate-900/55 transition hover:text-slate-900 lg:hidden">
            <ArrowLeft className="size-4" /> Back to site
          </Link>

          <div className="flex items-center gap-3.5">
            <motion.span
              initial={{ rotate: -12, scale: 0.7, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.15, type: "spring" }}
              className="inline-flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-teal-400 shadow-soft"
            >
              <Stethoscope className="size-6" />
            </motion.span>
            <div>
              <p className="font-display text-[26px] font-semibold leading-none tracking-tight text-slate-900">MedLeave</p>
              <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-700/50">& SessionTracker</p>
            </div>
          </div>

          <h2 className="mt-9 font-display text-[30px] font-medium tracking-tight text-slate-900">
            Sign in to the practice
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-slate-900/55">
            Choose a demo role below — the credentials <span className="font-semibold text-slate-800">autofill instantly</span>.
          </p>

          {/* Role cards */}
          <div className="mt-6 grid gap-2.5">
            {DEMO_ACCOUNTS.map((acc, i) => {
              const c = clinicians.find((x) => x.id === acc.id)!;
              const active = email === acc.email;
              return (
                <motion.button
                  key={acc.id}
                  initial={{ opacity: 0, x: -26 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.55, delay: 0.12 + i * 0.09, ease: EASE }}
                  onClick={() => { setEmail(acc.email); setPassword(acc.password); setError(null); }}
                  className={cn(
                    "group flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all duration-300",
                    active
                      ? "border-teal-400 bg-teal-100/60 shadow-soft"
                      : "border-slate-900/12 bg-card hover:-translate-y-0.5 hover:border-slate-900/25 hover:shadow-lift"
                  )}
                >
                  <Avatar c={c} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[13.5px] font-bold text-slate-900">{c.name}</span>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider",
                        acc.access === "Management" ? "bg-teal-400 text-slate-900" : "bg-slate-900/[0.07] text-slate-800"
                      )}>
                        {acc.access}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-slate-900/50">{acc.tagline}</span>
                  </span>
                  <span className={cn(
                    "inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                    active ? "bg-slate-900 text-teal-300" : "bg-slate-900/[0.06] text-slate-900/40 group-hover:bg-slate-900 group-hover:text-paper"
                  )}>
                    {active ? <CheckCircle2 className="size-4" /> : <ArrowRight className="size-3.5" />}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.42, ease: EASE }}
            className="mt-6 space-y-3.5"
          >
            <label className="block">
              <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-700/60">Email</span>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-900/35" />
                <input
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  type="email"
                  placeholder="you@medleave.demo"
                  className="w-full rounded-2xl border border-slate-900/14 bg-card py-3 pl-10 pr-4 text-sm text-ink shadow-soft outline-none transition placeholder:text-ink/30 focus:border-slate-600 focus:ring-2 focus:ring-slate-600/15"
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-700/60">Password</span>
              <span className="relative block">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-900/35" />
                <input
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-slate-900/14 bg-card py-3 pl-10 pr-11 text-sm text-ink shadow-soft outline-none transition placeholder:text-ink/30 focus:border-slate-600 focus:ring-2 focus:ring-slate-600/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label="Toggle password visibility"
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-1 text-slate-900/35 transition hover:text-slate-900"
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>

            <AnimatePresence initial={false}>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="rounded-2xl border border-rose-500/30 bg-rose-100/70 px-4 py-3 text-[12.5px] font-semibold leading-relaxed text-rose-700"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              onClick={submit}
              disabled={busy}
              whileTap={{ scale: 0.982 }}
              className={cn(
                "group relative flex w-full cursor-pointer items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-slate-900 py-3.5 text-[14px] font-bold text-paper shadow-lift transition hover:bg-slate-800 disabled:opacity-70",
              )}
            >
              <motion.span
                aria-hidden
                className="absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-teal-300/25 to-transparent"
                animate={{ x: ["-140%", "420%"] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
              />
              {busy ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-paper/30 border-t-teal-300" />
                  Signing you in…
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4.5 text-teal-300" />
                  Sign in securely
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </motion.button>

            <p className="flex items-start gap-2 pt-2 text-[11.5px] leading-relaxed text-slate-900/45">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-teal-600" />
              Fully simulated authentication — identities resolve against the demo tenant's staff
              directory; everything persists in your browser, no server involved.
            </p>
            <p className="flex items-center gap-2 text-[11.5px] text-slate-900/45">
              <UserRound className="size-3.5" /> Signing in as Management unlocks approvals, rosters, overrides and policies.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
