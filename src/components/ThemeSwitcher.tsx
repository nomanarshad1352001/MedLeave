"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Contrast, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore, type ThemeName } from "@/store/useStore";
import { cn } from "./ui";

/* ------------------------------------------------------------------ */
/* Keeps <html data-theme> in sync with the persisted store value      */
/* ------------------------------------------------------------------ */
export function ThemeSync() {
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme === "classic" ? "light" : "light";
  }, [theme]);
  return null;
}

/* ------------------------------------------------------------------ */
/* Theme definitions                                                   */
/* ------------------------------------------------------------------ */
export const THEMES: Array<{
  id: ThemeName;
  name: string;
  era: string;
  blurb: string;
  swatches: string[];
}> = [
  {
    id: "modern",
    name: "Modern",
    era: "Current design",
    blurb: "Slate navy surfaces with a trust-teal accent — the crisp clinical system in use today.",
    swatches: ["#0F172A", "#1E293B", "#0D9488", "#F8FAFC", "#10B981"],
  },
  {
    id: "classic",
    name: "Classic",
    era: "Original design",
    blurb: "Deep clinical pine with burnished gold on warm cream paper — the first luxury edition.",
    swatches: ["#16332B", "#2A6A56", "#D9B44A", "#F7F5EF", "#C05B3C"],
  },
];

/* ------------------------------------------------------------------ */
/* Switcher                                                            */
/* ------------------------------------------------------------------ */
export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const pushToast = useStore((s) => s.pushToast);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    if (open) {
      document.addEventListener("mousedown", close);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={`Theme: ${active.name}`}
        aria-label="Switch theme"
        className={cn(
          "group inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-900/10 bg-card p-2.5 text-slate-600 shadow-soft transition-all hover:shadow-lift hover:text-slate-900",
          compact && "px-2.5 py-2"
        )}
      >
        <Contrast className="size-4.5 shrink-0 transition-transform duration-300 group-hover:rotate-180" />
        {!compact && (
          <>
            <span className="hidden text-[12.5px] font-bold sm:block">{active.name}</span>
            <span className="flex gap-1 pr-1">
              {active.swatches.slice(0, 3).map((c) => (
                <span key={c} className="size-3 rounded-full ring-1 ring-black/10" style={{ background: c }} />
              ))}
            </span>
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] z-[70] w-[320px] rounded-3xl border border-slate-900/10 bg-card p-2.5 shadow-lift"
          >
            <p className="flex items-center gap-2 px-2.5 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              <Sparkles className="size-3" /> Appearance
            </p>

            {THEMES.map((t) => {
              const isActive = t.id === theme;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                    pushToast({
                      title: `${t.name} theme applied`,
                      description: t.blurb,
                      variant: "info",
                    });
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-3 rounded-2xl p-3 text-left transition-all",
                    isActive ? "bg-slate-900 text-white shadow-soft" : "hover:bg-slate-900/[0.05]"
                  )}
                >
                  {/* swatch preview */}
                  <span
                    className={cn(
                      "flex h-12 w-12 shrink-0 flex-col overflow-hidden rounded-xl ring-1",
                      isActive ? "ring-white/25" : "ring-black/10"
                    )}
                  >
                    {t.swatches.map((c) => (
                      <span key={c} className="flex-1" style={{ background: c }} />
                    ))}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn("text-[13.5px] font-bold", isActive ? "text-white" : "text-slate-900")}>
                        {t.name}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                          isActive ? "bg-teal-400 text-slate-900" : "bg-slate-900/[0.07] text-slate-500"
                        )}
                      >
                        {t.era}
                      </span>
                    </span>
                    <span className={cn("mt-1 block text-[11.5px] leading-relaxed", isActive ? "text-white/60" : "text-slate-500")}>
                      {t.blurb}
                    </span>
                  </span>

                  {isActive && <Check className="mt-0.5 size-4 shrink-0 text-teal-300" />}
                </button>
              );
            })}

            <p className="border-t border-slate-900/[0.07] px-2.5 pb-1 pt-2.5 text-[10.5px] leading-relaxed text-slate-400">
              Saved to this browser — applies to every screen instantly.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
