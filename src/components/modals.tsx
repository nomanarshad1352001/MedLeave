"use client";

import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  Briefcase,
  CalendarPlus,
  CheckCircle2,
  GraduationCap,
  HeartPulse,
  Palmtree,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  UserRoundPlus,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import {
  accruedBy,
  entitlementFor,
  evaluateRequest,
  fmtDay,
  fmtRange,
  todayISO,
} from "@/lib/engine";
import type { CoverPlan, LeaveRequest, LeaveType, LocumStatus } from "@/lib/types";
import { LEAVE_META, ACTIVITIES, LOCUM_AGENCIES, LOCUM_STATUS_META } from "@/lib/types";
import { Avatar, Badge, Button, cn, Field, inputCls, Modal, Select, Textarea } from "./ui";

const TYPE_OPTIONS: Array<{ value: LeaveType; label: string; icon: React.ReactNode }> = [
  { value: "annual", label: "Annual", icon: <Palmtree className="size-4" /> },
  { value: "study", label: "Study", icon: <GraduationCap className="size-4" /> },
  { value: "parental", label: "Parental", icon: <HeartPulse className="size-4" /> },
  { value: "sickness", label: "Sickness", icon: <Stethoscope className="size-4" /> },
  { value: "locum", label: "Locum-covered", icon: <Briefcase className="size-4" /> },
];

/* ------------------------------------------------------------------ */
/* Request Leave — with live entitlement guardrails                    */
/* ------------------------------------------------------------------ */
export function RequestLeaveModal({
  open,
  onClose,
  defaultType = "annual",
}: {
  open: boolean;
  onClose: () => void;
  defaultType?: LeaveType;
}) {
  const { currentUserId, clinicians, requests, policy, requestLeave, pushToast } = useStore();
  const me = clinicians.find((c) => c.id === currentUserId);
  const isManager = me?.role === "manager";

  const [subjectId, setSubjectId] = useState(currentUserId);
  const [type, setType] = useState<LeaveType>(defaultType);
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(todayISO());
  const [reason, setReason] = useState("");
  const [cover, setCover] = useState<CoverPlan>("internal");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const subject = clinicians.find((c) => c.id === subjectId) ?? me!;
  const ev = useMemo(
    () => evaluateRequest(subject, requests, policy, type, start, end),
    [subject, requests, policy, type, start, end]
  );

  const hardBlocked = ev.hard && !(isManager && policy.allowOverride);
  const needsOverride = isManager && policy.allowOverride && ev.hard;
  const canSubmit =
    ev.valid && !ev.conflict && !hardBlocked && (!needsOverride || note.trim().length > 0);

  const reset = () => {
    setReason(""); setNote(""); setError(""); setSubjectId(currentUserId);
    setType(defaultType); setStart(todayISO()); setEnd(todayISO());
  };

  const submit = () => {
    const res = requestLeave(
      { clinicianId: subject.id, type, start, end, reason: reason.trim(), cover, overrideReason: note },
      currentUserId
    );
    if (!res.ok) {
      setError(res.error ?? "Unable to submit.");
      pushToast({ title: "Request blocked", description: res.error, variant: "error" });
      return;
    }
    pushToast({
      title: `${LEAVE_META[type].label} requested`,
      description: `${ev.days} working days · ${fmtRange(start, end)}${ev.advance ? " · flagged for accrual override" : ""}`,
      variant: ev.advance ? "warning" : "success",
    });
    reset();
    onClose();
  };

  const meta = LEAVE_META[type];

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Request leave"
      subtitle="Guardrails check your balance against both the full-year entitlement and the accrual projected to the start date."
      icon={<CalendarPlus className="size-5" />}
      wide
    >
      <div className="grid gap-6 md:grid-cols-[1fr_240px]">
        {/* Form column */}
        <div className="space-y-4">
          {isManager && (
            <Field label="On behalf of">
              <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                {clinicians.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.grade}</option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Leave category">
            <div className="flex flex-wrap gap-1.5">
              {TYPE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setType(o.value)}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-all",
                    type === o.value
                      ? "border-transparent text-white shadow-soft"
                      : "border-slate-900/12 bg-white/60 text-slate-900/60 hover:text-slate-900"
                  )}
                  style={type === o.value ? { background: LEAVE_META[o.value].color } : {}}
                >
                  {o.icon} {o.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="First day">
              <input type="date" className={inputCls} value={start} min={type === "sickness" ? undefined : todayISO()} onChange={(e) => { setStart(e.target.value); if (e.target.value > end) setEnd(e.target.value); }} />
            </Field>
            <Field label="Last day">
              <input type="date" className={inputCls} value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Cover arrangement">
              <Select value={cover} onChange={(e) => setCover(e.target.value as CoverPlan)}>
                <option value="internal">Internal cover arranged</option>
                <option value="locum">Needs locum cover — will be tagged</option>
                <option value="none">No cover needed</option>
              </Select>
            </Field>
            <Field label={type === "sickness" ? "Absence details" : "Reason (optional)"}>
              <input
                className={inputCls}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={type === "sickness" ? "e.g. Self-certified flu" : "e.g. Family trip"}
              />
            </Field>
          </div>

          {needsOverride && (
            <div className="rounded-2xl border border-teal-400/50 bg-teal-100/60 p-4">
              <p className="flex items-center gap-2 text-[12.5px] font-bold text-teal-700">
                <ShieldCheck className="size-4" /> Managerial override required
              </p>
              <Textarea
                className="mt-2.5 bg-white/80"
                placeholder='Audit note, e.g. "Advance borrowing approved against Q4 expected sessions"'
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          )}

          {error && (
            <p className="flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-100/70 p-3.5 text-[12.5px] font-medium leading-relaxed text-rose-700">
              <XCircle className="mt-0.5 size-4 shrink-0" /> {error}
            </p>
          )}
        </div>

        {/* Live balance panel */}
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-900/[0.08] bg-slate-50/70 p-4">
            <p className="mb-3 flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-700/55">
              <BookOpen className="size-3.5" /> {meta.label} position
            </p>
            {ev.capped ? (
              <dl className="space-y-2 text-[12.5px]">
                <Row k="Annual entitlement" v={`${ev.entitlement}d`} />
                <Row k={`Accrued by ${fmtDay(start)}`} v={`${ev.accruedByStart}d`} />
                <Row k="Already approved" v={`−${ev.used}d`} />
                <Row k="Pending requests" v={`−${ev.pending}d`} muted={ev.pending === 0} />
                <div className="my-2 rule-h" />
                <Row k="This request" v={`${ev.days}d`} strong />
                <Row k="Projected remaining" v={`${ev.afterFull}d`} strong tone={ev.afterFull < 0 ? "bad" : "good"} />
              </dl>
            ) : (
              <p className="text-[12.5px] leading-relaxed text-slate-900/60">
                {meta.label} is recorded without a fixed allowance — it won't draw down the annual entitlement.
              </p>
            )}
            {subject.clinical && (
              <p className="mt-3 border-t border-slate-900/[0.07] pt-3 text-[11.5px] leading-relaxed text-slate-900/55">
                ≈ <strong className="text-slate-900">{ev.sessionsLost}</strong> contracted sessions will need cover during this period.
              </p>
            )}
          </div>

          {ev.conflict && (
            <Alert tone="rose" icon={<AlertTriangle className="size-4" />} text="Overlaps an existing request. Adjust the dates or cancel the original first." />
          )}
          {ev.hard && !ev.conflict && (
            <Alert
              tone="rose"
              icon={<ShieldAlert className="size-4" />}
              text={hardBlocked
                ? `Preventative block — exceeds the remaining entitlement by ${Math.abs(ev.afterFull)}d. Booking is disabled${policy.hardBlock ? "" : " for clinicians"}.`
                : "Over-entitlement — approvable only with a managerial override note."}
            />
          )}
          {!ev.hard && ev.advance && (
            <Alert tone="teal" icon={<AlertTriangle className="size-4" />} text={`Advance borrowing — ${Math.abs(ev.afterAccrual)}d beyond the accrual projected by the start date. A manager must approve with an audit note.`} />
          )}
          {ev.valid && !ev.conflict && !ev.hard && !ev.advance && (
            <Alert tone="slate" icon={<CheckCircle2 className="size-4" />} text="Within entitlement and projected accrual — clear to submit." />
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-900/[0.07] pt-5">
        <p className="text-[11.5px] text-slate-900/45">
          {ev.valid ? `${ev.days} working day${ev.days === 1 ? "" : "s"} deducted` : "Select a valid range"}
        </p>
        <div className="flex gap-2.5">
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button variant={needsOverride ? "teal" : "primary"} disabled={!canSubmit} onClick={submit}>
            {needsOverride ? <ShieldCheck className="size-4" /> : <CalendarPlus className="size-4" />}
            {needsOverride ? "Submit with override" : "Submit request"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Row({ k, v, strong, tone, muted }: { k: string; v: string; strong?: boolean; tone?: "good" | "bad"; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={cn("text-slate-900/60", strong && "font-semibold text-slate-900", muted && "opacity-40")}>{k}</dt>
      <dd className={cn(
        "font-semibold tabular-nums",
        strong ? "text-[13.5px] text-slate-900" : "text-slate-900",
        tone === "good" && "text-slate-600",
        tone === "bad" && "text-rose-500",
        muted && "opacity-40"
      )}>
        {v}
      </dd>
    </div>
  );
}

function Alert({ tone, icon, text }: { tone: "slate" | "teal" | "rose"; icon: React.ReactNode; text: string }) {
  return (
    <div className={cn(
      "flex items-start gap-2.5 rounded-2xl border p-3.5 text-[12px] font-medium leading-relaxed",
      tone === "slate" && "border-slate-600/25 bg-slate-100/70 text-slate-800",
      tone === "teal" && "border-teal-400/50 bg-teal-100/70 text-teal-700",
      tone === "rose" && "border-rose-500/30 bg-rose-100/70 text-rose-700"
    )}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      {text}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Decision modal — approve / reject                                   */
/* ------------------------------------------------------------------ */
export function DecisionModal({
  req,
  mode,
  onClose,
}: {
  req: LeaveRequest | null;
  mode: "approve" | "reject";
  onClose: () => void;
}) {
  const { clinicians, requests, policy, currentUserId, approveRequest, rejectRequest, pushToast } = useStore();
  const [note, setNote] = useState("");
  const c = req ? clinicians.find((x) => x.id === req.clinicianId) : undefined;

  const ev = useMemo(() => {
    if (!req || !c) return null;
    return evaluateRequest(c, requests, policy, req.type, req.start, req.end, req.id);
  }, [req, c, requests, policy]);

  if (!req || !c || !ev) return <Modal open={false} onClose={onClose} title="" />;

  const requiresNote = policy.allowOverride && (ev.hard || ev.advance);
  const canConfirm =
    mode === "reject" ? note.trim().length > 0 : (!requiresNote || note.trim().length > 0);

  const confirm = () => {
    if (mode === "approve") {
      const res = approveRequest(req.id, currentUserId, note);
      if (!res.ok) {
        pushToast({ title: "Approval blocked", description: res.error, variant: "error" });
        return;
      }
      pushToast({
        title: `Leave approved${ev.hard || ev.advance ? " with override" : ""}`,
        description: `${c.name} · ${req.days}d ${LEAVE_META[req.type].label.toLowerCase()} · ${fmtRange(req.start, req.end)}`,
        variant: "success",
      });
    } else {
      const res = rejectRequest(req.id, currentUserId, note.trim());
      if (!res.ok) {
        pushToast({ title: "Unable to reject", description: res.error, variant: "error" });
        return;
      }
      pushToast({ title: "Request rejected", description: `${c.name} has been notified with your reason.`, variant: "info" });
    }
    setNote("");
    onClose();
  };

  return (
    <Modal
      open={!!req}
      onClose={() => { setNote(""); onClose(); }}
      title={mode === "approve" ? "Approve leave" : "Reject leave"}
      subtitle={`${c.name} · ${req.days} working days`}
      icon={mode === "approve" ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
    >
      <div className="mb-4 rounded-2xl border border-slate-900/[0.08] bg-slate-50/70 p-4">
        <div className="flex items-center gap-3">
          <Avatar c={c} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">{fmtRange(req.start, req.end)}</p>
            <p className="text-[12px] text-slate-900/55">{LEAVE_META[req.type].label} · ≈{req.sessionsLost} sessions affected</p>
          </div>
          <Badge tone="neutral" className="shrink-0">{ev.remaining}d left of {ev.entitlement}d</Badge>
        </div>
        {(req.locumStatus && req.locumStatus !== "not-needed") && (
          <p className="mt-3 flex items-center gap-2 border-t border-slate-900/[0.07] pt-3 text-[12px] font-semibold"
            style={{ color: LOCUM_STATUS_META[req.locumStatus].deep }}>
            <BadgeCheck className="size-3.5" />
            {LOCUM_STATUS_META[req.locumStatus].label}
            {req.locumStatus === "booked" && req.locumName ? ` — ${req.locumName} · ${req.locumAgency ?? "agency"}` : " — staffing matrix will count this as exposed until booked"}
          </p>
        )}
        {req.reason && <p className="mt-3 border-t border-slate-900/[0.07] pt-3 text-[12.5px] italic text-slate-900/60">“{req.reason}”</p>}
        {req.decisionNote && req.override && (
          <p className="mt-2 flex items-start gap-2 text-[12px] font-medium leading-relaxed text-teal-700">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" /> Filed with managerial note: {req.decisionNote}
          </p>
        )}
      </div>

      {mode === "approve" && ev.hard && (
        <Alert tone="rose" icon={<ShieldAlert className="size-4" />} text={`This exceeds the remaining entitlement (${ev.remaining}d available vs ${req.days}d). Force-approval requires an audit note and will be logged.`} />
      )}
      {mode === "approve" && !ev.hard && ev.advance && (
        <Alert tone="teal" icon={<AlertTriangle className="size-4" />} text={`Advance borrowing — only ${ev.accruedByStart - ev.used - ev.pending}d accrued by the start date. Approval requires an audit note.`} />
      )}

      <div className="mt-4">
        <Field
          label={mode === "reject" ? "Reason for rejection (required)" : requiresNote ? "Override audit note (required)" : "Decision note (optional)"}
        >
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              mode === "reject"
                ? "e.g. Two GPs already absent that week; locum unavailable"
                : 'e.g. "Advance borrowing approved against Q4 expected sessions"'
            }
          />
        </Field>
      </div>

      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="ghost" onClick={() => { setNote(""); onClose(); }}>Back</Button>
        <Button
          variant={mode === "approve" ? (requiresNote ? "teal" : "primary") : "danger"}
          disabled={!canConfirm}
          onClick={confirm}
        >
          {mode === "approve"
            ? (requiresNote ? <><ShieldCheck className="size-4" /> Force-approve with note</> : <><CheckCircle2 className="size-4" /> Approve leave</>)
            : <><XCircle className="size-4" /> Reject request</>}
        </Button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Cancel confirmation                                                 */
/* ------------------------------------------------------------------ */
export function CancelRequestModal({ req, onClose }: { req: LeaveRequest | null; onClose: () => void }) {
  const { clinicians, currentUserId, cancelRequest, pushToast } = useStore();
  const c = req ? clinicians.find((x) => x.id === req.clinicianId) : undefined;
  if (!req || !c) return <Modal open={false} onClose={onClose} title="" />;
  return (
    <Modal open={!!req} onClose={onClose} title="Withdraw request" icon={<XCircle className="size-5" />}
      subtitle="The days will be released back to the balance immediately.">
      <p className="text-sm leading-relaxed text-slate-900/65">
        Withdraw <strong className="text-slate-900">{c.name}'s</strong> {req.days}-day{" "}
        {LEAVE_META[req.type].label.toLowerCase()} for{" "}
        <strong className="text-slate-900">{fmtRange(req.start, req.end)}</strong>?
        This action is recorded in the audit trail.
      </p>
      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="ghost" onClick={onClose}>Keep request</Button>
        <Button
          variant="danger"
          onClick={() => {
            const res = cancelRequest(req.id, currentUserId);
            if (res.ok) pushToast({ title: "Request withdrawn", description: `${req.days}d released back to ${c.firstName}'s balance.`, variant: "info" });
            onClose();
          }}
        >
          Withdraw request
        </Button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Log / report sessions — extra, cancellation, swap                   */
/* ------------------------------------------------------------------ */
type LogMode = "extra" | "cancel" | "swap";

export function LogSessionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentUserId, clinicians, logSession, reportSessionCancel, reportSessionSwap, pushToast } = useStore();
  const me = clinicians.find((c) => c.id === currentUserId);
  const [mode, setMode] = useState<LogMode>("extra");
  const [subjectId, setSubjectId] = useState(currentUserId);
  const [date, setDate] = useState(todayISO());
  const [toDate, setToDate] = useState(todayISO());
  const [period, setPeriod] = useState<"AM" | "PM" | "CUSTOM">("AM");
  const [fromT, setFromT] = useState("18:30");
  const [toT, setToT] = useState("20:00");
  const [activity, setActivity] = useState(ACTIVITIES[0]);
  const [note, setNote] = useState("");

  const isManager = me?.role === "manager";
  const subject = clinicians.find((c) => c.id === subjectId) ?? me;
  const clinicalIds = clinicians.filter((c) => c.clinical).map((c) => c.id);
  const effPeriod: "AM" | "PM" = period === "CUSTOM" ? "AM" : period;
  const customHours = period === "CUSTOM" ? `${fromT}–${toT}` : undefined;

  const submit = () => {
    if (!subject) return;
    if (mode === "extra") {
      if (date > todayISO()) {
        pushToast({ title: "Future sessions", description: "Delivered sessions can only be logged up to today.", variant: "error" });
        return;
      }
      const res = logSession({
        clinicianId: subject.id, date, period: effPeriod, activity,
        siteId: subject.siteId, origin: "extra", note: note.trim() || undefined, customHours,
      });
      if (!res.ok) { pushToast({ title: "Unable to log", description: res.error, variant: "error" }); return; }
      pushToast({
        title: "Extra session logged",
        description: `${subject.firstName} · ${activity} · ${fmtDay(date)}${customHours ? ` (${customHours})` : ` (${effPeriod})`} — counts toward the rolling total.`,
        variant: "success",
      });
    } else if (mode === "cancel") {
      const res = reportSessionCancel(
        { clinicianId: subject.id, date, period: effPeriod, activity, note: note.trim() || undefined },
        currentUserId
      );
      if (!res.ok) { pushToast({ title: "Unable to report", description: res.error, variant: "error" }); return; }
      pushToast({
        title: "Cancellation reported",
        description: `${subject.firstName} · ${effPeriod} on ${fmtDay(date)} marked cancelled — excluded from delivery counts.`,
        variant: "warning",
      });
    } else {
      const res = reportSessionSwap(
        { clinicianId: subject.id, fromDate: date, toDate, period: effPeriod, activity },
        currentUserId
      );
      if (!res.ok) { pushToast({ title: "Unable to swap", description: res.error, variant: "error" }); return; }
      pushToast({
        title: "Session swapped",
        description: `${subject.firstName} · ${effPeriod} moved ${fmtDay(date)} → ${fmtDay(toDate)}. Net delivery unchanged.`,
        variant: "info",
      });
    }
    setNote("");
    onClose();
  };

  const MODE_META: Array<{ v: LogMode; label: string; hint: string }> = [
    { v: "extra", label: "Log extra", hint: "Ad-hoc or additional session delivered" },
    { v: "cancel", label: "Report cancellation", hint: "Clinic cancelled — excluded from totals" },
    { v: "swap", label: "Report swap", hint: "Move a contracted session to a make-up date" },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Session journal" icon={<Stethoscope className="size-5" />}
      subtitle="Extras, cancellations and swaps adjust the rolling 12-month total in real time." wide>
      <div className="mb-5 grid gap-2 sm:grid-cols-3">
        {MODE_META.map((m) => (
          <button
            key={m.v}
            onClick={() => setMode(m.v)}
            className={cn(
              "cursor-pointer rounded-2xl border p-3.5 text-left transition-all",
              mode === m.v ? "border-slate-900 bg-slate-900 text-paper shadow-soft" : "border-slate-900/12 bg-white/60 hover:border-slate-900/30"
            )}
          >
            <p className={cn("text-[13px] font-bold", mode === m.v ? "text-paper" : "text-slate-900")}>{m.label}</p>
            <p className={cn("mt-1 text-[11px] leading-snug", mode === m.v ? "text-paper/60" : "text-slate-900/50")}>{m.hint}</p>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {isManager && (
          <Field label="Clinician">
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {clinicalIds.map((id) => {
                const cc = clinicians.find((x) => x.id === id)!;
                return <option key={id} value={id}>{cc.name} — {cc.sessionsPerWeek}/wk</option>;
              })}
            </Select>
          </Field>
        )}
        {!isManager && subject && (
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50/80 p-3">
            <Avatar c={subject} size="sm" />
            <p className="text-[13px] font-semibold text-slate-900">{subject.name}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={mode === "swap" ? "Original session date" : "Date"}>
            <input type="date" className={inputCls} value={date} max={mode === "extra" ? todayISO() : undefined} onChange={(e) => setDate(e.target.value)} />
          </Field>
          {mode === "swap" ? (
            <Field label="Make-up date">
              <input type="date" className={inputCls} value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </Field>
          ) : (
            <Field label="Block">
              <PeriodPicker period={period} setPeriod={setPeriod} />
            </Field>
          )}
        </div>
        {mode === "swap" && (
          <Field label="Block">
            <PeriodPicker period={period} setPeriod={setPeriod} />
          </Field>
        )}
        {period === "CUSTOM" && mode !== "swap" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <input type="time" className={inputCls} value={fromT} onChange={(e) => setFromT(e.target.value)} />
            </Field>
            <Field label="To">
              <input type="time" className={inputCls} value={toT} onChange={(e) => setToT(e.target.value)} />
            </Field>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Activity">
            <Select value={activity} onChange={(e) => setActivity(e.target.value)}>
              {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </Field>
          {mode !== "swap" && (
            <Field label={mode === "cancel" ? "Reason (optional)" : "Note (optional)"}>
              <input
                className={inputCls}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={mode === "cancel" ? "e.g. Staff sickness — clinic stood down" : "e.g. Saturday enhanced access"}
              />
            </Field>
          )}
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={mode === "cancel" ? "danger" : mode === "swap" ? "teal" : "primary"} onClick={submit}>
          <CheckCircle2 className="size-4" />
          {mode === "extra" ? "Log delivered session" : mode === "cancel" ? "Report cancellation" : "Confirm swap"}
        </Button>
      </div>
    </Modal>
  );
}

function PeriodPicker({ period, setPeriod }: { period: "AM" | "PM" | "CUSTOM"; setPeriod: (p: "AM" | "PM" | "CUSTOM") => void }) {
  return (
    <div className="flex gap-1.5">
      {(["AM", "PM", "CUSTOM"] as const).map((p) => (
        <button
          key={p}
          onClick={() => setPeriod(p)}
          className={cn(
            "flex-1 cursor-pointer rounded-xl border py-2.5 text-[12px] font-bold transition",
            period === p ? "border-transparent bg-slate-900 text-paper" : "border-slate-900/12 bg-white/60 text-slate-900/60"
          )}
        >
          {p === "CUSTOM" ? "Custom" : p}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Locum cover tagging                                                 */
/* ------------------------------------------------------------------ */
export function LocumTagModal({ req, onClose }: { req: LeaveRequest | null; onClose: () => void }) {
  const { clinicians, currentUserId, tagLocum, pushToast } = useStore();
  const [status, setStatus] = useState<LocumStatus>("needed");
  const [name, setName] = useState("");
  const [agency, setAgency] = useState(LOCUM_AGENCIES[0]);

  const c = req ? clinicians.find((x) => x.id === req.clinicianId) : undefined;

  useEffect(() => {
    if (req) {
      setStatus(req.locumStatus === "booked" ? "booked" : req.cover === "locum" ? "needed" : "not-needed");
      setName(req.locumName ?? "");
      setAgency(req.locumAgency ?? LOCUM_AGENCIES[0]);
    }
  }, [req]);

  if (!req || !c) return <Modal open={false} onClose={onClose} title="" />;

  const submit = () => {
    const res = tagLocum(req.id, currentUserId, {
      locumStatus: status,
      locumName: name,
      locumAgency: agency,
    });
    if (!res.ok) {
      pushToast({ title: "Booking details needed", description: res.error, variant: "error" });
      return;
    }
    pushToast({
      title: status === "booked" ? "Locum booked" : status === "needed" ? "Locum cover flagged" : "Locum cover cleared",
      description:
        status === "booked"
          ? `${name.trim()} (${agency}) will cover ${c.firstName}'s sessions ${fmtRange(req.start, req.end)}.`
          : status === "needed"
            ? `${c.firstName}'s absence is now flagged as needing a locum on the calendar.`
            : `Cover for ${c.firstName}'s absence is marked as not requiring a locum.`,
      variant: status === "booked" ? "success" : status === "needed" ? "warning" : "info",
    });
    onClose();
  };

  return (
    <Modal
      open={!!req}
      onClose={onClose}
      title="Locum cover"
      subtitle={`${c.name} · ${req.days}d ${LEAVE_META[req.type].label.toLowerCase()} · ≈${req.sessionsLost} sessions to cover`}
      icon={<BadgeCheck className="size-5" />}
    >
      <div className="mb-4 rounded-2xl border border-slate-900/[0.08] bg-slate-50/70 p-4 text-[12.5px] text-slate-900/60">
        <span className="font-semibold text-slate-900">{fmtRange(req.start, req.end)}</span> — tag this absence to keep the
        minimum-coverage matrix honest about whether a locum is actually on site.
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {(Object.keys(LOCUM_STATUS_META) as LocumStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "cursor-pointer rounded-2xl border p-3 text-center transition-all",
              status === s ? "border-transparent shadow-soft" : "border-slate-900/12 bg-white/60 hover:border-slate-900/25"
            )}
            style={status === s ? { background: LOCUM_STATUS_META[s].color, color: "#fff" } : {}}
          >
            <p className="text-[11.5px] font-bold leading-tight">{LOCUM_STATUS_META[s].short}</p>
          </button>
        ))}
      </div>

      {status !== "not-needed" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={status === "booked" ? "Locum name (required)" : "Locum name (when booked)"}>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. R. Okafor"
            />
          </Field>
          <Field label="Booking channel">
            <Select value={agency} onChange={(e) => setAgency(e.target.value)}>
              {LOCUM_AGENCIES.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </Field>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={status === "booked" ? "primary" : status === "needed" ? "teal" : "subtle"} onClick={submit}>
          <BadgeCheck className="size-4" />
          {status === "booked" ? "Confirm booking" : status === "needed" ? "Flag as needed" : "Mark not needed"}
        </Button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Add clinician                                                       */
/* ------------------------------------------------------------------ */
export function AddClinicianModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { sites, currentUserId, addClinician, pushToast } = useStore();
  const [name, setName] = useState("Dr. ");
  const [role, setRole] = useState<"partner" | "salaried" | "registrar" | "manager">("salaried");
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "oak");
  const [spw, setSpw] = useState(6);

  const submit = () => {
    if (name.trim().length < 5) {
      pushToast({ title: "Name required", description: "Please enter the clinician's full name.", variant: "error" });
      return;
    }
    addClinician({ name, role, siteId, sessionsPerWeek: spw }, currentUserId);
    pushToast({
      title: "Clinician added",
      description: `${name.trim()} joined ${sites.find((s) => s.id === siteId)?.short} at ${role === "manager" ? "full-time equivalent" : `${spw} sessions/wk`}.`,
      variant: "success",
    });
    setName("Dr. "); setSpw(6);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add team member" icon={<UserRoundPlus className="size-5" />}
      subtitle="Entitlement is computed automatically on a pro-rata basis from contracted sessions.">
      <div className="space-y-4">
        <Field label="Full name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Jane Appleton" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
              <option value="partner">Partner GP</option>
              <option value="salaried">Salaried GP</option>
              <option value="registrar">GP Registrar</option>
              <option value="manager">Practice Manager</option>
            </Select>
          </Field>
          <Field label="Surgery site">
            <Select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        </div>
        {role !== "manager" && (
          <Field label="Contracted sessions per week" hint={`Pro-rata accrual: ${spw} sessions/week against the full-time baseline`}>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-900/10 bg-white/60 p-2">
              <button className="size-9 cursor-pointer rounded-xl bg-slate-900/[0.06] text-lg font-bold text-slate-900 transition hover:bg-slate-900/10" onClick={() => setSpw((v) => Math.max(1, v - 1))}>−</button>
              <span className="flex-1 text-center font-display text-2xl font-medium text-slate-900">{spw}</span>
              <button className="size-9 cursor-pointer rounded-xl bg-slate-900/[0.06] text-lg font-bold text-slate-900 transition hover:bg-slate-900/10" onClick={() => setSpw((v) => Math.min(10, v + 1))}>+</button>
            </div>
          </Field>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}><UserRoundPlus className="size-4" /> Add to roster</Button>
      </div>
    </Modal>
  );
}
