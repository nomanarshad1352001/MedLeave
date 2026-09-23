# MedLeave & SessionTracker

> **Clinical leave management, rolling 12-month session tracking, surgery cover coordination and compliance reporting — built exclusively for primary care.**

MedLeave & SessionTracker is a multi-tenant web platform that replaces the wall charts, spreadsheets and email chains UK general practices still use to run clinician annual leave and sessional contracts. It knows what a 4-sessions/week contract means for someone's holiday entitlement, it knows when two GPs booking the same Tuesday makes a surgery unsafe, and it stamps every decision with an audit trail that a CQC inspector or NHS appraisal folder will accept verbatim.

**Live on dummy data — zero database required.** The full tenant (staff, leave, ~2,600 session logs, locum bookings, audit trail) ships as deterministic seed data and persists in the browser's `localStorage`, so the product is 100% interactive from the very first click with nothing installed and no patient data anywhere.

---

## 1 · What the platform actually does

### 1.1 Pro-Rata Leave & Accrual Engine
- Annual and study leave are calculated **pro-rata to contracted sessions per week**: a partner on 9 sessions receives the full allowance; a salaried GP on 4 sessions receives exactly 4/9ths — automatically, at half-day precision
- Entitlement **accrues linearly across the leave year** with a configurable front-loaded completion horizon (so realistic summer booking behaves sensibly)
- **Hard & soft guardrails**
  - *Hard block* — requests above the remaining entitlement simply cannot be submitted
  - *Soft advance-borrowing flag* — booking earlier than the projected accrual requires a managerial override with a **mandatory audit note**
- Five leave categories: Annual, Study, Maternity/Paternity, Sickness and Locum-Covered
- England & Wales **bank-holiday-aware** day counting (toggleable), weekends excluded, configurable leave-year start (defaults to 1 April)
- A **rolling leave-year timeline** per clinician — taken, pending and approved-future leave rendered as lanes with a gliding today-marker

### 1.2 Rolling 12-Month Session Target Monitor
- Every clinician's contract (`sessions/week × working weeks per year`) becomes a live, **trailing-365-day quota**
- Real-time verdicts: **On Track · At Risk (Deficit) · Surplus (Overworking)**, computed from pace-to-expectation with tolerance bands
- A **session journal** for logging delivered extras (AM/PM block or custom hours), reporting cancellations, and recording **swaps** (a session moved to a make-up date)
- **Session-to-leave correlation watch**: if a GP accumulates too much leave against too few delivered sessions in a rolling 90-day window, a subtle **staffing watch flag** (threshold configurable per practice) surfaces everywhere a decision is made
- Long-term protected absences (e.g. maternity) automatically exempt the clinician from degratory pace verdicts

### 1.3 Cover & Minimum Staffing Calendar
- **Interactive Month and Week calendars**: colour-coded absence bars by leave type, dashed bars for pending requests, locum-booked/needed badges inline
- A **minimum coverage matrix** per surgery × day × AM/PM: `scheduled vs minimum required` → *Safe / At minimum / ⚠ Low cover — Warning*, with booked locums counted toward effective staffing
- **Locum cover finder & tagging** — every absence carries a lifecycle: *Not needed → Needs locum → Booked (name + agency)*, all tracked in a **Locum Cover Ledger**

### 1.4 Multi-Tenant RBAC & Authentication
- A polished split-screen **login page with one-click demo role autofill** (Partner GP · Practice Manager · Salaried GP)
- Role-based access: clinicians see personal balances, requests and quotas; the Practice Manager additionally sees cross-site approval queues, staffing audits, rosters, locum controls and practice settings
- Auth guard on the app, sign-in entrance gate, sign-out anywhere, **multi-surgery site filtering** (All / Oakfield / Pine Valley) sharing one tenant datastore

### 1.5 Analytics, Reporting & Export Hub
- **Immutable audit & compliance log** — who requested, approved, rejected or overrode anything, and when; searchable and filterable, severity-coloured, ready for CQC inspection
- **Payroll summary** — sessions delivered/extras/cancellations, contracted target, leave days used per category, running balances and adjustments per clinician
- **NHS appraisal pack** — per-clinician delivered vs target, pace verdict, activity-mix breakdown, and leave history
- One-click generation across 4 periods (leave year / rolling 12m / 90d / 30d), **CSV download (Excel-ready BOM)** and **PDF preview with print/save**

---

## 2 · Who buys it

| Buyer | Why it lands |
|---|---|
| **GP surgeries & medical partnerships** (up to ~40 clinical staff) | Replaces the holiday wall chart; ends "who booked summer first" disputes; guards against unsafe rotas from un-coordinated leave |
| **Primary Care Networks (PCNs)** | One tenant spanning several surgeries with shared locum pools, cross-site cover radar and manager-level oversight |
| **Sessional / salaried GP-heavy practices** | Rolling 12-month session quotas where thin contracts (4–6 sessions/week) genuinely need pro-rata maths, and GP retention depends on transparent fairness |
| **GP federations & Training hubs** | Registrars juggling AKT prep + practice sessions, rotas inherited across trusts, and managers needing a single audit-ready source of truth |
| **Locum-led practices** | Practices running 30%+ locum sessions needing a ledger of which cover was *booked* vs *merely requested* |
| **Reception & back-office teams** | Operations, payroll and appraisal season — one CSV export replaces evenings with a calculator |

**Why they switch:** an average practice manager spends **~6 hours/week** reconciling leave with sessions; a single 1-day cover gap at a 5-GP surgery costs a cancelled clinic and a locum invoice. The platform's ROI is usually one prevented unsafe rota and one avoided locum double-booking per quarter.

---

## 3 · Qualities

- **Audit-safe by default** — every state change is written to an append-only log with actor, action, timestamp and context; overrides are physically impossible without a note
- **Instant** — entirely local-state driven; every click mutates the local datastore and re-renders in <16 ms with no network round-trip
- **Fairness you can show** — pro-rata maths are visible in the UI, not hidden in a spreadsheet macro; clinicians see *exactly* why a request is blocked
- **Safety-assured rotas** — the minimum-coverage matrix and 3-week-out cover radar mean locum emergencies are flagged while there's still time to fix them
- **Polished, medical-grade UX** — no 90s NHS intranet: Fraunces display type, deep slate surfaces, teal trust accent, pointer-reactive ambient motion, ⌘K command palette, tooltips on every complex figure, shimmer skeletons and orchestrated empty states
- **Demo-transparent** — single-tenant synthetic dataset; zero patient data; GDPR-clean to evaluate

## 4 · Feature checklist

- [x] Pro-rata accrual engine (annual + study leave, custom leave-year start)
- [x] Hard/soft guardrails, managerial override with required audit note
- [x] Rolling leave-year timeline (taken / pending / approved lanes)
- [x] Leave request ↔ decision queue with live balance-impact analysis
- [x] Seasonal session journal (log / cancel / swap, custom hours)
- [x] Rolling 12-month session target with On Track / Deficit / Surplus verdicts
- [x] 90-day session↔leave correlation staffing watch
- [x] Month + Week cover calendars with colour-coded leave types
- [x] Per-surgery × per-AM/PM minimum-coverage matrix with locum inclusion
- [x] Locum ledger: Need → Booked lifecycle + agency attribution
- [x] Multi-site tenancy with site filtering and tenant roster
- [x] Login auth + three-role access control (clinical / management)
- [x] Immutable, searchable audit & compliance log
- [x] Payroll + appraisal report generation, CSV export & PDF preview/print
- [x] Policy studio: thresholds, leave-year start, baseline days, guardrail toggles
- [x] ⌘K search palette, notification centre, one-click demo reset

---

## 5 · Technology stack

| Layer | Choice | Reason |
|---|---|---|
| **Framework** | Next.js 16 (App Router, React 19, Turbopack) | Server-rendered shell with client islands; file-based routing; first-class static export |
| **Language** | TypeScript 5 (strict) | Domain types for every entity; zero `any` in business logic |
| **State / persistence** | Zustand 5 + `persist` middleware → `localStorage` (v5 schema migration) | Client-side multi-user simulation with cross-session durability and **no database** |
| **Styling** | Tailwind CSS v4 (CSS-first `@theme`, custom tokens, shadows, keyframes) | One design system shared by every component; no runtime CSS-in-JS |
| **Motion** | Framer Motion 11 (layout/spring transitions) + hand-rolled CSS entrance choreography (clip-path reveals, gate sweeps, shimmer) + pointer-reactive ambient parallax backdrop | Awwwards-grade feel without jank |
| **Dates** | date-fns 4 | Rolling-window arithmetic, leave-year windows, working-day math, ISO layout |
| **Icons** | Lucide React | Consistent clinical iconography, no emojis anywhere |
| **Charts** | Recharts 2 | Session delivery bars + usage donuts inside themed tooltips |
| **Data (dummy)** | Deterministic seed module (`mulberry32` PRNG) generating ~2,600 session logs + 28 leave records + audit entries, all browser-persisted | Fully interactive out of the box, zero server, zero database |
| **Fonts** | Fraunces (display serif) + Inter (UI sans) via `next/font` | Editorial medical aesthetic |
| **Images** | Pexels CDN stock photography | Modern clinic photography, no license risk |
| **Build / tooling** | ESLint 9 + next config, `next typegen` route types, static prerendering for every page | Shipping-quality DX |

### Architecture

```
src/
├── lib/
│   ├── types.ts      # Domain model: Clinician, LeaveRequest, SessionLog, Policy, AuditEntry…
│   ├── engine.ts     # Pure accrual/guardrail/pace/correlation math (no UI coupling)
│   ├── reports.ts    # Payroll / appraisal / audit builders + CSV generation + download
│   ├── seed.ts       # Realistic synthetic tenant (deterministic PRNG)
│   └── anim.ts       # Motion helpers & ambient-parallax pointer math
├── store/
│   └── useStore.ts   # Zustand actions: requests, decisions, overrides, locums, sessions, policy
├── components/
│   ├── ui.tsx        # Design system (buttons, cards, modal, ring, tooltip, skeleton, empty state)
│   ├── shell.tsx     # Collapsible sidebar, topbar, ⌘K palette, notifications
│   ├── modals.tsx    # Request / decision / locum / session-journal / roster modals
│   ├── charts.tsx    # Themed Recharts wrappers
│   ├── appzoo.tsx    # Pointer-reactive ambient "app-zoo" backdrop
│   └── Toasts.tsx    # Toast notification system
└── app/              # 12 routes: marketing, /login, and the 8-module app
```

---

*MedLeave & SessionTracker — leave management and session tracking, for practices that have outgrown the spreadsheet.*
