"use client";

import { Stethoscope } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { AppShell } from "@/components/shell";
import { Toasts } from "@/components/Toasts";
import { useStore } from "@/store/useStore";

export default function AppLayout({ children }: { children: ReactNode }) {
  const authed = useStore((s) => s.authed);
  const [mounted, setMounted] = useState(false);
  const [gateDone, setGateDone] = useState(false);

  /* Hydrate + decide whether to show the entrance gate exactly once per session */
  useEffect(() => {
    if (sessionStorage.getItem("medleave-gate-done") === "1") {
      setGateDone(true);
    }
    setMounted(true);
  }, []);

  /* Once signed in and mounted, release the gate after one beat */
  useEffect(() => {
    if (!mounted || gateDone || !authed) return;
    const id = window.setTimeout(() => {
      sessionStorage.setItem("medleave-gate-done", "1");
      setGateDone(true);
    }, 1400);
    return () => window.clearTimeout(id);
  }, [mounted, gateDone, authed]);

  /* Hard safety net — gate can never lock longer than 2.2 s */
  useEffect(() => {
    if (!mounted || gateDone) return;
    const id = window.setTimeout(() => {
      sessionStorage.setItem("medleave-gate-done", "1");
      setGateDone(true);
    }, 2200);
    return () => window.clearTimeout(id);
  }, [mounted, gateDone]);

  const showGate = mounted && !gateDone && authed;
  const showShell = mounted;

  return (
    <>
      {/* scrim behind the shell while gate animates out */}
      {showGate && (
        <div className="gate-panel fixed inset-0 z-[120] flex flex-col items-center justify-center gap-5 bg-slate-900">
          <span className="inline-flex size-14 animate-pulse-slow items-center justify-center rounded-3xl bg-teal-400/15 text-teal-400">
            <Stethoscope className="size-7" />
          </span>
          <div className="text-center">
            <p className="font-display text-2xl font-semibold tracking-tight text-paper">MedLeave</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-paper/40">& SessionTracker</p>
          </div>
        </div>
      )}

      {showShell ? (
        <AppShell>
          {children}
          <Toasts />
        </AppShell>
      ) : (
        /* pre-hydration fallback only */
        <div className="flex min-h-screen items-center justify-center bg-paper">
          <span className="size-9 animate-spin rounded-full border-[3px] border-slate-900/15 border-t-slate-900" />
        </div>
      )}
    </>
  );
}
