# Discussion Notes — Business Model & Future Direction

Status: **discussion only** — nothing in this document has been implemented. Captured for reference before turning any of it into a plan.

---

## 1. Correcting the business model understanding

BeyondInfra is built for a **property consultant/broker** — they don't own or sell their own properties. They broker deals between two independent parties. Every record represents **one side of one party's ask**, not a listing with a fixed direction.

- **Buy** = a buyer's requirement — what someone wants to purchase. Consultant collects budget/type/etc. to go find a matching seller property.
- **Sell** = an owner's property that they want to sell. Consultant collects property details to find a matching buyer.
- **Rent** currently = a property available to rent (owner's side).
- **Tenant** = a renter's requirement (currently a separate lightweight model, not a subcategory) — needs a richer question set (lease duration, move-in date, family size, etc.) than currently modeled.

Every category is really two-sided: a demand side and a supply side.

## 2. Land and Special Projects

- **Land**: subcategories are **Buy** and **Sale** (not "Sell" — naming inconsistency vs. other categories). No Rent/Tenant split — raw land isn't typically leased the way built property is.
- **Special Projects**: subcategories are **Joint Venture** and **Redevelopment**, not Buy/Sell/Rent. Both are **owner-side-only intake forms** — the owner isn't selling to a buyer, they're proposing a partnership/rebuild instead.
  - **Joint Venture**: owner contributes land, developer contributes construction/capital, share of built units or profits. Fields include Reasons for JV, Financial Demands, Flat/Facility Demands, Owner Exit Preference.
  - **Redevelopment**: an existing multi-owner apartment building/association wants to demolish and rebuild. Fields include Number of Units/Blocks, Redevelopment Consent %, Utilized FSI Notes — reflects multi-owner consent complexity that Sell/single-owner properties don't have.
  - Both templates share the same Client Profile / Location / Land Details / Documents / Photos / Potential Scoring groups; only the middle "deal details" group differs.

## 3. Proposed 4-subcategory split (Residential / Commercial / Industrial)

Instead of the current 3 subcategories (Buy / Sell / Rent), each of these three categories would have **4**:

- **Buy** (buyer's requirement)
- **Sell** (owner's property for sale)
- **Tenant** (renter's requirement — new subcategory, new richer template)
- **Rent** (owner's property for rent — unchanged meaning)

Land keeps Buy/Sale only (no Tenant/Rent split needed). Special Projects (JV/Redevelopment) is unaffected by this split.

## 4. Award / Closure workflow — already exists for JV/Redevelopment, missing for Buy/Sell/Rent/Tenant

Discovered that the **"award to one developer" workflow the user described for Special Projects is already built**, just not labeled "Award":

- **"Developers & Proposals" tab** (shown for Special Projects, Land Sale): a `DeveloperProposal`-per-developer record with a full status lifecycle —
  `NOT_CONTACTED → PROJECT_SENT → RESPONSE_PENDING → INTERESTED → MEETING_SCHEDULED → PROPOSAL_REQUESTED → PROPOSAL_RECEIVED → SHORTLISTED → FINAL_NEGOTIATION → SELECTED`
  (with `NOT_INTERESTED` / `REJECTED` / `NOT_SELECTED` as dead-ends). Includes a side-by-side comparison table of each developer's commercial terms (additional area, corpus fund, rent, deposit, construction timeline, bank guarantee, parking, amenities) and a "Potential Partners" browser pulling from `Developer` profiles linked to `Contact`.
- **"Closure" tab**: the de-facto "award" step — pick `selectedDeveloper`, lock in final terms, record agreement/registration dates, BIPL commission, payment status, `commerciallyClosed`/`projectCompleted` flags. Not yet confirmed whether Closure auto-updates the winning `DeveloperProposal.status` to `SELECTED` or auto-rejects the others.

**The actual gap**: no equivalent Award/Closure step exists yet for the **Buy↔Sell** and **Rent↔Tenant** pairing. Today "Find Buyers/Tenants" only produces a scored, optionally `confirmedAt`-flagged `Match` — there's no "this is final, deal done, project closed" step. User confirmed: **award needs to exist for Buy/Sell and Rent/Tenant too**, both on the Project page and as an inline action on the Matching page.

Current `RecordState` enum is `OPEN / LOCKED / ARCHIVED` — no state represents "closed/won." A new state (e.g. `AWARDED`) would likely be needed, distinct from `ARCHIVED` (which reads as "hidden/inactive" rather than "successfully closed").

## 5. Fold BuyerRequirement / TenantRequirement into Project (bigger architectural change)

User wants to **drop the existing separate `BuyerRequirement`/`TenantRequirement` models** and move buyer/tenant requirements into the same `Project` + template system as Buy/Sell/Rent (per the 4-subcategory plan in §3). The existing `/requirements/buyer` and `/requirements/tenant` menu items would stay, but become **filtered views into the Projects table** rather than querying separate models.

**Why this is non-trivial**: the current matching engine (`app/api/matching/run/route.ts`) is asymmetric by design —
- `BuyerRequirement`/`TenantRequirement` are flat, typed models (`req.budgetMin`, `req.bhk`, etc.) — reliable, unambiguous.
- `Project` responses are read via a label-guessing map (`map["asking price"] ?? map["sale price"] ?? ...`) built from free-text `Response.value` — fragile, depends on template question labels matching known strings.

If Buy/Tenant become templated Projects too, the matcher would need to do label-guessing on **both** sides, doubling the fragility (this is the same class of silent-failure risk that Item 7 in the original 8-item plan had to fix for the print view's hardcoded group-name matching).

**Decided approach** (user confirmed): add a stable **`matchKey`** field to `Question` (e.g. `BUDGET_MIN`, `BHK`, `AREA_MIN`), assigned per-template via an admin UI (similar pattern to the existing `showInPrint`/`showInPptExport` toggles). The matcher gets rewritten to read `matchKey` instead of guessing on label text, symmetrically on both sides.

**Full scope this implies**:
- Schema: `matchKey` on `Question`; `Match` model changes from `buyerRequirementId`/`tenantRequirementId` pointing at flat models, to a Project-to-Project relation (e.g. `demandProjectId` + `supplyProjectId`).
- New **Buy** and **Tenant** templates (Question Groups + Questions, with `matchKey`s set) for each of the 4 property categories that don't yet have them — real content work, not just schema.
- Matcher rewrite (`scoreReq` in `matching/run/route.ts`) to be symmetric and `matchKey`-based instead of asymmetric and label-based.
- Data migration: existing `BuyerRequirement`/`TenantRequirement` rows need to become `Project` rows with their flat fields backfilled into template `Response`s (one-off script, same pattern as the earlier Item 6 duplicate-field cleanup).
- `RequirementForm.tsx`, `/requirements/buyer/new`, `/requirements/tenant/new`, `/requirements/[type]/[id]` either retired in favor of the normal Project create/detail flow, or become thin wrappers around it.
- Open question (not yet decided): should the admin UI warn when a template has no question tagged with a given `matchKey`, to avoid silent matching gaps when someone edits a template later?

This is scoped as its own multi-step plan, comparable in size to the earlier 8-item batch — not a small edit.

## 6. Files vs. Gallery, and their connection to Custom Fields

Both live in the **same** `ProjectFile` table, differentiated by the `kind` enum:

- **Files** tab = `kind: "DOCUMENT"` — general documents, optional free-text `category` (e.g. "Legal", "Financial").
- **Gallery** tab = `kind: "GALLERY_IMAGE"` — property photos for the visual gallery / PPT export / print.
- **`CUSTOM_FIELD_IMAGE`** — an image attached to a `ProjectCustomField` via `fileId` (Item 2's Additional Fields feature). Same storage/upload pipeline as Files/Gallery, just a different `kind`, so it doesn't appear in those tabs.
- **`PRINT_IMAGE`** — the "primary" property/buyer image used for print/PPT (Item 1's gallery redesign "Set as primary" action).
- `ProjectFile` also has an optional `questionId`, meaning a file can additionally be tied to a specific template question — a fourth possible linkage.

**Answer**: yes, Custom Field images are directly connected — same table, same upload/storage code, just tagged differently.

## 7. Notes, Tasks, Meetings — and calendar / Apple Calendar sync

- **Notes and Meetings share one model**: `ProjectNote`, with a `type: "note" | "meeting"` field. A "meeting" is just a note with `meetingAt: DateTime?` set — no structured meeting data (no attendees/location/agenda fields), just timestamped free text.
- **Tasks has no dedicated model** — likely backed by `FollowUp` (`dueAt`, `assigneeId`, `description`, `isDone`/`doneAt`), inferred from the schema; **not yet confirmed** by reading the actual Tasks tab JSX.
- **Calendar view**: feasible without new core models — would aggregate `ProjectNote(type="meeting")` (via `meetingAt`) and `FollowUp` (via `dueAt`) into one time-ordered view, either per-project or as a global "My Calendar" page.

### Apple Calendar sync — researched, decided

"Sync" means real two-way (not just export) — changes made in Apple Calendar should flow back into the app. Apple Calendar's only two-way protocol is **CalDAV**.

Researched free options:
- No free *hosted* CalDAV/sync provider exists (Nylas, Cronofy, Merge — all paid, since they run the protocol layer as an ongoing service).
- Free, open-source, **self-hosted** CalDAV servers do exist — **Radicale** (Python, GPLv3, lightweight) and **Baïkal** (PHP, sabre/dav-based, has a web admin UI, actively maintained as of Aug 2026). These would require this app to run and maintain its own standalone server for the first time — real new operational surface beyond the current Next.js + Supabase stack.

**Decided approach** (user confirmed): **Google Calendar as the bridge.** Google Calendar's API is free with no cost gate for this scale. The app syncs to Google Calendar (OAuth, REST API — stays inside the existing Next.js backend, no new server to host). Two-way Apple Calendar sync then happens natively on-device — iOS/macOS already sync a connected Google account to Apple Calendar bidirectionally, for free, with no extra software.

Implication: each user needs to connect a Google account (OAuth consent), and the app needs to store/refresh per-user Google OAuth tokens.

---

## Open items / not yet resolved

- Confirm what actually backs the "Tasks" tab (`FollowUp` assumed, not verified).
- Confirm whether "Closure" already auto-updates `DeveloperProposal.status` to `SELECTED` / rejects others, or if that wiring still needs to be added.
- Decide the exact question set for new **Buy** and **Tenant** templates, per category.
- Decide whether the admin `matchKey`-assignment UI should warn on missing/unmapped match keys.
- Decide exact `RecordState` addition for "awarded/closed" (e.g. new `AWARDED` value vs. reusing `ARCHIVED`).
- Land's "Sale" vs. other categories' "Sell" naming inconsistency — flagged, not addressed.
