"use client";

import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarPlus,
  CheckCircle2,
  FileSpreadsheet,
  Eye,
  Flame,
  Palmtree,
  ShieldAlert,
  Stethoscope,
  Timer,
  TrendingDown,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { MonthlyBars, UsageDonut } from "@/components/charts";
import { CancelRequestModal, DecisionModal, LogSessionModal, RequestLeaveModal } from "@/components/modals";
import { Avatar, Badge, Bar, Button, Card, Dot, Ring, SectionHead, cn } from "@/components/ui";
import {
  balanceSummary,
  correlationWarnings,
  coverageAlerts,
  fmtDay,
  fmtRange,
  greeting,
  heatmapWeeks,
  leaveYearWindow,
  monthlySeries,
  paceStatus,
  relativeDay,
  rollingSessions,
  sessionsTarget,
  todayISO,
} from "@/lib/engine";
import type { LeaveRequest } from "@/lib/types";
import { LEAVE_META, PACE_META } from "@/lib/types";
import { useStore } from "@/store/useStore";

export default function DashboardPage() {
  const {
    currentUserId, clinicians, requests, sessions, policy, sites, siteFilter,
  } = useStore();
  const me = clinicians.find((c) => c.id === currentUserId)!;
  const isManager = me.role === "manager";

  const [reqOpen, setReqOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [decision, setDecision] = useState<{ req: LeaveRequest; mode: "approve" | "reject" } | null>(null);
  const [cancel, setCancel] = useState<LeaveRequest | null>(null);

  const today = todayISO();
  const scopedStaff = siteFilter === "all" ? clinicians : clinicians.filter((c) => c.siteId === siteFilter);
  const scopedIds = new Set(scopedStaff.map((c) => c.id));
  const scopedRequests = requests.filter((r) => scopedIds.has(r.clinicianId));

  /* Personal balances */
  const annual = balanceSummary(me, requests, policy, "annual");
  const study = balanceSummary(me, requests, policy, "study");

  /* Session commitment KPIs */
  const rolling = rollingSessions(sessions, me.id);
  const myTarget = sessionsTarget(me, policy);
  const teamIds = useMemo(() => scopedStaff.filter((c) => c.clinical).map((c) => c.id), [scopedStaff]);
  const teamAgg = useMemo(() => {
    let delivered = 0;
    let target = 0;
    for (const c of scopedStaff) {
      if (!c.clinical) continue;
      delivered += rollingSessions(sessions, c.id).completed;
      target += sessionsTarget(c, policy);
    }
    return { delivered, target };
  }, [scopedStaff, sessions, policy]);

  const delivered = isManager ? teamAgg.delivered : rolling.completed;
  const target = isManager ? teamAgg.target : myTarget;
  const pct = target > 0 ? Math.round((delivered / target) * 100) : 0;
  const weeklyAvg = delivered / 52;

  /* Queue + upcoming */
  const queue = useMemo(
    () => scopedRequests.filter((r) => r.status === "pending").sort((a, b) => (a.requestedAt < b.requestedAt ? -1 : 1)),
    [scopedRequests]
  );
  const mine = useMemo(
    () => requests.filter((r) => r.clinicianId === currentUserId).sort((a, b) => (a.requestedAt > b.requestedAt ? -1 : 1)).slice(0, 6),
    [requests, currentUserId]
  );

  const { start: yrStart, end: yrEnd } = leaveYearWindow(policy, new Date());
  const yrS = format(yrStart, "yyyy-MM-dd");
  const yrE = format(yrEnd, "yyyy-MM-dd");

  const donutData = useMemo(() => {
    const source = isManager ? scopedRequests : requests.filter((r) => r.clinicianId === currentUserId);
    const byType = new Map<string, number>();
    let pendingDays = 0;
    for (const r of source) {
      if (r.start < yrS || r.start > yrE) continue;
      if (r.status === "approved") byType.set(r.type, (byType.get(r.type) ?? 0) + r.days);
      else if (r.status === "pending") pendingDays += r.days;
    }
    const out = Array.from(byType.entries()).map(([t, v]) => ({
      name: LEAVE_META[t as keyof typeof LEAVE_META].label,
      value: v,
      color: LEAVE_META[t as keyof typeof LEAVE_META].color,
    }));
    if (pendingDays > 0) out.push({ name: "Pending approval", value: pendingDays, color: "#FCD34D" });
    return out;
  }, [isManager, scopedRequests, requests, currentUserId, yrS, yrE]);

  const series = useMemo(() => {
    const ids = isManager ? teamIds : [me.id];
    return monthlySeries(sessions, ids, isManager ? teamAgg.target : myTarget);
  }, [isManager, teamIds, me.id, sessions, teamAgg.target, myTarget]);

  const upcoming = useMemo(() => {
    const limit = format(new Date(Date.now() + 35 * 86400000), "yyyy-MM-dd");
    return scopedRequests
      .filter((r) => r.status !== "rejected" && r.end >= today && r.start <= limit)
      .sort((a, b) => (a.start < b.start ? -1 : 1))
      .slice(0, 5);
  }, [scopedRequests, today]);

  const offThisWeek = useMemo(() => {
    const weekEnd = format(new Date(Date.now() + 7 * 86400000), "yyyy-MM-dd");
    const map = new Map<string, LeaveRequest>();
    for (const r of scopedRequests) {
      if (r.status !== "approved" || r.end < today || r.start > weekEnd) continue;
      map.set(r.clinicianId, r);
    }
    return Array.from(map.entries()).map(([id, r]) => ({ c: clinicians.find((x) => x.id === id)!, r }));
  }, [scopedRequests, today, clinicians]);

  const alerts = useMemo(
    () => coverageAlerts(scopedStaff, scopedRequests, 21).slice(0, 4),
    [scopedStaff, scopedRequests]
  );

  const pace = useMemo(() => paceStatus(me, sessions, policy), [me, sessions, policy]);
  const paceMeta = PACE_META[pace.status];

  const watchlist = useMemo(
    () => correlationWarnings(scopedStaff, scopedRequests, sessions, policy).slice(0, 3),
    [scopedStaff, scopedRequests, sessions, policy]
  );
  const deficitCount = useMemo(
    () => scopedStaff.filter((c) => c.clinical && paceStatus(c, sessions, policy).status === "deficit").length,
    [scopedStaff, sessions, policy]
  );

  const heat = useMemo(
    () => heatmapWeeks(sessions, me.clinical ? me.id : null, 20),
    [sessions, me]
  );
  const maxHeat = Math.max(1, ...heat.flat().map((c) => c.count));

  const pendingMine = requests.filter((r) => r.clinicianId === currentUserId && r.status === "pending").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-700/50">
            {format(new Date(), "EEEE, d MMMM yyyy")} · {sites.find((s) => s.id === me.siteId)?.name}
          </p>
          <h1 className="font-display text-[34px] font-medium leading-tight tracking-tight text-slate-900">
            {greeting()}, <span className="italic text-slate-700">{me.firstName}</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-900/55">
            {isManager
              ? `${queue.length} leave request${queue.length === 1 ? "" : "s"} awaiting your decision across ${siteFilter === "all" ? "both surgeries" : sites.find((s) => s.id === siteFilter)?.short}.`
              : `You have ${annual.remaining} days of annual leave remaining and ${pendingMine} request${pendingMine === 1 ? "" : "s"} in the pipeline.`}
          </p>
        </div>
        <div className="flex gap-2.5">
          {me.clinical && (
            <Button variant="outline" onClick={() => setLogOpen(true)}>
              <Stethoscope className="size-4" /> Log session
            </Button>
          )}
          <Link href="/app/reports">
            <Button variant="outline">
              <FileSpreadsheet className="size-4" /> Reports
            </Button>
          </Link>
          <Button variant="teal" onClick={() => setReqOpen(true)}>
            <CalendarPlus className="size-4" /> Request leave
          </Button>
        </div>
      </div>

      {/* hero banner — clip-path entrance, played on sign-in */}
      <div className="ent-img relative h-44 overflow-hidden rounded-[30px] shadow-soft lg:h-52">
        <img
          src="https://images.pexels.com/photos/5619462/pexels-photo-5619462.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200"
          alt="Consulting suite at Oakfield Health Centre"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/35 to-transparent" />
        <div className="ent-rise absolute inset-y-0 left-0 flex max-w-md flex-col justify-center px-8" style={{ animationDelay: "0.35s" }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-teal-300">Cover, balances & sessions</p>
          <p className="mt-2 font-display text-2xl font-medium leading-tight text-paper lg:text-[27px]">
            One diary for the whole partnership.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
            <span className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-emerald-200">On Track</span>
            <span className="rounded-full bg-rose-500/25 px-2.5 py-1 text-[#FECDD3]">At Risk — Deficit</span>
            <span className="rounded-full bg-teal-400/25 px-2.5 py-1 text-teal-200">Surplus — Overworking</span>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <CardStat
          icon={<Palmtree className="size-5" />}
          label="Annual leave remaining"
          value={`${annual.remaining}`}
          suffix={`/ ${annual.entitlement}d`}
          hint={<>Accrued to date {annual.accrued}d · {annual.pending}d pending approval</>}
        />
        <CardStat
          icon={<Activity className="size-5" />}
          label={isManager ? "Team sessions · 12 months" : "Sessions delivered · 12 months"}
          value={delivered.toLocaleString()}
          suffix={target > 0 ? `/ ${target}` : ""}
          hint={
            isManager ? (
              <span className={cn("font-semibold", deficitCount > 0 ? "text-rose-500" : "text-slate-600")}>
                {pct}% of rolling target · {deficitCount > 0 ? `${deficitCount} in deficit` : "all on track"}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-semibold" style={{ color: paceMeta.color }}>
                {pace.status === "deficit" && <TrendingDown className="size-3.5" />}
                {pace.status === "surplus" && <Flame className="size-3.5" />}
                {pace.status === "on-track" && <CheckCircle2 className="size-3.5" />}
                {paceMeta.label} · {pace.variance >= 0 ? "+" : ""}{pace.variance}
              </span>
            )
          }
        />
        <CardStat
          icon={<Timer className="size-5" />}
          label={isManager ? "Awaiting decision" : "My pending requests"}
          value={isManager ? queue.length : pendingMine}
          suffix={isManager ? "in queue" : "open"}
          tone="teal"
          hint={isManager ? <>Oldest request {queue[0] ? relativeDay(queue[0].start) : "—"}</> : <>{study.remaining} study days also available</>}
        />
        <CardStat
          icon={<Users className="size-5" />}
          label="Colleagues off this week"
          value={offThisWeek.length}
          suffix={`of ${scopedStaff.length}`}
          tone="teal"
          hint={<>{alerts.length > 0 ? `${alerts.length} cover pressure day${alerts.length === 1 ? "" : "s"} ahead` : "No cover pressure detected"}</>}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="p-6 xl:col-span-2">
          <SectionHead
            eyebrow="Rolling 12 months"
            title={isManager ? "Practice session delivery" : "Your session delivery"}
            action={
              <Badge tone="slate"><Dot color="#F59E0B" /> pro-rata target</Badge>
            }
          />
          <MonthlyBars data={series} height={272} />
        </Card>

        <Card className="flex flex-col items-center p-6">
          <SectionHead eyebrow="Commitment" title="Rolling session quota" className="w-full" />
          <Ring value={pct} size={170} stroke={13} color={pct >= 90 ? "#0D9488" : "#F43F5E"} className="my-3">
            <div className="text-center">
              <p className="font-display text-[38px] font-medium leading-none text-slate-900">{pct}%</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-700/50">of target</p>
            </div>
          </Ring>
          <dl className="mt-2 w-full space-y-2 border-t border-slate-900/[0.07] pt-4 text-[12.5px]">
            <div className="flex justify-between"><dt className="text-slate-900/55">Delivered</dt><dd className="font-bold text-slate-900 tabular-nums">{delivered.toLocaleString()}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-900/55">Contracted target</dt><dd className="font-bold text-slate-900 tabular-nums">{target.toLocaleString()}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-900/55">Weekly average</dt><dd className="font-bold text-slate-900 tabular-nums">{weeklyAvg.toFixed(1)}/wk</dd></div>
          </dl>
          <Badge tone={pct >= 97 ? "green" : pct >= 88 ? "teal" : "rose"} className="mt-4">
            {pct >= 97 ? "On pace — ahead of contracted quota" : pct >= 88 ? "Slightly behind — within tolerance" : "Behind quota — review rota"}
          </Badge>
        </Card>
      </div>

      {/* Queue + donut */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="p-6 xl:col-span-2">
          {isManager ? (
            <>
              <SectionHead
                eyebrow="Inbox"
                title="Awaiting your decision"
                action={<Link href="/app/approvals"><Button variant="ghost" size="sm">Open queue <ArrowRight className="size-3.5" /></Button></Link>}
              />
              {queue.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <span className="mb-3 inline-flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><CheckCircle2 className="size-5" /></span>
                  <p className="font-display text-lg text-slate-900">Queue clear</p>
                  <p className="mt-1 text-[13px] text-slate-900/50">No pending leave requests in this surgery view.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-900/[0.06]">
                  {queue.slice(0, 4).map((r) => {
                    const c = clinicians.find((x) => x.id === r.clinicianId)!;
                    return (
                      <li key={r.id} className="flex flex-wrap items-center gap-3 py-3.5">
                        <Avatar c={c} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[13.5px] font-bold text-slate-900">{c.name}</p>
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: LEAVE_META[r.type].soft, color: LEAVE_META[r.type].deep }}>
                              <Dot color={LEAVE_META[r.type].color} className="size-1.5" />{LEAVE_META[r.type].label}
                            </span>
                            {r.override && <Badge tone="teal">Override filed</Badge>}
                          </div>
                          <p className="mt-0.5 text-[12px] text-slate-900/50">{fmtRange(r.start, r.end)} · {r.days}d · ≈{r.sessionsLost} sessions · {relativeDay(r.start)}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="subtle" onClick={() => setDecision({ req: r, mode: "reject" })}><XCircle className="size-3.5" /> Reject</Button>
                          <Button size="sm" onClick={() => setDecision({ req: r, mode: "approve" })}><CheckCircle2 className="size-3.5" /> Approve</Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          ) : (
            <>
              <SectionHead
                eyebrow="Pipeline"
                title="My leave requests"
                action={<Link href="/app/leave"><Button variant="ghost" size="sm">View balances <ArrowRight className="size-3.5" /></Button></Link>}
              />
              <ul className="divide-y divide-slate-900/[0.06]">
                {mine.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                    <Dot color={LEAVE_META[r.type].color} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-bold text-slate-900">{LEAVE_META[r.type].label} · {r.days}d</p>
                      <p className="text-[12px] text-slate-900/50">{fmtRange(r.start, r.end)} · {relativeDay(r.start)}</p>
                    </div>
                    {r.override && <Badge tone="teal"><ShieldAlert className="size-3" /> Override</Badge>}
                    <StatusBadge status={r.status} />
                    {r.status !== "rejected" && r.end >= today && (
                      <Button size="sm" variant="ghost" onClick={() => setCancel(r)}>Withdraw</Button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card className="p-6">
          <SectionHead eyebrow="Leave year" title={isManager ? "Practice usage mix" : "My usage mix"} />
          {donutData.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-slate-900/45">No leave recorded yet this leave year.</p>
          ) : (
            <>
              <UsageDonut
                data={donutData}
                centerValue={`${donutData.reduce((a, d) => a + d.value, 0)}d`}
                centerLabel={format(yrStart, "yyyy") + " leave yr"}
              />
              <ul className="mt-4 space-y-2">
                {donutData.map((d) => (
                  <li key={d.name} className="flex items-center gap-2.5 text-[12.5px]">
                    <Dot color={d.color} />
                    <span className="flex-1 text-slate-900/65">{d.name}</span>
                    <span className="font-bold tabular-nums text-slate-900">{d.value}d</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      {/* Activity heatmap + on leave */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="p-6 xl:col-span-2">
          <SectionHead
            eyebrow="Clinical activity"
            title={me.clinical ? "Your delivery map · last 20 weeks" : "Practice delivery map · last 20 weeks"}
            action={<Link href="/app/sessions"><Button variant="ghost" size="sm">Session tracker <ArrowUpRight className="size-3.5" /></Button></Link>}
          />
          <div className="flex gap-[3px] overflow-x-auto pb-1">
            {heat.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((cell) => (
                  <span
                    key={cell.date}
                    title={`${fmtDay(cell.date)} — ${cell.count} session${cell.count === 1 ? "" : "s"}${cell.cancelled ? ` (${cell.cancelled} cancelled)` : ""}`}
                    className={cn(
                      "size-[13px] rounded-[4px] transition-transform hover:scale-125",
                      cell.future ? "border border-dashed border-slate-900/15" : ""
                    )}
                    style={{
                      background: cell.future
                        ? "transparent"
                        : cell.count === 0
                          ? "rgba(15,23,42,0.06)"
                          : `rgba(13,148,136,${0.25 + (0.75 * cell.count) / Math.max(2, maxHeat)})`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-4 text-[11px] font-medium text-slate-900/45">
            <span className="flex items-center gap-1.5"><span className="size-3 rounded-[4px] bg-slate-900/[0.06]" /> None</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded-[4px] bg-slate-600/40" /> 1 session</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded-[4px] bg-slate-600" /> 2+</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded-[4px] border border-dashed border-slate-900/25" /> Upcoming</span>
            <span className="ml-auto">Mon – Sun, oldest → newest</span>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-6">
            <SectionHead eyebrow="Availability" title="On leave now / this week" />
            {offThisWeek.length === 0 ? (
              <p className="py-4 text-[13px] text-slate-900/45">Full clinical strength this week.</p>
            ) : (
              <ul className="space-y-3">
                {offThisWeek.map(({ c, r }) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <Avatar c={c} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-slate-900">{c.name}</p>
                      <p className="text-[11.5px] text-slate-900/50">{fmtRange(r.start, r.end)}</p>
                    </div>
                    <span className="size-2 rounded-full" style={{ background: LEAVE_META[r.type].color }} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {isManager && (
            <Card className="p-6">
              <SectionHead eyebrow="Cover coordination" title="Pressure days < 3 wks" />
              {alerts.length === 0 ? (
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50/80 p-4">
                  <CheckCircle2 className="size-5 text-slate-600" />
                  <p className="text-[12.5px] font-medium leading-relaxed text-slate-800">Cover looks healthy across both surgeries for the next three weeks.</p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {alerts.map((a) => {
                    const site = sites.find((s) => s.id === a.siteId);
                    return (
                      <li key={`${a.siteId}-${a.date}`} className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-100/50 px-4 py-3">
                        <ShieldAlert className="size-4 shrink-0 text-rose-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] font-bold text-rose-700">{site?.short} · {fmtDay(a.date)}</p>
                          <p className="text-[11px] text-rose-700/70">{a.clinicianIds.length} of {a.siteCount} clinicians absent</p>
                        </div>
                        <Bar value={(a.clinicianIds.length / a.siteCount) * 100} color="#F43F5E" className="w-14" thin />
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}

          {isManager && (
            <Card className="p-6">
              <SectionHead eyebrow="Session ↔ leave · 90 days" title="Safe staffing watch" />
              {watchlist.length === 0 ? (
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50/80 p-4">
                  <CheckCircle2 className="size-5 text-slate-600" />
                  <p className="text-[12.5px] font-medium leading-relaxed text-slate-800">
                    No clinician exceeds {policy.safeStaffingThreshold} leave days per 90 days against sessions delivered.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {watchlist.map((w) => {
                    const c = clinicians.find((x) => x.id === w.clinicianId)!;
                    return (
                      <li
                        key={w.clinicianId}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border px-4 py-3",
                          w.severity === "high" ? "border-rose-500/25 bg-rose-100/50" : "border-teal-400/35 bg-teal-100/45"
                        )}
                      >
                        <Avatar c={c} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] font-bold text-slate-900">{c.name}</p>
                          <p className="text-[11px] text-slate-900/55">
                            {w.leaveDays}d leave · {w.delivered}/{w.expected} sessions ({Math.round(w.deliveryRatio * 100)}%)
                          </p>
                        </div>
                        <Eye className={cn("size-4 shrink-0", w.severity === "high" ? "text-rose-500" : "text-teal-600")} />
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link href="/app/sessions" className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-700 transition hover:text-slate-900">
                Review in session tracker <ArrowRight className="size-3.5" />
              </Link>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <RequestLeaveModal open={reqOpen} onClose={() => setReqOpen(false)} />
      <LogSessionModal open={logOpen} onClose={() => setLogOpen(false)} />
      <DecisionModal req={decision?.req ?? null} mode={decision?.mode ?? "approve"} onClose={() => setDecision(null)} />
      <CancelRequestModal req={cancel} onClose={() => setCancel(null)} />
    </div>
  );
}

function CardStat({
  icon, label, value, suffix, hint, tone = "slate",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  suffix?: string;
  hint?: React.ReactNode;
  tone?: "slate" | "teal";
}) {
  return (
    <Card className="group relative overflow-hidden p-5 transition-shadow duration-300 hover:shadow-lift">
      <div className={cn("absolute inset-x-0 top-0 h-[3px]", tone === "teal" ? "bg-teal-400" : "bg-slate-600")} />
      <span className={cn("inline-flex size-10 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105", tone === "teal" ? "bg-teal-400 text-slate-900" : "bg-slate-900 text-teal-300")}>
        {icon}
      </span>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-display text-[32px] font-medium leading-none tracking-tight text-slate-900">{value}</span>
        {suffix && <span className="text-[13px] font-semibold text-slate-900/40">{suffix}</span>}
      </div>
      <p className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-700/55">{label}</p>
      {hint && <div className="mt-2 text-xs leading-relaxed text-slate-900/50">{hint}</div>}
    </Card>
  );
}

export function StatusBadge({ status }: { status: LeaveRequest["status"] }) {
  if (status === "approved") return <Badge tone="green"><CheckCircle2 className="size-3" /> Approved</Badge>;
  if (status === "rejected") return <Badge tone="rose"><XCircle className="size-3" /> Rejected</Badge>;
  return <Badge tone="teal"><Timer className="size-3" /> Pending</Badge>;
}
