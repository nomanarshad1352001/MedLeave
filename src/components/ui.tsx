"use client";

import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";
import type { ReactNode, ButtonHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import type { Clinician } from "@/lib/types";

export const cn = (...args: Parameters<typeof clsx>) => clsx(...args);

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */
type BtnVariant = "primary" | "teal" | "outline" | "ghost" | "danger" | "subtle";
export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" && "px-3.5 py-1.5 text-[13px]",
        size === "md" && "px-5 py-2.5 text-sm",
        size === "lg" && "px-7 py-3.5 text-[15px]",
        variant === "primary" && "bg-slate-900 text-paper shadow-soft hover:bg-slate-800 hover:shadow-lift active:scale-[0.98]",
        variant === "teal" && "bg-teal-400 text-slate-900 shadow-soft hover:bg-teal-300 hover:shadow-lift active:scale-[0.98]",
        variant === "outline" && "border border-slate-900/15 bg-card text-slate-900 hover:border-slate-900/30 hover:bg-slate-50 active:scale-[0.98]",
        variant === "ghost" && "text-slate-800 hover:bg-slate-900/5 active:scale-[0.98]",
        variant === "danger" && "bg-rose-500 text-white shadow-soft hover:bg-rose-700 active:scale-[0.98]",
        variant === "subtle" && "bg-slate-900/[0.06] text-slate-900 hover:bg-slate-900/10 active:scale-[0.98]",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-3xl border border-slate-900/[0.08] bg-card shadow-soft", className)}>
      {children}
    </div>
  );
}

export function SectionHead({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600/70">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-[22px] font-medium leading-tight text-slate-900">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badges & chips                                                      */
/* ------------------------------------------------------------------ */
const TONES: Record<string, string> = {
  slate: "bg-slate-100 text-slate-800",
  teal: "bg-teal-100 text-teal-700",
  rose: "bg-rose-100 text-rose-700",
  amber: "bg-amber-100 text-amber-700",
  neutral: "bg-slate-900/[0.06] text-slate-900/70",
  sky: "bg-sky-100 text-sky-700",
  plum: "bg-violet-100 text-violet-700",
  green: "bg-emerald-50 text-emerald-700",
};
export function Badge({ tone = "neutral", className, children, title }: { tone?: keyof typeof TONES; className?: string; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return <span className={cn("inline-block size-2 rounded-full", className)} style={{ background: color }} />;
}

/* ------------------------------------------------------------------ */
/* Avatar with gradient initials                                       */
/* ------------------------------------------------------------------ */
export function Avatar({ c, size = "md", ring = false }: { c: Clinician; size?: "xs" | "sm" | "md" | "lg"; ring?: boolean }) {
  const sizes = { xs: "size-6 text-[9px]", sm: "size-8 text-[10.5px]", md: "size-10 text-xs", lg: "size-14 text-base" };
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-bold tracking-wide text-white",
        sizes[size],
        ring && "ring-2 ring-card"
      )}
      style={{ background: `linear-gradient(140deg, ${c.color}, color-mix(in srgb, ${c.color} 42%, var(--avatar-ink)) 72%, var(--avatar-ink))` }}
      title={c.name}
    >
      {c.initials}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Progress ring & bars                                                */
/* ------------------------------------------------------------------ */
export function Ring({
  value,
  size = 96,
  stroke = 8,
  color = "var(--lv-annual)",
  track = "rgba(15,23,42,0.08)",
  children,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (circ * pct) / 100}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export function Bar({ value, color = "var(--lv-annual)", className, thin = false }: { value: number; color?: string; className?: string; thin?: boolean }) {
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-slate-900/[0.07]", thin ? "h-1" : "h-1.5", className)}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form primitives                                                     */
/* ------------------------------------------------------------------ */
export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700/70">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-900/50">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-slate-900/12 bg-white/70 px-3.5 py-2.5 text-sm text-ink shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-ink/35 focus:border-slate-600 focus:ring-2 focus:ring-slate-600/15";

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputCls, "min-h-[84px] resize-y", props.className)} />;
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cn(inputCls, "cursor-pointer appearance-none pr-8", className)}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex cursor-pointer items-center gap-3"
    >
      <span className={cn("relative h-6 w-11 rounded-full transition-colors duration-200", checked ? "bg-slate-600" : "bg-slate-900/15")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all duration-200", checked ? "left-[22px]" : "left-0.5")} />
      </span>
      {label && <span className="text-sm text-slate-900">{label}</span>}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control                                                   */
/* ------------------------------------------------------------------ */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-full border border-slate-900/10 bg-slate-900/[0.04] p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all",
            value === o.value ? "bg-slate-900 text-paper shadow-soft" : "text-slate-900/60 hover:text-slate-900"
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false,
  icon,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  wide?: boolean;
  icon?: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 p-4 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "max-h-[90vh] w-full overflow-y-auto rounded-[28px] border border-slate-900/10 bg-card p-7 shadow-lift",
              wide ? "max-w-2xl" : "max-w-lg"
            )}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                {icon && (
                  <span className="mt-0.5 inline-flex size-10 items-center justify-center rounded-2xl bg-slate-900 text-teal-300">
                    {icon}
                  </span>
                )}
                <div>
                  <h3 className="font-display text-xl font-medium text-slate-900">{title}</h3>
                  {subtitle && <p className="mt-0.5 text-[13px] leading-relaxed text-slate-900/55">{subtitle}</p>}
                </div>
              </div>
              <button
                onClick={onClose}
                className="cursor-pointer rounded-full p-2 text-slate-900/40 transition hover:bg-slate-900/5 hover:text-slate-900"
                aria-label="Close"
              >
                <X className="size-4.5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */
export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="ent-item relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-14 text-center">
      <span className="pointer-events-none absolute -top-10 left-1/2 size-40 -translate-x-1/2 rounded-full bg-teal-100/60 blur-3xl" />
      <span className="relative mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-soft ring-1 ring-slate-900/[0.06]">
        {icon}
      </span>
      <p className="relative font-display text-lg font-medium text-slate-900">{title}</p>
      {body && <p className="relative mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-500">{body}</p>}
      {action && <div className="relative mt-5">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tooltip — contextual help for complex indicators                    */
/* ------------------------------------------------------------------ */
export function Tooltip({
  label,
  children,
  side = "top",
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            "tip-pop pointer-events-none absolute left-1/2 z-[70] w-max max-w-[248px] -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-left text-[11.5px] font-medium leading-relaxed text-slate-100 shadow-lift",
            side === "top" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]"
          )}
        >
          {label}
          <span
            className={cn(
              "absolute left-1/2 size-2 -translate-x-1/2 rotate-45 bg-slate-900",
              side === "top" ? "-bottom-1" : "-top-1"
            )}
          />
        </span>
      )}
    </span>
  );
}

export function InfoDot({ label }: { label: ReactNode }) {
  return (
    <Tooltip label={label}>
      <span className="inline-flex size-4 cursor-help items-center justify-center rounded-full bg-slate-900/[0.07] text-[9px] font-bold text-slate-500 transition hover:bg-slate-900 hover:text-white">
        ?
      </span>
    </Tooltip>
  );
}

/* ------------------------------------------------------------------ */
/* Loading skeletons                                                   */
/* ------------------------------------------------------------------ */
export function Skeleton({ className }: { className?: string }) {
  return <span className={cn("skeleton block rounded-lg", className)} />;
}

export function SkeletonCard() {
  return (
    <Card className="space-y-3 p-5">
      <Skeleton className="size-10 rounded-2xl" />
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-3 w-32" />
    </Card>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-900/[0.06] p-3.5">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inline spinner                                                      */
/* ------------------------------------------------------------------ */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block size-4 animate-spin rounded-full border-2 border-slate-900/15 border-t-teal-600", className)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* KPI stat                                                            */
/* ------------------------------------------------------------------ */
export function Stat({
  icon,
  label,
  value,
  suffix,
  hint,
  tone = "slate",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  suffix?: string;
  hint?: ReactNode;
  tone?: "slate" | "teal" | "rose";
}) {
  const iconTones = {
    slate: "bg-slate-900 text-teal-300",
    teal: "bg-teal-400 text-slate-900",
    rose: "bg-rose-500 text-white",
  };
  return (
    <Card className="group relative overflow-hidden p-5 transition-shadow duration-300 hover:shadow-lift">
      <div className="flex items-start justify-between">
        <span className={cn("inline-flex size-10 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105", iconTones[tone])}>
          {icon}
        </span>
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-display text-[34px] font-medium leading-none tracking-tight text-slate-900">{value}</span>
        {suffix && <span className="text-sm font-medium text-slate-900/45">{suffix}</span>}
      </div>
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700/60">{label}</p>
      {hint && <div className="mt-2.5 text-xs leading-relaxed text-slate-900/50">{hint}</div>}
    </Card>
  );
}
