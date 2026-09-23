"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  Bell,
  Building2,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronsLeft,
  CornerDownLeft,
  FileSpreadsheet,
  Inbox,
  LayoutGrid,
  LogOut,
  Menu,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useStore } from "@/store/useStore";
import { correlationWarnings, coverageAlerts, fmtDay, fmtRange, todayISO } from "@/lib/engine";
import { LEAVE_META, ROLE_LABEL } from "@/lib/types";
import { Avatar, Badge, cn } from "./ui";
import { AppZoo } from "./appzoo";
import { readPoint } from "@/lib/anim";

const NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutGrid },
  { href: "/app/leave", label: "Leave Planner", icon: CalendarDays },
  { href: "/app/calendar", label: "Cover Calendar", icon: CalendarRange },
  { href: "/app/sessions", label: "Session Tracker", icon: Activity },
  { href: "/app/approvals", label: "Approvals", icon: Inbox },
  { href: "/app/roster", label: "Staff Roster", icon: Users },
  { href: "/app/reports", label: "Reports", icon: FileSpreadsheet },
  { href: "/app/policies", label: "Practice Settings", icon: SlidersHorizontal, managerOnly: true },
];

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */
function Notifications() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { currentUserId, clinicians, requests, sites, siteFilter } = useStore();
  const me = clinicians.find((c) => c.id === currentUserId);
  const isManager = me?.role === "manager";

  useEffect(() => {
    const close = () => setOpen(false);
    if (open) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const items = useMemo(() => {
    const list: Array<{ id: string; tone: string; icon: ReactNode; title: string; body: string }> = [];
    if (isManager) {
      const pending = requests.filter((r) => {
        const c = clinicians.find((x) => x.id === r.clinicianId);
        return r.status === "pending" && (siteFilter === "all" || c?.siteId === siteFilter);
      });
      for (const r of pending.slice(0, 5)) {
        const c = clinicians.find((x) => x.id === r.clinicianId)!;
        list.push({
          id: r.id,
          tone: "teal",
          icon: <Inbox className="size-4" />,
          title: `${c.firstName} requests ${r.days}d ${LEAVE_META[r.type].label.toLowerCase()}`,
          body: `${fmtRange(r.start, r.end)} · awaiting your decision`,
        });
      }
      const alerts = coverageAlerts(clinicians, requests, 14).filter(
        (a) => siteFilter === "all" || a.siteId === siteFilter
      );
      for (const a of alerts.slice(0, 3)) {
        const site = sites.find((s) => s.id === a.siteId);
        list.push({
          id: `cov_${a.siteId}_${a.date}`,
          tone: "rose",
          icon: <Users className="size-4" />,
          title: `Cover pressure at ${site?.short}`,
          body: `${a.clinicianIds.length} of ${a.siteCount} clinicians off on ${fmtDay(a.date)}`,
        });
      }
    }
    const mine = requests.filter((r) => r.clinicianId === currentUserId && r.status !== "pending").slice(0, 4);
    for (const r of mine) {
      list.push({
        id: `mine_${r.id}`,
        tone: r.status === "approved" ? "slate" : "rose",
        icon: r.status === "approved" ? <Check className="size-4" /> : <X className="size-4" />,
        title: `Your ${LEAVE_META[r.type].label.toLowerCase()} was ${r.status}`,
        body: `${fmtRange(r.start, r.end)} · by ${r.decidedByName ?? "practice"}`,
      });
    }
    return list;
  }, [isManager, requests, clinicians, siteFilter, currentUserId, sites]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative cursor-pointer rounded-full border border-slate-900/10 bg-card p-2.5 text-slate-900 shadow-soft transition hover:shadow-lift"
        aria-label="Notifications"
      >
        <Bell className="size-4.5" />
        {items.length > 0 && (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-teal-400 text-[10px] font-bold text-slate-900">
            {items.length}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[360px] rounded-3xl border border-slate-900/10 bg-card p-2 shadow-lift"
          >
            <p className="px-3 pb-1 pt-2.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-700/50">
              Updates for you
            </p>
            <div className="max-h-[360px] overflow-y-auto">
              {items.length === 0 && (
                <p className="px-3 py-6 text-center text-[13px] text-slate-900/45">You're all caught up.</p>
              )}
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setOpen(false);
                    router.push("/app/approvals");
                  }}
                  className="flex w-full cursor-pointer items-start gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-900/[0.05]"
                >
                  <span className={cn(
                    "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl",
                    n.tone === "teal" && "bg-teal-100 text-teal-700",
                    n.tone === "slate" && "bg-slate-100 text-slate-700",
                    n.tone === "rose" && "bg-rose-100 text-rose-700"
                  )}>
                    {n.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold leading-snug text-slate-900">{n.title}</span>
                    <span className="mt-0.5 block text-[11.5px] text-slate-900/50">{n.body}</span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Command palette / search                                            */
/* ------------------------------------------------------------------ */
function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const { clinicians } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pages = NAV.filter((n) => n.label.toLowerCase().includes(q.toLowerCase()));
  const people = clinicians.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden cursor-pointer items-center gap-2.5 rounded-full border border-slate-900/10 bg-card px-4 py-2.5 text-[13px] text-slate-900/45 shadow-soft transition hover:shadow-lift md:flex"
      >
        <Search className="size-4" />
        Search people & pages…
        <kbd className="ml-2 rounded-md bg-slate-900/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-slate-900/50">⌘K</kbd>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-900/45 p-4 pt-[14vh] backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-900/10 bg-card shadow-lift"
            >
              <div className="flex items-center gap-3 border-b border-slate-900/[0.07] px-5 py-4">
                <Search className="size-4.5 text-slate-900/40" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search clinicians, sites, pages…"
                  className="w-full bg-transparent text-[15px] outline-none placeholder:text-slate-900/35"
                />
                <kbd className="rounded-md bg-slate-900/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-slate-900/50">ESC</kbd>
              </div>
              <div className="max-h-[340px] overflow-y-auto p-2">
                {pages.length > 0 && (
                  <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-700/45">Pages</p>
                )}
                {pages.map((n) => (
                  <button
                    key={n.href}
                    onClick={() => { setOpen(false); router.push(n.href); }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-2xl p-3 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-900/[0.05]"
                  >
                    <n.icon className="size-4 text-slate-700" /> {n.label}
                    <CornerDownLeft className="ml-auto size-3.5 text-slate-900/30" />
                  </button>
                ))}
                {people.length > 0 && (
                  <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-700/45">People</p>
                )}
                {people.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setOpen(false);
                      router.push("/app/roster");
                      setTimeout(() => window.dispatchEvent(new CustomEvent("medleave:open-clinician", { detail: c.id })), 250);
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-900/[0.05]"
                  >
                    <Avatar c={c} size="sm" />
                    <span>
                      <span className="block text-sm font-medium text-slate-900">{c.name}</span>
                      <span className="block text-[11px] text-slate-900/45">{c.grade} · {c.sessionsPerWeek} sessions/wk</span>
                    </span>
                  </button>
                ))}
                {pages.length === 0 && people.length === 0 && (
                  <p className="px-3 py-8 text-center text-[13px] text-slate-900/45">No matches for “{q}”.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */
function SidebarContent({ onNavigate, collapsed = false, onToggle }: { onNavigate?: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { clinicians, currentUserId, requests, siteFilter, resetDemo, pushToast, signOut } = useStore();
  const me = clinicians.find((c) => c.id === currentUserId);
  const isManager = me?.role === "manager";

  const pendingCount = useMemo(() => {
    if (!isManager) return requests.filter((r) => r.clinicianId === currentUserId && r.status === "pending").length;
    return requests.filter((r) => {
      const c = clinicians.find((x) => x.id === r.clinicianId);
      return r.status === "pending" && (siteFilter === "all" || c?.siteId === siteFilter);
    }).length;
  }, [isManager, requests, currentUserId, clinicians, siteFilter]);

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center pb-7 pt-7", collapsed ? "flex-col gap-3 px-3" : "gap-3 px-6")}>
        <Link href="/" onClick={onNavigate} className="group flex items-center gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-teal-400 shadow-soft transition-transform duration-300 group-hover:rotate-6">
            <Stethoscope className="size-5" />
          </span>
          {!collapsed && (
            <span>
              <span className="block font-display text-[19px] font-semibold leading-none tracking-tight text-slate-900">MedLeave</span>
              <span className="mt-1 block text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-400">& SessionTracker</span>
            </span>
          )}
        </Link>
        {onToggle && (
          <button
            onClick={onToggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "hidden cursor-pointer rounded-xl p-2 text-slate-400 transition hover:bg-slate-900/[0.06] hover:text-slate-900 lg:block",
              !collapsed && "ml-auto"
            )}
          >
            <ChevronsLeft className={cn("size-4 transition-transform duration-300", collapsed && "rotate-180")} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3.5">
        {NAV.map((n) => {
          if (n.managerOnly && !isManager) return null;
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={onNavigate}
              title={collapsed ? n.label : undefined}
              className={cn(
                "group relative flex items-center rounded-2xl text-[13.5px] font-medium transition-all",
                collapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-2.5",
                active ? "bg-slate-900 text-white shadow-soft" : "text-slate-500 hover:bg-slate-900/[0.05] hover:text-slate-900"
              )}
            >
              <n.icon className={cn("size-4.5 shrink-0 transition-transform duration-300 group-hover:scale-110", active && "text-teal-300")} />
              {!collapsed && n.label}
              {n.label === "Approvals" && pendingCount > 0 && (
                <span className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                  collapsed ? "absolute right-1.5 top-1.5" : "ml-auto",
                  active ? "bg-teal-400 text-slate-900" : "bg-slate-900 text-white"
                )}>
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}

        {!collapsed && (
        <div className="px-3.5 pb-2 pt-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Tenant</p>
        </div>
        )}
        <div className={cn("rounded-2xl border border-slate-900/[0.08] bg-slate-50 p-3.5", collapsed && "hidden")}>
          <div className="flex items-center gap-2.5">
            <Building2 className="size-4 text-slate-700" />
            <p className="text-[12.5px] font-bold text-slate-900">Cotswold Vale PCN</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-900/50">2 surgeries · 8 staff · NHS England South West</p>
          <Badge tone="green" className="mt-2.5">
            <span className="size-1.5 animate-pulse-slow rounded-full bg-emerald-500" /> Tenant live
          </Badge>
        </div>
      </nav>

      <div className="border-t border-slate-900/[0.07] p-3.5">
        {me && (
          <div className={cn("mb-2 flex items-center rounded-2xl bg-slate-900/[0.04] p-2.5", collapsed ? "justify-center" : "gap-3")}>
            <Avatar c={me} size="sm" />
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-semibold text-slate-900">{me.name}</span>
                <span className="block text-[10.5px] text-slate-400">{me.grade}</span>
              </span>
            )}
          </div>
        )}
        <button
          onClick={() => {
            resetDemo();
            pushToast({ title: "Demo data restored", description: "All balances, requests and sessions reset to the original seed.", variant: "info" });
          }}
          title="Reset demo data"
          className={cn("flex w-full cursor-pointer items-center rounded-2xl py-2.5 text-[12.5px] font-medium text-slate-500 transition hover:bg-slate-900/[0.05] hover:text-slate-900", collapsed ? "justify-center px-0" : "gap-2.5 px-3.5")}
        >
          <RotateCcw className="size-4" /> {!collapsed && "Reset demo data"}
        </button>
        <button
          onClick={() => {
            signOut();
            pushToast({ title: "Signed out", description: "You've been returned to the sign-in screen.", variant: "info" });
            router.push("/login");
          }}
          title="Sign out"
          className={cn("flex w-full cursor-pointer items-center rounded-2xl py-2.5 text-[12.5px] font-medium text-slate-500 transition hover:bg-rose-100 hover:text-rose-700", collapsed ? "justify-center px-0" : "gap-2.5 px-3.5")}
        >
          <LogOut className="size-4" /> {!collapsed && "Sign out"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */
export function AppShell({ children }: { children: ReactNode }) {
  const [mobileNav, setMobileNav] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { authed, siteFilter, setSiteFilter, sites, clinicians, currentUserId, signOut } = useStore();

  useEffect(() => {
    /* Only bounce to login once the store has actually hydrated */
    if (!authed && typeof window !== "undefined" && document.readyState === "complete") {
      const id = window.setTimeout(() => {
        if (!useStore.getState().authed) router.replace("/login");
      }, 350);
      return () => window.clearTimeout(id);
    }
  }, [authed, router]);

  const me = clinicians.find((c) => c.id === currentUserId);

  const zooKind = pathname.startsWith("/app/roster")
    ? "roster"
    : pathname === "/app"
      ? "mesh"
      : "calm";

  const [pointer, setPointer] = useState({ dx: 0, dy: 0 });
  const mainRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const p = readPoint(e, el);
        setPointer({ dx: (p.px - 0.5) * 120, dy: (p.py - 0.5) * 90 });
      });
    };
    el.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
    };
  }, []);

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <span className="size-9 animate-spin rounded-full border-[3px] border-slate-900/15 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div ref={mainRef} className="dg-main texture-grain relative min-h-screen bg-paper">
      <AppZoo kind={zooKind} pointer={pointer} speed={zooKind === "calm" ? 0.7 : 1} />
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-slate-900/[0.08] bg-white/85 backdrop-blur transition-[width] duration-300 ease-out lg:block",
          collapsed ? "w-[84px]" : "w-[264px]"
        )}
      >
        <SidebarContent collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileNav(false)}
            />
            <motion.aside
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-[61] w-[280px] bg-paper shadow-lift lg:hidden"
            >
              <SidebarContent onNavigate={() => setMobileNav(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className={cn("transition-[padding] duration-300 ease-out", collapsed ? "lg:pl-[84px]" : "lg:pl-[264px]")}>
        <header className="sticky top-0 z-30 border-b border-slate-900/[0.07] bg-paper/85 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
            <button
              onClick={() => setMobileNav(true)}
              className="cursor-pointer rounded-full border border-slate-900/10 bg-card p-2.5 text-slate-900 shadow-soft lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-4.5" />
            </button>

            {/* Site filter */}
            <div className="hidden items-center gap-1 rounded-full border border-slate-900/10 bg-slate-900/[0.04] p-1 sm:flex">
              {[{ id: "all", short: "All surgeries" }, ...sites].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSiteFilter(s.id)}
                  className={cn(
                    "cursor-pointer rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all",
                    siteFilter === s.id ? "bg-slate-900 text-paper shadow-soft" : "text-slate-900/55 hover:text-slate-900"
                  )}
                >
                  {s.short}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2.5">
              <SearchPalette />
              <Notifications />
              {me && (
                <div className="flex items-center gap-2.5">
                  <div className="hidden items-center gap-2.5 rounded-full border border-slate-900/10 bg-card py-1.5 pl-1.5 pr-3 shadow-soft sm:flex">
                    <Avatar c={me} size="sm" />
                    <span className="text-left">
                      <span className="block text-[12.5px] font-semibold leading-tight text-slate-900">{me.name}</span>
                      <span className="block text-[10.5px] font-medium leading-tight text-slate-700/60">{ROLE_LABEL[me.role]}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      router.push("/login");
                    }}
                    title="Sign out & switch role"
                    className="cursor-pointer rounded-full border border-slate-900/10 bg-card p-2.5 text-slate-900 shadow-soft transition hover:border-rose-500/30 hover:bg-rose-100 hover:text-rose-700"
                  >
                    <LogOut className="size-4.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="relative px-4 pb-20 pt-7 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export { todayISO };
