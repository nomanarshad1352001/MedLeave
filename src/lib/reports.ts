import { format, parseISO, subDays } from "date-fns";
import type { AuditEntry, Clinician, LeaveRequest, LeaveType, Policy, SessionLog, Site } from "./types";
import { LEAVE_META } from "./types";
import {
  balanceSummary,
  entitlementFor,
  leaveYearWindow,
  paceStatus,
  rollingSessions,
  sessionsTarget,
} from "./engine";

export type ReportKind = "payroll" | "appraisal" | "audit";
export type RangeKey = "leave-year" | "12m" | "90d" | "30d";

export const RANGE_META: Record<RangeKey, { label: string; hint: string }> = {
  "leave-year": { label: "Current leave year", hint: "Runs from the configured leave-year start" },
  "12m": { label: "Rolling 12 months", hint: "Trailing 365 days from today" },
  "90d": { label: "Last 90 days", hint: "Quarterly staffing window" },
  "30d": { label: "Last 30 days", hint: "Latest payroll month" },
};

export function rangeWindow(key: RangeKey, policy: Policy) {
  const today = new Date();
  if (key === "leave-year") {
    const { start, end } = leaveYearWindow(policy, today);
    return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") };
  }
  const days = key === "12m" ? 365 : key === "90d" ? 90 : 30;
  return { from: format(subDays(today, days), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
}

/* ------------------------------------------------------------------ */
/* Payroll rows                                                        */
/* ------------------------------------------------------------------ */
export interface PayrollRow {
  clinician: Clinician;
  site: string;
  sessionsDelivered: number;
  sessionsCancelled: number;
  extraSessions: number;
  contractedTarget: number;
  annualUsed: number;
  studyUsed: number;
  sicknessDays: number;
  parentalDays: number;
  annualEntitlement: number;
  annualRemaining: number;
  locumCoveredDays: number;
  overrides: number;
}

export function buildPayroll(
  clinicians: Clinician[],
  requests: LeaveRequest[],
  sessions: SessionLog[],
  sites: Site[],
  policy: Policy,
  range: RangeKey
): PayrollRow[] {
  const { from, to } = rangeWindow(range, policy);
  const today = format(new Date(), "yyyy-MM-dd");
  const hi = to < today ? to : today;

  return clinicians.map((c) => {
    let delivered = 0;
    let cancelled = 0;
    let extra = 0;
    for (const s of sessions) {
      if (s.clinicianId !== c.id || s.date < from || s.date > hi) continue;
      if (s.status === "completed") {
        delivered++;
        if (s.origin === "extra") extra++;
      } else cancelled++;
    }

    const dayTally = (type: LeaveType) =>
      requests
        .filter((r) => r.clinicianId === c.id && r.status === "approved" && r.type === type && r.start <= to && r.end >= from)
        .reduce((a, r) => a + r.days, 0);

    const locumCoveredDays = requests
      .filter((r) => r.clinicianId === c.id && r.status === "approved" && r.locumStatus === "booked" && r.start <= to && r.end >= from)
      .reduce((a, r) => a + r.days, 0);

    const overrides = requests.filter(
      (r) => r.clinicianId === c.id && r.override && r.start <= to && r.end >= from
    ).length;

    const annual = balanceSummary(c, requests, policy, "annual");

    return {
      clinician: c,
      site: sites.find((s) => s.id === c.siteId)?.name ?? "—",
      sessionsDelivered: delivered,
      sessionsCancelled: cancelled,
      extraSessions: extra,
      contractedTarget: sessionsTarget(c, policy),
      annualUsed: dayTally("annual"),
      studyUsed: dayTally("study"),
      sicknessDays: dayTally("sickness"),
      parentalDays: dayTally("parental"),
      annualEntitlement: entitlementFor(c, policy, "annual"),
      annualRemaining: annual.remaining,
      locumCoveredDays,
      overrides,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Appraisal pack (single clinician)                                   */
/* ------------------------------------------------------------------ */
export interface AppraisalPack {
  clinician: Clinician;
  site: string;
  periodFrom: string;
  periodTo: string;
  delivered: number;
  cancelled: number;
  extra: number;
  swaps: number;
  target: number;
  pacePct: number;
  paceLabel: string;
  activityMix: Array<{ activity: string; count: number }>;
  leaveByType: Array<{ type: LeaveType; days: number; periods: number }>;
  annualEntitlement: number;
  annualRemaining: number;
  studyDays: number;
  overrides: LeaveRequest[];
}

export function buildAppraisal(
  c: Clinician,
  requests: LeaveRequest[],
  sessions: SessionLog[],
  sites: Site[],
  policy: Policy,
  range: RangeKey
): AppraisalPack {
  const { from, to } = rangeWindow(range, policy);
  const today = format(new Date(), "yyyy-MM-dd");
  const hi = to < today ? to : today;

  let delivered = 0;
  let cancelled = 0;
  let extra = 0;
  let swaps = 0;
  const mix = new Map<string, number>();
  for (const s of sessions) {
    if (s.clinicianId !== c.id || s.date < from || s.date > hi) continue;
    if (s.status === "completed") {
      delivered++;
      if (s.origin === "extra") extra++;
      if (s.origin === "swap") swaps++;
      mix.set(s.activity, (mix.get(s.activity) ?? 0) + 1);
    } else cancelled++;
  }

  const leaveByType = (Object.keys(LEAVE_META) as LeaveType[]).map((type) => {
    const rows = requests.filter(
      (r) => r.clinicianId === c.id && r.status === "approved" && r.type === type && r.start <= to && r.end >= from
    );
    return {
      type,
      days: rows.reduce((a, r) => a + r.days, 0),
      periods: rows.length,
    };
  });

  const pace = paceStatus(c, sessions, policy);
  const annual = balanceSummary(c, requests, policy, "annual");
  const rolling = rollingSessions(sessions, c.id);

  return {
    clinician: c,
    site: sites.find((s) => s.id === c.siteId)?.name ?? "—",
    periodFrom: from,
    periodTo: hi,
    delivered: range === "12m" ? rolling.completed : delivered,
    cancelled,
    extra,
    swaps,
    target: sessionsTarget(c, policy),
    pacePct: pace.pct,
    paceLabel: pace.status,
    activityMix: Array.from(mix.entries())
      .map(([activity, count]) => ({ activity, count }))
      .sort((a, b) => b.count - a.count),
    leaveByType: leaveByType.filter((l) => l.days > 0),
    annualEntitlement: entitlementFor(c, policy, "annual"),
    annualRemaining: annual.remaining,
    studyDays: leaveByType.find((l) => l.type === "study")?.days ?? 0,
    overrides: requests.filter((r) => r.clinicianId === c.id && r.override && r.start <= to && r.end >= from),
  };
}

/* ------------------------------------------------------------------ */
/* CSV generation                                                      */
/* ------------------------------------------------------------------ */
function esc(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(headers: string[], rows: Array<Array<string | number>>) {
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

export function payrollCSV(rows: PayrollRow[], from: string, to: string) {
  return toCSV(
    [
      "Clinician", "Role", "Site", "Sessions/week", "Period from", "Period to",
      "Sessions delivered", "Extra sessions", "Sessions cancelled", "Contracted annual target",
      "Annual leave used (d)", "Study leave used (d)", "Sickness (d)", "Parental (d)",
      "Annual entitlement (d)", "Annual remaining (d)", "Locum-covered (d)", "Overrides",
    ],
    rows.map((r) => [
      r.clinician.name, r.clinician.grade, r.site, r.clinician.sessionsPerWeek, from, to,
      r.sessionsDelivered, r.extraSessions, r.sessionsCancelled, r.contractedTarget,
      r.annualUsed, r.studyUsed, r.sicknessDays, r.parentalDays,
      r.annualEntitlement, r.annualRemaining, r.locumCoveredDays, r.overrides,
    ])
  );
}

export function appraisalCSV(p: AppraisalPack) {
  const meta: Array<Array<string | number>> = [
    ["Clinician", p.clinician.name],
    ["Role", p.clinician.grade],
    ["Site", p.site],
    ["Contract", `${p.clinician.sessionsPerWeek} sessions/week`],
    ["Period", `${p.periodFrom} to ${p.periodTo}`],
    ["Sessions delivered", p.delivered],
    ["Contracted target", p.target],
    ["Pace vs target (%)", p.pacePct],
    ["Pace status", p.paceLabel],
    ["Extra sessions", p.extra],
    ["Swapped sessions", p.swaps],
    ["Cancelled sessions", p.cancelled],
    ["Annual entitlement (d)", p.annualEntitlement],
    ["Annual remaining (d)", p.annualRemaining],
    ["Study leave (d)", p.studyDays],
    [],
    ["Activity", "Sessions"],
    ...p.activityMix.map((a) => [a.activity, a.count] as Array<string | number>),
    [],
    ["Leave type", "Days", "Periods"],
    ...p.leaveByType.map((l) => [LEAVE_META[l.type].label, l.days, l.periods] as Array<string | number>),
  ];
  return meta.map((r) => r.map(esc).join(",")).join("\n");
}

export function auditCSV(entries: AuditEntry[]) {
  return toCSV(
    ["Timestamp (ISO)", "Date", "Actor", "Action", "Detail"],
    entries.map((a) => [a.at, format(parseISO(a.at), "yyyy-MM-dd HH:mm"), a.actorName, a.action, a.detail])
  );
}

/* ------------------------------------------------------------------ */
/* Browser download                                                    */
/* ------------------------------------------------------------------ */
export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 400);
}

export function auditSeverity(action: string): "teal" | "amber" | "rose" | "slate" {
  const a = action.toLowerCase();
  if (a.includes("override")) return "amber";
  if (a.includes("reject") || a.includes("cancel")) return "rose";
  if (a.includes("approve") || a.includes("booked")) return "teal";
  return "slate";
}
