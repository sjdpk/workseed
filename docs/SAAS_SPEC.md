# Workseeds SaaS — architecture spec (decisions locked)

Status: **spec only, nothing implemented.** 2026-07-29.
Background research and current-state audit: [`MULTI_TENANCY_AND_SUPER_ADMIN.md`](./MULTI_TENANCY_AND_SUPER_ADMIN.md).

## Decisions

| # | Decision | Choice |
| --- | --- | --- |
| D1 | Tenant addressing | **Subdomain** — `acme.workseeds.com`; custom domains deferred to a later phase (schema leaves room) |
| D2 | Onboarding | **Both** — public self-serve signup *and* super-admin manual creation; self-serve built first |
| D3 | One person, many companies | **Separate credentials per company.** No shared identity, no account linking. Login email is unique **platform-wide** |
| D3a | Reusing an email in another company | Allowed only after the old user is **deleted / archived**, which releases the email. See §1.2 |
| D4 | Isolation model | Shared schema + `tenantId`, Prisma scoping extension, Postgres RLS as backstop |
| D5 | Super admin | Separate `PlatformUser` table on its own surface (`admin.workseeds.com`), never a role inside tenant users |
| D6 | Scope | Full-featured v1 — the pitch is "complete platform", so the checklist in §6 is the definition of done |

---

## 1. Identity model (the consequence of D3)

### 1.1 One user row per employment, credentials included

`User` **keeps its current shape** — login credentials + HR record + org placement in one row — and simply gains `tenantId`. There is no `Account`, no `Membership`, no profile split.

One human working at two companies is **two completely unrelated `User` rows**, each with its own email and its own password:

| | Acme | Globex |
| --- | --- | --- |
| email | `alex@acme.com` | `alex.m@globex.io` |
| password | separate hash | separate hash |
| employeeId | `EMP00042` | `EMP00007` |
| role / employment | `EMPLOYEE` / `FULL_TIME` / Software Engineer | `EMPLOYEE` / `CONTRACT` / Consultant |
| everything else | Acme's record | Globex's record |

Consequences, all of them good for this product:

- **Isolation is structural.** No object is shared between the two rows, so there is nothing to leak — stronger than a shared-identity design, where you must actively hide memberships from each tenant.
- **No cross-tenant linkage exists at all.** Neither tenant, nor even super admin, can tell the two rows are the same human. (If support ever needs that, it would have to be inferred manually — deliberately, not by a query.)
- **Sessions are independent.** Cookie scoped per subdomain; signing out of Acme leaves Globex signed in. Password reset, MFA and lockout are per employment.
- **Cheaper build.** Phase 1 drops from 4–6 weeks to **3–4 weeks**: no identity split, no repointing of 20+ foreign keys, no tenant switcher, no handoff-token flow.

### 1.2 Email uniqueness and releasing an old email (D3a)

Login email stays **unique platform-wide** — one live email, one user, one company. To use an email that a previous employment already holds, that old user must first be **deleted / archived**, which releases the email.

Mechanically:

- `User` gains `deletedAt` (soft delete) and `archivedEmail`.
- Unique index becomes **partial**: `CREATE UNIQUE INDEX users_email_active ON users (lower(email)) WHERE deleted_at IS NULL`. Prisma can't express partial unique indexes in the schema DSL, so this goes in raw SQL inside the migration.
- Archiving a user copies `email` → `archivedEmail`, writes `deletedAt`, and rewrites `email` to a tombstone (`alex+deleted-<id>@archived.invalid`). History, audit rows, attendance and payslips keep pointing at the row; the address becomes reusable immediately.
- `archivedEmail` is what the UI and audit trail display, so "who was this?" still answers correctly years later.

**Open decision — does deactivation alone free the email, or only deletion?** You said "deleted or deactivated". My recommendation: **deactivation does not free it; releasing is an explicit action** (offered as a checkbox on the deactivate/offboard screen — "release `alex@acme.com` for reuse"). Reason: `INACTIVE`/`SUSPENDED` is routinely temporary — parental leave, a suspension pending investigation, a seasonal worker — and silently tombstoning the login would break their return and could hand their address to someone else while they're still an employee. An explicit release keeps your rule while making the destructive half deliberate.

**Trade-off you should know about.** Platform-wide uniqueness means Globex cannot invite `alex@gmail.com` if Acme already has it, and the error message necessarily reveals that the address exists *somewhere on the platform* — i.e. it leaks that the person has an account with another customer, and enables email enumeration. Unavoidable under D3a; mitigations are: a neutral message ("this email is not available"), rate limiting on the invite/user-create endpoint, and no distinction between "taken here" and "taken elsewhere". If that leak ever becomes a problem for an enterprise deal, the alternative is per-tenant unique emails (`@@unique([tenantId, email])`) with still-separate credentials — same UX for the part-timer, no leak, no delete-to-reuse dance. Flagging it once; proceeding as you specified.

### 1.3 Everything else

All existing relations (`Attendance`, `LeaveRequest`, `LeaveAllocation`, `UserDocument`, `Asset` assignee, `AssetAssignment`, `EmployeeRequest`, `Notice.createdBy`, `Team.leadId`, `Department.headId`, manager/subordinate, `NotificationPreference`, `PasswordResetToken`) stay pointed at `User` — unchanged. They inherit tenant isolation because `User` is tenant-bound.

`employeeId` and `deviceUserId` become **per-tenant** unique (`@@unique([tenantId, …])`), so both companies can run their own `EMP00001` series and their own biometric PIN numbering.

---

## 2. Auth flows

**Tenant login** — `acme.workseeds.com/login`
1. Middleware resolves host → tenant (cached; unknown slug → 404 marketing page).
2. Email + password → look up the user **scoped to that tenant** (`{ tenantId, email, deletedAt: null }`).
3. Wrong tenant, deleted, or non-`ACTIVE` status → the *same* generic "invalid credentials" error. Never "you belong to a different company" — that would leak where the person works.
4. JWT claims: `userId`, `tenantId`, `role`. Cookie scoped to the subdomain, so an Acme session and a Globex session coexist in two tabs without interfering.
5. Server code derives tenant from the token and cross-checks it against the host; mismatch → reject.

**Root-domain login** — `workseeds.com/login`
Only asks which company: "enter your work email" → resolve the tenant from the (globally unique) email → redirect to `acme.workseeds.com/login` with the email prefilled. Password is *never* accepted at the root domain, so this is a lookup convenience, not a second auth path. Unknown email → still redirect to a generic "check your company address" page rather than confirming absence.

**Self-serve signup** — `workseeds.com/signup` (D2)
Email + password + company name → slug availability (reserved-word list: `www api app admin auth static assets help docs status mail`) → verify email → create `Tenant` (`TRIAL`) + first `User` (`ADMIN`) → seed default leave types, email templates, notification rules, one branch → land on a guided setup checklist. Email already live anywhere on the platform → rejected with the neutral message from §1.2.

**Employee invite**
Admin invites `person@example.com` → create the `User` in this tenant with a set-password link. If the address is already live in *any* tenant, the invite fails with "this email is not available" and the admin must use a different address (or the other employment must be archived first). This is the operational cost of D3a — worth stating in your onboarding docs so admins aren't surprised.

**Mobile** (`/api/mobile-config`, Bearer tokens) — same claims; the app must send tenant context or use a tenant-bound token.

---

## 3. Data-layer enforcement

1. **Prisma client extension** injects `tenantId` into every `where`/`create` for tenant-owned models, reading from request-scoped context (`AsyncLocalStorage`). Route code stops writing scope by hand — 279 call sites can't each forget it.
2. **Postgres RLS** on tenant tables via `SET LOCAL app.tenant_id`, applied per transaction (note: the current `pg.Pool` in `src/lib/prisma.ts` means the variable must be set and reset inside the transaction, never per connection).
3. **Isolation test suite** — seeds two tenants with deliberately colliding data (same email as an account with two memberships, same `employeeId`, same branch name) and asserts every list endpoint, export and report returns only the caller's tenant. This suite is the gate for merging Phase 1.
4. Composite unique constraints per the table in the research doc, all keyed on `tenantId`.
5. `AuditLog` gains `tenantId` + actor = `membershipId`; platform actions go to a separate `PlatformAuditLog`.

---

## 4. Super admin (`admin.workseeds.com`)

Separate `PlatformUser` auth (mandatory 2FA, short sessions, optional IP allowlist, distinct cookie name).

- **Tenants** — list (name, slug, plan, status, employees, last activity), detail, create, suspend/reactivate/cancel, plan + employee cap + trial date, feature flags, export/erase.
- **Accounts & people** — search platform-wide by email/name/phone/employee ID; account detail shows its memberships across tenants (the only place that view exists, and it is audited); reset password, resend invite, unlock.
- **Requests inbox** — demo/contact requests from the landing page with full contact info, headcount, message, source/UTM, pipeline `NEW → CONTACTED → QUALIFIED → WON/LOST`, assignee, notes, CSV export, "convert to tenant" prefill.
- **Support view** — read-only access to a tenant's leave/employee requests for triage without impersonating.
- **Impersonation** — time-boxed, tenant opt-in, persistent banner, every session logged to `PlatformAuditLog`.
- **PII posture** — contact + employment metadata visible by default; documents, DOB and emergency contacts behind a second permission plus an access log entry.
- **Metrics** — tenants by status, signups over time, DAU/MAU, employees per tenant, email delivery (`EmailLog` already models status), attendance-device sync failures, storage.

---

## 5. Landing-page gap to close first

The demo form (`src/components/landing/DemoCta.tsx`) validates and shows a confirmation but **posts nowhere** — every submission is currently lost. Needs `DemoRequest` model, `POST /api/demo-requests` (Zod + rate limit + honeypot/Turnstile + duplicate collapse), sales notification, and the inbox above. ~3–5 days, independent of tenancy.

With D2 chosen, the landing promise "no card, no sales call to start" becomes true once self-serve signup ships.

---

## 6. Definition of done for the "complete platform" pitch (D6)

Already built (single-tenant): users/employees, branches, departments, teams, org chart, leave types/allocations/requests, attendance + biometric devices, holidays, assets + assignments, notices, employee requests, reports, audit logs, email templates + logs, notification rules/preferences, password reset, mobile config, dashboard, theming.

To add for a credible SaaS pitch:

| Area | Items |
| --- | --- |
| **Tenancy** | Tenant model, subdomain routing, scoping extension, RLS, isolation tests, composite uniques |
| **Identity** | Per-tenant credentials, platform-wide unique live email, soft delete + email release/archive, invite & offboard flows |
| **Onboarding** | Self-serve signup, slug reservation, email verification, seeded defaults, setup checklist, sample-data option |
| **Plans** | Plan + employee cap + trial clock, enforcement at user-create (not just UI), upgrade/downgrade, billing (Stripe, per-employee metered) + invoices + dunning |
| **Branding** | Per-tenant logo, name, accent, login page, email from-name; custom domain later |
| **Growth** | Demo requests, lead pipeline, UTM capture |
| **Support ops** | Super admin panel, audited impersonation, support read-only view, platform audit log |
| **Trust** | Per-tenant export + erasure, backup/restore story, DPA/privacy/subprocessor pages, session management, rate limits, secrets/2FA |
| **Reliability** | Background job queue for attendance sync + email (today they'd run in-request), per-tenant rate limits, health/status endpoint |
| **Extensibility** | Public API + tokens, webhooks, SSO/SCIM (enterprise tier), integrations page |

Items in the last three rows are what turn "an HR app" into "a platform" during a pitch — most are small next to Phase 1.

---

## 7. Phase plan (revised for D2 + D3)

| Phase | Scope | Effort |
| --- | --- | --- |
| **0** | `DemoRequest` + endpoint + notification + minimal platform auth & requests inbox | 3–5 days |
| **1** | `Tenant`, `PlatformUser`, `tenantId` on every model, composite uniques, partial unique email index + soft delete/archive, scoping extension, host→tenant middleware, tenant-scoped login, isolation test suite | 3–4 weeks |
| **2** | Self-serve signup + provisioning, invite + offboard/release-email flows, per-tenant branding, plan/cap/trial enforcement, suspend behaviour | 1.5–2 weeks |
| **3** | Full super admin: tenants, accounts across tenants, metrics, audited impersonation, support view, platform audit log | 2–3 weeks |
| **4** | Billing (Stripe), per-tenant export/erasure, RLS hardening, job queue | 2–3 weeks |
| **5** | Public API + webhooks, SSO/SCIM, custom domains | 2–3 weeks |

Realistic total for the full pitch-ready platform: **9–14 weeks** solo (D3 as specified saves 1–2 weeks versus a shared-identity design). Phase 1 must not be left half-done — a partially scoped codebase is more dangerous than an unscoped one.

Sequencing note: Phase 0 ships value on day one and is throwaway-free (the `DemoRequest` model gains a `tenantId`-free life on the platform side, so Phase 1 doesn't rewrite it).

---

## 8. Remaining open questions

0. **Does deactivation release the email, or only deletion/archive?** See §1.2 — recommendation is an explicit "release for reuse" action, not automatic on deactivate. **Blocking for Phase 1's migration.**
1. **Billing provider + model** — Stripe, per-employee metered as the pricing page states ($6 / $12)? Who counts as a billable employee (`ACTIVE` users only, excluding soft-deleted)?
2. **PII posture for platform staff** — confirm the default in §4.
3. **2FA** — mandatory for platform users from day one? Offered to tenant admins in v1?
4. **Trial length + free tier** — landing says "free for your first 10 employees". Free forever under 10, or 14-day trial then paid?
5. **Data residency** — any commitment to EU/AU hosting in v1? (Affects whether a dedicated-DB tier stays on the table.)
6. **Existing production data** — assumed none. Confirm, because it decides whether Phase 1's migration can be destructive.
7. **Per-tenant email domain/DKIM**, or one shared from-address with per-tenant display name?
