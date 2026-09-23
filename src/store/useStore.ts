"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AuditEntry,
  Clinician,
  CoverPlan,
  LeaveRequest,
  LeaveType,
  LocumStatus,
  Policy,
  Role,
  SessionLog,
  SessionOrigin,
  SessionPeriod,
  Site,
  ToastMsg,
} from "@/lib/types";
import { LEAVE_META } from "@/lib/types";
import { makeSeed, DEFAULT_POLICY } from "@/lib/seed";
import { evaluateRequest, generateSessions, uid, weeklyPattern } from "@/lib/engine";

export interface LeaveInput {
  clinicianId: string;
  type: LeaveType;
  start: string;
  end: string;
  reason: string;
  cover: CoverPlan;
  overrideReason?: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  needsOverride?: boolean;
  advance?: boolean;
}

export type ThemeName = "modern" | "classic";

interface AppState {
  authed: boolean;
  theme: ThemeName;
  currentUserId: string;
  siteFilter: string;
  sites: Site[];
  clinicians: Clinician[];
  policy: Policy;
  requests: LeaveRequest[];
  sessions: SessionLog[];
  audit: AuditEntry[];
  toasts: ToastMsg[];

  signIn: (email: string, password: string) => { ok: boolean; error?: string };
  signOut: () => void;
  setTheme: (t: ThemeName) => void;
  setUser: (id: string) => void;
  setSiteFilter: (id: string) => void;
  pushToast: (t: Omit<ToastMsg, "id">) => void;
  dismissToast: (id: string) => void;

  requestLeave: (input: LeaveInput, actorId: string) => ActionResult;
  approveRequest: (id: string, actorId: string, note?: string) => ActionResult;
  rejectRequest: (id: string, actorId: string, note: string) => ActionResult;
  cancelRequest: (id: string, actorId: string) => ActionResult;

  logSession: (input: {
    clinicianId: string;
    date: string;
    period: SessionPeriod;
    activity: string;
    siteId: string;
    origin?: SessionOrigin;
    note?: string;
    customHours?: string;
  }) => ActionResult;
  reportSessionCancel: (input: {
    clinicianId: string;
    date: string;
    period: SessionPeriod;
    activity: string;
    note?: string;
  }, actorId: string) => ActionResult;
  reportSessionSwap: (input: {
    clinicianId: string;
    fromDate: string;
    toDate: string;
    period: SessionPeriod;
    activity: string;
  }, actorId: string) => ActionResult;

  updatePolicy: (patch: Partial<Policy>, actorId: string) => void;
  tagLocum: (
    id: string,
    actorId: string,
    data: { locumStatus: LocumStatus; locumName?: string; locumAgency?: string }
  ) => ActionResult;
  addClinician: (input: {
    name: string;
    role: Role;
    siteId: string;
    sessionsPerWeek: number;
  }, actorId: string) => void;
  resetDemo: () => void;
}

const seed = makeSeed();

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      authed: false,
      theme: "modern",
      currentUserId: "c_eleanor",
      siteFilter: "all",
      sites: seed.sites,
      clinicians: seed.clinicians,
      policy: seed.policy,
      requests: seed.requests,
      sessions: seed.sessions,
      audit: seed.audit,
      toasts: [],

      signIn: (email, password) => {
        const c = get().clinicians.find(
          (x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.access
        );
        if (!c) {
          return {
            ok: false,
            error: "No account with this email can sign in. Tap a demo role below to autofill the credentials.",
          };
        }
        if (!password.trim()) {
          return { ok: false, error: "Enter your password — the demo accounts autofill it for you." };
        }
        set({ authed: true, currentUserId: c.id });
        return { ok: true };
      },
      signOut: () => set({ authed: false }),

      setTheme: (t) => set({ theme: t }),

      setUser: (id) => set({ currentUserId: id }),
      setSiteFilter: (id) => set({ siteFilter: id }),

      pushToast: (t) => {
        const toast: ToastMsg = { ...t, id: uid("t") };
        set((s) => ({ toasts: [...s.toasts.slice(-3), toast] }));
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      requestLeave: (input, actorId) => {
        const s = get();
        const clinician = s.clinicians.find((c) => c.id === input.clinicianId);
        if (!clinician) return { ok: false, error: "Unknown clinician." };
        const actor = s.clinicians.find((c) => c.id === actorId);
        const isManager = actor?.role === "manager";
        const meta = LEAVE_META[input.type];
        const ev = evaluateRequest(clinician, s.requests, s.policy, input.type, input.start, input.end);

        if (!ev.valid)
          return { ok: false, error: "Please choose a valid date range (working days only)." };
        if (ev.conflict)
          return { ok: false, error: `This range overlaps an existing ${meta.label.toLowerCase()} request — adjust the dates or cancel the original first.` };

        let override = false;
        if (ev.hard) {
          if (isManager && s.policy.allowOverride && input.overrideReason?.trim()) {
            override = true;
          } else if (s.policy.hardBlock) {
            return {
              ok: false,
              error: `Request exceeds ${clinician.firstName}'s remaining ${meta.label.toLowerCase()} entitlement (${ev.remaining}d available vs ${ev.days}d requested).`,
              needsOverride: true,
            };
          } else if (!input.overrideReason?.trim()) {
            return { ok: false, error: "Over-entitlement requests require a managerial audit note.", needsOverride: true };
          } else {
            override = true;
          }
        }

        const req: LeaveRequest = {
          id: uid("lr"),
          clinicianId: clinician.id,
          type: input.type,
          start: input.start,
          end: input.end,
          days: ev.days,
          sessionsLost: ev.sessionsLost,
          status: "pending",
          reason: input.reason,
          cover: input.cover,
          requestedAt: new Date().toISOString(),
          override,
          ...(override ? { decisionNote: input.overrideReason?.trim() } : {}),
          locumStatus:
            input.cover === "locum" ? ("needed" as const) : ("not-needed" as const),
        };
        set((st) => ({
          requests: [req, ...st.requests],
          audit: [
            {
              id: uid("au"),
              at: new Date().toISOString(),
              actorId,
              actorName: actor?.name ?? "Unknown",
              action: override ? "Requested (managerial over-entitlement)" : "Requested",
              detail: `${clinician.name} — ${ev.days}d ${meta.label.toLowerCase()}, ${req.start} → ${req.end}`,
            },
            ...st.audit,
          ].slice(0, 60),
        }));
        return { ok: true };
      },

      approveRequest: (id, actorId, note) => {
        const s = get();
        const req = s.requests.find((r) => r.id === id);
        const actor = s.clinicians.find((c) => c.id === actorId);
        if (!req || req.status !== "pending") return { ok: false, error: "Request is no longer pending." };
        const clinician = s.clinicians.find((c) => c.id === req.clinicianId);
        if (!clinician) return { ok: false, error: "Unknown clinician." };
        const ev = evaluateRequest(clinician, s.requests, s.policy, req.type, req.start, req.end, req.id);

        if (ev.hard && !(s.policy.allowOverride && note?.trim())) {
          return {
            ok: false,
            needsOverride: true,
            error: `This exceeds the remaining ${LEAVE_META[req.type].label.toLowerCase()} entitlement (${ev.remaining}d available vs ${ev.days}d). A managerial override note is required to force-approve.`,
          };
        }
        if (ev.advance && s.policy.allowOverride && !note?.trim()) {
          return {
            ok: false,
            needsOverride: true,
            advance: true,
            error: `Borrowing ahead of accrual — only ${ev.accruedByStart - ev.used - ev.pending}d will be accrued by the start date. An audit note is required to approve.`,
          };
        }

        set((st) => ({
          requests: st.requests.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: "approved" as const,
                  decidedBy: actorId,
                  decidedByName: actor?.name ?? "Practice Manager",
                  decidedAt: new Date().toISOString(),
                  override: r.override || ev.hard || ev.advance,
                  decisionNote: note?.trim() || r.decisionNote,
                }
              : r
          ),
          audit: [
            {
              id: uid("au"),
              at: new Date().toISOString(),
              actorId,
              actorName: actor?.name ?? "Unknown",
              action: ev.hard || ev.advance || req.override ? "Approved with override" : "Approved",
              detail: `${clinician.name} — ${req.days}d ${LEAVE_META[req.type].label.toLowerCase()}${note?.trim() ? `. Note: ${note.trim()}` : ""}`,
            },
            ...st.audit,
          ].slice(0, 60),
        }));
        return { ok: true };
      },

      rejectRequest: (id, actorId, note) => {
        const s = get();
        const req = s.requests.find((r) => r.id === id);
        const actor = s.clinicians.find((c) => c.id === actorId);
        if (!req || req.status !== "pending") return { ok: false, error: "Request is no longer pending." };
        const clinician = s.clinicians.find((c) => c.id === req.clinicianId);
        set((st) => ({
          requests: st.requests.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: "rejected" as const,
                  decidedBy: actorId,
                  decidedByName: actor?.name ?? "Practice Manager",
                  decidedAt: new Date().toISOString(),
                  decisionNote: note,
                }
              : r
          ),
          audit: [
            {
              id: uid("au"),
              at: new Date().toISOString(),
              actorId,
              actorName: actor?.name ?? "Unknown",
              action: "Rejected",
              detail: `${clinician?.name ?? "Request"} — ${req.days}d ${LEAVE_META[req.type].label.toLowerCase()}. Reason: ${note}`,
            },
            ...st.audit,
          ].slice(0, 60),
        }));
        return { ok: true };
      },

      cancelRequest: (id, actorId) => {
        const s = get();
        const req = s.requests.find((r) => r.id === id);
        const actor = s.clinicians.find((c) => c.id === actorId);
        if (!req) return { ok: false, error: "Request not found." };
        const clinician = s.clinicians.find((c) => c.id === req.clinicianId);
        set((st) => ({
          requests: st.requests.filter((r) => r.id !== id),
          audit: [
            {
              id: uid("au"),
              at: new Date().toISOString(),
              actorId,
              actorName: actor?.name ?? "Unknown",
              action: "Cancelled",
              detail: `${clinician?.name ?? "Request"} — ${req.days}d ${LEAVE_META[req.type].label.toLowerCase()} (${req.start})`,
            },
            ...st.audit,
          ].slice(0, 60),
        }));
        return { ok: true };
      },

      logSession: ({ clinicianId, date, period, activity, siteId, origin = "extra", note, customHours }) => {
        const s = get();
        const clinician = s.clinicians.find((c) => c.id === clinicianId);
        if (!clinician?.clinical) return { ok: false, error: "Sessions can only be logged for clinical staff." };
        const clash = s.sessions.find(
          (l) => l.clinicianId === clinicianId && l.date === date && l.period === period && l.status === "completed"
        );
        if (clash) {
          return { ok: false, error: `A delivered ${period} session is already recorded for that date.` };
        }
        const log: SessionLog = {
          id: uid("s"),
          clinicianId,
          date,
          period,
          activity,
          siteId: siteId || clinician.siteId,
          status: "completed",
          origin,
          ...(note ? { note } : {}),
          ...(customHours ? { customHours } : {}),
        };
        set((st) => ({ sessions: [log, ...st.sessions] }));
        return { ok: true };
      },

      reportSessionCancel: ({ clinicianId, date, period, activity, note }, actorId) => {
        const s = get();
        const clinician = s.clinicians.find((c) => c.id === clinicianId);
        const actor = s.clinicians.find((c) => c.id === actorId);
        if (!clinician?.clinical) return { ok: false, error: "Cancellations apply to clinical staff only." };
        const existing = s.sessions.find(
          (l) => l.clinicianId === clinicianId && l.date === date && l.period === period
        );
        if (existing?.status === "cancelled") {
          return { ok: false, error: "That session is already recorded as cancelled." };
        }
        set((st) => ({
          sessions: existing
            ? st.sessions.map((l) =>
                l.id === existing.id
                  ? { ...l, status: "cancelled" as const, ...(note ? { note } : {}) }
                  : l
              )
            : [
                {
                  id: uid("s"),
                  clinicianId,
                  date,
                  period,
                  activity,
                  siteId: clinician.siteId,
                  status: "cancelled" as const,
                  origin: "contract" as const,
                  ...(note ? { note } : {}),
                },
                ...st.sessions,
              ],
          audit: [
            {
              id: uid("au"),
              at: new Date().toISOString(),
              actorId,
              actorName: actor?.name ?? "Unknown",
              action: "Session cancelled",
              detail: `${clinician.name} — ${period} on ${date}${note ? `. Note: ${note}` : ""}`,
            },
            ...st.audit,
          ].slice(0, 60),
        }));
        return { ok: true };
      },

      reportSessionSwap: ({ clinicianId, fromDate, toDate, period, activity }, actorId) => {
        const s = get();
        const clinician = s.clinicians.find((c) => c.id === clinicianId);
        const actor = s.clinicians.find((c) => c.id === actorId);
        if (!clinician?.clinical) return { ok: false, error: "Swaps apply to clinical staff only." };
        if (fromDate === toDate) return { ok: false, error: "The make-up date must differ from the original session." };
        if (s.sessions.some((l) => l.clinicianId === clinicianId && l.date === toDate && l.period === period && l.status === "completed")) {
          return { ok: false, error: `A delivered ${period} session already exists on the make-up date.` };
        }
        const existing = s.sessions.find(
          (l) => l.clinicianId === clinicianId && l.date === fromDate && l.period === period
        );
        set((st) => ({
          sessions: [
            ...(existing
              ? st.sessions.map((l) =>
                  l.id === existing.id
                    ? { ...l, status: "cancelled" as const, note: `Swapped to ${toDate}`, origin: "swap" as const }
                    : l
                )
              : st.sessions),
            {
              id: uid("s"),
              clinicianId,
              date: toDate,
              period,
              activity,
              siteId: clinician.siteId,
              status: "completed" as const,
              origin: "swap" as const,
              note: `Make-up for ${fromDate}`,
            },
          ],
          audit: [
            {
              id: uid("au"),
              at: new Date().toISOString(),
              actorId,
              actorName: actor?.name ?? "Unknown",
              action: "Session swapped",
              detail: `${clinician.name} — ${period} moved ${fromDate} → ${toDate}`,
            },
            ...st.audit,
          ].slice(0, 60),
        }));
        return { ok: true };
      },

      tagLocum: (id, actorId, data) => {
        const s = get();
        const actor = s.clinicians.find((c) => c.id === actorId);
        const req = s.requests.find((r) => r.id === id);
        if (!req) return { ok: false, error: "Leave record not found." };
        if (data.locumStatus === "booked" && !data.locumName?.trim()) {
          return { ok: false, error: "Enter the locum's name to mark a booking." };
        }
        const clinician = s.clinicians.find((c) => c.id === req.clinicianId);
        set((st) => ({
          requests: st.requests.map((r) =>
            r.id === id
              ? {
                  ...r,
                  locumStatus: data.locumStatus,
                  locumName: data.locumStatus === "not-needed" ? undefined : data.locumName?.trim() || undefined,
                  locumAgency: data.locumStatus === "not-needed" ? undefined : data.locumAgency?.trim() || undefined,
                }
              : r
          ),
          audit: [
            {
              id: uid("au"),
              at: new Date().toISOString(),
              actorId,
              actorName: actor?.name ?? "Unknown",
              action:
                data.locumStatus === "booked"
                  ? "Locum booked"
                  : data.locumStatus === "needed"
                    ? "Locum cover flagged"
                    : "Locum cover cleared",
              detail: `${clinician?.name ?? "Clinician"} — ${LEAVE_META[req.type].label} ${req.start}${data.locumName?.trim() ? ` · ${data.locumName.trim()} (${data.locumAgency?.trim() ?? "agency"})` : ""}`,
            },
            ...st.audit,
          ].slice(0, 60),
        }));
        return { ok: true };
      },

      updatePolicy: (patch, actorId) => {
        const s = get();
        const actor = s.clinicians.find((c) => c.id === actorId);
        const keys = Object.keys(patch).join(", ");
        set((st) => ({
          policy: { ...st.policy, ...patch },
          audit: [
            {
              id: uid("au"),
              at: new Date().toISOString(),
              actorId,
              actorName: actor?.name ?? "Unknown",
              action: "Policy updated",
              detail: `Changed: ${keys}`,
            },
            ...st.audit,
          ].slice(0, 60),
        }));
      },

      addClinician: ({ name, role, siteId, sessionsPerWeek }, actorId) => {
        const s = get();
        const actor = s.clinicians.find((c) => c.id === actorId);
        const parts = name.trim().split(/\s+/);
        const initials = parts
          .filter((p) => /^[A-Z]/i.test(p))
          .map((p) => p[0]!.toUpperCase())
          .slice(-2)
          .join("") || "NC";
        const palette = ["#0D9488", "#0EA5E9", "#8B5CF6", "#F59E0B", "#0369A1", "#F43F5E"];
        const clinical = role !== "manager";
        const emailLocal = parts
          .filter((p) => !/^dr\.?$/i.test(p))
          .join(".")
          .toLowerCase()
          .replace(/[^a-z.]/g, "") || "new.member";
        const c: Clinician = {
          id: uid("c"),
          name: name.trim(),
          firstName: parts.find((p) => !/^dr\.?$/i.test(p)) ?? parts[0] ?? "New",
          initials,
          role,
          grade: role === "partner" ? "Partner GP" : role === "salaried" ? "Salaried GP" : role === "registrar" ? "GP Registrar" : "Practice Manager",
          siteId,
          sessionsPerWeek: clinical ? sessionsPerWeek : 10,
          clinical,
          color: palette[s.clinicians.length % palette.length],
          since: new Date().toISOString().slice(0, 10),
          email: `${emailLocal}@medleave.demo`,
          access: null,
        };
        const fresh = clinical ? generateSessions([c], [], s.policy as Policy) : [];
        set((st) => ({
          clinicians: [...st.clinicians, c],
          sessions: [...fresh, ...st.sessions],
          audit: [
            {
              id: uid("au"),
              at: new Date().toISOString(),
              actorId,
              actorName: actor?.name ?? "Unknown",
              action: "Clinician added",
              detail: `${c.name} — ${c.grade}, ${c.sessionsPerWeek} sessions/wk at ${st.sites.find((x) => x.id === siteId)?.short ?? siteId}`,
            },
            ...st.audit,
          ].slice(0, 60),
        }));
      },

      resetDemo: () => {
        const fresh = makeSeed();
        set((st) => ({
          clinicians: fresh.clinicians,
          sites: fresh.sites,
          policy: fresh.policy,
          requests: fresh.requests,
          sessions: fresh.sessions,
          audit: fresh.audit,
          toasts: st.toasts,
        }));
      },
    }),
    {
      name: "medleave-store",
      version: 5,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        authed: s.authed,
        theme: s.theme,
        currentUserId: s.currentUserId,
        siteFilter: s.siteFilter,
        sites: s.sites,
        clinicians: s.clinicians,
        policy: s.policy,
        requests: s.requests,
        sessions: s.sessions,
        audit: s.audit,
      }),
      migrate: (persisted) => {
        const p = persisted as Omit<AppState, "policy" | "clinicians" | "requests"> & {
          policy?: Partial<Policy>;
          clinicians?: Array<Partial<Clinician> & { id: string }>;
          requests?: Array<Partial<LeaveRequest> & { id: string }>;
        };
        return {
          ...p,
          authed: p.authed ?? false,
          theme: p.theme ?? "modern",
          policy: { ...DEFAULT_POLICY, ...(p.policy ?? {}) },
          clinicians: (p.clinicians ?? []).map((c) => {
            const seedC = seed.clinicians.find((x) => x.id === c.id);
            return {
              ...c,
              email: c.email ?? seedC?.email ?? `member.${c.id.slice(2)}@medleave.demo`,
              access: c.access ?? seedC?.access ?? null,
            } as Clinician;
          }),
          requests: (p.requests ?? []).map((r) => ({
            ...r,
            locumStatus: r.locumStatus ?? (r.cover === "locum" ? ("needed" as const) : ("not-needed" as const)),
          })) as LeaveRequest[],
          sessions: (p.sessions ?? []).map((l) => ({ ...l, origin: l.origin ?? ("contract" as const) })),
        } as AppState;
      },
    }
  )
);
