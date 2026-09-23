"use client";

import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import {
  Activity,
  CalendarRange,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Lock,
  Printer,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  InfoDot,
  Modal,
  SectionHead,
  Segmented,
  Select,
  Spinner,
  Tooltip,
  cn,
} from "@/components/ui";
import {
  RANGE_META,
  appraisalCSV,
  auditCSV,
  auditSeverity,
  buildAppraisal,
  buildPayroll,
  downloadCSV,
  payrollCSV,
  rangeWindow,
  type AppraisalPack,
  type PayrollRow,
  type RangeKey,
} from "@/lib/reports";
import { fmtDay, fmtRange } from "@/lib/engine";
import { LEAVE_META, PACE_META } from "@/lib/types";
import { useStore } from "@/store/useStore";

type Tab = "payroll" | "appraisal" | "audit";

export default function ReportsPage() {
  const { clinicians, requests, sessions, sites, policy, audit, currentUserId, siteFilter, pushToast } = useStore();
  const me = clinicians.find((c) => c.id === currentUserId)!;
  const isManager = me.role === "manager";

  const [tab, setTab] = useState<Tab>(isManager ? "payroll" : "appraisal");
  const [range, setRange] = useState<RangeKey>("leave-year");
  const [subject, setSubject] = useState(isManager ? clinicians.find((c) => c.clinical)!.id : currentUserId);
  const [q, setQ] = useState("");
  const [actionF, setActionF] = useState("all");
  const [preview, setPreview] = useState<null | { title: string; filename: string; csv: string; kind: Tab }>(null);
  const [busy, setBusy] = useState(false);

  const window = rangeWindow(range, policy);
  const scopedStaff = useMemo(
    () => clinicians.filter((c) => siteFilter === "all" || c.siteId === siteFilter),
    [clinicians, siteFilter]
  );

  /* ------------------------------ payroll ------------------------------ */
  const payroll = useMemo(
    () => buildPayroll(isManager ? scopedStaff : [me], requests, sessions, sites, policy, range),
    [isManager, scopedStaff, me, requests, sessions, sites, policy, range]
  );
  const payrollTotals = payroll.reduce(
    (a, r) => ({
      delivered: a.delivered + r.sessionsDelivered,
      cancelled: a.cancelled + r.sessionsCancelled,
      annual: a.annual + r.annualUsed,
      study: a.study + r.studyUsed,
    }),
    { delivered: 0, cancelled: 0, annual: 0, study: 0 }
  );

  /* ----------------------------- appraisal ----------------------------- */
  const subjectC = clinicians.find((c) => c.id === subject) ?? me;
  const pack: AppraisalPack = useMemo(
    () => buildAppraisal(subjectC, requests, sessions, sites, policy, range),
    [subjectC, requests, sessions, sites, policy, range]
  );

  /* ------------------------------- audit ------------------------------- */
  const actions = useMemo(() => Array.from(new Set(audit.map((a) => a.action))), [audit]);
  const auditRows = useMemo(
    () =>
      audit
        .filter((a) => actionF === "all" || a.action === actionF)
        .filter(
          (a) =>
            !q.trim() ||
            a.detail.toLowerCase().includes(q.toLowerCase()) ||
            a.actorName.toLowerCase().includes(q.toLowerCase()) ||
            a.action.toLowerCase().includes(q.toLowerCase())
        ),
    [audit, actionF, q]
  );

  /* ------------------------------ exporting ---------------------------- */
  const openPreview = (kind: Tab) => {
    setBusy(true);
    const stamp = format(new Date(), "yyyy-MM-dd");
    if (kind === "payroll") {
      setPreview({
        kind,
        title: "Payroll & sessions summary",
        filename: `medleave-payroll-${stamp}.csv`,
        csv: payrollCSV(payroll, window.from, window.to),
      });
    } else if (kind === "appraisal") {
      setPreview({
        kind,
        title: `Appraisal pack — ${subjectC.name}`,
        filename: `medleave-appraisal-${subjectC.initials.toLowerCase()}-${stamp}.csv`,
        csv: appraisalCSV(pack),
      });
    } else {
      setPreview({
        kind,
        title: "Audit & compliance log",
        filename: `medleave-audit-${stamp}.csv`,
        csv: auditCSV(auditRows),
      });
    }
    setBusy(false);
  };

  const doDownload = () => {
    if (!preview) return;
    downloadCSV(preview.filename, preview.csv);
    pushToast({
      title: "CSV exported",
      description: `${preview.filename} saved to your downloads — ready for the accountant or appraisal folder.`,
      variant: "success",
    });
  };

  const tabs = (
    <Segmented<Tab>
      value={tab}
      onChange={setTab}
      options={[
        ...(isManager ? [{ value: "payroll" as Tab, label: "Payroll" }] : []),
        { value: "appraisal" as Tab, label: "Appraisal" },
        { value: "audit" as Tab, label: "Audit log" },
      ]}
    />
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">Analytics & export hub</p>
          <h1 className="font-display text-[34px] font-medium leading-tight tracking-tight text-slate-900">
            Reporting <span className="italic text-teal-700">& compliance</span>
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
            One-click payroll summaries, NHS appraisal packs and an immutable transaction trail —
            previewed in-app, exported as CSV or printed to PDF.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {tabs}
          <Button variant="teal" onClick={() => openPreview(tab)} disabled={busy}>
            {busy ? <Spinner className="border-slate-900/25 border-t-slate-900" /> : <FileSpreadsheet className="size-4" />}
            Generate report
          </Button>
        </div>
      </div>

      {/* range selector */}
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          <CalendarRange className="size-3.5" /> Reporting period
        </span>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(RANGE_META) as RangeKey[]).map((k) => (
            <Tooltip key={k} label={RANGE_META[k].hint}>
              <button
                onClick={() => setRange(k)}
                className={cn(
                  "cursor-pointer rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all",
                  range === k ? "bg-slate-900 text-white shadow-soft" : "bg-slate-900/[0.05] text-slate-500 hover:text-slate-900"
                )}
              >
                {RANGE_META[k].label}
              </button>
            </Tooltip>
          ))}
        </div>
        <span className="ml-auto text-[12px] font-semibold tabular-nums text-slate-500">
          {fmtDay(window.from)} → {fmtDay(window.to)}
        </span>
      </Card>

      {/* ------------------------------ PAYROLL ------------------------------ */}
      {tab === "payroll" && (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Mini icon={<Activity className="size-4" />} label="Sessions delivered" value={payrollTotals.delivered.toLocaleString()} />
            <Mini icon={<CalendarRange className="size-4" />} label="Annual leave days" value={payrollTotals.annual} tone="teal" />
            <Mini icon={<FileText className="size-4" />} label="Study leave days" value={payrollTotals.study} tone="amber" />
            <Mini icon={<History className="size-4" />} label="Cancelled sessions" value={payrollTotals.cancelled} tone="rose" />
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/[0.07] p-5">
              <SectionHead
                title="Payroll & sessions summary"
                eyebrow={`${payroll.length} staff · ${RANGE_META[range].label.toLowerCase()}`}
                className="mb-0"
              />
              <Button size="sm" variant="outline" onClick={() => openPreview("payroll")}>
                <Download className="size-3.5" /> Preview & export
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left">
                <thead>
                  <tr className="border-b border-slate-900/[0.07] bg-slate-50 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    <th className="px-5 py-3">Clinician</th>
                    <th className="px-5 py-3">Contract</th>
                    <th className="px-5 py-3">
                      <span className="inline-flex items-center gap-1">Delivered <InfoDot label="Completed sessions inside the reporting period, including ad-hoc extras." /></span>
                    </th>
                    <th className="px-5 py-3">Extra</th>
                    <th className="px-5 py-3">Cancelled</th>
                    <th className="px-5 py-3">Annual (d)</th>
                    <th className="px-5 py-3">Study (d)</th>
                    <th className="px-5 py-3">Sick (d)</th>
                    <th className="px-5 py-3">
                      <span className="inline-flex items-center gap-1">Balance <InfoDot label="Annual leave days remaining against the pro-rata entitlement for the current leave year." /></span>
                    </th>
                    <th className="px-5 py-3 text-right">Adjustments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/[0.05]">
                  {payroll.map((r: PayrollRow) => (
                    <tr key={r.clinician.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-2.5">
                          <Avatar c={r.clinician} size="sm" />
                          <span>
                            <span className="block text-[13px] font-bold text-slate-900">{r.clinician.name}</span>
                            <span className="text-[10.5px] text-slate-400">{r.site}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[12.5px] font-semibold tabular-nums text-slate-500">
                        {r.clinician.clinical ? `${r.clinician.sessionsPerWeek}/wk` : "FTE"}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] font-bold tabular-nums text-slate-900">{r.sessionsDelivered}</td>
                      <td className="px-5 py-3.5 text-[12.5px] tabular-nums text-teal-700">{r.extraSessions || "—"}</td>
                      <td className="px-5 py-3.5 text-[12.5px] tabular-nums text-rose-600">{r.sessionsCancelled || "—"}</td>
                      <td className="px-5 py-3.5 text-[12.5px] tabular-nums text-slate-600">{r.annualUsed}</td>
                      <td className="px-5 py-3.5 text-[12.5px] tabular-nums text-slate-600">{r.studyUsed}</td>
                      <td className="px-5 py-3.5 text-[12.5px] tabular-nums text-slate-600">{r.sicknessDays || "—"}</td>
                      <td className="px-5 py-3.5 text-[12.5px] font-bold tabular-nums text-slate-900">
                        {r.annualRemaining}<span className="text-[10.5px] font-semibold text-slate-400">/{r.annualEntitlement}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {r.overrides > 0 ? (
                          <Badge tone="amber"><ShieldCheck className="size-3" /> {r.overrides} override{r.overrides > 1 ? "s" : ""}</Badge>
                        ) : r.locumCoveredDays > 0 ? (
                          <Badge tone="sky">{r.locumCoveredDays}d locum</Badge>
                        ) : (
                          <span className="text-[11px] text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ----------------------------- APPRAISAL ----------------------------- */}
      {tab === "appraisal" && (
        <>
          <Card className="flex flex-wrap items-center gap-3 p-4">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <UserRound className="size-3.5" /> Appraisal subject
            </span>
            {isManager ? (
              <Select value={subject} onChange={(e) => setSubject(e.target.value)} className="max-w-xs">
                {clinicians.filter((c) => c.clinical).map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.grade}</option>
                ))}
              </Select>
            ) : (
              <span className="flex items-center gap-2.5 rounded-full bg-slate-50 py-1.5 pl-1.5 pr-4">
                <Avatar c={me} size="sm" />
                <span className="text-[13px] font-bold text-slate-900">{me.name}</span>
              </span>
            )}
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => openPreview("appraisal")}>
              <Download className="size-3.5" /> Preview & export
            </Button>
          </Card>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="p-6 lg:col-span-2">
              <SectionHead eyebrow="NHS appraisal folder" title={`Session record — ${subjectC.firstName}`} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Delivered", pack.delivered, "sessions"],
                  ["Target", pack.target, "contracted"],
                  ["Extra", pack.extra, "ad-hoc"],
                  ["Swapped", pack.swaps, "moved"],
                ].map(([l, v, s]) => (
                  <div key={String(l)} className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="font-display text-[26px] font-medium leading-none text-slate-900">{v as number}</p>
                    <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{l as string}</p>
                    <p className="text-[10px] text-slate-400">{s as string}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-500">Activity mix</p>
                {pack.activityMix.length === 0 ? (
                  <p className="text-[12.5px] text-slate-400">No sessions recorded inside this period.</p>
                ) : (
                  <ul className="space-y-2">
                    {pack.activityMix.map((a) => {
                      const pct = Math.round((a.count / Math.max(1, pack.delivered)) * 100);
                      return (
                        <li key={a.activity} className="flex items-center gap-3">
                          <span className="w-40 shrink-0 truncate text-[12px] font-semibold text-slate-700">{a.activity}</span>
                          <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-900/[0.06]">
                            <span className="block h-full rounded-full bg-teal-600 transition-all duration-700" style={{ width: `${pct}%` }} />
                          </span>
                          <span className="w-16 text-right text-[11.5px] font-bold tabular-nums text-slate-900">{a.count} · {pct}%</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Card>

            <div className="space-y-5">
              <Card className="p-6">
                <SectionHead eyebrow="Verdict" title="Pace to contract" className="mb-3" />
                <p className="font-display text-[40px] font-medium leading-none text-slate-900">{pack.pacePct}%</p>
                <Badge tone={PACE_META[pack.paceLabel as keyof typeof PACE_META].tone} className="mt-3">
                  {PACE_META[pack.paceLabel as keyof typeof PACE_META].label}
                </Badge>
                <dl className="mt-4 space-y-2 border-t border-slate-900/[0.07] pt-4 text-[12.5px]">
                  <div className="flex justify-between"><dt className="text-slate-500">Annual entitlement</dt><dd className="font-bold tabular-nums text-slate-900">{pack.annualEntitlement}d</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Annual remaining</dt><dd className="font-bold tabular-nums text-slate-900">{pack.annualRemaining}d</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Study / CPD used</dt><dd className="font-bold tabular-nums text-slate-900">{pack.studyDays}d</dd></div>
                </dl>
              </Card>
              <Card className="p-6">
                <SectionHead eyebrow="Leave in period" title="By category" className="mb-3" />
                {pack.leaveByType.length === 0 ? (
                  <p className="text-[12.5px] text-slate-400">No approved leave in this window.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {pack.leaveByType.map((l) => (
                      <li key={l.type} className="flex items-center gap-2.5 text-[12.5px]">
                        <span className="size-2 rounded-full" style={{ background: LEAVE_META[l.type].color }} />
                        <span className="flex-1 text-slate-600">{LEAVE_META[l.type].label}</span>
                        <span className="font-bold tabular-nums text-slate-900">{l.days}d</span>
                        <span className="text-[10.5px] text-slate-400">({l.periods})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      {/* ------------------------------- AUDIT ------------------------------- */}
      {tab === "audit" && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/[0.07] p-5">
            <SectionHead
              title="Audit & compliance log"
              eyebrow={`${auditRows.length} of ${audit.length} immutable entries`}
              className="mb-0"
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="relative">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search actor, action, detail…"
                  className="w-[220px] rounded-full border border-slate-900/12 bg-white py-2 pl-9 pr-3 text-[12.5px] outline-none transition focus:border-teal-600"
                />
              </span>
              <span className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <select
                  value={actionF}
                  onChange={(e) => setActionF(e.target.value)}
                  className="cursor-pointer rounded-full border border-slate-900/12 bg-white py-2 pl-9 pr-3 text-[12px] font-bold text-slate-700 outline-none"
                >
                  <option value="all">All actions</option>
                  {actions.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </span>
              <Button size="sm" variant="outline" onClick={() => openPreview("audit")}>
                <Download className="size-3.5" /> Export
              </Button>
            </div>
          </div>

          {auditRows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<ScrollText className="size-6" />}
                title="No matching audit entries"
                body="Adjust the search term or action filter — every request, decision, override, swap and policy change is written here automatically."
                action={<Button size="sm" variant="outline" onClick={() => { setQ(""); setActionF("all"); }}>Clear filters</Button>}
              />
            </div>
          ) : (
            <ol className="divide-y divide-slate-900/[0.05]">
              {auditRows.map((a, i) => {
                const tone = auditSeverity(a.action);
                return (
                  <li key={a.id} className="flex flex-wrap items-start gap-3.5 px-5 py-4 transition hover:bg-slate-50">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl",
                        tone === "teal" && "bg-teal-100 text-teal-700",
                        tone === "amber" && "bg-amber-100 text-amber-700",
                        tone === "rose" && "bg-rose-100 text-rose-700",
                        tone === "slate" && "bg-slate-100 text-slate-600"
                      )}
                    >
                      {tone === "amber" ? <ShieldCheck className="size-4" /> : tone === "rose" ? <History className="size-4" /> : <CheckCircle2 className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-slate-900">
                        {a.action}
                        {i === 0 && <Badge tone="teal">Latest</Badge>}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{a.detail}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-semibold text-slate-400">
                        <span className="inline-flex items-center gap-1"><UserRound className="size-3" /> {a.actorName}</span>
                        <span className="inline-flex items-center gap-1">
                          <Lock className="size-3" /> {format(parseISO(a.at), "d MMM yyyy · HH:mm")}
                        </span>
                        <span>{formatDistanceToNowStrict(parseISO(a.at), { addSuffix: true })}</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="flex items-center gap-2 border-t border-slate-900/[0.07] bg-slate-50 px-5 py-3 text-[11.5px] text-slate-500">
            <Lock className="size-3.5" />
            Entries are append-only and cannot be edited or deleted in-app — suitable for CQC and NHS England evidence packs.
          </p>
        </Card>
      )}

      {/* ---------------------------- preview modal ---------------------------- */}
      <ExportPreviewModal preview={preview} onClose={() => setPreview(null)} onDownload={doDownload} pack={pack} payroll={payroll} window={window} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Preview modal — CSV + print-ready PDF view                          */
/* ------------------------------------------------------------------ */
function ExportPreviewModal({
  preview,
  onClose,
  onDownload,
  pack,
  payroll,
  window: win,
}: {
  preview: null | { title: string; filename: string; csv: string; kind: Tab };
  onClose: () => void;
  onDownload: () => void;
  pack: AppraisalPack;
  payroll: PayrollRow[];
  window: { from: string; to: string };
}) {
  const [mode, setMode] = useState<"pdf" | "csv">("pdf");
  if (!preview) return <Modal open={false} onClose={onClose} title="" />;

  return (
    <Modal
      open={!!preview}
      onClose={onClose}
      title={preview.title}
      subtitle={`${fmtRange(win.from, win.to)} · ${preview.filename}`}
      icon={<FileSpreadsheet className="size-5" />}
      wide
    >
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Segmented<"pdf" | "csv">
          value={mode}
          onChange={setMode}
          options={[
            { value: "pdf", label: "PDF preview" },
            { value: "csv", label: "Raw CSV" },
          ]}
        />
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-teal-700">
          <Sparkles className="size-3.5" /> Generated {format(new Date(), "d MMM yyyy · HH:mm")}
        </span>
      </div>

      {mode === "csv" ? (
        <pre className="max-h-[46vh] overflow-auto rounded-2xl bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-100">
          {preview.csv}
        </pre>
      ) : (
        <div className="max-h-[46vh] overflow-auto rounded-2xl border border-slate-900/[0.08] bg-white p-6 shadow-inner">
          {/* letterhead */}
          <div className="flex items-start justify-between border-b border-slate-900/10 pb-4">
            <div>
              <p className="font-display text-xl font-semibold text-slate-900">MedLeave &amp; SessionTracker</p>
              <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">
                {preview.kind === "payroll" ? "Payroll & session summary" : preview.kind === "appraisal" ? "NHS appraisal evidence pack" : "Audit & compliance log"}
              </p>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              <p className="font-semibold text-slate-700">Cotswold Vale PCN</p>
              <p>{fmtDay(win.from)} → {fmtDay(win.to)}</p>
            </div>
          </div>

          {preview.kind === "appraisal" ? (
            <div className="pt-4">
              <p className="text-[15px] font-bold text-slate-900">{pack.clinician.name}</p>
              <p className="text-[12px] text-slate-500">{pack.clinician.grade} · {pack.site} · {pack.clinician.sessionsPerWeek} sessions/week</p>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {[["Delivered", pack.delivered], ["Target", pack.target], ["Pace", `${pack.pacePct}%`], ["AL left", `${pack.annualRemaining}d`]].map(([l, v]) => (
                  <div key={String(l)} className="rounded-xl border border-slate-900/10 p-3 text-center">
                    <p className="font-display text-xl font-semibold text-slate-900">{v as string}</p>
                    <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">{l as string}</p>
                  </div>
                ))}
              </div>
              <table className="mt-5 w-full text-left text-[11.5px]">
                <thead>
                  <tr className="border-b border-slate-900/10 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-2">Activity</th><th className="py-2 text-right">Sessions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/[0.05]">
                  {pack.activityMix.map((a) => (
                    <tr key={a.activity}><td className="py-1.5 text-slate-700">{a.activity}</td><td className="py-1.5 text-right font-semibold tabular-nums text-slate-900">{a.count}</td></tr>
                  ))}
                </tbody>
              </table>
              {pack.leaveByType.length > 0 && (
                <table className="mt-4 w-full text-left text-[11.5px]">
                  <thead>
                    <tr className="border-b border-slate-900/10 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-2">Leave category</th><th className="py-2 text-right">Days</th><th className="py-2 text-right">Periods</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/[0.05]">
                    {pack.leaveByType.map((l) => (
                      <tr key={l.type}>
                        <td className="py-1.5 text-slate-700">{LEAVE_META[l.type].label}</td>
                        <td className="py-1.5 text-right font-semibold tabular-nums text-slate-900">{l.days}</td>
                        <td className="py-1.5 text-right tabular-nums text-slate-500">{l.periods}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : preview.kind === "payroll" ? (
            <table className="mt-4 w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-900/10 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2">Clinician</th><th className="py-2">Contract</th>
                  <th className="py-2 text-right">Delivered</th><th className="py-2 text-right">Annual</th>
                  <th className="py-2 text-right">Study</th><th className="py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/[0.05]">
                {payroll.map((r) => (
                  <tr key={r.clinician.id}>
                    <td className="py-1.5 font-semibold text-slate-800">{r.clinician.name}</td>
                    <td className="py-1.5 text-slate-500">{r.clinician.clinical ? `${r.clinician.sessionsPerWeek}/wk` : "FTE"}</td>
                    <td className="py-1.5 text-right font-semibold tabular-nums text-slate-900">{r.sessionsDelivered}</td>
                    <td className="py-1.5 text-right tabular-nums text-slate-600">{r.annualUsed}d</td>
                    <td className="py-1.5 text-right tabular-nums text-slate-600">{r.studyUsed}d</td>
                    <td className="py-1.5 text-right tabular-nums text-slate-900">{r.annualRemaining}/{r.annualEntitlement}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <pre className="mt-4 whitespace-pre-wrap text-[10.5px] leading-relaxed text-slate-700">{preview.csv}</pre>
          )}

          <p className="mt-6 border-t border-slate-900/10 pt-3 text-[9.5px] text-slate-400">
            Generated by MedLeave &amp; SessionTracker · demo tenant with synthetic data · not for clinical use.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2.5">
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button variant="outline" onClick={() => globalThis.print()}>
          <Printer className="size-4" /> Print / save as PDF
        </Button>
        <Button onClick={onDownload}>
          <Download className="size-4" /> Download CSV
        </Button>
      </div>
    </Modal>
  );
}

function Mini({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: "teal" | "rose" | "amber" }) {
  return (
    <Card className="flex items-center gap-3.5 p-4 transition-shadow hover:shadow-lift">
      <span className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-2xl",
        tone === "teal" && "bg-teal-100 text-teal-700",
        tone === "rose" && "bg-rose-100 text-rose-700",
        tone === "amber" && "bg-amber-100 text-amber-700",
        !tone && "bg-slate-900 text-teal-300"
      )}>
        {icon}
      </span>
      <span>
        <span className="block font-display text-[22px] font-semibold leading-none tabular-nums text-slate-900">{value}</span>
        <span className="mt-1 block text-[9.5px] font-bold uppercase tracking-[0.13em] text-slate-500">{label}</span>
      </span>
    </Card>
  );
}
