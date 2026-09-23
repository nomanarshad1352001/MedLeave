"use client";

import {
  Landmark,
  Lock,
  RotateCcw,
  Save,
  Scale,
  ShieldCheck,
  ShieldOff,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, SectionHead, Toggle, cn } from "@/components/ui";
import { entitlementFor } from "@/lib/engine";
import { DEFAULT_POLICY } from "@/lib/seed";
import type { Clinician, Policy } from "@/lib/types";
import { useStore } from "@/store/useStore";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function PoliciesPage() {
  const { currentUserId, clinicians, policy, updatePolicy, pushToast, audit, setUser } = useStore();
  const me = clinicians.find((c) => c.id === currentUserId)!;
  const isManager = me.role === "manager";

  const [draft, setDraft] = useState<Policy>(policy);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(policy), [draft, policy]);

  /* reset draft whenever store policy changes and form is clean */
  const set = (patch: Partial<Policy>) => setDraft((d) => ({ ...d, ...patch }));

  const save = () => {
    updatePolicy(draft, currentUserId);
    pushToast({
      title: "Policy updated",
      description: "All balances, guardrails and session targets recalculated instantly across the tenant.",
      variant: "success",
    });
  };

  const previewClinician = (spw: number): Clinician => ({
    id: "preview", name: "", firstName: "", initials: "", role: "salaried", grade: "",
    siteId: "oak", sessionsPerWeek: spw, clinical: true, color: "", since: "",
    email: "", access: null,
  });

  const policyAudits = audit.filter((a) => a.action === "Policy updated").slice(0, 5);

  if (!isManager) {
    return (
      <div className="mx-auto max-w-3xl pt-10">
        <EmptyState
          icon={<Lock className="size-6" />}
          title="Practice management only"
          body="Policy configuration is restricted to the Practice Manager persona in this demo tenant. Switch to Sarah Jenkins using the role switcher in the top bar."
          action={
            <Button onClick={() => { setUser("c_sarah"); pushToast({ title: "Now viewing as Sarah", description: "Practice Manager — management view.", variant: "info" }); }}>
              Switch to Sarah Jenkins
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-700/50">Governance</p>
          <h1 className="font-display text-[34px] font-medium leading-tight tracking-tight text-slate-900">
            Policies & <span className="italic text-slate-700">guardrails</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-900/55">
            Tune the accrual engine for the whole tenant. Changes apply live to every balance, guardrail and session target.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {dirty && <Badge tone="teal">Unsaved changes</Badge>}
          <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(policy)}>
            <RotateCcw className="size-4" /> Discard
          </Button>
          <Button variant="teal" disabled={!dirty} onClick={save}>
            <Save className="size-4" /> Save policy
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Entitlement engine */}
        <Card className="p-6">
          <SectionHead eyebrow="Accrual engine" title="Entitlement baseline" />
          <div className="space-y-5">
            <Stepper
              label="Full-time annual leave"
              hint="Days per leave year at full-time contract"
              value={draft.baseAnnualDays}
              min={20} max={40} step={1} suffix="days"
              onChange={(v) => set({ baseAnnualDays: v })}
            />
            <Stepper
              label="Full-time study leave"
              hint="CPD allowance at full-time contract"
              value={draft.baseStudyDays}
              min={0} max={15} step={1} suffix="days"
              onChange={(v) => set({ baseStudyDays: v })}
            />
            <Stepper
              label="Full-time sessions / week"
              hint="What counts as a 1.0 clinical contract"
              value={draft.fullTimeSessions}
              min={4} max={10} step={1} suffix="sessions"
              onChange={(v) => set({ fullTimeSessions: v })}
            />
            <Stepper
              label="Working weeks per year"
              hint="Denominator for rolling session targets"
              value={draft.workingWeeksPerYear}
              min={36} max={52} step={1} suffix="weeks"
              onChange={(v) => set({ workingWeeksPerYear: v })}
            />
            <Stepper
              label="Safe staffing threshold"
              hint="Planned-leave days per rolling 90-day window before a clinician is flagged for staffing review"
              value={draft.safeStaffingThreshold}
              min={4} max={20} step={1} suffix="days / 90d"
              onChange={(v) => set({ safeStaffingThreshold: v })}
            />
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[12px] font-semibold text-slate-900">Accrual completion horizon</p>
                <p className="text-[13px] font-bold tabular-nums text-slate-900">{draft.accrualCompletionMonths} months</p>
              </div>
              <input
                type="range"
                min={1} max={12}
                value={draft.accrualCompletionMonths}
                onChange={(e) => set({ accrualCompletionMonths: Number(e.target.value) })}
                className="lux-range w-full"
                style={{ ["--fill" as string]: `${(draft.accrualCompletionMonths / 12) * 100}%`, background: `linear-gradient(90deg, #0D9488 ${(draft.accrualCompletionMonths / 12) * 100}%, rgba(15,23,42,0.1) ${(draft.accrualCompletionMonths / 12) * 100}%)` }}
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-900/45">
                Entitlement accrues linearly and is fully available after this many months — earlier bookings borrow ahead of accrual and need an override note.
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-slate-900">Leave year starts</p>
              <div className="flex flex-wrap gap-1.5">
                {MONTHS.filter((_, i) => [0, 3, 6, 9].includes(i)).map((m) => {
                  const val = `${String(MONTHS.indexOf(m) + 1).padStart(2, "0")}-01`;
                  return (
                    <button
                      key={m}
                      onClick={() => set({ leaveYearStart: val })}
                      className={cn(
                        "cursor-pointer rounded-full px-3.5 py-1.5 text-[12px] font-bold transition",
                        draft.leaveYearStart === val ? "bg-slate-900 text-paper shadow-soft" : "bg-slate-900/[0.06] text-slate-900/60 hover:text-slate-900"
                      )}
                    >
                      1 {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          {/* Guardrails */}
          <Card className="p-6">
            <SectionHead eyebrow="Hard & soft guardrails" title="Booking rules" />
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-900/[0.08] p-4">
                <div className="flex gap-3">
                  <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-2xl", draft.hardBlock ? "bg-slate-900 text-teal-300" : "bg-slate-900/[0.06] text-slate-900/40")}>
                    {draft.hardBlock ? <ShieldCheck className="size-5" /> : <ShieldOff className="size-5" />}
                  </span>
                  <div>
                    <p className="text-[13.5px] font-bold text-slate-900">Preventative block</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-slate-900/55">
                      Clinicians are hard-blocked from submitting requests that exceed their remaining entitlement.
                    </p>
                  </div>
                </div>
                <Toggle checked={draft.hardBlock} onChange={(v) => set({ hardBlock: v })} />
              </div>

              <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-900/[0.08] p-4">
                <div className="flex gap-3">
                  <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-2xl", draft.allowOverride ? "bg-teal-400 text-slate-900" : "bg-slate-900/[0.06] text-slate-900/40")}>
                    <Scale className="size-5" />
                  </span>
                  <div>
                    <p className="text-[13.5px] font-bold text-slate-900">Managerial override</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-slate-900/55">
                      Allow force-approval against future accrual with a mandatory audit note — every override is written to the trail.
                    </p>
                  </div>
                </div>
                <Toggle checked={draft.allowOverride} onChange={(v) => set({ allowOverride: v })} />
              </div>

              <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-900/[0.08] p-4">
                <div className="flex gap-3">
                  <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-2xl", draft.excludeBankHolidays ? "bg-slate-900 text-teal-300" : "bg-slate-900/[0.06] text-slate-900/40")}>
                    <Landmark className="size-5" />
                  </span>
                  <div>
                    <p className="text-[13.5px] font-bold text-slate-900">Bank holiday exclusion</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-slate-900/55">
                      England & Wales bank holidays never deduct from entitlement when counting request length.
                    </p>
                  </div>
                </div>
                <Toggle checked={draft.excludeBankHolidays} onChange={(v) => set({ excludeBankHolidays: v })} />
              </div>
            </div>
          </Card>

          {/* Live pro-rata preview */}
          <Card className="p-6">
            <SectionHead eyebrow="Live preview" title="Pro-rata entitlement calculator" action={<Sparkles className="size-4 text-teal-500" />} />
            <div className="overflow-hidden rounded-2xl border border-slate-900/[0.08]">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-900/45">
                    <th className="px-4 py-2.5">Contract</th>
                    <th className="px-4 py-2.5">Annual</th>
                    <th className="px-4 py-2.5">Study</th>
                    <th className="px-4 py-2.5">Session target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/[0.05]">
                  {[9, 6, 4, 2].map((spw) => (
                    <tr key={spw} className="text-[13px]">
                      <td className="px-4 py-2.5 font-bold text-slate-900">{spw} sessions/wk</td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-900/70">{entitlementFor(previewClinician(spw), draft, "annual")}d</td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-900/70">{entitlementFor(previewClinician(spw), draft, "study")}d</td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-900/70">{spw * draft.workingWeeksPerYear} / 12m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {policyAudits.length > 0 && (
              <div className="mt-4 border-t border-slate-900/[0.07] pt-4">
                <p className="mb-2 flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-700/50">
                  <SlidersHorizontal className="size-3.5" /> Recent policy changes
                </p>
                <ul className="space-y-1.5">
                  {policyAudits.map((a) => (
                    <li key={a.id} className="text-[11.5px] text-slate-900/55">
                      <span className="font-semibold text-slate-900">{a.actorName}</span> — {a.detail} · {a.at.slice(0, 10)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stepper({
  label, hint, value, min, max, step = 1, suffix, onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-900/[0.08] p-4">
      <div>
        <p className="text-[13px] font-bold text-slate-900">{label}</p>
        <p className="mt-0.5 text-[11.5px] text-slate-900/50">{hint}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="size-8 cursor-pointer rounded-xl bg-slate-900/[0.06] text-base font-bold text-slate-900 transition hover:bg-slate-900/10"
        >
          −
        </button>
        <span className="w-[86px] text-center">
          <span className="font-display text-xl font-semibold tabular-nums text-slate-900">{value}</span>
          <span className="block text-[9.5px] font-bold uppercase tracking-wider text-slate-700/50">{suffix}</span>
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="size-8 cursor-pointer rounded-xl bg-slate-900/[0.06] text-base font-bold text-slate-900 transition hover:bg-slate-900/10"
        >
          +
        </button>
      </div>
    </div>
  );
}
