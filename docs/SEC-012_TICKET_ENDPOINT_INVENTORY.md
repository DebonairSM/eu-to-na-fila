# SEC-012 — Public Ticket Self-Service Endpoint Inventory & Token Model Proposal

**Status:** Inventory only. No migrations or token code implemented in this task.
**Scope:** Identify every public ticket self-service endpoint, document current authorization, and propose an explicit capability-token model to close the numeric-ID IDOR risk.

---

## 1. Threat summary

Ticket IDs are **sequential integers** (`id: serial('id').primaryKey()` — `apps/api/src/db/schema.ts:170`). Several state-changing customer endpoints authorize **solely on that guessable numeric ID** with no secret and no ownership check. An attacker can enumerate `1, 2, 3…` and cancel, reschedule, read, or trigger email on tickets belonging to anyone.

---

## 2. Endpoint inventory

Routes are registered under the `/api` prefix (`apps/api/src/server.ts:336-357`). All ticket/status/queue routes live in `apps/api/src/routes/{tickets,status,queue}.ts`.

### 2a. VULNERABLE — public ticket endpoints (SEC-012 targets)

Endpoints 1–3 are **state-changing** and numeric-ID-only → fixed by the capability token (§3). Endpoints 4/4b/4c are **read** leaks: a token fits the single-ticket read (4), but the queue reads (4b/4c) are a **response-shaping** problem — the public lobby legitimately shows `customerName` + position, but `customerPhone`/`deviceId`/`clientCity`/`clientState` must be stripped from anonymous responses. That is a separate, arguably higher-priority fix and does not depend on the token.

| # | Method + Route | File:line | Params / Body | Current authz | Abuse scenario |
|---|----------------|-----------|---------------|---------------|----------------|
| 1 | `POST /api/tickets/:id/cancel` | `tickets.ts:563` | param `id` (positive int); empty body | **None.** Loads ticket by ID, checks only status/settings (`canCancel`). No ownership, no secret. | Enumerate IDs and cancel any waiting/pending/in-progress ticket shop-wide — denial of service against real customers. |
| 2 | `POST /api/tickets/:id/reschedule` | `tickets.ts:528` | param `id`; body `scheduledTime` (ISO datetime) | **None.** Checks only `type==='appointment'` and `status==='pending'`. | Enumerate IDs and move any pending appointment to an arbitrary time; griefing / booking sabotage. |
| 3 | `POST /api/shops/:slug/appointments/:id/remind` | `tickets.ts:237` | params `slug`, `id`; body `email` | **None.** Validates ticket belongs to shop + is appointment. De-dupe is an in-memory `Set` (`reminderSentTicketIds`), lost on restart. | Enumerate IDs to send appointment-detail emails (shop, service, barber, time) to an **attacker-supplied** address → PII exfiltration + email-bombing a victim address. |
| 4 | `GET /api/tickets/:id` | `tickets.ts:419` | param `id` | **None.** Returns shaped ticket. | Enumerate IDs to read `customerName`, `customerPhone`, service, barber, schedule, `clientCity/State` — targeted PII read. **Note:** a token on this endpoint does *not* close the PII hole on its own — endpoints 4b/4c below expose the same fields in bulk without any ID. |
| 4b | `GET /api/shops/:slug/queue` | `queue.ts:26` | param `slug` | **None.** | **Widest PII vector — no enumeration needed.** `getByShop` (`TicketService.ts:40-48`) selects **all** ticket columns (no column restriction on the tickets table); `shapeTicketResponse` then emits `customerPhone`, `deviceId`, `clientCity`, `clientState` for **every** ticket in the shop. One anonymous request dumps the entire customer roster with phone numbers. |
| 4c | `GET /api/shops/:slug/queue/next` | `queue.ts:49` | param `slug` | **None.** | Same leak as 4b for the next ticket (full `shapeTicketResponse` including `customerPhone`, `deviceId`). |

### 2b. Public read, device-scoped (secondary — lower risk, review)

| # | Method + Route | File:line | Params / Body | Current authz | Note |
|---|----------------|-----------|---------------|---------------|------|
| 5 | `GET /api/shops/:slug/tickets/active` | `tickets.ts:392` | param `slug`; query `deviceId` | **None**, but keyed on client-supplied `deviceId` (opaque string), not numeric ID. | `deviceId` is a client-generated identifier, not a server secret. Guessing/reusing it discloses another device's active ticket. Lower priority but same class of issue; note for follow-up. |

### 2c. Public create (no ticket ID yet — not IDOR, but part of the surface)

| # | Method + Route | File:line | Authz | Note |
|---|----------------|-----------|-------|------|
| 6 | `POST /api/shops/:slug/tickets` | `tickets.ts:42` | `optionalAuth()` | Creates ticket. **This is where a capability token should be minted and returned** so the client can carry it to endpoints 1–4. |
| 7 | `POST /api/shops/:slug/appointments/book` | `tickets.ts:176` | `optionalAuth()` | Creates appointment. Same — mint token on creation. |

### 2d. Already protected (no change needed; listed for completeness)

| Method + Route | File:line | Authz |
|----------------|-----------|-------|
| `POST /api/shops/:slug/tickets/:id/check-in` | `tickets.ts:312` | `requireAuth()` + `requireRole(['customer'])` + **ownership check** (`ticketClientId === userClientId`, line 327) + per-user rate limit (1 / 20s). **This is the correct model** — check-in already fails closed for logged-in customers. |
| `POST /api/shops/:slug/tickets/appointment` | `tickets.ts:151` | `requireAuth()` + role owner/staff/barber |
| `PATCH /api/tickets/:id` | `tickets.ts:454` | `requireAuth()` + role + shop scoping |
| `PATCH /api/tickets/:id/status` | `status.ts:30` | `requireAuth()` + role owner/staff + shop scoping |
| `DELETE /api/tickets/:id` | `tickets.ts:605` | `requireAuth()` + role + shop scoping |
| `DELETE /api/shops/:slug/tickets` | `tickets.ts:634` | `requireAuth()` + role owner |

**Note on rate limiting:** the global limiter (`server.ts:157`) is `max: 5000/min` and **skips any request with a `Bearer` token** and static-looking paths. Endpoints 1–4 are anonymous so they hit the global bucket, but 5000/min is high enough that ID enumeration is entirely feasible. Rate limiting is not a substitute for the token.

---

## 3. Token model proposal (capability token per ticket)

The fix is an **unguessable, server-generated capability token** bound to a ticket. Endpoints 1–4 (and 5) require the token instead of trusting the bare numeric ID. Logged-in customers can continue to use the ownership check as an alternative path (as check-in already does).

### 3a. Requirements

| Property | Decision |
|----------|----------|
| **Generation** | `crypto.randomBytes(32)` → base64url (~43 chars). Cryptographically random, **non-incremental**, not derived from the ticket ID or any predictable input. |
| **Scope** | One token per **ticket**. The token authorizes actions on exactly that ticket. Actions available depend on ticket state (same `canCancel` / reschedule rules already enforced) — the token is the *authenticator*, existing state checks remain the *authorizer*. A per-(ticket,action) token is not required for v1; per-ticket is sufficient and simpler for the status-page UX (one link does cancel + reschedule + remind). |
| **Storage** | Store **hashed** at rest: `sha256(token)` in a new column/table. Raw token is returned to the client **once** at creation and never stored server-side in plaintext. (SHA-256 is adequate here because the token is high-entropy random, unlike a password — no bcrypt/argon needed.) |
| **Transport** | Returned in the create response body (endpoints 6/7) and embedded in the status-page URL / email links. Supplied by the client as a header (`X-Ticket-Token`) or body field on endpoints 1–4. Prefer header to keep it out of server access logs where feasible; the status-page link will carry it as a URL param, so treat presence-in-logs as accepted residual risk and keep expiry short-ish. |
| **Expiration** | Token valid while the ticket is in an actionable lifecycle. Concretely: expire on terminal state (`completed`/`cancelled`) and/or a TTL (e.g. 48h after `createdAt` for walk-ins, until `scheduledTime + grace` for appointments). Store an explicit `expiresAt` so the check is a single comparison. |
| **Rotation** | Not rotated during normal use (single short-lived capability). On reschedule the token **stays the same** (same ticket). No rotation endpoint in v1. If a leak is suspected, cancelling the ticket invalidates it. |
| **Lookup** | Endpoints change from "find by numeric ID" to "find by ID **and** verify token hash matches", failing closed (404/403) on mismatch. Constant-time compare on the hash. |

### 3b. Proposed data model (for the implementation card — do NOT implement here)

Option A (recommended, minimal): add columns to `tickets`:
- `access_token_hash text` (sha256 hex/base64 of the raw token)
- `access_token_expires_at timestamp` (nullable)

Option B (cleaner separation, more work): a `ticket_access_tokens` table (`id`, `ticket_id` FK, `token_hash`, `expires_at`, `created_at`, `revoked_at`) — supports multiple/rotatable tokens later. Recommend **Option A for v1**; note Option B as the upgrade path.

### 3c. Backward compatibility

Existing tickets (and in-flight status-page links) have no token. Migration strategy for the implementation card:
- Backfill a token for all currently-active tickets, **or**
- Allow a grace period where a missing-token request from a logged-in owning customer still succeeds (endpoints already have the `clientId` ownership pattern from check-in). Legacy anonymous links without tokens should be treated as expired once the feature ships.

Decision needed from council: hard cutover vs. grace window. Recommendation: **grace window** to avoid breaking emailed links already in the wild.

---

## 4. Definition-of-done check & follow-up cards

**Inventory complete:** ✅ 3 state-changing public endpoints (1–3), 3 public read leaks (4 single-ticket, 4b/4c bulk queue PII dumps), 1 secondary device-scoped (5), 2 creation entry points to mint tokens (6–7), plus the already-safe check-in reference implementation.

**Token model explicit:** ✅ generation, scope, hashed storage, expiry, rotation, transport, and lookup change all specified above.

### Follow-up cards to create

1. **SEC-012-impl-migration** — Add `access_token_hash` + `access_token_expires_at` to `tickets` (Option A). Drizzle migration only.
2. **SEC-012-impl-mint** — Generate + return capability token on ticket/appointment creation (endpoints 6, 7). Include token in status-page URL and email links (`EmailService.ts:98` builds `/status/:id` — extend to `/status/:id?t=<token>`).
3. **SEC-012-impl-enforce** — Require + verify token (constant-time, hashed, expiry) on cancel (1), reschedule (2), remind (3), get-by-id (4). Fail closed. Keep logged-in owning-customer path as alternative (mirror check-in ownership check).
4. **SEC-012-impl-remind-hardening** — Replace in-memory `reminderSentTicketIds` de-dupe with a persisted flag/timestamp; consider restricting `remind` email target to the ticket's on-file address rather than an arbitrary body-supplied email.
5. **SEC-012-test** — Test suite: (a) enumeration attack on 1–4 is rejected without valid token; (b) valid token succeeds; (c) expired/terminal-state token rejected; (d) token for ticket A cannot act on ticket B; (e) logged-in owner path still works; (f) legacy grace-window behavior.
6. **SEC-012-review-deviceId** — Evaluate endpoint 5 (`/tickets/active` by `deviceId`): decide whether to also gate behind the capability token or accept as lower risk.
7. **SEC-012-fix-public-shape** *(high priority, token-independent)* — Strip `customerPhone`, `deviceId`, `clientCity`, `clientState` from anonymous responses on `GET /shops/:slug/queue` (4b) and `/queue/next` (4c). Fix at the source: restrict columns in `TicketService.getByShop` (`TicketService.ts:40`) and/or add a public-safe variant of `shapeTicketResponse`. Note this is a **bulk PII leak requiring zero enumeration** and closes a hole the token model alone would leave open.
