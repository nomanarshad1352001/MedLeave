"use client";

import { differenceInCalendarDays, format, parseISO, addMonths } from "date-fns";
import {
  ArrowDownUp,
  CalendarPlus,
  GraduationCap,
  Palmtree,
  Scale,
  Sigma,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  CancelRequestModal,
  DecisionModal,
  RequestLeaveModal,
} from "@/components/modals";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Dot,
  Ring,
  SectionHead,
  Segmented,
  cn,
} from "@/components/ui";
import { StatusBadge } from "@/app/app/page";
import {
  balanceSummary,
  fmtDay,
  fmtRange,
  leaveYearWindow,
  relativeDay,
  todayISO,
} from "@/lib/engine";
import type { LeaveRequest, LeaveStatus, LeaveType } from "@/lib/types";
import { COVER_LABEL, LEAVE_META } from "@/lib/types";
import { useStore } from "@/store/useStore";

type Tab = "mine" | "practice";

export default function LeavePage() {
  const { currentUserId, clinicians, requests, policy } = useStore();
  const me = clinicians.find((c) => c.id === currentUserId)!;
  const isManager = me.role === "manager";

  const [tab, setTab] = useState<Tab>("mine");
  const [reqOpen, setReqOpen] = useState(false);
  const [reqType, setReqType] = useState<LeaveType>("annual");
  const [decision, setDecision] = useState<{ req: LeaveRequest; mode: "approve" | "reject" } | null>(null);
  const [cancel, setCancel] = useState<LeaveRequest | null>(null);

  const annual = balanceSummary(me, requests, policy, "annual");
  const study = balanceSummary(me, requests, policy, "study");
  const today = todayISO();

  const myRequests = useMemo(
    () => requests.filter((r) => r.clinicianId === currentUserId),
    [requests, currentUserId]
  );

  const taken = myRequests.filter((r) => r.status === "approved" && r.end < today);
  const upcomingApproved = myRequests.filter((r) => r.status === "approved" && r.end >= today);
  const pendingMine = myRequests.filter((r) => r.status === "pending");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-700/50">Leave centre</p>
          <h1 className="font-display text-[34px] font-medium leading-tight tracking-tight text-slate-900">
            Balances & <span className="italic text-slate-700">the rolling year</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-900/55">
            Entitlements accrue pro-rata to contracted sessions. Past, pending and future leave are laid over your {format(leaveYearWindow(policy, new Date()).start, "MMM yyyy")} – {format(leaveYearWindow(policy, new Date()).end, "MMM yyyy")} year below.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {isManager && (
            <Segmented<Tab>
              value={tab}
              onChange={setTab}
              options={[
                { value: "mine", label: "My leave" },
                { value: "practice", label: "Practice-wide" },
              ]}
            />
          )}
          <Button variant="teal" onClick={() => { setReqType("annual"); setReqOpen(true); }}>
            <CalendarPlus className="size-4" /> New request
          </Button>
        </div>
      </div>

      {tab === "mine" ? (
        <>
          {/* Balance cards */}
          <div className="grid gap-5 lg:grid-cols-3">
            <BalanceCard
              tone="slate"
              icon={<Palmtree className="size-5" />}
              title="Annual leave"
              entitlement={annual.entitlement}
              accrued={annual.accrued}
              used={annual.used}
              pending={annual.pending}
              remaining={annual.remaining}
              formula={
                me.clinical
                  ? `${policy.baseAnnualDays}d × ${me.sessionsPerWeek}/${policy.fullTimeSessions} sessions = ${annual.entitlement}d pro-rata`
                  : `Full-time administrative entitlement`
              }
              onRequest={() => { setReqType("annual"); setReqOpen(true); }}
            />
            <BalanceCard
              tone="teal"
              icon={<GraduationCap className="size-5" />}
              title="Study leave"
              entitlement={study.entitlement}
              accrued={study.accrued}
              used={study.used}
              pending={study.pending}
              remaining={study.remaining}
              formula={
                me.clinical
                  ? `${policy.baseStudyDays}d × ${me.sessionsPerWeek}/${policy.fullTimeSessions} sessions = ${study.entitlement}d pro-rata`
                  : `${policy.baseStudyDays}d CPD allowance`
              }
              onRequest={() => { setReqType("study"); setReqOpen(true); }}
            />
            <Card className="flex flex-col p-6">
              <SectionHead eyebrow="Snapshot" title="Days at a glance" />
              <div className="mt-1 grid flex-1 grid-cols-3 gap-3">
                {[
                  { label: "Taken", value: taken.reduce((a, r) => a + r.days, 0), sub: `${taken.length} period${taken.length === 1 ? "" : "s"}` },
                  { label: "Approved", value: upcomingApproved.reduce((a, r) => a + r.days, 0), sub: "ahead of you" },
                  { label: "Pending", value: pendingMine.reduce((a, r) => a + r.days, 0), sub: "awaiting decision" },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col rounded-2xl bg-slate-50/80 p-4 text-center">
                    <span className="font-display text-[30px] font-medium leading-none text-slate-900">{s.value}</span>
                    <span className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700/55">{s.label}</span>
                    <span className="mt-1 text-[10.5px] text-slate-900/45">{s.sub}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-teal-400/40 bg-teal-100/50 p-3.5 text-[11.5px] font-medium leading-relaxed text-teal-700">
                <Scale className="mt-0.5 size-4 shrink-0" />
                Hard guardrail active — requests beyond entitlement are blocked; borrowing ahead of accrual requires a managerial override note.
              </div>
            </Card>
          </div>

          {/* Rolling timeline */}
          <LeaveYearTimeline requests={myRequests} policy={policy} />

          {/* My requests table */}
          <RequestsTable
            title="My requests"
            rows={myRequests}
            clinicians={clinicians}
            onCancel={(r) => setCancel(r)}
          />
        </>
      ) : (
        <RequestsTable
          title="All practice requests"
          rows={requests}
          clinicians={clinicians}
          showClinician
          onCancel={(r) => setCancel(r)}
          onDecide={(r, mode) => setDecision({ req: r, mode })}
        />
      )}

      <RequestLeaveModal open={reqOpen} onClose={() => setReqOpen(false)} defaultType={reqType} />
      <DecisionModal req={decision?.req ?? null} mode={decision?.mode ?? "approve"} onClose={() => setDecision(null)} />
      <CancelRequestModal req={cancel} onClose={() => setCancel(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Balance hero card                                                   */
/* ------------------------------------------------------------------ */
function BalanceCard({
  icon, title, entitlement, accrued, used, pending, remaining, formula, onRequest, tone,
}: {
  icon: React.ReactNode;
  title: string;
  entitlement: number;
  accrued: number;
  used: number;
  pending: number;
  remaining: number;
  formula: string;
  onRequest: () => void;
  tone: "slate" | "teal";
}) {
  const pctUsed = entitlement > 0 ? Math.min(100, ((used + pending) / entitlement) * 100) : 0;
  const color = tone === "slate" ? "#0D9488" : "#F59E0B";
  return (
    <Card className="relative overflow-hidden p-6">
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <span className={cn("inline-flex size-10 items-center justify-center rounded-2xl", tone === "slate" ? "bg-slate-900 text-teal-300" : "bg-teal-400 text-slate-900")}>
          {icon}
        </span>
        <Ring value={100 - pctUsed} size={72} stroke={7} color={color}>
          <span className="font-display text-lg font-semibold text-slate-900">{Math.round(100 - pctUsed)}%</span>
        </Ring>
      </div>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-700/55">{title}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-[44px] font-medium leading-none tracking-tight text-slate-900">{remaining}</span>
        <span className="text-sm font-semibold text-slate-900/40">days of {entitlement}</span>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-900/[0.07] pt-4 text-center">
        <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-700/50">Accrued</dt><dd className="mt-1 text-[15px] font-bold text-slate-900 tabular-nums">{accrued}d</dd></div>
        <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-700/50">Approved</dt><dd className="mt-1 text-[15px] font-bold text-slate-900 tabular-nums">{used}d</dd></div>
        <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-700/50">Pending</dt><dd className="mt-1 text-[15px] font-bold text-slate-900 tabular-nums">{pending}d</dd></div>
      </dl>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-900/45">
        <Sigma className="size-3.5" /> {formula}
      </p>
      <Button variant="outline" size="sm" className="mt-4 w-full" onClick={onRequest}>
        <CalendarPlus className="size-3.5" /> Request {title.toLowerCase()}
      </Button>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Rolling leave-year timeline                                         */
/* ------------------------------------------------------------------ */
function LeaveYearTimeline({ requests, policy }: { requests: LeaveRequest[]; policy: ReturnType<typeof useStore.getState>["policy"] }) {
  const { start, end } = leaveYearWindow(policy, new Date());
  const ys = format(start, "yyyy-MM-dd");
  const ye = format(end, "yyyy-MM-dd");
  const span = differenceInCalendarDays(end, start);
  const today = todayISO();
  const pos = (iso: string) =>
    Math.max(0, Math.min(100, (differenceInCalendarDays(parseISO(iso), start) / span) * 100));

  const visible = requests
    .filter((r) => r.status !== "rejected" && r.end >= ys && r.start <= ye)
    .sort((a, b) => (a.start < b.start ? -1 : 1));

  const months: string[] = [];
  for (let i = 0; i < 12; i++) months.push(format(addMonths(start, i), "MMM"));

  const laneOf = (r: LeaveRequest): number => {
    if (r.type === "sickness" || r.type === "parental" || r.type === "locum") return 0;
    if (r.status === "pending") return 1;
    return r.end < today ? 2 : 3;
  };
  const lanes = [
    { label: "Recorded", bg: "rgba(15,23,42,0.035)" },
    { label: "Pending", bg: "rgba(15,23,42,0.035)" },
    { label: "Taken", bg: "rgba(15,23,42,0.035)" },
    { label: "Approved ahead", bg: "rgba(15,23,42,0.035)" },
  ];

  const todayPct = pos(today);

  return (
    <Card className="p-6">
      <SectionHead
        eyebrow="Rolling view timeline"
        title={`Leave year ${format(start, "d MMM yyyy")} → ${format(end, "d MMM yyyy")}`}
        action={
          <div className="hidden items-center gap-3 text-[10.5px] font-semibold text-slate-900/50 lg:flex">
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-slate-900/25" /> Taken</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-slate-600" /> Approved</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full border border-teal-500 bg-teal-300/60" /> Pending</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-rose-500" /> Recorded</span>
          </div>
        }
      />
      <div className="relative">
        {/* today marker */}
        <div className="pointer-events-none absolute inset-y-0 z-10 w-px" style={{ left: `${todayPct}%` }}>
          <div className="h-full w-px bg-teal-600" />
          <div className="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full border-2 border-card bg-teal-500" />
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-teal-300">Today</span>
        </div>

        <div className="space-y-1.5 pt-6">
          {lanes.map((lane, li) => (
            <div key={lane.label} className="flex items-center gap-3">
              <span className="w-[86px] shrink-0 text-right text-[10px] font-bold uppercase tracking-wider text-slate-900/40">{lane.label}</span>
              <div className="relative h-8 flex-1 rounded-xl" style={{ background: lane.bg }}>
                {visible.filter((r) => laneOf(r) === li).map((r) => {
                  const l = pos(r.start);
                  const w = Math.max(1.2, pos(r.end) - l + 0.15);
                  const meta = LEAVE_META[r.type];
                  const isPending = r.status === "pending";
                  const recorded = r.type === "sickness" || r.type === "parental" || r.type === "locum";
                  const bg = isPending
                    ? `repeating-linear-gradient(45deg, ${meta.color}55 0 6px, ${meta.color}22 6px 12px)`
                    : r.end < today || recorded
                      ? "rgba(15,23,42,0.28)"
                      : meta.color;
                  return (
                    <div
                      key={r.id}
                      title={`${meta.label} · ${r.days}d · ${fmtRange(r.start, r.end)}${r.reason ? ` — ${r.reason}` : ""}`}
                      className="absolute top-1/2 h-5 -translate-y-1/2 cursor-pointer rounded-full border transition-transform hover:scale-y-125"
                      style={{ left: `${l}%`, width: `${w}%`, background: bg, borderColor: isPending ? meta.color : "transparent" }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* month axis */}
        <div className="ml-[98px] mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-900/35">
          {months.map((m) => <span key={m}>{m}</span>)}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Requests table with sorting / filtering                             */
/* ------------------------------------------------------------------ */
type SortKey = "start" | "days" | "type" | "status";

function RequestsTable({
  title,
  rows,
  clinicians,
  showClinician = false,
  onCancel,
  onDecide,
}: {
  title: string;
  rows: LeaveRequest[];
  clinicians: ReturnType<typeof useStore.getState>["clinicians"];
  showClinician?: boolean;
  onCancel?: (r: LeaveRequest) => void;
  onDecide?: (r: LeaveRequest, mode: "approve" | "reject") => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("start");
  const [dir, setDir] = useState<1 | -1>(1);
  const [statusF, setStatusF] = useState<"all" | LeaveStatus>("all");
  const [typeF, setTypeF] = useState<"all" | LeaveType>("all");
  const today = todayISO();

  const filtered = useMemo(() => {
    const out = rows.filter(
      (r) => (statusF === "all" || r.status === statusF) && (typeF === "all" || r.type === typeF)
    );
    const statusRank: Record<LeaveStatus, number> = { pending: 0, approved: 1, rejected: 2 };
    out.sort((a, b) => {
      let v = 0;
      if (sortKey === "start") v = a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
      if (sortKey === "days") v = a.days - b.days;
      if (sortKey === "type") v = a.type.localeCompare(b.type);
      if (sortKey === "status") v = statusRank[a.status] - statusRank[b.status];
      return v * dir;
    });
    return out;
  }, [rows, statusF, typeF, sortKey, dir]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(k); setDir(1); }
  };

  const ThBtn = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <button
      onClick={() => toggleSort(k)}
      className={cn("inline-flex cursor-pointer items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] transition hover:text-slate-900", sortKey === k ? "text-slate-900" : "text-slate-900/40", className)}
    >
      {label} <ArrowDownUp className={cn("size-3", sortKey === k && "text-teal-600")} />
    </button>
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/[0.07] p-5">
        <SectionHead title={title} className="mb-0" eyebrow={`${filtered.length} of ${rows.length} shown`} />
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusF(s)}
              className={cn(
                "cursor-pointer rounded-full px-3 py-1.5 text-[11.5px] font-bold capitalize transition",
                statusF === s ? "bg-slate-900 text-paper" : "bg-slate-900/[0.05] text-slate-900/55 hover:text-slate-900"
              )}
            >
              {s}
            </button>
          ))}
          <select
            value={typeF}
            onChange={(e) => setTypeF(e.target.value as typeof typeF)}
            className="cursor-pointer rounded-full border border-slate-900/12 bg-white/70 px-3 py-1.5 text-[11.5px] font-bold text-slate-900 outline-none"
          >
            <option value="all">All categories</option>
            {(Object.keys(LEAVE_META) as LeaveType[]).map((t) => (
              <option key={t} value={t}>{LEAVE_META[t].label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="border-b border-slate-900/[0.07] bg-slate-50/60">
              {showClinician && <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-900/45">Clinician</th>}
              <th className="px-5 py-3"><ThBtn k="type" label="Category" /></th>
              <th className="px-5 py-3"><ThBtn k="start" label="Dates" /></th>
              <th className="px-5 py-3"><ThBtn k="days" label="Days" /></th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-900/45">Sessions</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-900/45">Cover</th>
              <th className="px-5 py-3"><ThBtn k="status" label="Status" /></th>
              <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-slate-900/45">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/[0.05]">
            {filtered.map((r) => {
              const c = clinicians.find((x) => x.id === r.clinicianId);
              const meta = LEAVE_META[r.type];
              return (
                <tr key={r.id} className="group transition-colors hover:bg-slate-50/70">
                  {showClinician && (
                    <td className="px-5 py-3.5">
                      {c && (
                        <span className="flex items-center gap-2.5">
                          <Avatar c={c} size="xs" />
                          <span className="text-[12.5px] font-semibold text-slate-900">{c.name}</span>
                        </span>
                      )}
                    </td>
                  )}
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: meta.soft, color: meta.deep }}>
                      <Dot color={meta.color} className="size-1.5" />{meta.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="block text-[12.5px] font-semibold text-slate-900">{fmtRange(r.start, r.end)}</span>
                    <span className="text-[10.5px] text-slate-900/45">{r.start >= today ? relativeDay(r.start) : r.end >= today ? "In progress" : fmtDay(r.start)}</span>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] font-bold tabular-nums text-slate-900">{r.days}</td>
                  <td className="px-5 py-3.5 text-[12.5px] tabular-nums text-slate-900/60">{r.sessionsLost > 0 ? `≈${r.sessionsLost}` : "—"}</td>
                  <td className="px-5 py-3.5 text-[11.5px] font-medium text-slate-900/60">
                    {COVER_LABEL[r.cover]}
                    {r.locumStatus === "booked" && (
                      <span className="mt-0.5 block text-[10px] font-bold text-slate-700">locum: {r.locumName}</span>
                    )}
                    {r.locumStatus === "needed" && (
                      <span className="mt-0.5 block text-[10px] font-bold text-rose-600">cover unbooked</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={r.status} />
                      {r.override && <Badge tone="teal">Override</Badge>}
                    </div>
                    {r.decisionNote && (
                      <p className="mt-1 max-w-[220px] truncate text-[10.5px] italic text-slate-900/45" title={r.decisionNote}>“{r.decisionNote}”</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex gap-1.5 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
                      {r.status === "pending" && onDecide && (
                        <>
                          <Button size="sm" variant="subtle" onClick={() => onDecide(r, "reject")}>Reject</Button>
                          <Button size="sm" onClick={() => onDecide(r, "approve")}>Approve</Button>
                        </>
                      )}
                      {r.status !== "rejected" && r.end >= today && onCancel && (
                        <Button size="sm" variant="ghost" onClick={() => onCancel(r)}>Withdraw</Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-[13px] text-slate-900/45">
                  No requests match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
