"use client";

import {
  ArrowDownUp,
  Building2,
  CalendarDays,
  CircleDot,
  Eye,
  Flame,
  Search,
  TrendingDown,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { MonthlyBars } from "@/components/charts";
import { AddClinicianModal, RequestLeaveModal } from "@/components/modals";
import { Avatar, Badge, Bar, Button, Card, Dot, Modal, SectionHead, Segmented, cn } from "@/components/ui";
import {
  balanceSummary,
  correlationWarnings,
  fmtRange,
  monthlySeries,
  paceStatus,
  rollingSessions,
  sessionsTarget,
  todayISO,
} from "@/lib/engine";
import type { Clinician } from "@/lib/types";
import { LEAVE_META, PACE_META } from "@/lib/types";
import { useStore } from "@/store/useStore";

type SortKey = "name" | "spw" | "remaining" | "pace";

export default function RosterPage() {
  const { clinicians, requests, sessions, policy, sites, siteFilter, currentUserId } = useStore();
  const me = clinicians.find((c) => c.id === currentUserId)!;
  const isManager = me.role === "manager";

  const [q, setQ] = useState("");
  const [roleF, setRoleF] = useState<"all" | "clinical" | "admin">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [dir, setDir] = useState<1 | -1>(1);
  const [focus, setFocus] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const today = todayISO();

  /* open drawer from search palette */
  useEffect(() => {
    const onOpen = (e: Event) => setFocus((e as CustomEvent<string>).detail);
    window.addEventListener("medleave:open-clinician", onOpen);
    return () => window.removeEventListener("medleave:open-clinician", onOpen);
  }, []);

  const rows = useMemo(() => {
    const scoped = siteFilter === "all" ? clinicians : clinicians.filter((c) => c.siteId === siteFilter);
    const list = scoped
      .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
      .filter((c) => (roleF === "all" ? true : roleF === "clinical" ? c.clinical : !c.clinical))
      .map((c) => {
        const annual = balanceSummary(c, requests, policy, "annual");
        const rolling = rollingSessions(sessions, c.id);
        const target = sessionsTarget(c, policy);
        const pace = target > 0 ? Math.round((rolling.completed / target) * 100) : 0;
        const onLeave = requests.some((r) => r.clinicianId === c.id && r.status === "approved" && r.start <= today && r.end >= today);
        return { c, annual, pace, target, onLeave };
      });
    list.sort((a, b) => {
      let v = 0;
      if (sortKey === "name") v = a.c.name.localeCompare(b.c.name);
      if (sortKey === "spw") v = a.c.sessionsPerWeek - b.c.sessionsPerWeek;
      if (sortKey === "remaining") v = a.annual.remaining - b.annual.remaining;
      if (sortKey === "pace") v = a.pace - b.pace;
      return v * dir;
    });
    return list;
  }, [clinicians, siteFilter, q, roleF, requests, policy, sessions, today, sortKey, dir]);

  const focusC = focus ? clinicians.find((c) => c.id === focus) : undefined;

  const watchIds = useMemo(
    () => new Map(correlationWarnings(clinicians, requests, sessions, policy).map((w) => [w.clinicianId, w])),
    [clinicians, requests, sessions, policy]
  );

  const toggle = (k: SortKey) => {
    if (k === sortKey) setDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(k); setDir(k === "name" ? 1 : -1); }
  };

  const Th = ({ k, label, right }: { k: SortKey; label: string; right?: boolean }) => (
    <button
      onClick={() => toggle(k)}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] transition hover:text-slate-900",
        right && "flex-row-reverse",
        sortKey === k ? "text-slate-900" : "text-slate-900/40"
      )}
    >
      {label} <ArrowDownUp className={cn("size-3", sortKey === k && "text-teal-600")} />
    </button>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-700/50">Multi-site staffing</p>
          <h1 className="font-display text-[34px] font-medium leading-tight tracking-tight text-slate-900">
            Staff <span className="italic text-slate-700">roster</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-900/55">
            {siteFilter === "all"
              ? `Both surgeries — ${clinicians.length} team members.`
              : `${sites.find((s) => s.id === siteFilter)?.name} — ${rows.length} team members.`}{" "}
            Click any row for the full entitlement & delivery profile.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-900/35" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name…"
              className="w-[210px] rounded-full border border-slate-900/12 bg-card py-2.5 pl-9 pr-4 text-[13px] shadow-soft outline-none transition focus:border-slate-600"
            />
          </div>
          <Segmented
            value={roleF}
            onChange={setRoleF}
            options={[
              { value: "all", label: "All" },
              { value: "clinical", label: "Clinical" },
              { value: "admin", label: "Admin" },
            ]}
          />
          {isManager && (
            <Button onClick={() => setAddOpen(true)}>
              <UserRoundPlus className="size-4" /> Add member
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead>
              <tr className="border-b border-slate-900/[0.07] bg-slate-50/60">
                <th className="px-5 py-3"><Th k="name" label="Clinician" /></th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-900/45">Site</th>
                <th className="px-5 py-3"><Th k="spw" label="Contract" /></th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-900/45">Entitlement</th>
                <th className="px-5 py-3"><Th k="remaining" label="AL remaining" /></th>
                <th className="px-5 py-3"><Th k="pace" label="12m session pace" /></th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-slate-900/45">Today</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/[0.05]">
              {rows.map(({ c, annual, pace, target, onLeave }) => {
                const site = sites.find((s) => s.id === c.siteId);
                return (
                  <tr
                    key={c.id}
                    onClick={() => setFocus(c.id)}
                    className="cursor-pointer transition hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-3">
                        <Avatar c={c} size="md" />
                        <span>
                          <span className="block text-[13.5px] font-bold text-slate-900">{c.name}</span>
                          <span className="text-[11px] text-slate-900/45">{c.grade} · since {format(parseISO(c.since), "yyyy")}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: `color-mix(in srgb, ${site?.color ?? "var(--site-oak)"} 12%, transparent)`, color: site?.color }}>
                        <Building2 className="size-3" /> {site?.short}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] font-semibold tabular-nums text-slate-900/70">
                      {c.clinical ? `${c.sessionsPerWeek}/wk` : "FTE"}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] tabular-nums text-slate-900/70">
                      {annual.entitlement}d <span className="text-[10.5px] text-slate-900/40">({annual.used} used)</span>
                    </td>
                    <td className="px-5 py-3.5 text-[14px] font-bold tabular-nums text-slate-900">{annual.remaining}d</td>
                    <td className="px-5 py-3.5">
                      {c.clinical && target > 0 ? (
                        <span className="flex items-center gap-2.5">
                          <Bar value={pace} color={pace >= 97 ? "var(--pace-on)" : pace >= 88 ? "var(--pace-surplus)" : "var(--pace-deficit)"} className="w-28" />
                          <span className="text-[12px] font-bold tabular-nums text-slate-900">{pace}%</span>
                        </span>
                      ) : (
                        <span className="text-[12px] text-slate-900/35">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex items-center justify-end gap-1.5">
                        {watchIds.has(c.id) && (
                          <Badge tone={watchIds.get(c.id)!.severity === "high" ? "rose" : "teal"} title={`${watchIds.get(c.id)!.leaveDays} leave days in the last 90 against ${watchIds.get(c.id)!.delivered} delivered sessions`}>
                            <Eye className="size-3" /> {watchIds.get(c.id)!.leaveDays}d/90d
                          </Badge>
                        )}
                        {onLeave ? (
                          <Badge tone="rose"><CircleDot className="size-3" /> On leave</Badge>
                        ) : (
                          <Badge tone="green"><span className="size-1.5 rounded-full bg-emerald-500" /> In</Badge>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <Users className="mx-auto mb-3 size-6 text-slate-900/30" />
                    <p className="text-[13px] text-slate-900/45">No team members match “{q}” in this surgery view.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail drawer */}
      <ClinicianDrawer
        c={focusC ?? null}
        onClose={() => setFocus(null)}
        onRequestLeave={() => setReqOpen(true)}
      />

      <AddClinicianModal open={addOpen} onClose={() => setAddOpen(false)} />
      <RequestLeaveModal open={reqOpen} onClose={() => setReqOpen(false)} />
    </div>
  );
}

function ClinicianDrawer({
  c,
  onClose,
  onRequestLeave,
}: {
  c: Clinician | null;
  onClose: () => void;
  onRequestLeave: () => void;
}) {
  const { requests, sessions, policy, sites, clinicians, currentUserId } = useStore();
  const me = clinicians.find((x) => x.id === currentUserId);
  const isManager = me?.role === "manager";

  const data = useMemo(() => {
    if (!c) return null;
    const annual = balanceSummary(c, requests, policy, "annual");
    const study = balanceSummary(c, requests, policy, "study");
    const rolling = rollingSessions(sessions, c.id);
    const target = sessionsTarget(c, policy);
    const pace = target > 0 ? Math.round((rolling.completed / target) * 100) : 0;
    const pstatus = paceStatus(c, sessions, policy);
    const watch = correlationWarnings([c], requests, sessions, policy)[0] ?? null;
    const upcoming = requests
      .filter((r) => r.clinicianId === c.id && r.status !== "rejected" && r.end >= todayISO())
      .sort((a, b) => (a.start < b.start ? -1 : 1))
      .slice(0, 4);
    const series = c.clinical ? monthlySeries(sessions, [c.id], target, 6) : [];
    return { annual, study, rolling, target, pace, pstatus, watch, upcoming, series };
  }, [c, requests, policy, sessions]);

  if (!c || !data) return <Modal open={false} onClose={onClose} title="" />;
  const site = sites.find((s) => s.id === c.siteId);

  return (
    <Modal open={!!c} onClose={onClose} title={c.name} subtitle={`${c.grade} · ${site?.name ?? ""}`} icon={<CalendarDays className="size-5" />} wide>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-3xl bg-slate-50/80 p-4">
            <Avatar c={c} size="lg" />
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-slate-900">{c.name}</p>
              <p className="text-[12px] text-slate-900/55">{site?.town}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge tone="slate">{c.clinical ? `${c.sessionsPerWeek} sessions/wk` : "Full-time"}</Badge>
                <Badge tone="neutral">{site?.pcn}</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-900/[0.07] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700/50">Annual leave</p>
              <p className="mt-1.5 font-display text-[26px] font-medium leading-none text-slate-900">
                {data.annual.remaining}<span className="text-sm text-slate-900/40"> / {data.annual.entitlement}d</span>
              </p>
              <Bar value={((data.annual.used + data.annual.pending) / data.annual.entitlement) * 100} color="var(--lv-annual)" className="mt-3" />
              <p className="mt-2 text-[10.5px] text-slate-900/45">{data.annual.used}d used · {data.annual.pending}d pending · accrued {data.annual.accrued}d</p>
            </div>
            <div className="rounded-2xl border border-slate-900/[0.07] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700/50">Study leave</p>
              <p className="mt-1.5 font-display text-[26px] font-medium leading-none text-slate-900">
                {data.study.remaining}<span className="text-sm text-slate-900/40"> / {data.study.entitlement}d</span>
              </p>
              <Bar value={((data.study.used + data.study.pending) / Math.max(1, data.study.entitlement)) * 100} color="var(--lv-study)" className="mt-3" />
              <p className="mt-2 text-[10.5px] text-slate-900/45">{data.study.used}d used · {data.study.pending}d pending</p>
            </div>
          </div>

          {c.clinical && (
            <div className="rounded-2xl border border-slate-900/[0.07] p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700/50">Rolling 12-month sessions</p>
                <Badge tone={PACE_META[data.pstatus.status].tone}>
                  {data.pstatus.status === "deficit" && <TrendingDown className="size-3" />}
                  {data.pstatus.status === "surplus" && <Flame className="size-3" />}
                  {PACE_META[data.pstatus.status].label}
                </Badge>
              </div>
              <p className="mt-1.5 font-display text-[26px] font-medium leading-none text-slate-900">
                {data.rolling.completed}<span className="text-sm text-slate-900/40"> / {data.target} · {data.pace}%</span>
              </p>
              <Bar value={data.pace} color={PACE_META[data.pstatus.status].color} className="mt-3" />
              <p className="mt-2 text-[10.5px] text-slate-900/45">
                Year-to-date pace {data.pstatus.pct}% of expectation · projected {data.pstatus.projected} by year end
              </p>
            </div>
          )}
          {c.clinical && data.watch && (
            <div className="flex items-start gap-3 rounded-2xl border border-teal-400/45 bg-teal-100/50 p-4">
              <Eye className="mt-0.5 size-4 shrink-0 text-teal-700" />
              <p className="text-[12px] leading-relaxed text-teal-700">
                <strong className="font-bold">Staffing watch:</strong> {data.watch.leaveDays} leave days in the last 90 against{" "}
                {data.watch.delivered} of ~{data.watch.expected} expected sessions delivered ({Math.round(data.watch.deliveryRatio * 100)}%).
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {c.clinical && data.series.length > 0 && (
            <div className="rounded-2xl border border-slate-900/[0.07] p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-700/50">Last 6 months</p>
              <MonthlyBars data={data.series} height={130} />
            </div>
          )}
          <div className="rounded-2xl border border-slate-900/[0.07] p-4">
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-700/50">Upcoming leave</p>
            {data.upcoming.length === 0 ? (
              <p className="py-3 text-[12px] text-slate-900/45">No future leave on record.</p>
            ) : (
              <ul className="space-y-2">
                {data.upcoming.map((r) => (
                  <li key={r.id} className="flex items-center gap-2.5 text-[12px]">
                    <Dot color={LEAVE_META[r.type].color} />
                    <span className="flex-1 font-semibold text-slate-900">{fmtRange(r.start, r.end)}</span>
                    <span className="tabular-nums text-slate-900/50">{r.days}d</span>
                    <Badge tone={r.status === "approved" ? "green" : "teal"}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {isManager && (
            <Button variant="outline" className="w-full" onClick={() => { onClose(); onRequestLeave(); }}>
              <CalendarDays className="size-4" /> File leave on their behalf
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
