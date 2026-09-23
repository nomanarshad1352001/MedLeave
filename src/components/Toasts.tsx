"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, ShieldAlert, X, XCircle } from "lucide-react";
import { useEffect, type ReactElement } from "react";
import { useStore } from "@/store/useStore";
import type { ToastMsg } from "@/lib/types";
import { cn } from "./ui";

const ICONS: Record<ToastMsg["variant"], ReactElement> = {
  success: <CheckCircle2 className="size-4.5 text-emerald-300" />,
  error: <XCircle className="size-4.5 text-red-300" />,
  warning: <ShieldAlert className="size-4.5 text-teal-300" />,
  info: <Info className="size-4.5 text-sky-300" />,
};

function ToastItem({ t }: { t: ToastMsg }) {
  const dismiss = useStore((s) => s.dismissToast);
  useEffect(() => {
    const id = setTimeout(() => dismiss(t.id), 4600);
    return () => clearTimeout(id);
  }, [t.id, dismiss]);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
      transition={{ type: "spring", damping: 26, stiffness: 320 }}
      className={cn(
        "pointer-events-auto flex w-[min(92vw,380px)] items-start gap-3 rounded-2xl border border-white/10 bg-slate-900/95 p-4 text-paper shadow-lift backdrop-blur"
      )}
    >
      <span className="mt-0.5">{ICONS[t.variant]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">{t.title}</p>
        {t.description && <p className="mt-0.5 text-[12.5px] leading-relaxed text-paper/60">{t.description}</p>}
      </div>
      <button onClick={() => dismiss(t.id)} className="cursor-pointer rounded-full p-1 text-paper/40 transition hover:bg-white/10 hover:text-paper">
        <X className="size-3.5" />
      </button>
    </motion.div>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-2.5">
      <AnimatePresence>{toasts.map((t) => <ToastItem key={t.id} t={t} />)}</AnimatePresence>
    </div>
  );
}
