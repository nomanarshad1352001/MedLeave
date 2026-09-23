"use client";

import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  AlertTriangle,
  ArrowLeftRight,
  BadgeCheck,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  Stethoscope,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { LogSessionModal, LocumTagModal, RequestLeaveModal } from "@/components/modals";
import { Avatar, Badge, Button, Card, Dot, Modal, SectionHead, Segmented, cn } from "@/components/ui";
import { fmtRange, todayISO, weeklyPattern } from "@/lib/engine";
import type { Clinician, LeaveRequest, LeaveType, SessionPeriod } from "@/lib/types";
import { LEAVE_META, LOCUM_STATUS_META } from "@/lib/types";
import { useStore } from "@/store/useStore";

type View = "month" | "week";

const BAR_COLORS: Record<LeaveType, string> = {
  annual: "var(--lv-annual)",
  study: "var(--lv-study)",
  parental: "var(--lv-parental)",
  sickness: "var(--lv-sickness)",
  locum: "var(--lv-locum)",
};

export default function CalendarPage() {
  const { clinicians, requests, sessions, sites, siteFilter, currentUserId } = useStore();
  const me = clinicians.find((c) => c.id === currentUserId)!;
  const isManager = me.role === "manager";

  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(new Date());
  const [period, setPeriod] = useState<SessionPeriod>("AM");
  const [locumF, setLocumF] = useState<"all" | "needed" | "booked">("all");
  const [dayFocus, setDayFocus] = useState<string | null>(null);
  const [tagReq, setTagReq] = useState<LeaveRequest | null>(null);
  const [reqOpen, setReqOpen] = useState(false);
  const [logMode, setLogMode] = useState<null | string>(null);

  const staff = useMemo(
    () => clinicians.filter((c) => c.clinical && (siteFilter === "all" || c.siteId === siteFilter)),
    [clinicians, siteFilter]
  );
  const staffIds = useMemo(() => new Set(staff.map((c) => c.id)), [staff]);
  const scoped = useMemo(() => requests.filter((r) => staffIds.has(r.clinicianId)), [requests, staffIds]);

  /* ---------------------------------- leave visibility --------------------------------- */
  const isPlanned = (r: LeaveRequest) => r.status === "approved" || r.status === "pending";
  const covers = (r: LeaveRequest, iso: string) => r.start <= iso && r.end >= iso;

  const weekdayIdx = (d: Date) => {
    const g = d.getDay();
    return ((g + 6) % 7) + 1; // 1..7 Monday-first
  };

  /** scheduled count for a site+period on a date */
  const staffing = (iso: string, p: SessionPeriod, siteId?: string) => {
    const d = parseISO(iso);
    const wd = weekdayIdx(d);
    const pool = siteId ? staff.filter((c) => c.siteId === siteId) : staff;
    const patterns = new Map(pool.map((c) => [c.id, new Set(weeklyPattern(c.sessionsPerWeek).map(([w, pp]) => `${w}-${pp}`))]));
    let sched = 0;
    let leaveCnt = 0;
    let locumCover = 0;
    const absent: Clinician[] = [];
    const leaveRows: Array<{ r: LeaveRequest; c: Clinician }> = [];
    for (const c of pool) {
      const on = patterns.get(c.id)?.has(`${wd}-${p}`);
      if (!on) continue;
      const r = scoped.find((x) => x.clinicianId === c.id && isPlanned(x) && covers(x, iso));
      if (!r) {
        const cancelled = sessions.some(
          (s) => s.clinicianId === c.id && s.date === iso && s.period === p && s.status === "cancelled"
        );
        if (cancelled) {
          leaveCnt++;
        } else {
          sched++;
        }
      } else {
        leaveCnt++;
        absent.push(c);
        leaveRows.push({ r, c });
        if (r.locumStatus === "booked") locumCover++;
      }
    }
    return { sched, totalSched: sched + leaveCnt, leaveCnt, locumCover, absent, leaveRows, pool: pool.length };
  };

  const minRequired = (siteId?: string) => Math.max(1, Math.ceil((siteId ? staff.filter((c) => c.siteId === siteId).length : staff.length) / 2));
  const isWorkingDay = (d: Date) => weekdayIdx(d) <= 5;

  /** pool-level medical staffing status for a date */
  const dayStatus = (iso: string) => {
    const d = parseISO(iso);
    if (!isWorkingDay(d)) return "off";
    const am = staffing(iso, "AM");
    const pm = staffing(iso, "PM");
    const need = minRequired();
    const worst = Math.min(am.sched, pm.sched);
    if (worst < need) return "short";
    if (worst === need) return "tight";
    return "safe";
  };

  /* ---------------------------------- month grid -------------------------------------- */
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays: Date[] = [];
  for (let d = calStart; d <= calEnd; d = addDays(d, 1)) monthDays.push(d);
  const weeks: Date[][] = [];
  for (let i = 0; i < monthDays.length; i += 7) weeks.push(monthDays.slice(i, i + 7));

  /* ---------------------------------- week strip -------------------------------------- */
  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  /* ---------------------------------- locum ledger ------------------------------------ */
  const ledger = useMemo(
    () =>
      scoped
        .filter((r) => (r.locumStatus ?? "not-needed") !== "not-needed")
        .filter((r) => locumF === "all" || r.locumStatus === locumF)
        .sort((a, b) => (a.start < b.start ? -1 : 1)),
    [scoped, locumF]
  );
  const openNeeds = scoped.filter((r) => (r.locumStatus ?? "not-needed") === "needed" && r.end >= todayISO());
  const bookedActive = scoped.filter((r) => r.locumStatus === "booked" && r.end >= todayISO());

  const cta = (
    <div className="flex items-center gap-2.5">
      {me.clinical && (
        <Button variant="outline" onClick={() => setLogMode("extra")}>
          <Stethoscope className="size-4" /> Session journal
        </Button>
      )}
      <Button variant="teal" onClick={() => setReqOpen(true)}>
        <CalendarPlus className="size-4" /> New leave request
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-700/50">Coverage & safety</p>
          <h1 className="font-display text-[34px] font-medium leading-tight tracking-tight text-slate-900">
            Surgery <span className="italic text-slate-700">cover calendar</span>
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-900/55">
            Every absence, colour-coded by leave type, laid over live day-level staffing arithmetic —
            minimum required vs scheduled — so no clinic is ever staffed on hope.
          </p>
        </div>
        {cta}
      </div>

      {/* toolbar */}
      <Card className="sticky top-[76px] z-20 flex flex-wrap items-center gap-3 p-3.5">
        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { value: "month", label: "Month" },
            { value: "week", label: "Week" },
          ]}
        />
        <div className="flex items-center gap-1 rounded-full border border-slate-900/10 bg-slate-900/[0.04] p-1">
          <button
            onClick={() => setCursor((d) => (view === "month" ? addMonths(d, -1) : addWeeks(d, -1)))}
            className="cursor-pointer rounded-full p-2 text-slate-900/55 transition hover:bg-slate-900/10 hover:text-slate-900"
            aria-label="Previous"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="cursor-pointer rounded-full px-3 py-1.5 text-[12px] font-bold text-slate-900/70 transition hover:bg-slate-900/10 hover:text-slate-900"
          >
            Today
          </button>
          <button
            onClick={() => setCursor((d) => (view === "month" ? addMonths(d, 1) : addWeeks(d, 1)))}
            className="cursor-pointer rounded-full p-2 text-slate-900/55 transition hover:bg-slate-900/10 hover:text-slate-900"
            aria-label="Next"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <p className="font-display text-lg font-medium tracking-tight text-slate-900">
          {view === "month" ? format(cursor, "MMMM yyyy") : `${format(weekStart, "d MMM")} – ${format(addDays(weekStart, 4), "d MMM yyyy")}`}
        </p>

        {/* type legend */}
        <div className="ml-auto hidden items-center gap-2.5 lg:flex">
          {(Object.keys(LEAVE_META) as LeaveType[]).map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-900/50">
              <Dot color={BAR_COLORS[t]} /> {LEAVE_META[t].label.split(" ")[0]}
            </span>
          ))}
        </div>
      </Card>

      {/* views */}
      {view === "month" ? (
        <Card className="overflow-hidden">
          {/* weekday header */}
          <div className="grid grid-cols-7 border-b border-slate-900/[0.07] bg-slate-50/70">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
              <div key={d} className={cn("px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em]", i < 5 ? "text-slate-900/55" : "text-slate-900/30")}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 divide-y divide-slate-900/[0.06]">
            {weeks.map((week, wi) => {
              const wStart = week[0];
              const wEnd = week[6];
              const spans = scoped
                .filter(isPlanned)
                .map((r) => {
                  const s = r.start > format(wStart, "yyyy-MM-dd") ? parseISO(r.start) : wStart;
                  const e = r.end < format(wEnd, "yyyy-MM-dd") ? parseISO(r.end) : wEnd;
                  if (e < s) return null;
                  return { r, s, e };
                })
                .filter(Boolean) as Array<{ r: LeaveRequest; s: Date; e: Date }>;

              const rows: Array<Array<{ r: LeaveRequest; s: Date; e: Date }>> = [[], [], [], []];
              const occupied = [new Set<number>(), new Set<number>(), new Set<number>(), new Set<number>()];
              for (const sp of spans) {
                spans.sort((a, b) => a.s.getTime() - b.s.getTime());
              }
              const sorted = [...spans].sort((a, b) => a.s.getTime() - b.s.getTime());
              for (const sp of sorted) {
                const sCol = Math.max(0, Math.floor((sp.s.getTime() - wStart.getTime()) / 86400000));
                const eCol = Math.min(6, Math.floor((sp.e.getTime() - wStart.getTime()) / 86400000));
                let placed = -1;
                const order = [0, 1, 2, 3];
                for (const li of order) {
                  let free = true;
                  for (let c2 = sCol; c2 <= eCol; c2++) if (occupied[li].has(c2)) { free = false; break; }
                  if (free) { placed = li; break; }
                }
                if (placed === -1) continue;
                for (let c2 = sCol; c2 <= eCol; c2++) occupied[placed].add(c2);
                rows[placed].push(sp);
              }

              return (
                <div key={wi}>
                  <div className="relative grid grid-cols-7">
                    {/* day cells */}
                    {week.map((d) => {
                      const iso = format(d, "yyyy-MM-dd");
                      const st = dayStatus(iso);
                      const inMonth = isSameMonth(d, cursor);
                      const todayCls = isToday(d);
                      return (
                        <button
                          key={iso}
                          onClick={() => setDayFocus(iso)}
                          className={cn(
                            "group relative flex min-h-[108px] cursor-pointer flex-col border-r border-slate-900/[0.06] p-2 text-left align-top transition-colors last:border-r-0",
                            !inMonth && "bg-slate-900/[0.02]",
                            st === "short" && isWorkingDay(d) && inMonth && "bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.13),transparent_65%)]"
                          )}
                        >
                          <span className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold transition",
                            todayCls ? "bg-slate-900 text-teal-300" : inMonth ? "text-slate-900 group-hover:bg-slate-900/[0.06]" : "text-slate-900/30"
                          )}>
                            {format(d, "d")}
                          </span>
                          {isWorkingDay(d) && inMonth && (
                            <span className={cn(
                              "mt-auto inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                              st === "safe" && "bg-slate-100 text-slate-700",
                              st === "tight" && "bg-teal-100 text-teal-700",
                              st === "short" && "bg-rose-100 text-rose-700"
                            )}>
                              {st === "short" && <AlertTriangle className="size-2.5" />}
                              {st === "tight" && "Tight"}
                              {st === "short" && "Low cover"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {/* absence bars */}
                    {rows.map((row, li) =>
                      row.map(({ r, s, e }, bi) => {
                        const sCol = Math.max(0, Math.floor((s.getTime() - wStart.getTime()) / 86400000));
                        const eCol = Math.min(6, Math.floor((e.getTime() - wStart.getTime()) / 86400000));
                        const spanN = eCol - sCol + 1;
                        const color = BAR_COLORS[r.type];
                        const c = clinicians.find((x) => x.id === r.clinicianId)!;
                        return (
                          <button
                            key={`${r.id}_${li}_${bi}`}
                            onClick={() => setDayFocus(format(s, "yyyy-MM-dd"))}
                            className={cn(
                              "absolute z-10 flex cursor-pointer items-center gap-1 overflow-hidden text-left text-white transition-transform hover:scale-[1.02] hover:shadow-lift",
                              r.status === "pending" ? "border border-dashed bg-white/60" : ""
                            )}
                            style={{
                              top: `${30 + li * 20}px`,
                              left: `calc((${(sCol)}/7*100%) + 7px)`,
                              width: `calc(${(spanN)}/7*100% - 14px)`,
                              height: 17,
                              borderRadius: 99,
                              background: r.status === "pending" ? `repeating-linear-gradient(45deg, color-mix(in srgb, ${color} 24%, transparent) 0 6px, color-mix(in srgb, ${color} 12%, transparent) 6px 12px)` : color,
                              borderColor: r.status === "pending" ? color : "transparent",
                            }}
                            title={`${c.name} · ${LEAVE_META[r.type].label}${r.status === "pending" ? " (pending)" : ""} · ${fmtRange(r.start, r.end)}${r.locumStatus === "booked" ? ` · Locum: ${r.locumName}` : r.locumStatus === "needed" ? " · needs locum" : ""}`}
                          >
                            <span className={cn("inline-flex size-4 items-center justify-center rounded-full text-[8.5px] font-bold", r.status === "pending" ? "text-slate-900" : "bg-white/25")}>
                              {c.initials}
                            </span>
                            {spanN >= 2 && (
                              <span className={cn("truncate text-[9.5px] font-bold tracking-wide", r.status === "pending" ? "text-slate-900/70" : "text-white/95")}>
                                {c.firstName}
                              </span>
                            )}
                            {r.locumStatus === "booked" && <BadgeCheck className="size-3 shrink-0 text-white/90" />}
                            {r.locumStatus === "needed" && <CircleSlash className="size-3 shrink-0 text-white/90" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        /* ------------------------------------ week view ------------------------------------ */
        <Card className="grid grid-cols-1 overflow-hidden lg:grid-cols-[150px_1fr]">
          <div className="hidden border-r border-slate-900/[0.07] bg-slate-50/60 lg:block">
            <div className="h-14 border-b border-slate-900/[0.07]" />
            {staff.map((c) => (
              <div key={c.id} className="flex h-20 items-center gap-2.5 border-b border-slate-900/[0.05] px-3">
                <Avatar c={c} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold text-slate-900">{c.firstName}{c.id === me.id ? " (you)" : ""}</p>
                  <p className="truncate text-[10px] text-slate-900/45">{c.sessionsPerWeek}/wk · {sites.find((s) => s.id === c.siteId)?.short}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <div className={cn("min-w-[720px]", staff.length <= 0 && "min-w-0")}>
              {/* header row */}
              <div className="grid h-14 grid-cols-5 border-b border-slate-900/[0.07]">
                {weekDays.map((d) => (
                  <div key={d.toISOString()} className={cn("flex flex-col items-center justify-center border-r border-slate-900/[0.05] last:border-r-0", isToday(d) && "bg-slate-900/[0.05]")}>
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-700/60">{format(d, "EEE")}</span>
                    <span className={cn("mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[12.5px] font-bold", isToday(d) ? "bg-slate-900 text-teal-300" : "text-slate-900")}>
                      {format(d, "d")}
                    </span>
                  </div>
                ))}
              </div>
              {/* clinician rows */}
              {staff.map((c) => (
                <div key={c.id} className="grid grid-cols-5 border-b border-slate-900/[0.05] sm:h-0 lg:h-0">
                  {weekDays.map((d) => {
                    const iso = format(d, "yyyy-MM-dd");
                    const pattern = new Set(weeklyPattern(c.sessionsPerWeek).map(([w, p]) => `${w}-${p}`));
                    const wd = weekdayIdx(d);
                    const amOn = pattern.has(`${wd}-AM`);
                    const pmOn = pattern.has(`${wd}-PM`);
                    const r = scoped.find((x) => x.clinicianId === c.id && isPlanned(x) && x.start <= iso && x.end >= iso);
                    const cancelled = sessions.filter((s) => s.clinicianId === c.id && s.date === iso && s.status === "cancelled");
                    return (
                      <div key={iso} className={cn("flex flex-col gap-1 border-r border-slate-900/[0.05] p-2 last:border-r-0 lg:h-20", isToday(d) && "bg-slate-900/[0.03]")}>
                        {r ? (
                          <button
                            onClick={() => setDayFocus(iso)}
                            className={cn(
                              "flex h-full w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl text-[10px] font-bold transition hover:scale-[1.02]",
                              r.status === "pending" ? "border border-dashed text-slate-900/60" : "text-white"
                            )}
                            style={
                              r.status === "pending"
                                ? { borderColor: BAR_COLORS[r.type], background: `repeating-linear-gradient(45deg, color-mix(in srgb, ${BAR_COLORS[r.type]} 18%, transparent) 0 6px, color-mix(in srgb, ${BAR_COLORS[r.type]} 10%, transparent) 6px 12px)` }
                                : { background: BAR_COLORS[r.type] }
                            }
                            title={`${LEAVE_META[r.type].label} · ${fmtRange(r.start, r.end)} — click for detail`}
                          >
                            <Stethoscope className="size-3" />
                            {LEAVE_META[r.type].label.split(" ")[0]}
                            {r.locumStatus === "booked" && <BadgeCheck className="size-3" />}
                            {r.locumStatus === "needed" && <CircleSlash className="size-3" />}
                          </button>
                        ) : (
                          <div className="h-full space-y-1">
                            {(["AM", "PM"] as const).map((p) => {
                              const on = p === "AM" ? amOn : pmOn;
                              if (!on) return null;
                              const cx = cancelled.some((s) => s.period === p);
                              return (
                                <div
                                  key={p}
                                  className={cn(
                                    "flex flex-1 items-center justify-center rounded-lg border text-[9.5px] font-bold",
                                    cx
                                      ? "border-rose-500/30 bg-rose-100/60 text-rose-700"
                                      : "border-slate-600/20 bg-slate-100/70 text-slate-800"
                                  )}
                                >
                                  {p}{cx ? " · cancelled" : ""}
                                </div>
                              );
                            })}
                            {!amOn && !pmOn && <div className="h-full rounded-lg border border-dashed border-slate-900/10" />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ------------------------------ coverage matrix ------------------------------ */}
      <Card className="p-6">
        <SectionHead
          eyebrow="Minimum coverage matrix"
          title="Daily staffing levels"
          action={
            <div className="flex items-center gap-1.5">
              <Segmented<SessionPeriod>
                value={period}
                onChange={setPeriod}
                options={[
                  { value: "AM", label: "AM sessions" },
                  { value: "PM", label: "PM sessions" },
                ]}
              />
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead>
              <tr className="border-b border-slate-900/[0.07] text-[10px] font-bold uppercase tracking-[0.14em] text-slate-900/45">
                <th className="py-2.5 pr-3">Surgery</th>
                {weekDays.map((d) => (
                  <th key={d.toISOString()} className={cn("px-2 py-2.5 text-center", isToday(d) && "text-slate-900")}>
                    {format(d, "EEE d")}
                  </th>
                ))}
                <th className="py-2.5 pl-3 text-right">Week score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/[0.05]">
              {sites
                .filter((s) => siteFilter === "all" || s.id === siteFilter)
                .map((s) => {
                  const need = minRequired(s.id);
                  let shortCount = 0;
                  const cells = weekDays.map((d) => {
                    const iso = format(d, "yyyy-MM-dd");
                    if (!isWorkingDay(d)) return null;
                    const st = staffing(iso, period, s.id);
                    const eff = st.sched + st.locumCover;
                    const status = eff < need ? "short" : eff === need ? "tight" : "safe";
                    if (status === "short") shortCount++;
                    return { iso, st, eff, status };
                  });
                  return (
                    <tr key={s.id} className="align-middle">
                      <td className="min-w-[200px] py-3.5 pr-3">
                        <p className="text-[13.5px] font-bold text-slate-900">{s.short}</p>
                        <p className="text-[11px] text-slate-900/50">Minimum required {need} · roster {staff.filter((c) => c.siteId === s.id).length}</p>
                      </td>
                      {weekDays.map((d, i) => {
                        const cell = cells[i];
                        const iso = format(d, "yyyy-MM-dd");
                        if (!cell)
                          return (
                            <td key={iso} className="px-2 py-3.5 text-center text-[11px] text-slate-900/25">—</td>
                          );
                        return (
                          <td key={iso} className="px-2 py-3.5">
                            <button
                              onClick={() => setDayFocus(cell.iso)}
                              className={cn(
                                "mx-auto flex w-full max-w-[130px] cursor-pointer flex-col items-center gap-1 rounded-2xl border px-2 py-2 transition hover:-translate-y-0.5 hover:shadow-lift",
                                cell.status === "safe" && "border-slate-600/25 bg-slate-100/60",
                                cell.status === "tight" && "border-teal-400/45 bg-teal-100/60",
                                cell.status === "short" && "border-rose-500/40 bg-rose-100/70"
                              )}
                              title={`${s.short} · ${format(d, "EEE d MMM")} — click to inspect`}
                            >
                              <span className={cn(
                                "font-display text-[15px] font-semibold leading-none",
                                cell.status === "safe" && "text-slate-700",
                                cell.status === "tight" && "text-teal-700",
                                cell.status === "short" && "text-rose-700"
                              )}>
                                {cell.st.sched}<span className="text-[10px] text-slate-900/40">/{need}</span>
                              </span>
                              <span className="flex items-center gap-1 text-[9.5px] font-bold leading-none">
                                {cell.status === "short" ? <AlertTriangle className="size-2.5 text-rose-600" /> : <Users className="size-2.5 text-slate-700/50" />}
                                <span className={cell.status === "safe" ? "text-slate-900/50" : cell.status === "tight" ? "text-teal-700" : "text-rose-700"}>
                                  {cell.status === "short" ? "Low cover" : cell.status === "tight" ? "At minimum" : "Safe"}
                                </span>
                              </span>
                              {cell.st.locumCover > 0 && (
                                <span className="flex items-center gap-0.5 text-[9px] font-bold text-sky-700">
                                  <BadgeCheck className="size-2.5" /> +{cell.st.locumCover} locum
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td className="py-3.5 pl-3 text-right">
                        {shortCount === 0 ? (
                          <Badge tone="green"><CheckCircle2 className="size-3" /> All safe</Badge>
                        ) : (
                          <Badge tone="rose"><AlertTriangle className="size-3" /> {shortCount} short</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 border-t border-slate-900/[0.07] pt-3.5 text-[11.5px] leading-relaxed text-slate-900/45">
          Effective staffing = scheduled clinicians (minus absences, bank-holiday-aware) <strong className="text-slate-900/70">+ booked locums</strong>.
          Pending leave shows as dashed bars and counts conservatively toward absence projections.
        </p>
      </Card>

      {/* ------------------------------ locum ledger ------------------------------ */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/[0.07] p-5">
          <SectionHead
            title="Locum cover ledger"
            eyebrow={`${openNeeds.length} flagged needed · ${bookedActive.length} booked or covering ahead`}
            className="mb-0"
          />
          <div className="flex gap-1.5">
            {(["all", "needed", "booked"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setLocumF(s)}
                className={cn(
                  "cursor-pointer rounded-full px-3 py-1.5 text-[11.5px] font-bold capitalize transition",
                  locumF === s ? "bg-slate-900 text-paper" : "bg-slate-900/[0.05] text-slate-900/55 hover:text-slate-900"
                )}
              >
                {s === "all" ? "All tagged" : s}
              </button>
            ))}
          </div>
        </div>
        <ul className="divide-y divide-slate-900/[0.05]">
          {ledger.map((r) => {
            const c = clinicians.find((x) => x.id === r.clinicianId)!;
            const meta = LOCUM_STATUS_META[r.locumStatus ?? "needed"];
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50/70">
                <Avatar c={c} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13.5px] font-bold text-slate-900">{c.name}</p>
                    {r.status === "pending" && <Badge tone="teal">Pending approval</Badge>}
                  </div>
                  <p className="text-[12px] text-slate-900/50">
                    {LEAVE_META[r.type].label} · {fmtRange(r.start, r.end)} · ≈{r.sessionsLost} sessions
                  </p>
                </div>
                {r.locumStatus === "booked" && (
                  <div className="text-right">
                    <p className="text-[12.5px] font-bold text-slate-900">{r.locumName}</p>
                    <p className="text-[10.5px] text-slate-900/45">{r.locumAgency}</p>
                  </div>
                )}
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold"
                  style={{ background: meta.soft, color: meta.deep }}
                >
                  {r.locumStatus === "booked" ? <BadgeCheck className="size-3" /> : <CircleSlash className="size-3" />}
                  {meta.label}
                </span>
                {isManager && (
                  <Button size="sm" variant="outline" onClick={() => setTagReq(r)}>
                    <ArrowLeftRight className="size-3.5" /> Manage cover
                  </Button>
                )}
              </li>
            );
          })}
          {ledger.length === 0 && (
            <li className="px-5 py-12 text-center text-[13px] text-slate-900/45">
              No absences are currently flagged for locum cover{locumF !== "all" ? " with this filter" : ""}.
            </li>
          )}
        </ul>
      </Card>

      {/* ------------------------------ day focus modal ------------------------------ */}
      <DayFocusModal
        iso={dayFocus}
        onClose={() => setDayFocus(null)}
        staff={staff}
        scoped={scoped}
        sites={sites}
        onTag={(r) => setTagReq(r)}
      />

      {/* ------------------------------ other modals -------------------------------- */}
      <LocumTagModal req={tagReq} onClose={() => setTagReq(null)} />
      <RequestLeaveModal open={reqOpen} onClose={() => setReqOpen(false)} />
      <LogSessionModal open={logMode !== null} onClose={() => setLogMode(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Day focus                                                           */
/* ------------------------------------------------------------------ */
function DayFocusModal({
  iso,
  onClose,
  staff,
  scoped,
  sites,
  onTag,
}: {
  iso: string | null;
  onClose: () => void;
  staff: Clinician[];
  scoped: LeaveRequest[];
  sites: ReturnType<typeof useStore.getState>["sites"];
  onTag: (r: LeaveRequest) => void;
}) {
  const { currentUserId, clinicians } = useStore();
  const me = clinicians.find((x) => x.id === currentUserId);
  const isManager = me?.role === "manager";
  if (!iso) return <Modal open={false} onClose={onClose} title="" />;

  const rows = scoped
    .filter((r) => (r.status === "approved" || r.status === "pending") && r.start <= iso && r.end >= iso)
    .map((r) => ({ r, c: staff.find((x) => x.id === r.clinicianId) }))
    .filter((x) => x.c) as Array<{ r: LeaveRequest; c: Clinician }>;

  const title = format(parseISO(iso), "EEEE, d MMMM yyyy");

  return (
    <Modal open={!!iso} onClose={onClose} title={title} subtitle={`${rows.length} absence${rows.length === 1 ? "" : "s"} · ${staff.length} clinicians in view`} icon={<Users className="size-5" />} wide>
      {rows.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50/80 p-4">
          <CheckCircle2 className="size-5 text-slate-600" />
          <p className="text-[13px] font-medium text-slate-800">Full clinical strength — no approved or pending absences overlap this date.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ r, c }) => (
            <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-slate-900/[0.08] p-3">
              <span className="h-10 w-1 rounded-full" style={{ background: BAR_COLORS[r.type] }} />
              <Avatar c={c} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13.5px] font-bold text-slate-900">{c.name}</p>
                  <span className="rounded-full bg-slate-900/[0.06] px-2 py-0.5 text-[9.5px] font-bold text-slate-800">
                    {sites.find((s) => s.id === c.siteId)?.short}
                  </span>
                  {r.status === "pending" && <Badge tone="teal">Pending</Badge>}
                </div>
                <p className="mt-0.5 text-[11.5px] text-slate-900/50">
                  {LEAVE_META[r.type].label} · {fmtRange(r.start, r.end)} · ≈{r.sessionsLost} sessions
                  {r.reason ? ` — ${r.reason}` : ""}
                </p>
              </div>
              {(r.locumStatus ?? "not-needed") !== "not-needed" && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
                  style={{ background: LOCUM_STATUS_META[r.locumStatus ?? "needed"].soft, color: LOCUM_STATUS_META[r.locumStatus ?? "needed"].deep }}
                >
                  {r.locumStatus === "booked" ? <BadgeCheck className="size-3" /> : <CircleSlash className="size-3" />}
                  {r.locumStatus === "booked" ? r.locumName : "Needs locum"}
                </span>
              )}
              {isManager && (
                <Button size="sm" variant="outline" onClick={() => { onClose(); onTag(r); }}>
                  Cover…
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
