# Multi-tenancy + Super Admin — research & requirements

Status: **research only, nothing implemented.** Written 2026-07-29 against `main` @ `fad7495`.

---

## 1. Direct answers

### Does the product support tenants today?

**No.** It is a single-tenant HRMS: one deployment = one company.

Evidence:

| Check | Result |
| --- | --- |
| `grep -rn 'tenant\|organizationId' src prisma` | **0 hits** |
| `OrganizationSettings` (`prisma/schema.prisma:94`) | Singleton row — one company name, logo, permissions blob |
| `User.email` (`schema.prisma:173`) | `@unique` **globally**, not per company |
| JWT payload (`src/lib/auth.ts:24`) | `{ userId, email, role }` — no tenant claim |
| `Role` enum (`schema.prisma:9`) | `ADMIN, HR, MANAGER, TEAM_LEAD, EMPLOYEE` — no platform-level role |
| `middleware.ts` | Token presence only; no tenant resolution |

### If company 1 and company 2 both use it, how are they distinguished?

Today: **they can't be.** Every table is a flat global list. If you loaded two companies into this database:

- `hr@acme.com` and `hr@globex.com` are fine, but Acme could never reuse an email Globex took.
- `EMP00001` collides — `generateEmployeeId()` (`src/app/api/users/route.ts:50`) counts **all** users platform-wide.
- `Branch.name`, `Branch.code`, `Department.code`, `Team.code`, `LeaveType.name/code`, `EmailTemplate.name` are globally unique — both companies want "Head Office", "HR", "Annual Leave".
- `NotificationRule.type` is `@unique` — **one row per notification type for the entire platform.** Acme turning off birthday emails turns them off for Globex.
- `OrganizationSettings` — one name/logo. `/api/organization/public` (used by the login page) would serve Acme's logo to Globex's employees.
- Every list endpoint (`/api/users`, `/api/attendance`, `/api/leave-requests`, …) returns **both companies' rows**, including salaries, addresses and emergency contacts.

So the current shape is "install one copy per customer", not SaaS.

### How big is the change?

| Surface | Count |
| --- | --- |
| API route files | 69 |
| Files touching `prisma.` | 71 |
| `prisma.<model>.<op>` call sites | 279 |
| Dashboard pages | 48 |
| Prisma models | 23 |
| Migrations that exist | **1** (`20260130000000_init`) |

Honest estimate: **4–7 weeks of focused work** for tenancy done properly (schema + scoping + auth + onboarding + isolation tests), plus **1.5–3 weeks** for the super-admin panel. It is the single largest change the codebase will take.

**The good news:** one migration, no shipped tenants. Doing this now is roughly 3× cheaper than after real customer data exists, because the migration can be destructive and the unique-constraint rewrites don't need backfill choreography. This is the cheapest week it will ever be.

---

## 2. Tenancy model — options and recommendation

| Model | How | Pros | Cons |
| --- | --- | --- | --- |
| **A. Shared schema, `tenantId` column** | Every tenant-owned table gets `tenantId`; every query filters on it | One migration set, one connection pool, cheapest ops, easy cross-tenant analytics for super admin | A missing `where` = data leak; noisy-neighbour risk |
| **B. Schema-per-tenant** | `CREATE SCHEMA acme` per customer, same DB | Strong isolation, per-tenant restore | Migrations × N schemas; Prisma support is awkward; connection/search-path juggling |
| **C. Database-per-tenant** | Own DB per customer | Strongest isolation, per-tenant residency | Ops cost per customer, migration fan-out, super-admin aggregation needs a warehouse |

**Recommendation: A, with Postgres Row-Level Security as a second lock.**

Rationale: Prisma + Next.js + one Postgres, and you want a super admin that reads across all tenants — A makes that a `WHERE` instead of N connections. Keep C in the back pocket as an "enterprise / data residency" tier later; the `tenantId` column doesn't block it.

Two-layer defence (both, not either):

1. **App layer** — a Prisma client extension that injects `tenantId` into every `where` and every `create` from request context. Route code stops hand-writing scope, so a forgotten filter can't happen in 279 places.
2. **DB layer** — RLS policies on tenant tables keyed to a session variable (`SET LOCAL app.tenant_id`). If the app layer is ever bypassed, Postgres still refuses. Note: RLS needs a non-superuser DB role and interacts with the current `pg.Pool` in `src/lib/prisma.ts` — pooled connections must set/reset the variable per transaction.

---

## 3. How a request finds its tenant

| Option | Example | Notes |
| --- | --- | --- |
| **Subdomain** | `acme.workseeds.com` | Recommended. Branding on the login page works before auth; cookies scope cleanly per subdomain; standard SaaS shape |
| Path prefix | `workseeds.com/acme/...` | Rewrites every route and link; cookie is shared across tenants |
| Login-derived only | email → tenant | Breaks branded login, breaks same email in two tenants |
| Custom domain | `hr.acme.com` | Phase 2 — needs a domain table + TLS automation |

Recommended flow: `middleware.ts` reads the host → resolves tenant slug (cached) → attaches it to the request → login issues a JWT containing `tenantId` → server code reads tenant from the token, **never** from a client-supplied header or body field. Mismatch between host tenant and token tenant = reject.

Consequence for auth: `User.email` becomes `@@unique([tenantId, email])`, so the login lookup **must** be tenant-scoped. The mobile app (`/api/mobile-config`, Bearer tokens) needs the same treatment.

---

## 4. Schema work (concrete)

New models:

- `Tenant` — id, slug (unique), name, status (`TRIAL / ACTIVE / SUSPENDED / CANCELLED`), plan, employee cap, createdAt, trialEndsAt, and the branding/config that lives in `OrganizationSettings` today.
- `TenantDomain` — optional custom domains (phase 2).
- `PlatformUser` — super-admin accounts (see §5).
- `DemoRequest` / `Lead` — see §6.
- `Subscription` / `Invoice` — only when billing is in scope.

`OrganizationSettings` collapses into `Tenant` (it is already a per-company singleton — it becomes one row per tenant).

`tenantId` (+ index) needed on: `Branch`, `Department`, `Team`, `User`, `UserDocument`*, `LeaveType`, `LeaveAllocation`*, `LeaveRequest`*, `AuditLog`, `Notice`, `Asset`, `AssetAssignment`*, `AttendanceDevice`, `Attendance`*, `Holiday`, `EmployeeRequest`*, `EmailTemplate`, `EmailLog`, `NotificationRule`, `NotificationPreference`*, `PasswordResetToken`*.

\* = reachable via a parent's `tenantId`. Denormalising it anyway is worth it: it makes RLS policies and every list query a single-table filter instead of a join.

Unique constraints that **must** become composite (each is a cross-tenant collision today):

| Model:field | Now | Must become |
| --- | --- | --- |
| `User.email` | `@unique` | **stays platform-wide unique**, but as a *partial* index over live rows only — `UNIQUE (lower(email)) WHERE deleted_at IS NULL` (decision D3a in [`SAAS_SPEC.md`](./SAAS_SPEC.md) §1.2) |
| `User.employeeId` | `@unique` | `@@unique([tenantId, employeeId])` |
| `User.deviceUserId` | `@unique` | `@@unique([tenantId, deviceUserId])` |
| `Branch.name`, `Branch.code` | `@unique` | `@@unique([tenantId, …])` |
| `Department.code` | `@unique` | `@@unique([tenantId, code])` |
| `Team.code` | `@unique` | `@@unique([tenantId, code])` |
| `LeaveType.name`, `.code` | `@unique` | `@@unique([tenantId, …])` |
| `Asset.assetTag`, `.serialNumber` | `@unique` | `@@unique([tenantId, …])` |
| `AttendanceDevice.deviceId` | `@unique` | `@@unique([tenantId, deviceId])` |
| `Holiday` | `@@unique([date, name])` | `@@unique([tenantId, date, name])` |
| `EmailTemplate.name` | `@unique` | `@@unique([tenantId, name])` |
| `NotificationRule.type` | `@unique` | `@@unique([tenantId, type])` |
| `LeaveAllocation` | `@@unique([userId, leaveTypeId, year])` | fine (user is already tenant-bound) |
| `Attendance` | `@@unique([userId, date])` | fine |
| `PasswordResetToken.token` | `@unique` | fine (random token) |

Other logic that is silently global today:

- `generateEmployeeId()` — `prisma.user.count()` platform-wide → must count within tenant (and a count-based sequence is racy regardless; a per-tenant counter or sequence is the fix).
- `allocateDefaultLeaves()` — reads all active `LeaveType` rows → tenant-scoped.
- `/api/organization/public` — must resolve by host, and must expose **only** branding fields.
- Seed script (`prisma/seed.ts`) — currently seeds "the" org; becomes "seed a demo tenant".
- Email sending (`src/lib/email-service.ts`) — per-tenant from-address/branding, and per-tenant suppression if a tenant is suspended.

---

## 5. Super admin panel — requirements

### Where it lives and who logs in

**Recommendation: a separate `PlatformUser` table and a separate surface (`/admin`, or better `admin.workseeds.com`), not a `SUPER_ADMIN` value on the tenant `Role` enum.**

Why: a `SUPER_ADMIN` row inside `users` has a `tenantId`, so every "is this row mine?" check needs an exception branch — and an exception branch in a scoping rule is exactly where cross-tenant leaks are born. A separate table means platform queries are deliberately unscoped and tenant queries are *always* scoped, with no special cases. It also lets platform auth be stricter (mandatory 2FA, IP allowlist, shorter session) without touching tenant login.

### Functional requirements

**Tenants**
1. List all tenants: name, slug, plan, status, employee count, created date, last activity.
2. Tenant detail: full config, branding, feature flags, admin contacts, usage.
3. Create tenant manually (sales-led onboarding) — provisions settings, default leave types, first admin user, sends invite.
4. Suspend / reactivate / cancel (suspend must block login *and* stop scheduled email/attendance jobs).
5. Delete / export tenant data (GDPR-style erasure + takeout).
6. Change plan, employee cap, trial end date.
7. Feature flags per tenant.

**Users across tenants**
8. Search every user platform-wide by name / email / phone / employee ID, with the owning tenant shown.
9. User detail: role, status, contact info (email, phone, address, emergency contact), last login, tenant.
10. Reset a user's password / resend invite / unlock.
11. **Impersonation** ("view as") — must be explicitly audited, time-boxed, visibly banner-marked in the UI, and ideally opt-in per tenant. This is the single most abuse-prone feature in the panel.
12. Data-protection note: HR data includes DOB, address, emergency contacts, documents. Platform staff seeing all of it needs a lawful basis, a documented policy, and an audit trail — decide *deliberately* which fields the panel shows. Recommendation: contact + employment metadata by default; documents and sensitive personal fields behind a separate permission and an access log.

**Requests inbox**
13. **Demo / contact requests from the landing page** — see §6. Full contact info, message, headcount, source, status pipeline (`NEW → CONTACTED → QUALIFIED → WON / LOST`), assignee, internal notes, CSV export.
14. Optionally aggregate **in-product requests** (`EmployeeRequest`, leave requests) read-only for support triage — "customer says approvals are stuck", you look without impersonating.

**Platform health**
15. Metrics: tenants by status, signups over time, active users (DAU/MAU), employees per tenant, storage, email delivery success (`EmailLog` already models status), attendance-device sync failures.
16. Cross-tenant audit log viewer (`AuditLog` already exists — needs `tenantId` + a platform-side reader).
17. Every platform action written to a **separate** `PlatformAuditLog` (who impersonated whom, who exported what, who suspended whom).

**Non-functional**
18. Platform auth separate from tenant auth; 2FA; short sessions; optional IP allowlist.
19. Not reachable from a tenant subdomain; distinct cookie name so a tenant session can never be mistaken for a platform session.
20. Rate limiting (`src/lib/rate-limit.ts` exists) and no destructive action without typed confirmation.

---

## 6. Demo requests — missing today

The landing page's demo form (`src/components/landing/DemoCta.tsx`) validates and shows a confirmation, **but posts nowhere.** There is no lead table, no endpoint, no notification. Every demo request submitted right now is lost.

Needed:

- `DemoRequest` model: name, workEmail, company, phone?, headcount band, message, source (`landing / pricing / referral`), utm fields, ip, userAgent, status, assignedTo, internalNotes, createdAt, contactedAt, linked `tenantId` once converted.
- `POST /api/demo-requests` — Zod validated, rate limited, honeypot/turnstile for spam, duplicate-email collapse.
- Notification to sales (email or Slack) on create.
- Super admin inbox (§5.13) + "convert to tenant" action that pre-fills tenant creation from the lead.

---

## 7. Self-serve signup (decide before building)

The landing page promises *"Free for your first 10 employees · No card, no sales call to start"*. That promise needs a public signup flow that provisions a tenant unattended: slug availability check, email verification, first-admin creation, default leave types/templates, trial clock, employee-cap enforcement. Today the only way a tenant exists is the seed script.

If the go-to-market is actually sales-led for now, **change the landing copy** — or the first user who clicks it hits a wall.

---

## 8. Risks

| Risk | Mitigation |
| --- | --- |
| Cross-tenant data leak from one missing `where` | Prisma client extension injects scope; RLS as backstop; integration test suite that seeds 2 tenants and asserts every list endpoint returns only its own rows |
| Impersonation abuse | Time-boxed, audited, banner, tenant opt-in |
| Unique-constraint migration breaks existing data | Do it **now**, while there is 1 migration and no customer data |
| Noisy neighbour (one tenant's attendance sync/report load) | Per-tenant rate limits; move heavy jobs to a queue |
| Backups/restore of a single tenant | Shared schema makes single-tenant restore hard — needs a logical export path per tenant (feeds §5.5) |
| Employee-cap and plan limits unenforced | Enforce in user-create path, not just in the UI |
| Super-admin panel becomes a second, unguarded API | Separate auth, separate audit, no shared routes with tenant API |

---

## 9. Suggested phasing

| Phase | Scope | Rough effort |
| --- | --- | --- |
| **0** | `DemoRequest` model + endpoint + notification + minimal `/admin` requests inbox (platform auth, read + status changes) | 3–5 days |
| **1** | `Tenant` + `PlatformUser` models, tenantId on every model, composite uniques, Prisma scoping extension, host→tenant middleware, tenant claim in JWT, tenant-scoped login, 2-tenant isolation test suite | 3–4 weeks |
| **2** | Tenant provisioning (manual + self-serve), per-tenant branding on login, employee cap + trial enforcement, tenant suspend | 1–1.5 weeks |
| **3** | Full super admin: tenant list/detail, cross-tenant user search, metrics, audited impersonation, platform audit log | 1.5–3 weeks |
| **4** | RLS hardening, per-tenant export/erasure, billing + subscription | 2–3 weeks |

Phase 0 is independent of tenancy and unblocks the landing page immediately. Phases 1–2 should not be split across long gaps — a half-scoped codebase is more dangerous than an unscoped one.

---

## 10. Open questions (need answers before design freeze)

1. **Tenant addressing** — subdomain (`acme.workseeds.com`), path (`/acme`), or custom domains from day one?
2. **Go-to-market** — self-serve signup, sales-led only, or both? (Decides Phase 2 shape and whether the landing copy is honest today.)
3. ~~**Can one person belong to two tenants?**~~ **Answered:** yes as a human, but with **separate credentials per company** — no shared identity, no `User` split. Live login emails stay unique platform-wide; reusing one requires archiving the old employment first. See [`SAAS_SPEC.md`](./SAAS_SPEC.md) D3 / D3a.
4. **Impersonation** — allowed at all? Tenant opt-in required?
5. **How much employee PII may platform staff see?** All fields, or contact + employment only with documents behind extra permission?
6. **Billing** — in scope for v1? Which provider (Stripe)? Per-employee metered, as the pricing page says?
7. **Existing data** — any live company already using this in production whose data must survive the migration? (Assumption: no.)
8. **Data residency / enterprise isolation** — will you need to promise a dedicated DB for a big customer? (Keeps door C open.)
9. **Super admin accounts** — who gets one, and is 2FA mandatory from day one?
10. **Per-tenant email sending** — shared from-address, or per-tenant domain/DKIM?
