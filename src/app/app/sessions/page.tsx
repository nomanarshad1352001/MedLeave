"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Equal,
  Eye,
  Flame,
  Stethoscope,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { MonthlyBars } from "@/components/charts";
import { LogSessionModal } from "@/components/modals";
import { Avatar, Badge, Bar, Button, Card, Dot, Ring, SectionHead, Segmented, cn } from "@/components/ui";
import {
  correlationWarnings,
  fmtDay,
  monthlySeries,
  paceStatus,
  rollingSessions,
  sessionsTarget,
  weeklyPattern,
} from "@/lib/engine";
import type { SessionLog } from "@/lib/types";
import { PACE_META } from "@/lib/types";
import { useStore } from "@/store/useStore";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function SessionsPage() {
  const { currentUserId, clinicians, requests, sessions, policy } = useStore();
  const me = clinicians.find((c) => c.id === currentUserId)!;
  const isManager = me.role === "manager";

  const [tab, setTab] = useState<"mine" | "practice">("mine");
  const [logOpen, setLogOpen] = useState(false);
  const [activityF, setActivityF] = useState("all");
  const [dateAsc, setDateAsc] = useState(false);

  const pace = useMemo(() => paceStatus(me, sessions, policy), [me, sessions, policy]);
  const paceMeta = PACE_META[pace.status];
  const pattern = useMemo(() => new Set(weeklyPattern(me.sessionsPerWeek).map(([d, p]) => `${d}-${p}`)), [me.sessionsPerWeek]);

  const series = useMemo(
    () => monthlySeries(sessions, me.clinical ? [me.id] : null, me.clinical ? pace.target : 0),
    [sessions, me, pace.target]
  );

  const myLogs = useMemo(() => {
    const list = sessions
      .filter((l) => l.clinicianId === me.id && (activityF === "all" || l.activity === activityF))
      .sort((a, b) => (a.date < b.date ? (dateAsc ? -1 : 1) : dateAsc ? 1 : -1));
    return list.slice(0, 14);
  }, [sessions, me.id, activityF, dateAsc]);

  const activities = Array.from(new Set(sessions.filter((l) => l.clinicianId === me.id).map((l) => l.activity)));

  /* Practice oversight data */
  const clinicalStaff = clinicians.filter((c) => c.clinical);
  const [teamSort, setTeamSort] = useState<"name" | "pace" | "spw">("pace");
  const [teamDir, setTeamDir] = useState<1 | -1>(1);

  const watchlist = useMemo(
    () => correlationWarnings(clinicians, requests, sessions, policy),
    [clinicians, requests, sessions, policy]
  );
  const watchIds = useMemo(() => new Map(watchlist.map((w) => [w.clinicianId, w])), [watchlist]);

  const teamRows = useMemo(() => {
    const rows = clinicalStaff.map((c) => {
      const r = rollingSessions(sessions, c.id);
      const t = sessionsTarget(c, policy);
      const p = t > 0 ? Math.round((r.completed / t) * 100) : 0;
      const pstatus = paceStatus(c, sessions, policy);
      return { c, delivered: r.completed, cancelled: r.cancelled, target: t, pace: p, pstatus };
    });
    rows.sort((a, b) => {
      let v = 0;
      if (teamSort === "name") v = a.c.name.localeCompare(b.c.name);
      if (teamSort === "pace") v = a.pace - b.pace;
      if (teamSort === "spw") v = a.c.sessionsPerWeek - b.c.sessionsPerWeek;
      return v * teamDir;
    });
    return rows;
  }, [clinicalStaff, sessions, policy, teamSort, teamDir]);

  const teamSeries = useMemo(
    () => monthlySeries(sessions, clinicalStaff.map((c) => c.id), clinicalStaff.reduce((a, c) => a + sessionsTarget(c, policy), 0)),
    [sessions, clinicalStaff, policy]
  );

  const Totals = teamRows.reduce(
    (acc, r) => ({ delivered: acc.delivered + r.delivered, target: acc.target + r.target }),
    { delivered: 0, target: 0 }
  );
  const deficitCount = teamRows.filter((r) => r.pstatus.status === "deficit").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-700/50">Session tracker</p>
          <h1 className="font-display text-[34px] font-medium leading-tight tracking-tight text-slate-900">
            The rolling <span className="italic text-slate-700">12-month commitment</span>
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-900/55">
            Contracted sessions × {policy.workingWeeksPerYear} working weeks, monitored on a live pace line.
            Extras top up the ledger; cancellations fall out of it; swaps move delivery without changing it.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {isManager && (
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: "mine", label: "My rolling year" },
                { value: "practice", label: "Practice oversight" },
              ]}
            />
          )}
          <Button variant="outline" onClick={() => setLogOpen(true)}>
            <Stethoscope className="size-4" /> Session journal
          </Button>
        </div>
      </div>

      {tab === "mine" ? (
        <>
          {/* Personal pace band */}
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="flex items-center gap-6 p-6">
              <Ring value={pace.target > 0 ? Math.min(120, pace.pct) : 0} size={136} stroke={12} color={paceMeta.color}>
                <div className="text-center">
                  <p className="font-display text-[30px] font-medium leading-none text-slate-900">{me.clinical ? `${pace.pct}%` : "—"}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-700/50">of pace</p>
                </div>
              </Ring>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-700/55">Target pace · year to date</p>
                <Badge tone={paceMeta.tone} className="mt-2.5">
                  {pace.status === "on-track" && <Equal className="size-3" />}
                  {pace.status === "deficit" && <TrendingDown className="size-3" />}
                  {pace.status === "surplus" && <Flame className="size-3" />}
                  {me.clinical ? paceMeta.label : "Non-clinical role"}
                </Badge>
                {me.clinical && (
                  <p className="mt-2.5 text-[12.5px] font-semibold leading-snug text-slate-900/60">
                    {pace.variance === 0
                      ? "Exactly on the contracted line — immaculate."
                      : pace.variance > 0
                        ? `${pace.variance} sessions ahead of where the contract expects you today.`
                        : `${Math.abs(pace.variance)} sessions behind the contracted expectation today.`}
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <SectionHead eyebrow="Projection" title="Year-end forecast" className="mb-4" />
              {/* progress with expected marker */}
              <div className="relative pt-5">
                <div className="relative h-3 overflow-visible rounded-full bg-slate-900/[0.07]">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, (pace.delivered / Math.max(1, pace.target)) * 100)}%`, background: paceMeta.color }}
                  />
                  <span
                    className="absolute -top-1.5 h-6 w-[3px] rounded-full bg-slate-900"
                    style={{ left: `${Math.round(pace.elapsedFrac * 100)}%` }}
                  />
                  <span
                    className="absolute -top-5 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase tracking-wider text-slate-900"
                    style={{ left: `clamp(16%, ${Math.round(pace.elapsedFrac * 100)}%, 84%)` }}
                  >
                    expected {pace.expected}
                  </span>
                </div>
              </div>
              <dl className="mt-6 space-y-2.5 text-[13px]">
                <Row k="Delivered (target year)" v={`${pace.delivered}`} strong />
                <Row k="Expected by today" v={`${pace.expected}`} />
                <Row k="Full-year target" v={`${pace.target}`} />
                <Row k="Projected year total" v={me.clinical ? `${pace.projected}` : "—"} strong />
                <Row k="Variance" v={`${pace.variance > 0 ? "+" : ""}${pace.variance}`} />
              </dl>
            </Card>

            <Card className="p-6">
              <SectionHead eyebrow="Contract" title="Weekly pattern" className="mb-4" />
              <div className="grid grid-cols-2 gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900/40">Day</span>
                <div className="grid grid-cols-2 gap-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-900/40">
                  <span>AM</span><span>PM</span>
                </div>
                {DAYS.map((d, i) => (
                  <div key={d} className="contents">
                    <span className="flex items-center text-[12px] font-semibold text-slate-900">{d}</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(["AM", "PM"] as const).map((p) => {
                        const on = pattern.has(`${i + 1}-${p}`);
                        return (
                          <span
                            key={p}
                            className={cn(
                              "cursor-default rounded-lg py-1.5 text-center text-[10.5px] font-bold transition",
                              on ? "bg-slate-600 text-white shadow-soft" : "border border-dashed border-slate-900/15 text-slate-900/30"
                            )}
                            title={on ? `Contracted ${d} ${p}` : `Protected time ${d} ${p}`}
                          >
                            {on ? "On" : "—"}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-900/45">
                <CalendarClock className="mr-1 inline size-3.5" />
                {me.clinical
                  ? `${me.sessionsPerWeek} clinical sessions + ${10 - me.sessionsPerWeek} protected blocks — target ${pace.target}/yr.`
                  : "Administrative full-time equivalent."}
              </p>
            </Card>
          </div>

          {/* Chart */}
          <Card className="p-6">
            <SectionHead eyebrow="Month on month" title="Delivered sessions vs pro-rata target" />
            <MonthlyBars data={series} height={260} />
          </Card>

          {/* Recent journal */}
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/[0.07] p-5">
              <SectionHead title="Session journal" eyebrow={`Latest ${myLogs.length} entries`} className="mb-0" />
              <div className="flex items-center gap-2">
                <select
                  value={activityF}
                  onChange={(e) => setActivityF(e.target.value)}
                  className="cursor-pointer rounded-full border border-slate-900/12 bg-white/70 px-3 py-1.5 text-[11.5px] font-bold text-slate-900 outline-none"
                >
                  <option value="all">All activities</option>
                  {activities.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <Button variant="subtle" size="sm" onClick={() => setDateAsc((v) => !v)}>
                  <ArrowDownUp className="size-3.5" /> {dateAsc ? "Oldest first" : "Newest first"}
                </Button>
              </div>
            </div>
            <ul className="divide-y divide-slate-900/[0.05]">
              {myLogs.map((l) => (
                <JournalRow key={l.id} l={l} />
              ))}
              {myLogs.length === 0 && (
                <li className="px-5 py-12 text-center text-[13px] text-slate-900/45">
                  {me.clinical ? "No sessions match this filter." : "Session logging applies to clinical roles."}
                </li>
              )}
            </ul>
          </Card>
        </>
      ) : (
        <>
          {/* Watchlist */}
          <Card className="p-6">
            <SectionHead
              eyebrow="Session-to-leave correlation · rolling 90 days"
              title="Safe staffing watchlist"
              action={<Badge tone="neutral">{watchlist.length} flagged · threshold {policy.safeStaffingThreshold}d</Badge>}
            />
            {watchlist.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50/80 p-4">
                <CheckCircle2 className="size-5 text-slate-600" />
                <p className="text-[12.5px] font-medium leading-relaxed text-slate-800">
                  Nobody exceeds {policy.safeStaffingThreshold} leave days against sessions delivered in the last 90 days. Cover ratios look safe.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {watchlist.map((w) => {
                  const c = clinicians.find((x) => x.id === w.clinicianId)!;
                  return (
                    <div
                      key={w.clinicianId}
                      className={cn(
                        "flex items-center gap-4 rounded-2xl border p-4",
                        w.severity === "high" ? "border-rose-500/30 bg-rose-100/50" : "border-teal-400/40 bg-teal-100/40"
                      )}
                    >
                      <Avatar c={c} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13.5px] font-bold text-slate-900">{c.name}</p>
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                            w.severity === "high" ? "bg-rose-500 text-white" : "bg-teal-400 text-slate-900"
                          )}>
                            <AlertTriangle className="size-3" /> {w.severity === "high" ? "High — review now" : "Review"}
                          </span>
                        </div>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-slate-900/60">
                          <strong className="text-slate-900">{w.leaveDays}d</strong> planned leave in 90 days · delivered{" "}
                          <strong className="text-slate-900">{w.delivered}</strong> of ~{w.expected} expected sessions (
                          {Math.round(w.deliveryRatio * 100)}% delivery)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn("font-display text-2xl font-semibold", w.severity === "high" ? "text-rose-500" : "text-teal-600")}>
                          {w.leaveDays}d
                        </p>
                        <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-900/40">leave / 90d</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-4 border-t border-slate-900/[0.07] pt-3.5 text-[11.5px] leading-relaxed text-slate-900/45">
              <Eye className="mr-1 inline size-3.5" />
              A clinician appears here when approved annual / study / locum-covered leave in the trailing 90 days reaches{" "}
              {policy.safeStaffingThreshold}+ days — a prompt to review safe staffing thresholds, not a judgement. Tune the threshold in Policies.
            </p>
          </Card>

          <Card className="p-6">
            <SectionHead
              eyebrow="All clinicians"
              title="Practice-wide delivery, trailing 12 months"
              action={deficitCount > 0 ? <Badge tone="rose">{deficitCount} in deficit</Badge> : <Badge tone="green">No deficits</Badge>}
            />
            <MonthlyBars data={teamSeries} height={240} />
          </Card>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/[0.07] p-5">
              <SectionHead
                title="Quota audit by clinician"
                eyebrow={`${Totals.delivered.toLocaleString()} of ${Totals.target.toLocaleString()} practice sessions delivered`}
                className="mb-0"
              />
              <div className="flex gap-1.5">
                {(
                  [
                    ["name", "Name"],
                    ["spw", "Contract"],
                    ["pace", "Rolling %"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => { if (teamSort === k) setTeamDir((d) => (d === 1 ? -1 : 1)); else { setTeamSort(k); setTeamDir(k === "name" ? 1 : -1); } }}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition",
                      teamSort === k ? "bg-slate-900 text-paper" : "bg-slate-900/[0.05] text-slate-900/55"
                    )}
                  >
                    {label} <ArrowDownUp className="size-3" />
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr className="border-b border-slate-900/[0.07] bg-slate-50/60 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-900/45">
                    <th className="px-5 py-3">Clinician</th>
                    <th className="px-5 py-3">Contract</th>
                    <th className="px-5 py-3">Delivered 12m</th>
                    <th className="w-[200px] px-5 py-3">Rolling vs target</th>
                    <th className="px-5 py-3">Pace status</th>
                    <th className="px-5 py-3 text-right">Watch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/[0.05]">
                  {teamRows.map(({ c, delivered, target, pace: rp, cancelled, pstatus }) => {
                    const meta = PACE_META[pstatus.status];
                    const watch = watchIds.get(c.id);
                    return (
                      <tr key={c.id} className="transition hover:bg-slate-50/70">
                        <td className="px-5 py-3.5">
                          <span className="flex items-center gap-2.5">
                            <Avatar c={c} size="sm" />
                            <span>
                              <span className="block text-[13px] font-bold text-slate-900">{c.name}</span>
                              <span className="text-[10.5px] text-slate-900/45">{c.grade}</span>
                            </span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[12.5px] font-semibold tabular-nums text-slate-900/70">{c.sessionsPerWeek}/wk → {target}</td>
                        <td className="px-5 py-3.5 text-[13px] font-bold tabular-nums text-slate-900">
                          {delivered}
                          <span className="ml-1 text-[10.5px] font-semibold text-slate-900/40">({cancelled} lost)</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="flex items-center gap-2.5">
                            <Bar value={rp} color={rp >= 97 ? "#0D9488" : rp >= 88 ? "#F59E0B" : "#F43F5E"} className="w-24" />
                            <span className="w-10 text-[12px] font-bold tabular-nums text-slate-900">{rp}%</span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge tone={meta.tone}>
                            {pstatus.status === "deficit" && <TrendingDown className="size-3" />}
                            {pstatus.status === "surplus" && <TrendingUp className="size-3" />}
                            {meta.label}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {watch ? (
                            <Badge tone={watch.severity === "high" ? "rose" : "teal"}>
                              <Eye className="size-3" /> {watch.leaveDays}d/90d
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-slate-900/30">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-900/[0.07] bg-slate-50/60 px-5 py-3 text-[11.5px] font-semibold text-slate-900/55">
              <span className="flex items-center gap-1.5"><Dot color="#0D9488" /> {clinicalStaff.length} clinicians under rolling audit</span>
              <a href="/app/roster" className="inline-flex items-center gap-1 text-slate-700 transition hover:text-slate-900">
                Open staff roster <ArrowRight className="size-3.5" />
              </a>
            </div>
          </Card>
        </>
      )}

      <LogSessionModal open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  );
}

function JournalRow({ l }: { l: SessionLog }) {
  const originBadge =
    l.origin === "extra" ? (
      <Badge tone="teal"><TrendingUp className="size-3" /> Extra</Badge>
    ) : l.origin === "swap" ? (
      <Badge tone="sky"><ArrowRight className="size-3" /> Swap</Badge>
    ) : null;
  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50/70">
      <span className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-xl",
        l.status === "completed" ? "bg-slate-100 text-slate-700" : "bg-rose-100 text-rose-700"
      )}>
        {l.status === "completed" ? <CheckCircle2 className="size-4.5" /> : <XCircle className="size-4.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-slate-900">{l.activity}</p>
        <p className="text-[11.5px] text-slate-900/50">
          {fmtDay(l.date)}
          {l.customHours && (
            <span className="ml-1.5 inline-flex items-center gap-1 font-semibold text-slate-800">
              <Clock3 className="inline size-3" />{l.customHours}
            </span>
          )}
          {l.note && <span className="ml-1.5 italic text-slate-900/40">· {l.note}</span>}
        </p>
      </div>
      {originBadge}
      <Badge tone={l.period === "AM" ? "sky" : "plum"}>{l.period}</Badge>
      <Badge tone={l.status === "completed" ? "green" : "rose"}>
        {l.status === "completed" ? "Delivered" : "Cancelled"}
      </Badge>
    </li>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-900/[0.06] pb-2.5 last:border-0 last:pb-0">
      <dt className={cn("text-slate-900/55", strong && "font-semibold text-slate-900")}>{k}</dt>
      <dd className={cn("font-semibold tabular-nums", strong ? "text-slate-900" : "text-slate-900")}>{v}</dd>
    </div>
  );
}
