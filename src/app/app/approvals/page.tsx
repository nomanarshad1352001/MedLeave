"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  History,
  Inbox,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Timer,
  UserRound,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { CancelRequestModal, DecisionModal } from "@/components/modals";
import { Avatar, Badge, Button, Card, Dot, EmptyState, SectionHead, cn } from "@/components/ui";
import { StatusBadge } from "@/app/app/page";
import { correlationWarnings, evaluateRequest, fmtRange, relativeDay, paceStatus } from "@/lib/engine";
import { PACE_META } from "@/lib/types";
import type { LeaveRequest } from "@/lib/types";
import { COVER_LABEL, LEAVE_META } from "@/lib/types";
import { useStore } from "@/store/useStore";

export default function ApprovalsPage() {
  const { currentUserId, clinicians, requests, policy, sites, siteFilter, audit, sessions } = useStore();
  const me = clinicians.find((c) => c.id === currentUserId)!;
  const isManager = me.role === "manager";

  const watchIds = useMemo(
    () => new Map(correlationWarnings(clinicians, requests, sessions, policy).map((w) => [w.clinicianId, w])),
    [clinicians, requests, sessions, policy]
  );

  const [decision, setDecision] = useState<{ req: LeaveRequest; mode: "approve" | "reject" } | null>(null);
  const [cancel, setCancel] = useState<LeaveRequest | null>(null);
  const [histF, setHistF] = useState<"all" | "approved" | "rejected">("all");

  const inScope = useMemo(
    () => requests.filter((r) => {
      const c = clinicians.find((x) => x.id === r.clinicianId);
      return siteFilter === "all" || c?.siteId === siteFilter;
    }),
    [requests, clinicians, siteFilter]
  );

  const queue = isManager
    ? inScope.filter((r) => r.status === "pending").sort((a, b) => (a.requestedAt < b.requestedAt ? -1 : 1))
    : requests.filter((r) => r.clinicianId === currentUserId && r.status === "pending");

  const history = useMemo(() => {
    const src = isManager ? inScope : requests.filter((r) => r.clinicianId === currentUserId);
    return src
      .filter((r) => r.status !== "pending" && (histF === "all" || r.status === histF))
      .sort((a, b) => ((b.decidedAt ?? b.requestedAt) > (a.decidedAt ?? a.requestedAt) ? 1 : -1));
  }, [isManager, inScope, requests, currentUserId, histF]);

  const wantsOverride = queue.filter((r) => {
    const c = clinicians.find((x) => x.id === r.clinicianId);
    if (!c) return false;
    const ev = evaluateRequest(c, requests, policy, r.type, r.start, r.end, r.id);
    return ev.hard || ev.advance || r.override;
  }).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-700/50">
          {isManager ? "Decision centre" : "My decisions"}
        </p>
        <h1 className="font-display text-[34px] font-medium leading-tight tracking-tight text-slate-900">
          Approvals <span className="italic text-slate-700">& audit trail</span>
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-900/55">
          {isManager
            ? "Every decision is evaluated live against entitlement and projected accrual. Overrides are force-stamped with your audit note."
            : "Track the status of your requests and read the decision notes left by the practice manager."}
        </p>
      </div>

      {/* KPI micro-band */}
      <div className="flex flex-wrap gap-3">
        <KpiChip icon={<Inbox className="size-4" />} label={isManager ? "Awaiting you" : "Pending"} value={queue.length} />
        {isManager && (
          <KpiChip icon={<ShieldAlert className="size-4" />} label="Need override note" value={wantsOverride} tone="teal" />
        )}
        <KpiChip icon={<CheckCircle2 className="size-4" />} label="Approved this year" value={history.filter((h) => h.status === "approved").length} tone="green" />
        <KpiChip icon={<XCircle className="size-4" />} label="Rejected" value={history.filter((h) => h.status === "rejected").length} tone="rose" />
      </div>

      {/* Queue */}
      <div>
        <SectionHead
          eyebrow={isManager ? "Progressive queue — oldest first" : "Waiting on the practice manager"}
          title={isManager ? "Leave requests awaiting decision" : "Your open requests"}
        />
        {queue.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="size-6" />}
            title={isManager ? "Queue clear — nice work" : "Nothing pending"}
            body={isManager ? "Every request in this surgery view has been decided." : "Submit a leave request from the Leave centre to see it here."}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {queue.map((r) => {
              const c = clinicians.find((x) => x.id === r.clinicianId)!;
              const site = sites.find((s) => s.id === c.siteId);
              const ev = evaluateRequest(c, requests, policy, r.type, r.start, r.end, r.id);
              const meta = LEAVE_META[r.type];
              return (
                <Card key={r.id} className="relative overflow-hidden p-5">
                  <div className="absolute inset-y-0 left-0 w-[3px]" style={{ background: meta.color }} />
                  <div className="flex items-start gap-3.5">
                    <Avatar c={c} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <p className="text-[15px] font-bold text-slate-900">{c.name}</p>
                        <span className="rounded-full bg-slate-900/[0.06] px-2 py-0.5 text-[10px] font-bold text-slate-800">{c.grade}</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `color-mix(in srgb, ${site?.color ?? "var(--site-oak)"} 14%, transparent)`, color: site?.color }}>{site?.short}</span>
                      </div>
                      <p className="mt-1 text-[12.5px] font-semibold text-slate-900">
                        <Dot color={meta.color} className="mr-1.5" />{meta.label} — {fmtRange(r.start, r.end)}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-slate-900/50">
                        {r.days} working days · ≈{r.sessionsLost} sessions · {COVER_LABEL[r.cover]} · {relativeDay(r.start)}
                      </p>
                      {r.reason && <p className="mt-2 text-[12px] italic leading-relaxed text-slate-900/55">“{r.reason}”</p>}
                      {r.override && r.decisionNote && (
                        <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] font-semibold leading-relaxed text-teal-700">
                          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" /> Managerial note on file: {r.decisionNote}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* balance impact */}
                  {ev.capped && (
                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50/80 p-3 text-center">
                      <Impact label="Remaining now" value={`${ev.remaining}d`} />
                      <Impact label="Requesting" value={`${r.days}d`} />
                      <Impact label="Would leave" value={`${ev.afterFull}d`} danger={ev.afterFull < 0} />
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ev.hard && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-[10.5px] font-bold text-rose-700">
                        <ShieldAlert className="size-3" /> Exceeds entitlement — override only
                      </span>
                    )}
                    {!ev.hard && ev.advance && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-2.5 py-1 text-[10.5px] font-bold text-teal-700">
                        <AlertTriangle className="size-3" /> Borrows {Math.abs(ev.afterAccrual)}d ahead of accrual
                      </span>
                    )}
                    {!ev.hard && !ev.advance && ev.capped && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10.5px] font-bold text-emerald-700">
                        <CheckCircle2 className="size-3" /> Within entitlement & accrual
                      </span>
                    )}
                    {r.locumStatus === "needed" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-[10.5px] font-bold text-rose-700">
                        Needs locum cover — not yet booked
                      </span>
                    )}
                    {watchIds.has(r.clinicianId) && (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-[10.5px] font-bold text-rose-700"
                        title={`${watchIds.get(r.clinicianId)!.leaveDays} leave days vs ${watchIds.get(r.clinicianId)!.delivered} sessions delivered in the last 90 days`}
                      >
                        <Eye className="size-3" /> Staffing watch · {watchIds.get(r.clinicianId)!.leaveDays}d leave / 90d
                      </span>
                    )}
                    {c.clinical && paceStatus(c, sessions, policy).status === "deficit" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100/70 px-2.5 py-1 text-[10.5px] font-bold text-rose-700">
                        Session deficit · {paceStatus(c, sessions, policy).variance}
                      </span>
                    )}
                  </div>

                  {isManager ? (
                    <div className="mt-4 flex justify-end gap-2">
                      <Button variant="subtle" size="sm" onClick={() => setDecision({ req: r, mode: "reject" })}>
                        <XCircle className="size-3.5" /> Reject
                      </Button>
                      <Button size="sm" variant={ev.hard || ev.advance ? "teal" : "primary"} onClick={() => setDecision({ req: r, mode: "approve" })}>
                        {ev.hard || ev.advance ? <ShieldCheck className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                        {ev.hard ? "Force-approve…" : "Approve"}
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-teal-700">
                        <Timer className="size-3.5" /> Submitted {r.requestedAt.slice(0, 10)}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => setCancel(r)}>Withdraw</Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* History */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/[0.07] p-5">
          <SectionHead title="Decision history" eyebrow={`${history.length} records`} className="mb-0" />
          <div className="flex gap-1.5">
            {(["all", "approved", "rejected"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setHistF(s)}
                className={cn(
                  "cursor-pointer rounded-full px-3 py-1.5 text-[11.5px] font-bold capitalize transition",
                  histF === s ? "bg-slate-900 text-paper" : "bg-slate-900/[0.05] text-slate-900/55 hover:text-slate-900"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <ul className="divide-y divide-slate-900/[0.05]">
          {history.slice(0, 12).map((r) => {
            const c = clinicians.find((x) => x.id === r.clinicianId)!;
            const meta = LEAVE_META[r.type];
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50/60">
                {isManager && <Avatar c={c} size="sm" />}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-900">
                    {isManager ? `${c.firstName} · ` : ""}{meta.label} — {r.days}d
                  </p>
                  <p className="text-[11.5px] text-slate-900/50">{fmtRange(r.start, r.end)} · decided by {r.decidedByName ?? "—"}</p>
                  {r.decisionNote && (
                    <p className="mt-1 flex items-start gap-1.5 text-[11.5px] italic leading-relaxed text-slate-900/55">
                      <ScrollText className="mt-0.5 size-3 shrink-0 text-teal-600" />“{r.decisionNote}”
                    </p>
                  )}
                </div>
                {r.override && <Badge tone="teal"><ShieldAlert className="size-3" /> Override</Badge>}
                <StatusBadge status={r.status} />
              </li>
            );
          })}
          {history.length === 0 && (
            <li className="px-5 py-10 text-center text-[13px] text-slate-900/45">No decisions on record.</li>
          )}
        </ul>
      </Card>

      {/* Audit trail (manager) */}
      {isManager && (
        <Card className="p-6">
          <SectionHead eyebrow="Immutable log" title="Audit trail" action={<Badge tone="neutral"><History className="size-3" /> last {audit.length} events</Badge>} />
          <ol className="relative space-y-0 border-l border-slate-900/10 pl-0">
            {audit.slice(0, 10).map((a, i) => (
              <li key={a.id} className="relative flex gap-4 pb-5 pl-6 last:pb-0">
                <span className={cn(
                  "absolute -left-[7px] top-1 inline-flex size-3.5 items-center justify-center rounded-full border-2 border-card",
                  a.action.toLowerCase().includes("override") ? "bg-teal-400" : a.action.toLowerCase().includes("reject") ? "bg-rose-500" : "bg-slate-600"
                )} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-slate-900">
                    {a.action}
                    <span className="text-[10.5px] font-semibold text-slate-900/40">
                      {formatDistanceToNowStrict(parseISO(a.at), { addSuffix: true })}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-slate-900/55">{a.detail}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-900/40">
                    <UserRound className="size-3" /> {a.actorName}
                  </p>
                </div>
                {i === 0 && <Badge tone="teal" className="self-start">Latest</Badge>}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <DecisionModal req={decision?.req ?? null} mode={decision?.mode ?? "approve"} onClose={() => setDecision(null)} />
      <CancelRequestModal req={cancel} onClose={() => setCancel(null)} />
    </div>
  );
}

function Impact({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl bg-white/60 py-2">
      <p className={cn("font-display text-lg font-semibold leading-none tabular-nums", danger ? "text-rose-500" : "text-slate-900")}>{value}</p>
      <p className="mt-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-700/50">{label}</p>
    </div>
  );
}

function KpiChip({ icon, label, value, tone = "slate" }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: "slate" | "teal" | "rose" | "green" }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-900/[0.08] bg-card px-4 py-3 shadow-soft">
      <span className={cn(
        "inline-flex size-9 items-center justify-center rounded-xl",
        tone === "slate" && "bg-slate-900 text-teal-300",
        tone === "teal" && "bg-teal-100 text-teal-700",
        tone === "rose" && "bg-rose-100 text-rose-700",
        tone === "green" && "bg-emerald-50 text-emerald-700"
      )}>
        {icon}
      </span>
      <span>
        <span className="block font-display text-xl font-semibold leading-none text-slate-900">{value}</span>
        <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700/50">{label}</span>
      </span>
    </div>
  );
}
