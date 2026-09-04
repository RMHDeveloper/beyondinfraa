# BeyondInfra CRM — End-to-End Test Cases: Full Application

Companion to [`test-cases.md`](./test-cases.md) (which covers the project lifecycle — creation
through client intake, matching, and award — in depth per Category/Subcategory) and
[`lifecycle-flowchart.md`](./lifecycle-flowchart.md). This document covers **everything else**:
auth, contacts, employees/users, proposals, matching (briefly), calendar/site visits/tasks/
followups, settings, dashboard/reports, audit logs, and search.

Findings are grounded in the actual route code, not assumptions — several test cases below exist
specifically to confirm real gaps found while reading the code (missing auth, inconsistent role
checks, unhandled duplicate-key errors). These are flagged **⚠ Known gap** so they're not mistaken
for expected behavior.

Roles referenced throughout: `SUPER_ADMIN`, `OWNER`, `EMPLOYEE` (`UserRole` enum).

---

## 1. Authentication & Sessions

| # | Step | Action | Expected Result |
|---|---|---|---|
| A1 | Login with valid credentials | `POST /api/auth/login` with correct email/password | 200, `bi_token` HttpOnly cookie set, response body `{ user: { id, name, email, role } }` (no password hash) |
| A2 | Login with wrong password | Same email, wrong password | 401 `"Invalid credentials"` |
| A3 | Login with unknown email | Non-existent email | 401 `"Invalid credentials"` (same message as A2 — confirm no user-enumeration difference) |
| A4 | Login with missing fields | Omit `email` or `password` | 400 `"Email and password required"` |
| A5 | Login as deactivated user | `isActive: false` user, correct password | 401 `"Invalid credentials"` (not a distinct "account disabled" message) |
| A6 | Email case sensitivity | Log in with `Foo@Example.com` when account was created as `foo@example.com` | Should succeed — login lowercases/trims before lookup |
| A7 | Repeated failed logins | 10+ wrong-password attempts in a row | No lockout/rate-limit currently — confirm this is accepted, flag if unexpected |
| A8 | Logout | `POST /api/auth/logout` | Cookie cleared (`Max-Age=0`); subsequent authenticated calls fail |
| A9 | `GET /api/auth/me` without cookie | No `bi_token` | 401 JSON `{ error: "Unauthorized" }` (this route handles it cleanly, unlike most others — see A10) |
| A10 | Any other protected API route without cookie | e.g. `GET /api/contacts`, `GET /api/matches` with no cookie | ⚠ **Known gap**: returns **500**, not 401 (`requireSession()` throws uncaught). Confirm current behavior; flag if this should be fixed to 401. |
| A11 | Deactivate a user mid-session | Log in, admin sets `isActive: false` on that user via DB, original session's JWT still unexpired | ⚠ **Known gap**: a "new-shaped" JWT (issued after the name/email-embedded token change) does **not** re-check `isActive` server-side — user keeps working until the 7-day token expires or they log out. Verify actual behavior. |
| A12 | Unauthenticated visit to any `(internal)` page | e.g. `/dashboard`, `/contacts` with no session | Redirects to `/login` |
| A13 | Cookie over plain HTTP | Inspect `Set-Cookie` header on login | No `Secure` flag present — cookie would transmit over HTTP too; confirm expected for current deployment target |

---

## 2. Contacts

| # | Step | Action | Expected Result |
|---|---|---|---|
| CT1 | Create contact | `POST /api/contacts` with `name` + `type` | 201/200, contact created |
| CT2 | Create contact missing required fields | Omit `name` or `type` | 400 `"Name and type are required"` |
| CT3 | Create DEVELOPER-type contact | `type: "DEVELOPER"` + developer fields (`reraNumber`, `preferredProjectSize`, `preferredLocations` as comma-separated string, `financialCapability`, `completedProjects`, `ongoingProjects`, `internalRating`) | Contact **and** linked `Developer` profile row both created; numeric fields parse cleanly (invalid numbers fall back to `0`/`null` via `parseInt(...) || ...`) |
| CT4 | List contacts | `GET /api/contacts` | Returns only `isActive: true` contacts, fields `{ id, name, type, phone, email }` |
| CT5 | Edit contact | Use the contact edit page (server action, not an API route) | Fields update; no `requireSession()` on this action — confirm only the page-level layout redirect gates access |
| CT6 | Edit with empty name | Submit edit form with blank `name` | Silently no-ops (no error message shown) — confirm this is the actual UX, not a crash |
| CT7 | Change type away from DEVELOPER | Edit a DEVELOPER contact, change type to e.g. BUYER, save | ⚠ **Known gap**: existing `Developer` profile row is **not** deleted/deactivated — orphaned record remains. Verify. |
| CT8 | Deactivate a contact | Set Status → Inactive on edit form | Contact disappears from `GET /api/contacts` (soft-delete via `isActive`) |
| CT9 | Hard delete a contact | Look for a delete action | Confirm none exists — soft-deactivate is the only removal path |
| CT10 | Duplicate phone/email across contacts | Create two contacts with the same phone | Allowed — schema has no uniqueness constraint on `Contact.phone`/`email` |
| CT11 | View contact detail page | Open a contact with linked projects | "Buyer/Tenant Requirements" section shows their Buy/Tenant-subcategory projects; Proposals and Site Visits sections show related records |

---

## 3. Employees & Users

| # | Step | Action | Expected Result |
|---|---|---|---|
| U1 | Create user as SUPER_ADMIN | `POST /api/users` with `name`, `email`, `phone`, `role`, `password`, logged in as SUPER_ADMIN | 201, user created, password bcrypt-hashed |
| U2 | Create user as OWNER | Same request, logged in as OWNER | 403 `"Forbidden"` — **user creation requires SUPER_ADMIN specifically**, unlike most other admin actions where OWNER suffices |
| U3 | Create user as EMPLOYEE | Same request as EMPLOYEE | 403 `"Forbidden"` |
| U4 | Create user missing fields | Omit `name`/`email`/`password`/`role` | 400 |
| U5 | Create user with duplicate email | Email already in use (exact case match) | 409 `"Email already in use"` |
| U6 | Create user with duplicate email, different case | Existing `foo@x.com`, new user `Foo@x.com` | ⚠ **Known gap**: uniqueness check is **not** case-normalized here (unlike login) — may bypass the 409 and create a second account that later can't be distinguished from the first at login. Verify actual behavior. |
| U7 | Create user with duplicate phone | Phone already in use (schema has `@unique` on phone) | ⚠ **Known gap**: no pre-check — expect an uncaught 500, not a clean 409. Verify. |
| U8 | Weak password via direct API call | Password under 8 chars, bypassing the client form's `minLength` | Confirm whether it's accepted (no server-side minimum found) |
| U9 | List users | `GET /api/users` as any authenticated role, including EMPLOYEE | 200 — no role restriction on listing (`id, name, role` only, `isActive: true`) |
| U10 | Deactivate/edit an existing user | Look for `PATCH`/`DELETE /api/users/[id]` | Confirm no such route exists — there is currently no way to deactivate or change an existing user via the app |
| U11 | Employees page | Visit `/employees` as any role | Read-only table of `role: EMPLOYEE` users; no create/edit actions on this page itself |
| U12 | Non-admin visits `/users/new` | EMPLOYEE navigates directly to the URL | ⚠ **Known gap**: page renders (no page-level role gate) — submission then fails with 403 from U3. Confirm the form is visible but non-functional for this role, not hidden. |

---

## 4. Requirements (Buy/Tenant Project Views)

Not a distinct data model — `/requirements/buyer` and `/requirements/tenant` are filtered, read-only
views of `Project` records where `subcategory.name` is `"Buy"` / `"Tenant"`. No dedicated API routes
exist.

| # | Step | Action | Expected Result |
|---|---|---|---|
| RQ1 | Open Buyer Requirements | Visit `/requirements/buyer` | Lists only projects with subcategory `Buy`, split into Active/Archived by `state` |
| RQ2 | Open Tenant Requirements | Visit `/requirements/tenant` | Lists only projects with subcategory `Tenant` |
| RQ3 | Match-count badge | A listed requirement has one or more confirmed matches | Badge count reflects only matches where `confirmedAt != null` |
| RQ4 | "Add Requirement" button | Click through | Opens the generic `/projects/new` flow (not a requirements-specific form) — same creation path documented in `test-cases.md` |
| RQ5 | Row navigation | Click a requirement row | Opens the standard `/projects/:id` detail page |

---

## 5. Proposals & Developer Proposals

**Status flow (`ProposalStatus`):** `DRAFT → SENT → VIEWED → RESPONSE_PENDING → INTERESTED →
PARTIALLY_SHORTLISTED → SITE_VISIT_REQUESTED → NEGOTIATING → ACCEPTED / REJECTED / EXPIRED`
**Per-property response (`PropertyResponse`):** `NO_RESPONSE, INTERESTED, NOT_INTERESTED,
SHORTLISTED, SITE_VISIT_REQUESTED, NEGOTIATING, CONFIRMED`

| # | Step | Action | Expected Result |
|---|---|---|---|
| P1 | Create proposal | `/proposals/new`: select `contactId`, ≥1 `projectIds` (listing properties), optional `demandProjectId`, `introduction`, `remarks` | Proposal created with `proposalNumber` = `PRP-####`, nested `ProposalProperty` rows (one per selected listing, `response: NO_RESPONSE`) |
| P2 | Submit with no properties selected | Leave `projectIds` empty, submit | ⚠ **Known gap**: silent no-op, no error shown. Confirm this is actually what happens. |
| P3 | Submit with no contact | Leave `contactId` empty | Same silent no-op |
| P4 | Concurrent proposal creation | Two proposals created at (near) the same instant | ⚠ **Known gap**: `proposalNumber` is generated via `count()+1`, not a transaction — possible duplicate numbers under real concurrency. Worth a load-style test if this matters operationally. |
| P5 | Advance proposal status | `PATCH /api/proposals/[id]` with any `status` value | ⚠ **Known gap**: no state-machine enforcement at the API level — e.g. DRAFT → ACCEPTED directly is accepted. Confirm whether the UI itself restricts which transitions are offered, even though the API doesn't. |
| P6 | Update one property's response | `PATCH /api/proposal-items/[id]` with a `PropertyResponse` value | Line-item updates independent of the parent proposal's own status |
| P7 | View proposals for a listing project | `GET /api/projects/:id/proposals` | Returns all `ProposalProperty` rows referencing that project, with parent proposal summary |
| P8 | Generate marketing PPT (global) | `POST /api/proposals/marketing-ppt` with `{ items: [{ projectId, imageId }] }` | Returns a downloadable `.pptx`; only `GALLERY_IMAGE`/`CUSTOM_FIELD_IMAGE` kinds eligible |
| P9 | PPT with empty items | `items: []` | 400 `"No matching images found"` (or equivalent — confirm exact message) |
| P10 | PPT with mismatched projectId/imageId pair | Pass an `imageId` that belongs to a different project than the paired `projectId` | Pair is silently dropped server-side (trust-nothing check); if **all** pairs are invalid, 400 |
| P11 | PPT with a DOCUMENT-kind file referenced | Pass an `imageId` for a file whose `kind` is `DOCUMENT`, not an image kind | Excluded from the generated deck |
| P12 | Per-project marketing PPT | `POST /api/projects/[id]/marketing-ppt` | Confirm this single-project variant behaves consistently with the bulk/global one (separate code path) |
| P13 | Bulk marketing PPT + email | `POST /api/projects/[id]/bulk-marketing-ppt` and its `/email` sub-route | Email variant logs `AuditAction.EMAIL_SENT`; confirm both routes independently since they're separate implementations |
| P14 | Create developer proposal | Via project detail page → `POST /api/projects/[id]/extra` with `type: "developerProposal"` | Created with `DeveloperStatus.NOT_CONTACTED` (or as specified) |
| P15 | Mark a second developer proposal SELECTED while one is already SELECTED | On the same project, attempt to set a second `DeveloperProposal.status = "SELECTED"` | 409 `"Another developer is already SELECTED for this project."` — enforced on both create and update, plus again inside the award endpoint |
| P16 | Delete a developer proposal/owner unit from the wrong project | `DELETE /api/projects/:idA/extra` with `id` of a record actually belonging to project `:idB` | ⚠ **Known gap**: no cross-check that the record belongs to `:idA` — deletion likely succeeds regardless. Confirm and flag if unintended. |
| P17 | Upload developer proposal file | `POST /api/developer-proposals/[id]/files` | Success logs `AuditAction.FILE_UPLOAD`; 404 if the parent `developerProposal` doesn't exist |
| P18 | Delete developer proposal file | `DELETE /api/developer-proposals/[id]/files/[fileId]` | Logs `AuditAction.FILE_DELETE` |
| P19 | Owner Unit duplicate unit number | Create two `ownerUnit` records with the same `unitNumber` on one project | Allowed — no uniqueness check |

---

## 6. Matching (Summary — award-side detail already in `test-cases.md`)

| # | Step | Action | Expected Result |
|---|---|---|---|
| M1 | Run bulk auto-match | `POST /api/matching/run` | Scores all `OPEN` demand×listing pairs, skips pairs with an existing `Match` row, bulk-creates new unconfirmed suggestions, returns `{ ok: true, created: <count> }` |
| M2 | Get live suggestions (no writes) | `POST /api/matching/suggest`, optionally scoped by `projectId`/`demandProjectId` | Read-only, sorted by match %, flags `alreadyConfirmed`/`existingMatchId` per suggestion |
| M3 | Create manual match on a new pair | `POST /api/matches` with `projectId` + `demandProjectId`, no existing match | 201, new confirmed match, `isManual: true`, `matchPct: 0` |
| M4 | Create manual match on an existing unconfirmed suggestion | Same pair already has an unconfirmed auto-match | 200, existing row is confirmed and upgraded to `isManual: true` (not duplicated) |
| M5 | Re-confirm an already-confirmed match | `PATCH /api/matches/[id]` on a match with `confirmedAt` already set | `confirmedAt` is simply overwritten with the new timestamp — no "already confirmed" error |
| M6 | Delete a match with no deal | `DELETE /api/matches/[id]` | Succeeds cleanly |
| M7 | Delete a match that has an associated Deal (post-award) | `DELETE /api/matches/[id]` where `Deal.matchId` points to it | ⚠ **Known gap**: likely an uncaught FK-violation 500, not a clean 409. Verify actual behavior — this is a meaningful data-integrity case. |
| M8 | Role check on matching endpoints | Run matching/suggest/confirm as EMPLOYEE | All three succeed — no role restriction (contrast with Award itself, which is SUPER_ADMIN/OWNER only) |

---

## 7. Calendar, Site Visits, Tasks, Followups, Cron

| # | Step | Action | Expected Result |
|---|---|---|---|
| CV1 | Fetch calendar with valid range | `GET /api/calendar?start=...&end=...` (ISO dates) | 200, merged/sorted array of `followup`, `sitevisit`, and `meeting`-type events |
| CV2 | Fetch calendar missing params | Omit `start` or `end` | 400 `"start and end query params required (ISO dates)"` |
| CV3 | Fetch calendar with unparseable dates | `start=notadate` | 400, same message |
| CV4 | Meeting round-trip | Create a meeting note (`ProjectNote` with `__meeting__:` prefix + JSON), then fetch the calendar for that range | Meeting appears correctly parsed as a calendar event |
| CV5 | Corrupted meeting note | Manually malform the JSON payload of a `__meeting__:` note | Calendar endpoint skips it silently rather than crashing |
| T1 | View Tasks page | `/tasks` | Lists all `FollowUp` rows (not a separate Task model), ordered by done-status then due date, capped at 200 |
| F1 | Create followup | `POST /api/projects/[id]/followups` with `description` + `dueAt` | 201 |
| F2 | Create followup missing fields | Omit `description` or `dueAt` | 400 `"description and dueAt required"` |
| F3 | Toggle followup done via project-scoped route | `PATCH /api/projects/[id]/followups` | `isDone`/`doneAt` update |
| F4 | Toggle followup done via top-level route | `PATCH /api/followups/[id]` | ⚠ Confirm this second, separately-implemented route behaves identically to F3 — they're overlapping code paths that could drift |
| F5 | Delete a followup | Look for a DELETE route | Confirm none exists |
| SV1 | Create site visit | `/site-visits/new` server action | `visitNumber` = `SV-####`; confirm `scheduledAt` isn't silently defaulted to "now" if left blank on the form |
| SV2 | Concurrent site visit creation | Two visits created near-simultaneously | ⚠ **Known gap**: same non-transactional `count()+1` numbering race as proposals (P4) |
| SV3 | Update site visit status | Look for the actual mutation path (no `app/api/site-visits/**` route exists) | Confirm how status/feedback/interestLevel updates actually happen — likely another server action or the `extra` route; test at the UI level |
| CR1 | Cron followup-reminders, production | `GET /api/cron/followup-reminders` with correct `x-cron-secret` header, `NODE_ENV=production` | 200, sends reminder emails for today's due, not-done followups (assignee-less or emailless ones silently skipped), capped at 200, returns `{ ok: true, sent: <count> }` |
| CR2 | Cron followup-reminders, wrong secret, production | Wrong/missing `x-cron-secret`, `NODE_ENV=production` | Rejected |
| CR3 | Cron followup-reminders, non-production | Same call with no secret header, `NODE_ENV != production` | ⚠ **Known gap**: secret check is bypassed entirely outside production — runs unauthenticated. Verify against the actual deployed environment's `NODE_ENV`. |
| CR4 | Cron site-visit-reminders | Same pattern as CR1–CR3 for `GET /api/cron/site-visit-reminders` | Same behavior, scoped to today's `SCHEDULED`/`CONFIRMED` visits |
| CR5 | Over 200 due items in one day | More than 200 followups (or site visits) due today | Only the first 200 are reminded — no pagination/second pass |

---

## 8. Settings

| # | Step | Action | Expected Result |
|---|---|---|---|
| S1 | List categories, no auth | `GET /api/settings/categories` with no session cookie | ⚠ **Known gap**: 200 — this route has no auth check at all. Same for `tags`, `statuses`, `scoring-rules`, `templates` GETs. Confirm and flag as intentional-or-not. |
| S2 | Create category as OWNER | `POST /api/settings/categories` with `name` + `slug` | 200/201 — OWNER is sufficient (bundled with SUPER_ADMIN) |
| S3 | Create category as EMPLOYEE | Same request | 403 |
| S4 | Create category with duplicate slug | Slug already exists | ⚠ **Known gap**: no pre-check — expect uncaught 500 (P2002), not a clean 409. Verify. |
| S5 | Edit or delete a category | Look for PATCH/DELETE routes | Confirm none exist — categories/subcategories are add-only, no UI or API for editing/removing, so "delete a category with active projects" cannot currently be tested via the API at all |
| S6 | Create subcategory missing categoryId | `POST /api/settings/subcategories` without `categoryId` | 400 |
| S7 | Toggle a question's print/PPT visibility | `PATCH /api/settings/templates/questions/[id]` with `showInPrint` and/or `showInPptExport` | Updates only those two booleans; role SUPER_ADMIN/OWNER |
| S8 | Toggle with neither flag supplied | Empty/irrelevant body | 400 `"Nothing to update"` |
| S9 | Reorder questions within a group | `PATCH /api/settings/templates/questions/reorder` with `groupId` + `orderedIds` | Bulk `sortOrder` update via transaction |
| S10 | Reorder missing params | Omit `groupId` or empty `orderedIds` | 400 |
| S11 | Attempt to edit a question's label/type/options | Look for a route that supports this | Confirm none exists — only the two narrow PATCH routes above are exposed; full template/question authoring is DB-seeded only in this version |
| S12 | Create/edit/delete Status | Full CRUD via `/api/settings/statuses` | POST/PATCH = SUPER_ADMIN or OWNER; **DELETE = SUPER_ADMIN only** — confirm OWNER is blocked from delete specifically |
| S13 | Delete a Status currently assigned to a project | `DELETE` on an in-use status | ⚠ **Known gap**: no pre-check for references — likely an uncaught FK-violation 500. Verify. |
| S14 | Create/delete Tag | `/api/settings/tags`, both POST and DELETE = SUPER_ADMIN or OWNER | Consistent role requirement (unlike Status, where delete is stricter) |
| S15 | Delete a Tag currently applied to projects | `DELETE` on an in-use tag | Succeeds cleanly — cascades and removes `ProjectTag` join rows with no error, no confirmation step |
| S16 | Create/edit/delete Scoring Rule | `/api/settings/scoring-rules` | POST/PATCH = SUPER_ADMIN or OWNER; DELETE = SUPER_ADMIN only |
| S17 | Create scoring rule missing fields | Omit `name`, `templateSlug`, `matchValue`, or `score` | 400 |
| S18 | Update App Settings | `PATCH /api/settings/app` with an arbitrary key/value map, SUPER_ADMIN | Every key is upserted with no allowlist — confirm a typo'd/unexpected key is silently accepted, not rejected |
| S19 | Update App Settings as OWNER | Same request as OWNER | 403 — this is SUPER_ADMIN only, no OWNER bundling |
| S20 | Upload PPT template slot | `POST /api/settings/ppt-template/[slot]` with `slot` in `{cover, middle, thankyou}` + file, SUPER_ADMIN | Stored, `AppSetting` row `ppt_{slot}_image` upserted |
| S21 | Upload PPT template with invalid slot | `slot: "banner"` (not one of the three) | 400 `"Invalid slot"` |
| S22 | Upload PPT template with no file | Missing `file` in the request | 400 `"No file provided"` |
| S23 | Upload a non-image file as a PPT slot | e.g. a `.pdf` or `.txt` | Confirm whether this is rejected — no file-type validation was found in the route |
| S24 | Upload an oversized file as a PPT slot | Very large file | Confirm behavior — no size limit found in the route itself |

---

## 9. Dashboard & Reports

| # | Step | Action | Expected Result |
|---|---|---|---|
| D1 | Load dashboard, no filter | `GET /api/dashboard` | Returns org-wide `totalProjects`, `openCount`, `byState`, `byCategory`, `byStatus`, `recentProjects` (5), `overdueFollowups`, `totalContacts`, `totalBuyerReqs`/`totalTenantReqs` (Project-based, not the unused Requirement models), `totalMatches`, `totalProposals`, `totalSiteVisits`, `totalDeals`, `pipelineValue` |
| D2 | Load dashboard scoped to one employee | `GET /api/dashboard?employeeId=...` | Most metrics scope to that assignee's projects |
| D3 | Overdue followups with employee filter | Same as D2 | ⚠ **Known gap**: `overdueFollowups` is **not** scoped by `employeeId` even when the param is passed — confirm whether this is a bug (every other metric respects the filter) |
| D4 | Projects with no status assigned | One or more projects have `statusId: null` | `byStatus` breakdown silently excludes them — total across `byStatus` entries will be less than `totalProjects` |
| D5 | Pipeline value calculation | Open Buy-subcategory projects with a "Budget — Max" response filled in | `pipelineValue` sums those values correctly |
| D6 | Pipeline value after renaming the Budget question | If the "Budget — Max" question label is ever changed | ⚠ **Known gap**: relies on an exact hardcoded label string match — value would silently drop to 0 with no error. Good regression check after any template edit touching that label. |
| D7 | Per-category match breakdown | Confirm `matchByCatMap` (built via raw `$queryRaw`) returns correct counts | Cross-check against a manual count for at least one category |
| D8 | Load Reports page | `/reports` | Shows overlapping but simpler metric set; confirm it has **no** `employeeId` scoping (unlike Dashboard) |
| D9 | Reports as EMPLOYEE | Any authenticated role visits `/reports` | Full org-wide numbers visible — no role gate |

---

## 10. Audit Logs

| # | Step | Action | Expected Result |
|---|---|---|---|
| AL1 | View audit logs as EMPLOYEE | Navigate to `/audit-logs` | ⚠ **Known gap**: no role restriction — page is visible to any authenticated user. Confirm whether this is intended. |
| AL2 | Award a deal, then check the log | Complete an award (per `test-cases.md`) | An entry with `action: AWARD` appears |
| AL3 | Lock a project, check the log | `PATCH /api/projects/:id/state` → LOCKED | Entry with `action: LOCK` |
| AL4 | Unlock a locked project, check the log | Same project, LOCKED → OPEN | Entry logged as `action: UNLOCK` |
| AL5 | Archive a project, check the log | OPEN → ARCHIVED | Entry with `action: ARCHIVE` |
| AL6 | Un-archive a project, check the log | ARCHIVED → OPEN | ⚠ **Known gap**: logged as `action: UNLOCK`, not `UNARCHIVE` — the code computes the action purely from "did it become OPEN," not from what it transitioned *from*. Confirm this mislabeling. |
| AL7 | Log in / log out, check the log | Perform A1/A8 | ⚠ **Known gap**: no `LOGIN` or `LOGOUT` entries are ever written, despite both existing in the `AuditAction` enum |
| AL8 | Upload/delete a file, check the log | Any file upload or delete | `FILE_UPLOAD` / `FILE_DELETE` entries appear |
| AL9 | Row detail | Click/inspect an individual audit log row | Only `user.name`, `action`, `entityType`, and a truncated `entityId` are shown — confirm the `before`/`after`/`meta`/`ip` diff fields are not surfaced anywhere in the current UI |
| AL10 | Pagination | Audit log has more than 200 entries | Only the most recent 200 are shown, no way to page further or filter by user/action/date |

---

## 11. Search

| # | Step | Action | Expected Result |
|---|---|---|---|
| SR1 | Search with ≥2 characters | `GET /api/search?q=ab` | Returns matching `projects` (by `title`, `projectNumber`, `clientName`, `clientPhone`) and `contacts` (by `name`, `phone`, `email`, `company`), case-insensitive substring match, max 8 each |
| SR2 | Search with 1 character | `GET /api/search?q=a` | Returns `{ projects: [], contacts: [] }` — **200**, not a 400 validation error |
| SR3 | Search with empty query | `q=` or omitted | Same as SR2 |
| SR4 | Search a formatted phone number | Stored phone is `9876543210`, search `98765-43210` or `+91 98765 43210` | ⚠ **Known gap**: no phone normalization in this route — formatted variants likely won't match. Verify. |
| SR5 | Search across other entities | Try matching a Proposal number, Deal number, or Site Visit number | Confirm these are **not** searchable — only Projects and Contacts are covered |
| SR6 | Result cap | Query that matches more than 8 projects or contacts | Only the 8 most recently updated of each are returned |

---

## 12. Client Portal (Cross-Reference)

Fully covered in `test-cases.md` (OTP phone-match flow, dev-bypass, autosave, read-only lock on
non-`OPEN` projects) and `lifecycle-flowchart.md`. No additional routes or behavior found beyond
what's already documented there.

---

## 13. Cross-Cutting Priority List

If time only allows a subset, these systemic findings are the highest-value to verify first since
each one affects many endpoints at once:

1. **Auth error codes**: confirm whether unauthenticated calls to protected API routes should
   return 401 (currently 500 in most cases — A10).
2. **Unauthenticated settings GETs**: categories/tags/statuses/scoring-rules/templates readable
   with no session at all (S1).
3. **Role matrix inconsistency**: build the full endpoint × role table — OWNER is bundled with
   SUPER_ADMIN almost everywhere except user-creation and several settings-delete routes.
4. **Duplicate-key handling**: category/subcategory/status/tag/scoring-rule names and user phone
   numbers throw uncaught 500s on conflict instead of clean 409s.
5. **Delete-with-references**: Status deletion likely 500s if in use; Tag deletion cascades
   silently; Category/Subcategory/Template have no delete path to test at all.
6. **Audit log accuracy**: LOGIN/LOGOUT never recorded; un-archive mislabeled as UNLOCK.
7. **Cron secret bypass** outside `NODE_ENV=production`.

---

*BeyondInfra CRM — Full Application Test Cases (companion to `test-cases.md`)*
