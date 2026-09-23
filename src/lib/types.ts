export type Role = "partner" | "salaried" | "registrar" | "manager";
export type Access = "clinical" | "management" | null;
export type LeaveType = "annual" | "study" | "parental" | "sickness" | "locum";
export type LeaveStatus = "pending" | "approved" | "rejected";
export type SessionPeriod = "AM" | "PM";
export type SessionStatus = "completed" | "cancelled";

export interface Site {
  id: string;
  name: string;
  short: string;
  town: string;
  pcn: string;
  color: string;
}

export interface Clinician {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  role: Role;
  grade: string;
  siteId: string;
  sessionsPerWeek: number;
  clinical: boolean;
  color: string;
  since: string;
  email: string;
  access: Access;
}

export type CoverPlan = "internal" | "locum" | "none";
export type LocumStatus = "not-needed" | "needed" | "booked";

export interface LeaveRequest {
  id: string;
  clinicianId: string;
  type: LeaveType;
  start: string; // yyyy-MM-dd
  end: string; // yyyy-MM-dd
  days: number;
  sessionsLost: number;
  status: LeaveStatus;
  reason?: string;
  cover: CoverPlan;
  locumStatus?: LocumStatus;
  locumName?: string;
  locumAgency?: string;
  requestedAt: string;
  decidedBy?: string;
  decidedByName?: string;
  decidedAt?: string;
  override?: boolean;
  decisionNote?: string;
}

export type SessionOrigin = "contract" | "extra" | "swap";

export interface SessionLog {
  id: string;
  clinicianId: string;
  date: string; // yyyy-MM-dd
  period: SessionPeriod;
  activity: string;
  siteId: string;
  status: SessionStatus;
  origin: SessionOrigin;
  note?: string;
  customHours?: string;
}

export interface Policy {
  baseAnnualDays: number;
  baseStudyDays: number;
  fullTimeSessions: number;
  workingWeeksPerYear: number;
  leaveYearStart: string; // "MM-DD"
  accrualCompletionMonths: number;
  hardBlock: boolean;
  allowOverride: boolean;
  excludeBankHolidays: boolean;
  safeStaffingThreshold: number; // max leave days tolerated per rolling 90-day window
}

export type PaceStatus = "on-track" | "deficit" | "surplus";

export const PACE_META: Record<
  PaceStatus,
  { label: string; short: string; tone: "green" | "rose" | "amber"; color: string }
> = {
  "on-track": { label: "On Track", short: "On track", tone: "green", color: "var(--pace-on)" },
  deficit: { label: "At Risk — Deficit", short: "Deficit", tone: "rose", color: "var(--pace-deficit)" },
  surplus: { label: "Surplus — Overworking", short: "Surplus", tone: "amber", color: "var(--pace-surplus)" },
};

export interface AuditEntry {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  action: string;
  detail: string;
}

export interface ToastMsg {
  id: string;
  title: string;
  description?: string;
  variant: "success" | "error" | "info" | "warning";
}

/** Soft/deep tints derived from the theme-aware base colour at runtime. */
const softTint = (v: string) => `color-mix(in srgb, ${v} 16%, white)`;
const deepTint = (v: string) => `color-mix(in srgb, ${v} 78%, black)`;

export const LEAVE_META: Record<
  LeaveType,
  { label: string; capped: boolean; color: string; soft: string; deep: string }
> = {
  annual: { label: "Annual Leave", capped: true, color: "var(--lv-annual)", soft: softTint("var(--lv-annual)"), deep: deepTint("var(--lv-annual)") },
  study: { label: "Study Leave", capped: true, color: "var(--lv-study)", soft: softTint("var(--lv-study)"), deep: deepTint("var(--lv-study)") },
  parental: { label: "Maternity / Paternity", capped: false, color: "var(--lv-parental)", soft: softTint("var(--lv-parental)"), deep: deepTint("var(--lv-parental)") },
  sickness: { label: "Sickness", capped: false, color: "var(--lv-sickness)", soft: softTint("var(--lv-sickness)"), deep: deepTint("var(--lv-sickness)") },
  locum: { label: "Locum-Covered", capped: false, color: "var(--lv-locum)", soft: softTint("var(--lv-locum)"), deep: deepTint("var(--lv-locum)") },
};

export const ROLE_LABEL: Record<Role, string> = {
  partner: "Partner GP",
  salaried: "Salaried GP",
  registrar: "GP Registrar",
  manager: "Practice Manager",
};

export const ACTIVITIES = [
  "GP Clinic",
  "Telephone Triage",
  "Home Visits",
  "Duty Doctor",
  "Enhanced Access",
  "Clinical Admin",
  "MDT / PCN Meeting",
];

export const COVER_LABEL: Record<CoverPlan, string> = {
  internal: "Internal cover arranged",
  locum: "Locum required",
  none: "No cover needed",
};

export const LOCUM_AGENCIES = ["Cotswold Locums", "GP Now Agency", "MediBank Booking", "In-house locum pool"];

export const LOCUM_STATUS_META: Record<LocumStatus, { label: string; short: string; color: string; soft: string; deep: string }> = {
  "not-needed": { label: "No locum required", short: "No locum", color: "var(--locum-none)", soft: softTint("var(--locum-none)"), deep: deepTint("var(--locum-none)") },
  needed: { label: "Needs locum cover", short: "Needs locum", color: "var(--locum-needed)", soft: softTint("var(--locum-needed)"), deep: deepTint("var(--locum-needed)") },
  booked: { label: "Locum booked", short: "Locum booked", color: "var(--locum-booked)", soft: softTint("var(--locum-booked)"), deep: deepTint("var(--locum-booked)") },
};
