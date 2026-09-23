"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  Check,
  ChevronDown,
  Building2,
  Inbox,
  Minus,
  Palmtree,
  Scale,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

const IMG = {
  hero: "https://images.pexels.com/photos/5619462/pexels-photo-5619462.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  exam: "https://images.pexels.com/photos/32830266/pexels-photo-32830266.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  collab: "https://images.pexels.com/photos/5327649/pexels-photo-5327649.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  team: "https://images.pexels.com/photos/5327654/pexels-photo-5327654.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  portraitF: "https://images.pexels.com/photos/6749778/pexels-photo-6749778.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  portraitM: "https://images.pexels.com/photos/4989148/pexels-photo-4989148.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
};

const EASE = [0.22, 1, 0.36, 1] as const;

function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />
      <Hero />
      <Marquee />
      <Features />
      <EngineSection />
      <ProductPreview />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Nav                                                                 */
/* ------------------------------------------------------------------ */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={cn(
      "fixed inset-x-0 top-0 z-50 transition-all duration-500",
      scrolled ? "border-b border-white/10 bg-slate-900/90 py-3 backdrop-blur-xl" : "bg-transparent py-5"
    )}>
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-teal-400 text-slate-900">
            <Stethoscope className="size-4.5" />
          </span>
          <span className="leading-none">
            <span className="block font-display text-[17px] font-semibold tracking-tight text-paper">MedLeave</span>
            <span className="mt-0.5 block text-[8.5px] font-bold uppercase tracking-[0.22em] text-paper/50">& SessionTracker</span>
          </span>
        </Link>
        <nav className="ml-6 hidden items-center gap-7 text-[13px] font-medium text-paper/70 lg:flex">
          {[["Platform", "#platform"], ["Accrual engine", "#engine"], ["Inside", "#product"], ["Pricing", "#pricing"], ["FAQ", "#faq"]].map(([label, href]) => (
            <a key={href} href={href} className="transition hover:text-teal-300">{label}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <ThemeSwitcher />
          <Link href="/login" className="hidden text-[13px] font-semibold text-paper/70 transition hover:text-teal-300 sm:block">Sign in</Link>
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 rounded-full bg-teal-400 px-5 py-2.5 text-[13px] font-bold text-slate-900 transition hover:bg-teal-300"
          >
            Launch live demo
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */
function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-slate-900 pb-24 pt-36 text-paper lg:pb-32 lg:pt-44">
      {/* ambient gradients */}
      <div className="pointer-events-none absolute -left-40 top-0 size-[560px] rounded-full bg-slate-600/25 blur-[140px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 size-[520px] rounded-full bg-teal-500/12 blur-[140px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(var(--tooltip-fg) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />

      <motion.div style={{ y, opacity }} className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-300"
            >
              <Sparkles className="size-3.5" /> Multi-tenant · GP surgeries & PCNs
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 34 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.08, ease: EASE }}
              className="mt-7 font-display text-[13vw] font-medium leading-[0.98] tracking-tight sm:text-6xl lg:text-[76px]"
            >
              Clinical leave,
              <br />
              <span className="italic text-teal-300">elegantly</span> under
              <br />
              control.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.18, ease: EASE }}
              className="mt-7 max-w-lg text-[16px] leading-relaxed text-paper/65"
            >
              MedLeave & SessionTracker pairs pro-rata annual leave accrual with a rolling
              12-month session audit — so partners, salaried GPs and managers always know
              exactly who can be away, when, and who's covering the waiting room.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.28, ease: EASE }}
              className="mt-9 flex flex-wrap items-center gap-4"
            >
              <Link
                href="/login"
                className="group inline-flex items-center gap-2.5 rounded-full bg-teal-400 px-7 py-4 text-[15px] font-bold text-slate-900 shadow-[0_20px_50px_-15px_rgba(20,184,166,0.5)] transition hover:bg-teal-300"
              >
                Enter the live demo
                <ArrowRight className="size-4.5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#engine" className="inline-flex items-center gap-2 rounded-full border border-paper/20 px-7 py-4 text-[15px] font-semibold text-paper/80 transition hover:border-teal-400/50 hover:text-teal-300">
                See the accrual engine
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="mt-12 flex flex-wrap gap-x-10 gap-y-5"
            >
              {[
                ["12-mo", "rolling session audit"],
                ["Pro-rata", "to contracted sessions"],
                ["2 sites", "one tenant, one truth"],
              ].map(([big, small]) => (
                <div key={big}>
                  <p className="font-display text-2xl font-medium text-teal-300">{big}</p>
                  <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-paper/40">{small}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Collage */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: EASE }}
            className="relative hidden lg:block"
          >
            <div className="relative overflow-hidden rounded-[32px] border border-paper/10 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.6)]">
              <img src={IMG.hero} alt="A bright, modern GP consulting room" className="h-[430px] w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">Oakfield Health Centre</p>
                  <p className="mt-1 font-display text-lg text-paper">Consulting Room 4 — Tuesday AM</p>
                </div>
                <span className="rounded-full bg-paper/15 px-3 py-1.5 text-[10.5px] font-bold text-paper backdrop-blur">4 sessions live</span>
              </div>
            </div>

            {/* floating card: balance */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-10 -top-8 w-[240px] rounded-3xl border border-paper/10 bg-slate-900/90 p-4 shadow-lift backdrop-blur"
            >
              <div className="flex items-center gap-2.5">
                <span className="inline-flex size-8 items-center justify-center rounded-xl bg-slate-600 text-teal-300"><Palmtree className="size-4" /></span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-paper/45">Annual leave</p>
                  <p className="font-display text-lg font-semibold leading-tight text-paper">Dr. E. Vance</p>
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <p className="font-display text-3xl font-medium text-teal-300">23<span className="text-sm text-paper/50"> / 30d</span></p>
                <p className="text-[10.5px] font-semibold text-emerald-300">within accrual</p>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-paper/10">
                <div className="h-full w-[77%] rounded-full bg-gradient-to-r from-slate-400 to-teal-400" />
              </div>
            </motion.div>

            {/* floating card: approval */}
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-9 right-4 w-[260px] rounded-3xl border border-paper/10 bg-paper p-4 text-ink shadow-lift"
            >
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-700/60">
                <ShieldCheck className="size-3.5 text-teal-600" /> Override approved
              </p>
              <p className="mt-2 text-[12.5px] font-semibold leading-snug text-slate-900">“Advance borrowing approved against Q4 expected sessions.”</p>
              <p className="mt-1.5 text-[10.5px] text-slate-900/50">Sarah Jenkins · Practice Manager · stamped 09:42</p>
            </motion.div>

            {/* floating chip: rolling */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -right-6 top-16 rounded-2xl border border-paper/10 bg-slate-900/90 px-4 py-3 shadow-lift backdrop-blur"
            >
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-paper/45">Rolling 365-day</p>
              <p className="font-display text-xl font-semibold text-emerald-300">101% of quota</p>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Marquee                                                             */
/* ------------------------------------------------------------------ */
function Marquee() {
  const names = [
    "Oakfield Health Centre", "Pine Valley Surgery", "Cotswold Vale PCN",
    "Whittington Medical Partnership", "Ridgeway Practice", "St. Anne's Surgery",
    "Meadowbank GP Alliance", "Fernhill PCN",
  ];
  return (
    <section className="border-b border-slate-900/[0.08] bg-parchment py-6">
      <div className="overflow-hidden">
        <div className="flex w-max animate-marquee items-center gap-14">
          {[...names, ...names].map((n, i) => (
            <span key={i} className="flex shrink-0 items-center gap-3 text-[13px] font-bold uppercase tracking-[0.2em] text-slate-900/35">
              <Building2 className="size-4 text-teal-600/50" /> {n}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Features (bento)                                                    */
/* ------------------------------------------------------------------ */
function Features() {
  const items = [
    {
      icon: <Scale className="size-5" />,
      title: "Pro-rata accrual engine",
      body: "9 sessions a week? Full entitlement. 4? Exactly 4/9ths — computed the moment a contract changes, accruing month-by-month across the leave year.",
      big: true,
    },
    {
      icon: <ShieldCheck className="size-5" />,
      title: "Hard & soft guardrails",
      body: "Over-entitlement requests are physically disabled. Advance borrowing routes to a manager with a mandatory audit note.",
    },
    {
      icon: <Activity className="size-5" />,
      title: "Rolling 365-day session audit",
      body: "Every delivered clinic counts toward the contracted quota on a trailing window — no more year-end surprises at appraisal.",
    },
    {
      icon: <Users className="size-5" />,
      title: "Cover pressure radar",
      body: "Two GPs off at the same surgery next Tuesday? You're warned three weeks ahead, with locum flags attached.",
    },
    {
      icon: <Inbox className="size-5" />,
      title: "Managerial approvals inbox",
      body: "Balance impact, sessions affected and cover plan — everything a practice manager needs, decided in one click.",
      big: true,
    },
    {
      icon: <ScrollText className="size-5" />,
      title: "Immutable audit trail",
      body: "CQC-friendly records of every request, decision, override and policy change — who, what, when and why.",
    },
  ];
  return (
    <section id="platform" className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
      <Reveal>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-teal-600">The platform</p>
        <h2 className="mt-3 max-w-2xl font-display text-4xl font-medium leading-tight tracking-tight text-slate-900 lg:text-[52px]">
          Leave management that thinks like a <span className="italic text-slate-600">practice manager</span>
        </h2>
        <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-slate-900/55">
          One tenant for the whole partnership. Every module below is live in the demo — switch personas in the top bar to see each seat's reality.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {items.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.06} className={f.big ? "md:col-span-2" : ""}>
            <div className="group relative h-full overflow-hidden rounded-[28px] border border-slate-900/[0.09] bg-card p-7 shadow-soft transition-all duration-500 hover:-translate-y-1 hover:shadow-lift">
              <div className="absolute -right-10 -top-10 size-32 rounded-full bg-slate-100/70 blur-2xl transition-all duration-500 group-hover:bg-teal-100" />
              <span className="relative inline-flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-teal-300 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                {f.icon}
              </span>
              <h3 className="relative mt-5 font-display text-[21px] font-medium text-slate-900">{f.title}</h3>
              <p className="relative mt-2.5 text-[13.5px] leading-relaxed text-slate-900/55">{f.body}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-700 opacity-0 transition-all duration-500 group-hover:opacity-100">
                Live in demo <ArrowUpRight className="size-3.5" />
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Engine + interactive calculator                                     */
/* ------------------------------------------------------------------ */
function EngineSection() {
  const [spw, setSpw] = useState(6);
  const annual = Math.round((30 * spw) / 9 * 2) / 2;
  const study = Math.round((5 * spw) / 9 * 2) / 2;
  const target = spw * 44;
  const fte = Math.round((spw / 9) * 100);

  return (
    <section id="engine" className="relative overflow-hidden bg-slate-900 py-24 text-paper lg:py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 size-[640px] -translate-x-1/2 rounded-full bg-slate-600/20 blur-[160px]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-2 lg:px-8">
        <Reveal>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-teal-300">The accrual engine</p>
          <h2 className="mt-3 font-display text-4xl font-medium leading-tight tracking-tight lg:text-[52px]">
            Mathematics your <span className="italic text-teal-300">accountant</span> would approve of
          </h2>
          <p className="mt-5 max-w-md text-[15.5px] leading-relaxed text-paper/60">
            Entitlements derive from the BMA-model sessional contract. Drag the slider — this is the
            exact computation running against every clinician in the demo tenant.
          </p>

          <ol className="mt-9 space-y-4">
            {[
              ["01", "Contract captured", "Sessions per week per clinician, per site."],
              ["02", "Pro-rata applied", "annual = base × sessions ÷ full-time sessions."],
              ["03", "Accrual projected", "Linear accrual across the leave year, front-loaded for summer."],
              ["04", "Guardrails enforced", "Soft borrowing flags, hard over-entitlement blocks."],
            ].map(([n, t, b]) => (
              <li key={n} className="flex gap-4 border-b border-paper/10 pb-4">
                <span className="font-display text-lg italic text-teal-400/80">{n}</span>
                <div>
                  <p className="text-[15px] font-bold">{t}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-paper/50">{b}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative rounded-[32px] border border-paper/12 bg-slate-900/60 p-8 shadow-lift backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-300">Live calculator</p>
              <BadgeCheck className="size-5 text-emerald-300" />
            </div>

            <div className="mt-8 text-center">
              <p className="font-display text-[86px] font-medium leading-none tracking-tight">
                {spw}<span className="text-2xl text-paper/40"> /wk</span>
              </p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-paper/40">contracted sessions · {fte}% of full-time</p>
              <input
                type="range" min={1} max={10} value={spw}
                onChange={(e) => setSpw(Number(e.target.value))}
                className="lux-range mt-7 w-full"
                style={{ ["--fill" as string]: `${(spw / 10) * 100}%` }}
              />
              <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-paper/30">
                <span>1 · locum-lite</span><span>9 · full-time</span><span>10</span>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                ["Annual leave", `${annual}d`, "per leave year"],
                ["Study leave", `${study}d`, "CPD allowance"],
                ["Session quota", `${target}`, "rolling 12 months"],
              ].map(([label, val, sub]) => (
                <motion.div
                  key={label}
                  layout
                  className="rounded-2xl border border-paper/10 bg-slate-900/60 p-4 text-center"
                >
                  <motion.p key={val} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="font-display text-[26px] font-semibold text-teal-300">
                    {val}
                  </motion.p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-paper/45">{label}</p>
                  <p className="mt-0.5 text-[10px] text-paper/30">{sub}</p>
                </motion.div>
              ))}
            </div>

            <p className="mt-6 rounded-2xl border border-teal-400/25 bg-teal-400/10 p-4 text-[12px] leading-relaxed text-teal-200/90">
              <strong className="font-bold">Worked example:</strong> 30d × {spw} sessions ÷ 9 full-time sessions ={" "}
              <strong className="font-bold">{annual} days</strong>. Sickness, parental and locum-covered leave are recorded without touching this balance.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Product preview (CSS mocks)                                         */
/* ------------------------------------------------------------------ */
function ProductPreview() {
  return (
    <section id="product" className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
      <Reveal className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-teal-600">Inside the product</p>
        <h2 className="mx-auto mt-3 max-w-2xl font-display text-4xl font-medium leading-tight tracking-tight text-slate-900 lg:text-[52px]">
          Quietly beautiful, <span className="italic text-slate-600">loudly</span> useful
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {/* approvals mock */}
        <Reveal delay={0}>
          <div className="rounded-[28px] border border-slate-900/[0.09] bg-card p-6 shadow-soft">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700/50">Approvals · live queue</p>
            <div className="mt-4 space-y-3">
              {[
                ["PS", "var(--st-priya)", "Dr. Priya Sharma", "Annual · 11d · override needed", true],
                ["MC", "var(--st-marcus)", "Dr. Marcus Chen", "Annual · 5d · within accrual", false],
                ["AO", "var(--st-amara)", "Dr. Amara Osei", "Study · 1d · within accrual", false],
              ].map(([ini, color, name, line, warn]) => (
                <div key={name as string} className="flex items-center gap-3 rounded-2xl border border-slate-900/[0.07] p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: color as string }}>{ini}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold text-slate-900">{name}</p>
                    <p className={cn("truncate text-[10.5px] font-semibold", warn ? "text-teal-700" : "text-slate-900/45")}>{line}</p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-1 text-[9.5px] font-bold", warn ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-700")}>
                    {warn ? "Override…" : "Approve"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* heatmap mock */}
        <Reveal delay={0.08}>
          <div className="rounded-[28px] border border-slate-900/[0.09] bg-card p-6 shadow-soft">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700/50">Delivery map · 20 weeks</p>
            <div className="mt-4 flex gap-[3px]">
              {Array.from({ length: 20 }).map((_, w) => (
                <div key={w} className="flex flex-col gap-[3px]">
                  {Array.from({ length: 7 }).map((_, d) => {
                    const v = [0, 1, 2, 0, 2, 1, 0][(w * 3 + d * 5) % 7];
                    return (
                      <span
                        key={d}
                        className="size-[13px] rounded-[4px]"
                        style={{ background: v === 0 ? "rgba(127,127,127,0.14)" : v === 1 ? "color-mix(in srgb, var(--lv-annual) 45%, transparent)" : "var(--lv-annual)" }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-900/[0.07] pt-4">
              <div>
                <p className="font-display text-2xl font-medium text-slate-900">396 <span className="text-sm text-slate-900/40">/ 396</span></p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700/50">Rolling quota</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">100% · audit clean</span>
            </div>
          </div>
        </Reveal>

        {/* timeline mock */}
        <Reveal delay={0.16}>
          <div className="rounded-[28px] border border-slate-900/[0.09] bg-card p-6 shadow-soft">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700/50">Rolling leave year</p>
            <div className="mt-6 space-y-4">
              {[
                ["Taken", "rgba(15,23,42,0.28)", [4, 14], "Annual · 5d"],
                ["Pending", "repeating-linear-gradient(45deg,color-mix(in srgb, var(--lv-study) 40%, transparent) 0 6px,color-mix(in srgb, var(--lv-study) 15%, transparent) 6px 12px)", [46, 12], "Annual · 5d"],
                ["Approved", "var(--lv-annual)", [68, 10], "Study · 2d"],
              ].map(([lane, bg, [x, w], label]) => (
                <div key={lane as string} className="flex items-center gap-3">
                  <span className="w-[70px] text-right text-[9.5px] font-bold uppercase tracking-wider text-slate-900/40">{lane}</span>
                  <div className="relative h-6 flex-1 rounded-lg bg-slate-900/[0.04]">
                    <span
                      className="absolute top-1/2 h-4 -translate-y-1/2 rounded-full"
                      style={{ left: `${x}%`, width: `${w}%`, background: bg as string }}
                      title={label as string}
                    />
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-slate-900/50">
                <CalendarClock className="size-3.5 text-teal-600" /> Today marker glides along the year as accrual builds
              </div>
            </div>
            <img src={IMG.collab} alt="Two GPs reviewing a rota on a laptop" className="mt-5 h-32 w-full rounded-2xl object-cover" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Testimonials                                                        */
/* ------------------------------------------------------------------ */
function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <div className="relative">
            <img src={IMG.exam} alt="A modern examination suite at a GP surgery" className="h-[420px] w-full rounded-[32px] object-cover shadow-lift" />
            <div className="absolute -bottom-6 -right-6 hidden rounded-3xl border border-slate-900/[0.08] bg-card p-5 shadow-lift sm:block">
              <p className="font-display text-3xl font-medium text-slate-900">4.9<span className="text-lg text-teal-500">/5</span></p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-700/50">from 214 practice teams</p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-teal-600">Loved by the front line</p>
          <blockquote className="mt-5 font-display text-[26px] font-medium leading-snug tracking-tight text-slate-900 lg:text-[32px]">
            “We replaced three spreadsheets and a wall chart. The override notes alone ended the
            <span className="italic text-slate-600"> annual argument</span> about who booked summer first.”
          </blockquote>
          <div className="mt-7 flex items-center gap-3.5">
            <img src={IMG.portraitF} alt="Dr. H. Okafor" className="size-12 rounded-full object-cover object-top" />
            <div>
              <p className="text-[14px] font-bold text-slate-900">Dr. Hannah Okafor</p>
              <p className="text-[12px] text-slate-900/55">Senior Partner — Ridgeway Practice, Gloucestershire</p>
            </div>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-slate-900/[0.08] pt-8">
            {[
              ["38%", "fewer cover gaps"],
              ["6 hrs", "saved weekly per PM"],
              ["100%", "audit-ready decisions"],
            ].map(([v, l]) => (
              <div key={l}>
                <p className="font-display text-3xl font-medium text-teal-500">{v}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-700/50">{l}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */
function Pricing() {
  const tiers = [
    {
      name: "Single Surgery",
      price: "£59",
      per: "per month",
      blurb: "One site, unlimited clinicians.",
      features: ["Pro-rata accrual engine", "Rolling session audit", "Leave guardrails & overrides", "Manager approvals inbox", "Email support"],
      featured: false,
    },
    {
      name: "PCN & Partnership",
      price: "£189",
      per: "per month · up to 5 sites",
      blurb: "The multi-site workhorse.",
      features: ["Everything in Single Surgery", "Cross-site cover pressure radar", "Role-based access control", "Locum budget tracking", "Immutable audit exports", "Priority support"],
      featured: true,
    },
    {
      name: "Federation / ICB",
      price: "Custom",
      per: "annual agreement",
      blurb: "Estates-wide workforce visibility.",
      features: ["Everything in PCN", "SSO & directory sync", "Custom leave-year rules", "API & BI connectors", "Dedicated success manager"],
      featured: false,
    },
  ];
  return (
    <section id="pricing" className="relative overflow-hidden bg-slate-900 py-24 text-paper lg:py-32">
      <div className="pointer-events-none absolute right-0 top-0 size-[480px] rounded-full bg-teal-500/10 blur-[140px]" />
      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-teal-300">Pricing</p>
          <h2 className="mx-auto mt-3 max-w-xl font-display text-4xl font-medium leading-tight tracking-tight lg:text-[52px]">
            Priced like a <span className="italic text-teal-300">locum's half-hour</span>
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {tiers.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <div className={cn(
                "relative flex h-full flex-col rounded-[28px] border p-8 transition-all duration-500 hover:-translate-y-1.5",
                t.featured
                  ? "border-teal-400/50 bg-slate-900/80 shadow-[0_30px_80px_-30px_rgba(20,184,166,0.35)]"
                  : "border-paper/12 bg-slate-900/40 hover:border-paper/25"
              )}>
                {t.featured && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-teal-400 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-900">
                    Most chosen
                  </span>
                )}
                <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-paper/50">{t.name}</p>
                <div className="mt-4 flex items-baseline gap-2">
                  <p className={cn("font-display text-5xl font-medium tracking-tight", t.featured ? "text-teal-300" : "text-paper")}>{t.price}</p>
                </div>
                <p className="mt-1 text-[12px] font-semibold text-paper/40">{t.per}</p>
                <p className="mt-4 text-[13.5px] leading-relaxed text-paper/60">{t.blurb}</p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px] text-paper/75">
                      <Check className={cn("mt-0.5 size-4 shrink-0", t.featured ? "text-teal-300" : "text-slate-300")} /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={cn(
                    "mt-8 inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-bold transition",
                    t.featured ? "bg-teal-400 text-slate-900 hover:bg-teal-300" : "border border-paper/20 text-paper hover:border-teal-400/60 hover:text-teal-300"
                  )}
                >
                  Start with the demo <ArrowRight className="size-4" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */
function FAQ() {
  const faqs = [
    {
      q: "How does the pro-rata accrual actually work?",
      a: "Each clinician's entitlement equals the full-time allowance multiplied by their contracted sessions and divided by the full-time session count (9 by default). A partner on 9 sessions receives the full 30 days; a salaried GP on 4 sessions receives 13.3. Entitlement accrues evenly across the leave year, with a configurable front-loaded completion horizon so summer booking stays sensible.",
    },
    {
      q: "What exactly is the rolling 12-month session audit?",
      a: "Every delivered AM/PM session is logged against the clinician. The tracker compares the last 365 days with the contracted quota (sessions per week × working weeks per year, default 44). Leave periods automatically pause delivery — so a six-week sabbatical never looks like shirking.",
    },
    {
      q: "What happens when someone requests more than they've earned?",
      a: "Two guardrails fire. A soft flag appears when the request borrows ahead of the accrual projected to the start date — a manager may approve with a mandatory audit note (the managerial override). A hard block disables submission entirely when the request exceeds the full-year entitlement balance. Managers can force-approve even that, again with a stamped note, when policy allows.",
    },
    {
      q: "Is the demo connected to a real database?",
      a: "The demo tenant runs entirely on seed data persisted in your browser's local storage — no patient data, no servers, fully GDPR-safe to explore. Every action (requests, approvals, overrides, policy edits, new staff) writes to that local store and survives refresh until you press 'Reset demo data'.",
    },
    {
      q: "Does it understand UK bank holidays and NHS leave years?",
      a: "Yes. England & Wales bank holidays are excluded when counting request length (toggleable), and the leave year start is configurable — April 1st by default, matching most GP partnerships.",
    },
  ];
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="mx-auto max-w-4xl px-5 py-24 lg:px-8 lg:py-32">
      <Reveal className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-teal-600">Questions</p>
        <h2 className="mt-3 font-display text-4xl font-medium tracking-tight text-slate-900 lg:text-[48px]">
          Asked by every <span className="italic text-slate-600">practice manager</span>
        </h2>
      </Reveal>
      <div className="mt-12 space-y-3">
        {faqs.map((f, i) => (
          <Reveal key={f.q} delay={i * 0.05}>
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              className={cn(
                "w-full cursor-pointer rounded-3xl border p-6 text-left transition-all duration-300",
                open === i ? "border-slate-900/20 bg-card shadow-lift" : "border-slate-900/[0.09] bg-card/60 hover:bg-card hover:shadow-soft"
              )}
            >
              <span className="flex items-center justify-between gap-4">
                <span className="font-display text-[19px] font-medium text-slate-900">{f.q}</span>
                <span className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                  open === i ? "rotate-180 bg-slate-900 text-teal-300" : "bg-slate-900/[0.06] text-slate-900"
                )}>
                  <ChevronDown className="size-4" />
                </span>
              </span>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.span
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="block overflow-hidden"
                  >
                    <span className="block pt-4 text-[14px] leading-relaxed text-slate-900/60">{f.a}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* CTA + Footer                                                        */
/* ------------------------------------------------------------------ */
function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
      <Reveal>
        <div className="relative overflow-hidden rounded-[36px] bg-slate-900 px-8 py-16 text-center text-paper lg:py-24">
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(var(--tooltip-fg) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
          <div className="pointer-events-none absolute -left-20 top-0 size-[380px] rounded-full bg-teal-500/15 blur-[120px]" />
          <p className="relative text-[11px] font-bold uppercase tracking-[0.24em] text-teal-300">Zero setup · no sign-in</p>
          <h2 className="relative mx-auto mt-4 max-w-2xl font-display text-4xl font-medium leading-tight tracking-tight lg:text-[56px]">
            Run the whole practice in the <span className="italic text-teal-300">next 30 seconds</span>
          </h2>
          <p className="relative mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-paper/60">
            Approve Dr. Sharma's Jaipur wedding with an override. Watch Dr. Wilson's rolling quota.
            Then switch seats and do it all again from the other side.
          </p>
          <Link
            href="/login"
            className="group relative mt-9 inline-flex items-center gap-2.5 rounded-full bg-teal-400 px-9 py-4.5 text-[16px] font-bold text-slate-900 shadow-[0_24px_60px_-15px_rgba(20,184,166,0.55)] transition hover:bg-teal-300"
          >
            Launch MedLeave & SessionTracker
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-900/[0.08] bg-parchment">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-slate-900 text-teal-400"><Stethoscope className="size-4.5" /></span>
            <span>
              <span className="block font-display text-[17px] font-semibold tracking-tight">MedLeave</span>
              <span className="block text-[8.5px] font-bold uppercase tracking-[0.22em] text-slate-900/50">& SessionTracker</span>
            </span>
          </div>
          <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-slate-900/55">
            Multi-tenant leave management and rolling session tracking for UK & international general practice.
            Demo tenant contains synthetic seed data only — no patient or staff information.
          </p>
        </div>
        {[
          ["Platform", ["Accrual engine", "Session audit", "Approvals & overrides", "Multi-site roster"]],
          ["Practice", ["Pricing", "Security & GDPR", "CQC-ready exports", "API documentation"]],
        ].map(([h, links]) => (
          <div key={h as string}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-900/45">{h}</p>
            <ul className="mt-4 space-y-2.5">
              {(links as string[]).map((l) => (
                <li key={l}>
                  <Link href="/login" className="group inline-flex items-center gap-1.5 text-[13.5px] font-medium text-slate-900/65 transition hover:text-slate-900">
                    <Minus className="size-3 text-teal-500 opacity-0 transition group-hover:opacity-100" /> {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-900/[0.08]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-[12px] text-slate-900/45 lg:px-8">
          <p>© {new Date().getFullYear()} MedLeave Ltd. Crafted for primary care.</p>
          <p className="flex items-center gap-1.5"><span className="size-1.5 animate-pulse-slow rounded-full bg-emerald-500" /> Demo tenant: Cotswold Vale PCN — operational</p>
        </div>
      </div>
    </footer>
  );
}
