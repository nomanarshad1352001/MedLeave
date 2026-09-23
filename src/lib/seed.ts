import { addDays, subDays, format } from "date-fns";
import type { Clinician, LeaveRequest, Policy, SessionLog, Site, AuditEntry } from "./types";
import { generateSessions, sessionsLostBetween, workingDaysBetween } from "./engine";

export const SITES: Site[] = [
  {
    id: "oak",
    name: "Oakfield Health Centre",
    short: "Oakfield",
    town: "Chipping Norton, Oxfordshire",
    pcn: "Cotswold Vale PCN",
    color: "#0D9488",
  },
  {
    id: "pine",
    name: "Pine Valley Surgery",
    short: "Pine Valley",
    town: "Moreton-in-Marsh, Gloucestershire",
    pcn: "Cotswold Vale PCN",
    color: "#F59E0B",
  },
];

export const CLINICIANS: Clinician[] = [
  { id: "c_eleanor", name: "Dr. Eleanor Vance", firstName: "Eleanor", initials: "EV", role: "partner", grade: "Partner GP", siteId: "oak", sessionsPerWeek: 9, clinical: true, color: "#0D9488", since: "2011-04-01", email: "eleanor.vance@medleave.demo", access: "clinical" },
  { id: "c_sarah", name: "Sarah Jenkins", firstName: "Sarah", initials: "SJ", role: "manager", grade: "Practice Manager", siteId: "oak", sessionsPerWeek: 10, clinical: false, color: "#F59E0B", since: "2016-09-12", email: "sarah.jenkins@medleave.demo", access: "management" },
  { id: "c_james", name: "Dr. James Wilson", firstName: "James", initials: "JW", role: "salaried", grade: "Salaried GP", siteId: "oak", sessionsPerWeek: 6, clinical: true, color: "#0EA5E9", since: "2019-08-01", email: "james.wilson@medleave.demo", access: "clinical" },
  { id: "c_amara", name: "Dr. Amara Osei", firstName: "Amara", initials: "AO", role: "registrar", grade: "GP Registrar (ST3)", siteId: "oak", sessionsPerWeek: 8, clinical: true, color: "#8B5CF6", since: "2024-02-05", email: "amara.osei@medleave.demo", access: null },
  { id: "c_nina", name: "Dr. Nina Kowalski", firstName: "Nina", initials: "NK", role: "salaried", grade: "Salaried GP", siteId: "oak", sessionsPerWeek: 7, clinical: true, color: "#F43F5E", since: "2017-03-20", email: "nina.kowalski@medleave.demo", access: null },
  { id: "c_marcus", name: "Dr. Marcus Chen", firstName: "Marcus", initials: "MC", role: "partner", grade: "Partner GP", siteId: "pine", sessionsPerWeek: 8, clinical: true, color: "#0F766E", since: "2013-06-01", email: "marcus.chen@medleave.demo", access: null },
  { id: "c_priya", name: "Dr. Priya Sharma", firstName: "Priya", initials: "PS", role: "salaried", grade: "Salaried GP", siteId: "pine", sessionsPerWeek: 4, clinical: true, color: "#B45309", since: "2021-01-11", email: "priya.sharma@medleave.demo", access: null },
  { id: "c_tom", name: "Dr. Tom Hartley", firstName: "Tom", initials: "TH", role: "salaried", grade: "Salaried GP", siteId: "pine", sessionsPerWeek: 5, clinical: true, color: "#0369A1", since: "2022-10-03", email: "tom.hartley@medleave.demo", access: null },
];

/** Demo sign-in accounts shown on the login screen — one click autofills the form. */
export const DEMO_ACCOUNTS = [
  { id: "c_eleanor", email: "eleanor.vance@medleave.demo", password: "partner-demo", access: "Clinical", tagline: "Partner GP · Oakfield Health Centre" },
  { id: "c_sarah", email: "sarah.jenkins@medleave.demo", password: "manager-demo", access: "Management", tagline: "Practice Manager · PCN-wide" },
  { id: "c_james", email: "james.wilson@medleave.demo", password: "salaried-demo", access: "Clinical", tagline: "Salaried GP · Oakfield Health Centre" },
] as const;

export const DEFAULT_POLICY: Policy = {
  baseAnnualDays: 30,
  baseStudyDays: 5,
  fullTimeSessions: 9,
  workingWeeksPerYear: 44,
  leaveYearStart: "04-01",
  accrualCompletionMonths: 9,
  hardBlock: true,
  allowOverride: true,
  excludeBankHolidays: true,
  safeStaffingThreshold: 7,
};

const iso = (d: Date) => format(d, "yyyy-MM-dd");

export function makeSeedRequests(now = new Date()): LeaveRequest[] {
  const t = (n: number) => iso(addDays(now, n));
  const m = (n: number) => iso(subDays(now, n));

  type Raw = Omit<LeaveRequest, "days" | "sessionsLost" | "requestedAt" | "id"> & { id: string; requestedDaysAgo: number };
  const raw: Raw[] = [
    /* ---------------- Dr. James Wilson (Salaried, 6/wk) ---------------- */
    { id: "lr_j_winter", clinicianId: "c_james", type: "annual", start: m(96), end: m(92), status: "approved", reason: "Family skiing — Morzine", cover: "internal", requestedDaysAgo: 150, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 140)) },
    { id: "lr_j_ski_override", clinicianId: "c_james", type: "annual", start: m(44), end: m(38), status: "approved", reason: "Silver anniversary trip — booked before year start", cover: "locum", locumStatus: "booked", locumName: "Dr. R. Okafor", locumAgency: "GP Now Agency", requestedDaysAgo: 90, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 84)), override: true, decisionNote: "Advance borrowing approved against Q3 expected sessions. Locum budget released.", },
    { id: "lr_j_study", clinicianId: "c_james", type: "study", start: m(30), end: m(30), status: "approved", reason: "Safeguarding Adults Level 3 update", cover: "none", requestedDaysAgo: 45, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 40)) },
    { id: "lr_j_sick", clinicianId: "c_james", type: "sickness", start: m(15), end: m(14), status: "approved", reason: "Influenza — self-certified (2 days)", cover: "internal", requestedDaysAgo: 15, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 14)) },
    { id: "lr_j_grad", clinicianId: "c_james", type: "annual", start: t(16), end: t(17), status: "pending", reason: "Daughter's graduation — Bristol", cover: "internal", requestedDaysAgo: 2 },

    /* ---------------- Dr. Eleanor Vance (Partner, 9/wk) ---------------- */
    { id: "lr_e_easter", clinicianId: "c_eleanor", type: "annual", start: m(128), end: m(122), status: "approved", reason: "Easter break — Cornwall with family", cover: "locum", locumStatus: "booked", locumName: "Dr. K. Whitfield", locumAgency: "MediBank Booking", requestedDaysAgo: 170, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 165)) },
    { id: "lr_e_wedding", clinicianId: "c_eleanor", type: "annual", start: m(61), end: m(60), status: "approved", reason: "Long weekend — nephew's wedding", cover: "internal", requestedDaysAgo: 80, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 75)) },
    { id: "lr_e_rcgp", clinicianId: "c_eleanor", type: "study", start: m(82), end: m(81), status: "approved", reason: "RCGP One Day Essentials — dermatology focus", cover: "none", requestedDaysAgo: 100, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 95)) },
    { id: "lr_e_lakes", clinicianId: "c_eleanor", type: "annual", start: t(21), end: t(27), status: "approved", reason: "Lake District walking week", cover: "internal", requestedDaysAgo: 12, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 6)) },
    { id: "lr_e_halfterm", clinicianId: "c_eleanor", type: "annual", start: t(41), end: t(45), status: "pending", reason: "Half-term break with the children", cover: "internal", requestedDaysAgo: 1 },

    /* ---------------- Dr. Priya Sharma (Salaried, 4/wk — pro-rata) ---------------- */
    { id: "lr_p_mumbai", clinicianId: "c_priya", type: "annual", start: m(70), end: m(68), status: "approved", reason: "Family visit — Mumbai", cover: "internal", requestedDaysAgo: 90, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 85)) },
    { id: "lr_p_pune", clinicianId: "c_priya", type: "annual", start: m(26), end: m(20), status: "approved", reason: "Family emergency travel — Pune", cover: "locum", requestedDaysAgo: 33, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 30)), decisionNote: "Approved at short notice; locum cover sourced same-day." },
    { id: "lr_p_jaipur", clinicianId: "c_priya", type: "annual", start: t(35), end: t(49), status: "pending", reason: "Extended family wedding — Jaipur (flights booked)", cover: "locum", locumStatus: "needed", requestedDaysAgo: 3 },
    { id: "lr_p_drcog", clinicianId: "c_priya", type: "study", start: t(60), end: t(61), status: "pending", reason: "DRCOG preparatory course — Oxford", cover: "none", requestedDaysAgo: 4 },

    /* ---------------- Dr. Marcus Chen (Partner, 8/wk) ---------------- */
    { id: "lr_m_locum", clinicianId: "c_marcus", type: "locum", start: m(101), end: m(96), status: "approved", reason: "Family matter — sessions covered by locum", cover: "locum", locumStatus: "booked", locumName: "Dr. K. Whitfield", locumAgency: "Cotswold Locums", requestedDaysAgo: 120, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 115)), decisionNote: "Covered by Dr. Whitfield, locum invoice #2214." },
    { id: "lr_m_diabetes", clinicianId: "c_marcus", type: "study", start: t(26), end: t(27), status: "approved", reason: "Diabetes masterclass — RCGP", cover: "internal", requestedDaysAgo: 15, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 9)) },
    { id: "lr_m_amalfi", clinicianId: "c_marcus", type: "annual", start: t(54), end: t(58), status: "pending", reason: "Silver wedding anniversary — Amalfi coast", cover: "internal", requestedDaysAgo: 2 },

    /* ---------------- Dr. Amara Osei (Registrar, 8/wk) ---------------- */
    { id: "lr_a_akt", clinicianId: "c_amara", type: "study", start: m(40), end: m(39), status: "approved", reason: "AKT preparation intensive course", cover: "none", requestedDaysAgo: 60, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 55)) },
    { id: "lr_a_halfterm", clinicianId: "c_amara", type: "annual", start: m(36), end: m(32), status: "approved", reason: "Half-term with fiancé's family", cover: "internal", requestedDaysAgo: 52, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 47)) },
    { id: "lr_a_verona", clinicianId: "c_amara", type: "annual", start: t(10), end: t(16), status: "approved", reason: "Sister's wedding — Verona", cover: "internal", requestedDaysAgo: 25, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 18)) },
    { id: "lr_a_msk", clinicianId: "c_amara", type: "study", start: t(62), end: t(62), status: "pending", reason: "MSK examination skills workshop", cover: "none", requestedDaysAgo: 1 },

    /* ---------------- Dr. Tom Hartley (Salaried, 5/wk) ---------------- */
    { id: "lr_t_devon", clinicianId: "c_tom", type: "annual", start: m(75), end: m(71), status: "approved", reason: "Devon coast with the dog", cover: "internal", requestedDaysAgo: 100, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 92)) },
    { id: "lr_t_migraine", clinicianId: "c_tom", type: "sickness", start: m(22), end: m(21), status: "approved", reason: "Acute migraine — self-certified", cover: "internal", requestedDaysAgo: 22, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 21)) },
    { id: "lr_t_move", clinicianId: "c_tom", type: "annual", start: t(19), end: t(20), status: "pending", reason: "House move — completion day", cover: "internal", requestedDaysAgo: 2 },

    /* ---------------- Dr. Nina Kowalski (Salaried, 7/wk — maternity) ---------------- */
    { id: "lr_n_summer", clinicianId: "c_nina", type: "annual", start: m(150), end: m(146), status: "approved", reason: "Summer holiday", cover: "internal", requestedDaysAgo: 180, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 170)) },
    { id: "lr_n_mat", clinicianId: "c_nina", type: "parental", start: m(30), end: t(180), status: "approved", reason: "Maternity leave — planned return in 6 months", cover: "locum", locumStatus: "booked", locumName: "Dr. S. Adeyemi", locumAgency: "In-house locum pool", requestedDaysAgo: 60, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 55)), decisionNote: "Locum budget approved via NHSE maternity locum fund." },

    /* ---------------- Sarah Jenkins (Practice Manager) ---------------- */
    { id: "lr_s_retreat", clinicianId: "c_sarah", type: "annual", start: t(30), end: t(33), status: "pending", reason: "Cotswold wellness retreat", cover: "none", requestedDaysAgo: 1 },

    /* ---------------- A rejection for the audit trail ---------------- */
    { id: "lr_t_fest", clinicianId: "c_tom", type: "annual", start: m(200), end: m(196), status: "rejected", reason: "Music festival weekend", cover: "none", requestedDaysAgo: 220, decidedBy: "c_sarah", decidedByName: "Sarah Jenkins", decidedAt: iso(subDays(now, 215)), decisionNote: "Declined — two GPs already absent at Pine Valley that week; no locum availability." },
  ];

  return raw.map((r) => {
    const c = CLINICIANS.find((x) => x.id === r.clinicianId)!;
    const { requestedDaysAgo, ...rest } = r;
    return {
      ...rest,
      days: workingDaysBetween(r.start, r.end, true),
      sessionsLost: sessionsLostBetween(c, DEFAULT_POLICY, r.start, r.end),
      requestedAt: iso(subDays(now, requestedDaysAgo)),
    };
  });
}

export function makeSeedAudit(now = new Date()): AuditEntry[] {
  const isoT = (d: Date) => d.toISOString();
  return [
    { id: "au_1", at: isoT(subDays(now, 84)), actorId: "c_sarah", actorName: "Sarah Jenkins", action: "Approved with override", detail: "Dr. James Wilson — 5 days annual leave. Note: advance borrowing approved against Q3 expected sessions." },
    { id: "au_2", at: isoT(subDays(now, 55)), actorId: "c_sarah", actorName: "Sarah Jenkins", action: "Approved", detail: "Dr. Nina Kowalski — maternity leave, locum budget released." },
    { id: "au_3", at: isoT(subDays(now, 215)), actorId: "c_sarah", actorName: "Sarah Jenkins", action: "Rejected", detail: "Dr. Tom Hartley — 5 days annual. Cover unavailable at Pine Valley." },
  ];
}

export interface SeedData {
  sites: Site[];
  clinicians: Clinician[];
  policy: Policy;
  requests: LeaveRequest[];
  sessions: SessionLog[];
  audit: AuditEntry[];
}

export function makeSeed(now = new Date()): SeedData {
  const requests = makeSeedRequests(now);
  return {
    sites: SITES,
    clinicians: CLINICIANS,
    policy: DEFAULT_POLICY,
    requests,
    sessions: generateSessions(CLINICIANS, requests, DEFAULT_POLICY),
    audit: makeSeedAudit(now),
  };
}
