import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isWeekend,
  parseISO,
  startOfMonth,
  addMonths,
  startOfWeek,
  subDays,
  getDay,
} from "date-fns";
import type {
  Clinician,
  LeaveRequest,
  LeaveType,
  PaceStatus,
  Policy,
  SessionLog,
  SessionPeriod,
} from "./types";
import { ACTIVITIES, LEAVE_META } from "./types";

/* ------------------------------------------------------------------ */
/* Deterministic PRNG for stable dummy data                            */
/* ------------------------------------------------------------------ */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

export const todayISO = () => format(new Date(), "yyyy-MM-dd");
export const roundHalf = (n: number) => Math.round(n * 2) / 2;
export const round1 = (n: number) => Math.round(n * 10) / 10;
export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/* ------------------------------------------------------------------ */
/* UK bank holidays (England & Wales)                                  */
/* ------------------------------------------------------------------ */
export const BANK_HOLIDAYS = new Set([
  "2024-12-25", "2024-12-26",
  "2025-01-01", "2025-04-18", "2025-04-21", "2025-05-05", "2025-05-26",
  "2025-08-25", "2025-12-25", "2025-12-26",
  "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25",
  "2026-08-31", "2026-12-25", "2026-12-28",
  "2027-01-01",
]);

export function isWorkingDay(d: Date, excludeBankHolidays = true) {
  if (isWeekend(d)) return false;
  if (excludeBankHolidays && BANK_HOLIDAYS.has(format(d, "yyyy-MM-dd"))) return false;
  return true;
}

export function workingDaysBetween(startISO: string, endISO: string, excludeBankHolidays = true) {
  const s = parseISO(startISO);
  const e = parseISO(endISO);
  if (e < s) return 0;
  return eachDayOfInterval({ start: s, end: e }).filter((d) =>
    isWorkingDay(d, excludeBankHolidays)
  ).length;
}

/* ------------------------------------------------------------------ */
/* Leave-year maths                                                    */
/* ------------------------------------------------------------------ */
export function leaveYearWindow(policy: Policy, ref: Date) {
  const [m, d] = policy.leaveYearStart.split("-").map(Number);
  let start = new Date(ref.getFullYear(), m - 1, d);
  if (start.getTime() > ref.getTime()) start = new Date(ref.getFullYear() - 1, m - 1, d);
  const next = new Date(start.getFullYear() + 1, m - 1, d);
  const end = addDays(next, -1);
  return { start, end, total: differenceInCalendarDays(next, start) };
}

/** Full-year entitlement for a leave type, pro-rated to contracted sessions. */
export function entitlementFor(clinician: Clinician, policy: Policy, type: LeaveType) {
  if (!LEAVE_META[type].capped) return Infinity;
  const base = type === "annual" ? policy.baseAnnualDays : policy.baseStudyDays;
  if (!clinician.clinical) return base;
  return roundHalf((base * clinician.sessionsPerWeek) / policy.fullTimeSessions);
}

/** Amount of the entitlement accrued by a given date (front-loaded curve). */
export function accruedBy(entitlement: number, policy: Policy, dateISO: string) {
  if (!isFinite(entitlement)) return Infinity;
  const date = parseISO(dateISO);
  const { start, total } = leaveYearWindow(policy, date);
  const elapsed = clamp01(differenceInCalendarDays(date, start) / total);
  const completion = clamp01((policy.accrualCompletionMonths || 12) / 12);
  const frac = clamp01(elapsed / (completion || 1));
  return roundHalf(entitlement * frac);
}

function usageInWindow(
  clinicianId: string,
  requests: LeaveRequest[],
  policy: Policy,
  type: LeaveType,
  refISO: string,
  excludeId?: string
) {
  const { start, end } = leaveYearWindow(policy, parseISO(refISO));
  let used = 0;
  let pending = 0;
  for (const r of requests) {
    if (r.id === excludeId) continue;
    if (r.clinicianId !== clinicianId || r.type !== type) continue;
    const rs = parseISO(r.start);
    if (rs < start || rs > end) continue;
    if (r.status === "approved") used += r.days;
    else if (r.status === "pending") pending += r.days;
  }
  return { used, pending, start, end };
}

export interface BalanceSummary {
  type: LeaveType;
  capped: boolean;
  entitlement: number; // Infinity when uncapped
  accrued: number; // accrued to date (now)
  used: number;
  pending: number;
  remaining: number; // entitlement - used - pending
  availableNow: number; // accrued(now) - used - pending
}

export function balanceSummary(
  clinician: Clinician,
  requests: LeaveRequest[],
  policy: Policy,
  type: LeaveType
): BalanceSummary {
  const capped = LEAVE_META[type].capped;
  const entitlement = entitlementFor(clinician, policy, type);
  const now = todayISO();
  const { used, pending } = usageInWindow(clinician.id, requests, policy, type, now);
  if (!capped) {
    return { type, capped, entitlement: Infinity, accrued: Infinity, used, pending, remaining: Infinity, availableNow: Infinity };
  }
  const accrued = accruedBy(entitlement, policy, now);
  return {
    type,
    capped,
    entitlement,
    accrued,
    used,
    pending,
    remaining: roundHalf(entitlement - used - pending),
    availableNow: roundHalf(accrued - used - pending),
  };
}

export interface RequestEvaluation {
  days: number;
  sessionsLost: number;
  capped: boolean;
  entitlement: number;
  accruedByStart: number;
  used: number;
  pending: number;
  remaining: number; // full-year remaining before this request
  afterFull: number; // remaining - days
  afterAccrual: number; // accrued-by-start availability - days
  hard: boolean; // exceeds full-year entitlement
  advance: boolean; // exceeds accrued-by-start projection (borrow against future accrual)
  conflict: boolean;
  valid: boolean;
}

export function evaluateRequest(
  clinician: Clinician,
  requests: LeaveRequest[],
  policy: Policy,
  type: LeaveType,
  startISO: string,
  endISO: string,
  excludeId?: string
): RequestEvaluation {
  const days = workingDaysBetween(startISO, endISO, policy.excludeBankHolidays);
  const sessionsLost = sessionsLostBetween(clinician, policy, startISO, endISO);
  const capped = LEAVE_META[type].capped;
  const entitlement = entitlementFor(clinician, policy, type);
  const { used, pending } = usageInWindow(clinician.id, requests, policy, type, startISO, excludeId);
  const conflict = requests.some(
    (r) =>
      r.id !== excludeId &&
      r.clinicianId === clinician.id &&
      r.status !== "rejected" &&
      !(r.end < startISO || r.start > endISO)
  );
  const accruedByStart = accruedBy(entitlement, policy, startISO);
  if (!capped) {
    return {
      days, sessionsLost, capped, entitlement: Infinity, accruedByStart: Infinity,
      used, pending, remaining: Infinity, afterFull: Infinity, afterAccrual: Infinity,
      hard: false, advance: false, conflict, valid: days > 0,
    };
  }
  const remaining = roundHalf(entitlement - used - pending);
  const accrAvail = roundHalf(accruedByStart - used - pending);
  return {
    days, sessionsLost, capped, entitlement, accruedByStart, used, pending,
    remaining, afterFull: roundHalf(remaining - days), afterAccrual: roundHalf(accrAvail - days),
    hard: days > remaining,
    advance: days <= remaining && days > accrAvail,
    conflict, valid: days > 0,
  };
}

/* ------------------------------------------------------------------ */
/* Session patterns, targets & generation                              */
/* ------------------------------------------------------------------ */
const DROP_ORDER: Array<[number, SessionPeriod]> = [
  [5, "PM"], [3, "PM"], [1, "PM"], [2, "PM"], [4, "PM"],
  [3, "AM"], [5, "AM"], [1, "AM"], [2, "AM"], [4, "AM"],
];

/** Weekly contracted pattern: list of [weekday(1-5), period] slots. */
export function weeklyPattern(sessionsPerWeek: number): Array<[number, SessionPeriod]> {
  const all: Array<[number, SessionPeriod]> = [];
  for (let d = 1; d <= 5; d++) {
    all.push([d, "AM"], [d, "PM"]);
  }
  const count = Math.min(10, Math.max(0, Math.round(sessionsPerWeek)));
  const drops = new Set(DROP_ORDER.slice(0, 10 - count).map(([d, p]) => `${d}-${p}`));
  return all.filter(([d, p]) => !drops.has(`${d}-${p}`));
}

export function sessionsTarget(clinician: Clinician, policy: Policy) {
  if (!clinician.clinical) return 0;
  return Math.round(clinician.sessionsPerWeek * policy.workingWeeksPerYear);
}

export function sessionsLostBetween(clinician: Clinician, policy: Policy, startISO: string, endISO: string) {
  if (!clinician.clinical) return 0;
  const pattern = weeklyPattern(clinician.sessionsPerWeek);
  const byDay = new Map<number, number>();
  for (const [d] of pattern) byDay.set(d, (byDay.get(d) ?? 0) + 1);
  const s = parseISO(startISO);
  const e = parseISO(endISO);
  if (e < s) return 0;
  let lost = 0;
  for (const day of eachDayOfInterval({ start: s, end: e })) {
    if (!isWorkingDay(day, policy.excludeBankHolidays)) continue;
    lost += byDay.get(getDay(day)) ?? 0;
  }
  return lost;
}

function onApprovedLeave(clinicianId: string, requests: LeaveRequest[], dateISO: string) {
  return requests.some(
    (r) =>
      r.clinicianId === clinicianId &&
      r.status === "approved" &&
      r.start <= dateISO &&
      r.end >= dateISO
  );
}

export function generateSessions(
  clinicians: Clinician[],
  requests: LeaveRequest[],
  policy: Policy
): SessionLog[] {
  const rng = mulberry32(0x5eed2024);
  const logs: SessionLog[] = [];
  const today = new Date();
  for (const c of clinicians) {
    if (!c.clinical) continue;
    const pattern = weeklyPattern(c.sessionsPerWeek);
    const byDay = new Map<number, SessionPeriod[]>();
    for (const [d, p] of pattern) {
      byDay.set(d, [...(byDay.get(d) ?? []), p]);
    }
    for (let i = 365; i >= 1; i--) {
      const date = subDays(today, i);
      const iso = format(date, "yyyy-MM-dd");
      if (!isWorkingDay(date, true)) continue;
      const periods = byDay.get(getDay(date));
      if (!periods) continue;
      if (onApprovedLeave(c.id, requests, iso)) continue;
      for (const period of periods) {
        const cancelled = rng() < 0.045;
        logs.push({
          id: `s_${c.id}_${iso}_${period}`,
          clinicianId: c.id,
          date: iso,
          period,
          activity: ACTIVITIES[Math.floor(rng() * ACTIVITIES.length)],
          siteId: c.siteId,
          status: cancelled ? "cancelled" : "completed",
          origin: "contract",
        });
      }
    }
  }
  return logs.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ------------------------------------------------------------------ */
/* Rolling 12-month analytics                                          */
/* ------------------------------------------------------------------ */
export function rollingSessions(logs: SessionLog[], clinicianId: string, days = 365) {
  const cutoff = format(subDays(new Date(), days), "yyyy-MM-dd");
  let completed = 0;
  let cancelled = 0;
  for (const l of logs) {
    if (l.clinicianId !== clinicianId || l.date < cutoff) continue;
    if (l.status === "completed") completed++;
    else cancelled++;
  }
  return { completed, cancelled };
}

export function monthlySeries(logs: SessionLog[], clinicianIds: string[] | null, totalTarget: number, months = 12) {
  const ids = clinicianIds ? new Set(clinicianIds) : null;
  const today = new Date();
  const out: Array<{ key: string; label: string; completed: number; cancelled: number; target: number }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const m = startOfMonth(addMonths(today, -i));
    const key = format(m, "yyyy-MM");
    let completed = 0;
    let cancelled = 0;
    for (const l of logs) {
      if (ids && !ids.has(l.clinicianId)) continue;
      if (l.date.slice(0, 7) !== key) continue;
      if (l.status === "completed") completed++;
      else cancelled++;
    }
    out.push({ key, label: format(m, "MMM"), completed, cancelled, target: Math.round(totalTarget / 12) });
  }
  return out;
}

export interface HeatCell {
  date: string;
  count: number;
  cancelled: number;
  future: boolean;
}

export function heatmapWeeks(logs: SessionLog[], clinicianId: string | null, weeks = 20): HeatCell[][] {
  const today = new Date();
  const start = startOfWeek(subDays(today, (weeks - 1) * 7), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end: addDays(start, weeks * 7 - 1) });
  const byDate = new Map<string, { count: number; cancelled: number }>();
  for (const l of logs) {
    if (clinicianId && l.clinicianId !== clinicianId) continue;
    const cur = byDate.get(l.date) ?? { count: 0, cancelled: 0 };
    if (l.status === "completed") cur.count++;
    else cur.cancelled++;
    byDate.set(l.date, cur);
  }
  const cols: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = days[w * 7 + d];
      const iso = format(day, "yyyy-MM-dd");
      const future = day.getTime() > today.getTime();
      const rec = byDate.get(iso) ?? { count: 0, cancelled: 0 };
      col.push({ date: iso, ...rec, future });
    }
    cols.push(col);
  }
  return cols;
}

/* ------------------------------------------------------------------ */
/* 12-month target pace monitor                                        */
/* ------------------------------------------------------------------ */
export interface PaceInfo {
  status: PaceStatus;
  delivered: number; // completed sessions in the target year so far
  expected: number; // pro-rata expectation to date
  target: number; // full-year contracted target
  variance: number; // delivered - expected
  pct: number; // delivered / expected * 100
  projected: number; // projected year-end total at current pace
  yearStart: string;
  yearEnd: string;
  elapsedFrac: number;
}

export function paceStatus(clinician: Clinician, logs: SessionLog[], policy: Policy): PaceInfo {
  const target = sessionsTarget(clinician, policy);
  const today = new Date();
  const { start, end, total } = leaveYearWindow(policy, today);
  const sISO = format(start, "yyyy-MM-dd");
  const eISO = format(addDays(end, 1), "yyyy-MM-dd");
  const tISO = format(today, "yyyy-MM-dd");
  let delivered = 0;
  for (const l of logs) {
    if (l.clinicianId === clinician.id && l.status === "completed" && l.date >= sISO && l.date < eISO && l.date <= tISO) {
      delivered++;
    }
  }
  const elapsedFrac = Math.max(0.04, Math.min(1, differenceInCalendarDays(today, start) / total));
  const expected = Math.round(target * elapsedFrac);
  const variance = delivered - expected;
  const pct = expected > 0 ? (delivered / expected) * 100 : target === 0 ? 100 : 0;
  const projected = elapsedFrac > 0 ? Math.round(delivered / elapsedFrac) : 0;
  const status: PaceStatus =
    target === 0 ? "on-track" : pct > 106 ? "surplus" : pct < 94 ? "deficit" : "on-track";
  return {
    status, delivered, expected, target, variance,
    pct: Math.round(pct),
    projected,
    yearStart: sISO, yearEnd: format(end, "yyyy-MM-dd"),
    elapsedFrac,
  };
}

/* ------------------------------------------------------------------ */
/* Session-to-leave correlation — rolling 90-day watchlist            */
/* ------------------------------------------------------------------ */
export interface CorrelationWarning {
  clinicianId: string;
  leaveDays: number; // approved planned-leave days inside the window
  delivered: number; // completed sessions inside the window
  expected: number; // contracted expectation for the window
  deliveryRatio: number; // delivered / expected
  severity: "review" | "high";
}

const COUNTED_TYPES: LeaveType[] = ["annual", "study", "locum"];

export function correlationWarnings(
  clinicians: Clinician[],
  requests: LeaveRequest[],
  logs: SessionLog[],
  policy: Policy,
  windowDays = 90
): CorrelationWarning[] {
  const out: CorrelationWarning[] = [];
  const today = new Date();
  const winEndISO = format(today, "yyyy-MM-dd");
  const winStart = subDays(today, windowDays);
  const winStartISO = format(winStart, "yyyy-MM-dd");
  const weeksInWindow = windowDays / 7;

  for (const c of clinicians) {
    if (!c.clinical) continue;
    let leaveDays = 0;
    for (const r of requests) {
      if (r.clinicianId !== c.id || r.status !== "approved") continue;
      if (!COUNTED_TYPES.includes(r.type)) continue;
      const s = r.start > winStartISO ? r.start : winStartISO;
      const e = r.end < winEndISO ? r.end : winEndISO;
      if (e < s) continue;
      leaveDays += workingDaysBetween(s, e, policy.excludeBankHolidays);
    }
    let delivered = 0;
    for (const l of logs) {
      if (l.clinicianId === c.id && l.status === "completed" && l.date >= winStartISO && l.date <= winEndISO) {
        delivered++;
      }
    }
    const expected = Math.round(c.sessionsPerWeek * weeksInWindow * (policy.workingWeeksPerYear / 52));
    const deliveryRatio = expected > 0 ? delivered / expected : 1;
    if (leaveDays >= policy.safeStaffingThreshold) {
      out.push({
        clinicianId: c.id,
        leaveDays,
        delivered,
        expected,
        deliveryRatio,
        severity:
          leaveDays >= policy.safeStaffingThreshold + 4 || deliveryRatio < 0.8 ? "high" : "review",
      });
    }
  }
  return out.sort((a, b) => b.leaveDays - a.leaveDays);
}

/* ------------------------------------------------------------------ */
/* Cover coordination                                                  */
/* ------------------------------------------------------------------ */
export interface CoverageAlert {
  date: string;
  siteId: string;
  clinicianIds: string[];
  siteCount: number;
}

export function coverageAlerts(
  clinicians: Clinician[],
  requests: LeaveRequest[],
  horizonDays = 21
): CoverageAlert[] {
  const alerts: CoverageAlert[] = [];
  const today = new Date();
  const sites = Array.from(new Set(clinicians.map((c) => c.siteId)));
  for (let i = 0; i < horizonDays; i++) {
    const date = addDays(today, i);
    if (isWeekend(date)) continue;
    const iso = format(date, "yyyy-MM-dd");
    for (const siteId of sites) {
      const siteStaff = clinicians.filter((c) => c.clinical && c.siteId === siteId);
      const off = siteStaff.filter((c) =>
        requests.some(
          (r) =>
            r.clinicianId === c.id &&
            r.status === "approved" &&
            (r.type === "annual" || r.type === "study" || r.type === "locum" || r.type === "parental") &&
            r.start <= iso &&
            r.end >= iso
        )
      );
      if (off.length >= 2 && off.length / siteStaff.length >= 0.34) {
        alerts.push({ date: iso, siteId, clinicianIds: off.map((c) => c.id), siteCount: siteStaff.length });
      }
    }
  }
  return alerts;
}

export function isOnLeaveToday(clinicianId: string, requests: LeaveRequest[]) {
  const iso = todayISO();
  return requests.some(
    (r) => r.clinicianId === clinicianId && r.status === "approved" && r.start <= iso && r.end >= iso
  );
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */
export const fmtDay = (iso: string) => format(parseISO(iso), "d MMM yyyy");
export const fmtShort = (iso: string) => format(parseISO(iso), "d MMM");
export const fmtWeekday = (iso: string) => format(parseISO(iso), "EEE d MMM");

export function fmtRange(startISO: string, endISO: string) {
  const s = parseISO(startISO);
  const e = parseISO(endISO);
  if (startISO === endISO) return format(s, "EEE d MMM yyyy");
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear())
    return `${format(s, "d")} – ${format(e, "d MMM yyyy")}`;
  return `${format(s, "d MMM")} – ${format(e, "d MMM yyyy")}`;
}

export function relativeDay(iso: string) {
  const diff = differenceInCalendarDays(parseISO(iso), new Date());
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return diff > 0 ? `In ${diff} days` : `${Math.abs(diff)} days ago`;
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
