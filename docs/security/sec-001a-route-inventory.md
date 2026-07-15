# SEC-001A — Shop-Scoped Route Surface & Authorization Inventory

**Status:** Inventory only (no code changes)
**Date:** 2026-07-15
**Scope:** `apps/api/src/routes/*` — every endpoint that reads or mutates shop / company / client / barber-scoped data.
**Council decision (2026-05-02):** SEC-001 starts as inventory, not implementation.

---

## 1. How authorization works today

Auth primitives live in `apps/api/src/middleware/auth.ts`:

| Helper | What it checks |
| --- | --- |
| `requireAuth()` | Valid JWT; attaches `request.user = { id, shopId?, companyId?, role, barberId?, clientId? }`. |
| `requireRole([...])` | `request.user.role` is in the allowed list. **Role only — does not compare any tenant id.** |
| `requireCompanyAdmin()` | Alias for `requireRole(['company_admin'])`. |
| `requireShopAccess(getShopId)` | Compares `request.user.shopId` to a shop id from the request. **Defined but wired into ZERO routes.** |
| `requireBarberShop(getShopId)` | Barber role + `request.user.shopId === shopId` + `barberId` present. Used by exactly one route (`GET /analytics/me`). |
| `optionalAuth()` | Attaches user if a token is present; never rejects. |

### The systemic gap

JWTs for `owner`, `staff`, `barber`, `kiosk`, and `customer` are **scoped to a single `shopId`** (see token minting in `auth.ts`). Company-admin JWTs are scoped to a single `companyId`.

- **Company-scoped routes** (`companies.ts`, `company-shops.ts`, `ads.ts`) consistently re-check `request.user.companyId === <id from path>` and scope every DB query by `companyId`. Tenant isolation here is generally sound.
- **Shop-scoped routes keyed by `:slug` or bare `:id`** almost never compare `request.user.shopId` to the shop resolved from the path. They rely on `requireRole(['owner'])` (or `owner/staff/barber`) alone. Because **any** owner token satisfies `requireRole(['owner'])`, an owner/staff/barber authenticated against shop A can drive the same request against shop B's slug (or a barber/service/ticket id belonging to shop B) and the handler executes against the other tenant.

The **`tickets.ts` and `status.ts` mutation handlers are the exception** — they explicitly check `request.user.shopId != null && existingTicket.shopId !== request.user.shopId` and return 403. Those are the pattern the rest of the surface should follow.

Legend for the **Ownership check** column below:
- ✅ **Scoped** — handler verifies the caller's tenant matches the resource.
- ⚠️ **Partial** — checks one role/branch but leaves another cross-tenant.
- ❌ **None** — role gate only; no tenant comparison. Cross-tenant abuse possible.
- 🌐 **Public** — intentionally unauthenticated.

---

## 2. Route inventory

### 2.1 `barbers.ts`

| Method + Path | Role required | Ownership check | Cross-tenant abuse with a foreign token |
| --- | --- | --- | --- |
| `GET /shops/:slug/barbers` | none (`optionalAuth`) | 🌐 Public | Public list; returns `revenueSharePercent` unless caller is a barber with `barbersCanSeeProfits === false`. Any anonymous caller reads any shop's barber roster (names, emails, phones, usernames, revenue share). |
| `PATCH /barbers/:id/presence` | owner, staff, barber | ⚠️ Partial | Barber branch checks `barberId === user.barberId`. **Owner/staff of shop A can toggle presence of any barber id in shop B** — barber is fetched by id only, no `shopId` comparison. |
| `PATCH /barbers/:id/status` | owner, staff, barber | ⚠️ Partial | Same as presence: owner/staff can flip active/on-break for a foreign shop's barber and trigger `recalculateShopQueue` on that shop. |
| `PATCH /barbers/:id` | owner | ❌ None | Barber fetched by id only. **Owner of shop A can rename, set username, reset password, and change revenue share of shop B's barber** (account takeover of a foreign barber login). |
| `POST /shops/:slug/barbers/:id/set-password` | owner | ❌ None | `getShopBySlug(slug)` + barber `and(id, shopId=shop.id)`, but shop is taken from the path, never compared to `user.shopId`. Any owner can set a password on any shop's barber via that shop's slug. |
| `POST /shops/:slug/barbers` | owner | ❌ None | Any owner can create a barber (with login credentials) in any shop by that shop's slug. |
| `DELETE /barbers/:id` | owner | ❌ None | Barber fetched by id only. Any owner can delete any shop's barber, unassigning that shop's tickets. |

### 2.2 `services.ts`

| Method + Path | Role required | Ownership check | Cross-tenant abuse with a foreign token |
| --- | --- | --- | --- |
| `GET /shops/:slug/services` | none | 🌐 Public | Public menu; expected. |
| `POST /shops/:slug/services` | owner, company_admin | ⚠️ Partial | Company-admin branch checks `shop.companyId === user.companyId`. **Owner branch has no `shopId` check** — any owner can add services to any shop by slug. |
| `POST /shops/:slug/services/reorder` | owner, company_admin | ⚠️ Partial | Same: company_admin scoped, owner unscoped. Owner can reorder a foreign shop's services. |
| `PATCH /services/:id` | owner, company_admin | ⚠️ Partial | Service fetched by id; company_admin verified via `shop.companyId`. **Owner unscoped** — any owner can edit price/duration/name of any shop's service. |
| `DELETE /services/:id` | owner, company_admin | ⚠️ Partial | Same shape. Owner can delete any shop's service (blocked only if tickets reference it). |

### 2.3 `queue.ts`

| Method + Path | Role required | Ownership check | Cross-tenant abuse with a foreign token |
| --- | --- | --- | --- |
| `GET /shops/:slug/queue` | none | 🌐 Public | Returns full `shop` row + all tickets (customer names/phones). Public today; note PII exposure. |
| `GET /shops/:slug/queue/next` | none | 🌐 Public | Next ticket, incl. customer name. Public. |
| `GET /shops/:slug/metrics` | none | 🌐 Public | Aggregate metrics. Public. |
| `GET /shops/:slug/wait-debug` | none (non-prod only) | 🌐 Public | Registered only when `NODE_ENV !== 'production'`. Diagnostic. |
| `GET /shops/:slug/statistics` | none | 🌐 Public | Ticket statistics. Public. |
| `GET /shops/:slug/wait-times` | none | 🌐 Public | Standard + per-barber wait times. Public. |
| `POST /shops/:slug/recalculate` | owner | ❌ None | No `shopId` check. Any owner can force queue recalculation on any shop by slug. |

### 2.4 `tickets.ts`

| Method + Path | Role required | Ownership check | Cross-tenant abuse with a foreign token |
| --- | --- | --- | --- |
| `POST /shops/:slug/tickets` | none (`optionalAuth`) | 🌐 Public | Join queue. Public by design. Links `clientId` if caller is a customer. |
| `POST /shops/:slug/tickets/appointment` | owner, staff, barber | ❌ None | Shop from slug; no `user.shopId` check. Any owner/staff/barber can create a staff-side appointment in a foreign shop. |
| `POST /shops/:slug/appointments/book` | none (`optionalAuth`) | 🌐 Public | Public booking. Expected. |
| `POST /shops/:slug/appointments/:id/remind` | none | 🌐 Public | Verifies `ticket.shopId === shop.id`; one email per ticket. Public but arbitrary-email trigger — abuse-limited by dedupe set. |
| `POST /shops/:slug/tickets/:id/check-in` | customer | ✅ Scoped | Verifies `ticket.shopId === shop.id` **and** `ticket.clientId === user.clientId`. Rate-limited. Good model. |
| `GET /shops/:slug/appointments/slots` | none | 🌐 Public | Public slot availability. |
| `GET /shops/:slug/tickets/active` | none | 🌐 Public | Active ticket by `deviceId`. Public (device-scoped). |
| `GET /tickets/:id` | none | ❌ None / IDOR | **Any ticket by numeric id, no auth, no shop scoping.** Returns customer name, phone, status, barber. Enumerable IDOR leaking PII across all shops. |
| `PATCH /tickets/:id` | owner, staff, barber | ✅ Scoped | Checks `existingTicket.shopId !== user.shopId → 403`; barber can only self-assign. Reference pattern. |
| `POST /tickets/:id/reschedule` | none | ❌ None / IDOR | Public reschedule of any pending appointment by id (customer status-page flow). No ownership token; any id reachable. |
| `POST /tickets/:id/cancel` | none | ❌ None / IDOR | Public cancel of any cancellable ticket by id. No ownership proof; any id reachable. |
| `DELETE /tickets/:id` | owner, staff, barber | ✅ Scoped | Checks `existingTicket.shopId !== user.shopId → 403`. Good. |
| `DELETE /shops/:slug/tickets` | owner | ❌ None | Bulk-delete every ticket for a shop by slug; no `user.shopId` check. Any owner can wipe a foreign shop's queue. |

### 2.5 `status.ts`

| Method + Path | Role required | Ownership check | Cross-tenant abuse with a foreign token |
| --- | --- | --- | --- |
| `PATCH /tickets/:id/status` | owner, staff | ✅ Scoped | Checks `existingTicket.shopId !== user.shopId → 403`. Good. |

### 2.6 `clients.ts`

| Method + Path | Role required | Ownership check | Cross-tenant abuse with a foreign token |
| --- | --- | --- | --- |
| `GET /shops/:slug/clients/remember` | none | 🌐 Public | Phone lookup returns `{ hasClient, name }`. Public; enables name enumeration by phone across shops. |
| `GET /shops/:slug/clients/list` | owner | ❌ None | No `user.shopId` check. Any owner can page the full client list (names, phones, emails, demographics) of a foreign shop. |
| `GET /shops/:slug/clients` (search) | owner, staff, barber | ⚠️ Partial | Barber branch checks `user.shopId === shop.id`; **owner/staff branch does not**. Owner/staff of shop A can search shop B's clients. |
| `GET /shops/:slug/clients/:id` | owner, staff, barber | ⚠️ Partial | `getByIdWithShopCheck(id, shop.id)` scopes to the slug's shop, but barber-only checks `user.shopId === shop.id`; **owner/staff can read any shop's client detail + clip notes + history via that shop's slug.** |
| `GET /shops/:slug/clients/:id/reference-image` | owner, staff (barber blocked) | ⚠️ Partial | Barber explicitly forbidden; owner/staff not compared to `user.shopId`. Cross-tenant image read via slug. |
| `PATCH /shops/:slug/clients/:id` | owner, staff (barber blocked) | ⚠️ Partial | Barber blocked; owner/staff not `shopId`-scoped. Owner/staff can edit a foreign shop's client profile. |
| `POST /shops/:slug/clients/:id/clip-notes` | owner, staff, barber | ⚠️ Partial | Barber branch checks `user.shopId === shop.id`; owner/staff unscoped. Owner/staff can attach clip notes to a foreign shop's client. |

### 2.7 `shops.ts`

| Method + Path | Role required | Ownership check | Cross-tenant abuse with a foreign token |
| --- | --- | --- | --- |
| `GET /shops/:slug/config` | none | 🌐 Public | Public theme/home config. |
| `GET /shops` | none | 🌐 Public | All shops, public fields only. |
| `PATCH /shops/:slug/temporary-status` | owner | ❌ None | No `user.shopId` check. Any owner can force-open/close a foreign shop for up to 24h. |
| `DELETE /shops/:slug/temporary-status` | owner | ❌ None | Any owner can clear a foreign shop's status override. |

### 2.8 `auth.ts` (shop-scoped auth + customer self-service)

| Method + Path | Role required | Ownership check | Notes |
| --- | --- | --- | --- |
| `GET /auth/debug/google-redirect-uri` | none (non-prod only) | 🌐 Public | Diagnostic; non-production only. |
| `POST /shops/:slug/auth` | none (rate-limited) | 🌐 Public | Owner/staff PIN login. Credential check is the boundary. |
| `POST /shops/:slug/auth/staff` | none (rate-limited) | 🌐 Public | Unified staff/barber/kiosk login. |
| `POST /shops/:slug/auth/barber` | none (rate-limited) | 🌐 Public | Barber login. |
| `POST /shops/:slug/auth/kiosk` | none (rate-limited) | 🌐 Public | Kiosk login. |
| `POST /shops/:slug/auth/customer/register` | none (rate-limited) | 🌐 Public | Customer register; client scoped to `shop.id`. |
| `POST /shops/:slug/auth/customer/login` | none (rate-limited) | 🌐 Public | Customer login. |
| `GET /shops/:slug/auth/customer/me` | customer | ✅ Scoped | Reads client by `and(id=user.clientId, shopId=shop.id)`. Token's `clientId` is the boundary. |
| `PATCH /shops/:slug/auth/customer/me` | customer | ✅ Scoped | Updates own client via `clientId + shop.id`. |
| `POST /shops/:slug/auth/customer/me/reference/upload` | customer | ✅ Scoped | Own client; `getByIdWithShopCheck(clientId, shop.id)`. |
| `GET /shops/:slug/auth/customer/me/reference/image` | customer | ✅ Scoped | Own client image. |
| `GET /shops/:slug/auth/customer/me/appointments` | customer | ✅ Scoped | Tickets filtered by `clientId + shop.id`. |
| `GET /shops/:slug/auth/customer/google` | none | 🌐 Public | OAuth redirect start. |
| `GET /auth/customer/google/callback` | none | 🌐 Public | OAuth callback; slug from signed state. |

> **Note on customer tokens:** the `me/*` routes trust `user.clientId` and re-scope to the slug's shop. A customer token minted for shop A carries `clientId` for shop A; against shop B's slug the `and(clientId, shopId=B)` lookup yields no row → 404. Isolation holds here.

### 2.9 `analytics.ts`

| Method + Path | Role required | Ownership check | Cross-tenant abuse with a foreign token |
| --- | --- | --- | --- |
| `GET /shops/:slug/analytics` | owner | ❌ None | No `user.shopId` check. Any owner can read a foreign shop's full analytics incl. **revenue**. |
| `GET /shops/:slug/analytics/barber-productivity-by-week` | owner | ❌ None | Any owner can read a foreign shop's per-barber productivity. |
| `GET /shops/:slug/analytics/barbers/:barberId/history` | owner | ❌ None | Barber scoped to slug's shop, but slug's shop not scoped to `user.shopId`. Any owner reads a foreign barber's ticket history. |
| `GET /shops/:slug/analytics/me` | barber | ✅ Scoped | Uses `requireBarberShop(...)` → `user.shopId === shop.id` and `barberId` present. **The one correctly-scoped shop route; use as template.** |

### 2.10 `companies.ts` (company-scoped)

| Method + Path | Role required | Ownership check | Cross-tenant abuse with a foreign token |
| --- | --- | --- | --- |
| `GET /companies/:id` | company_admin | ✅ Scoped | `user.companyId !== id → 403`. |
| `GET /companies/:id/ad-pricing` | company_admin | ✅ Scoped | `companyId` compared. |
| `PUT /companies/:id/ad-pricing` | company_admin | ✅ Scoped | `companyId` compared. |
| `PATCH /companies/:id` | company_admin | ✅ Scoped | `companyId` compared. |
| `GET /companies/:id/dashboard` | company_admin | ✅ Scoped | `companyId` compared; queries scoped by `companyId`. |
| `GET /companies/:id/places-lookup` | company_admin | ✅ Scoped | `companyId` compared. |
| `GET /companies/:id/ad-orders` | company_admin | ✅ Scoped | `companyId` compared; query scoped. |
| `PATCH /companies/:id/ad-orders/:orderId` | company_admin | ✅ Scoped | `companyId` compared; order re-scoped by `companyId`. |

### 2.11 `company-shops.ts` (company-scoped shop CRUD)

| Method + Path | Role required | Ownership check | Cross-tenant abuse with a foreign token |
| --- | --- | --- | --- |
| `GET /companies/:id/shops` | company_admin | ✅ Scoped | `companyId` compared; query scoped. |
| `POST /companies/:id/shops` | company_admin | ✅ Scoped | `companyId` compared; shop inserted under `companyId`. |
| `PATCH /companies/:id/shops/:shopId` | company_admin | ✅ Scoped | Shop re-fetched by `and(id=shopId, companyId=id)`; `companyId` compared. |
| `POST /companies/:id/shops/:shopId/home-image` | company_admin | ✅ Scoped | `companyId` compared; shop re-scoped. |
| `GET /companies/:id/shops/:shopId/home-image` | none | 🌐 Public | Serves image file by path; no auth. Path-scoped by `companyId/shopId`. |
| `POST /companies/:id/uploads/home-about` | company_admin | ✅ Scoped | `companyId` compared. |
| `GET /companies/:id/drafts/home-about/:filename` | none | 🌐 Public | Serves draft image; filename regex-validated; no auth. |
| `PATCH /companies/:id/shops/:shopId/barbers/:barberId` | company_admin | ✅ Scoped | `companyId` compared; shop + barber re-scoped by shop/company. |
| `DELETE /companies/:id/shops/:shopId` | company_admin | ✅ Scoped | `companyId` compared; shop re-scoped; cascade delete. |
| `POST /companies/:id/shops/full` | company_admin | ✅ Scoped | `companyId` compared. |

### 2.12 `ads.ts`

| Method + Path | Role required | Ownership check | Cross-tenant abuse with a foreign token |
| --- | --- | --- | --- |
| `POST /ads/uploads` | company_admin | ✅ Scoped | Uses `user.companyId`; validates `shopId` belongs to company. |
| `GET /ads/:id/media` | none | 🌐 Public | Ad media for kiosk. Public by design. |
| `GET /ads/public/manifest` | none | 🌐 Public | Public manifest by `shopSlug`. |
| `GET /ads` | company_admin | ✅ Scoped | Scoped to `user.companyId`. |
| `PATCH /ads/:id` | company_admin | ✅ Scoped | Ad re-fetched by `and(id, companyId=user.companyId)`. |
| `DELETE /ads/:id` | company_admin | ✅ Scoped | Ad re-fetched by `and(id, companyId=user.companyId)`. |

### 2.13 `company-auth.ts`, `propagandas-public.ts`, `stripe-webhook.ts`, `projects.ts`

| Method + Path | Role required | Ownership check | Notes |
| --- | --- | --- | --- |
| `POST /company/auth` | none (rate-limited) | 🌐 Public | Company-admin login; credentials are the boundary. |
| `GET /public/propagandas/quote` | none | 🌐 Public | Root-company ad pricing. |
| `GET /public/propagandas/shops` | none | 🌐 Public | Root-company shop list (id + name). |
| `POST /public/propagandas/orders` | none | 🌐 Public | Create ad order under `ROOT_COMPANY_ID`. |
| `POST /public/propagandas/checkout` | none | 🌐 Public | Create order + Stripe session. |
| `GET /public/propagandas/orders/complete` | none | 🌐 Public | Verifies Stripe session paid before returning `orderId`. |
| `POST /public/propagandas/orders/:id/image` | none | ⚠️ Weak | Order re-scoped to `ROOT_COMPANY_ID` + eligibility (pending_approval, or paid w/o image). No per-advertiser token — any caller can attach an image to any eligible root-company order by id. Enumerable. |
| `POST /stripe/webhook` | none (Stripe sig) | ✅ Scoped | Signature-verified via `STRIPE_WEBHOOK_SECRET`. |
| `GET /projects` | none | 🌐 Public | Public project list. |

---

## 3. Summary of cross-tenant exposure (for SEC-001B prioritization)

**Class A — authenticated cross-shop (owner/staff/barber token, wrong shop).** Root cause: slug/id routes never compare `request.user.shopId` to the resolved shop. These are the primary SEC-001B targets:

- `barbers.ts`: `PATCH /barbers/:id/presence`, `PATCH /barbers/:id/status`, `PATCH /barbers/:id`, `POST /shops/:slug/barbers/:id/set-password`, `POST /shops/:slug/barbers`, `DELETE /barbers/:id`
- `services.ts`: `POST /shops/:slug/services`, `POST /shops/:slug/services/reorder`, `PATCH /services/:id`, `DELETE /services/:id` (owner branch)
- `queue.ts`: `POST /shops/:slug/recalculate`
- `tickets.ts`: `POST /shops/:slug/tickets/appointment`, `DELETE /shops/:slug/tickets`
- `shops.ts`: `PATCH /shops/:slug/temporary-status`, `DELETE /shops/:slug/temporary-status`
- `clients.ts`: `GET /shops/:slug/clients/list`, `GET /shops/:slug/clients`, `GET /shops/:slug/clients/:id`, `GET /shops/:slug/clients/:id/reference-image`, `PATCH /shops/:slug/clients/:id`, `POST /shops/:slug/clients/:id/clip-notes` (owner/staff branch)
- `analytics.ts`: `GET /shops/:slug/analytics`, `GET /shops/:slug/analytics/barber-productivity-by-week`, `GET /shops/:slug/analytics/barbers/:barberId/history`

**Class B — unauthenticated IDOR (numeric id, no token).** Secondary; may be partly intentional (customer status-page flows) but leak/allow mutation across shops:

- `GET /tickets/:id` — reads any ticket's PII by id.
- `POST /tickets/:id/reschedule` — reschedules any pending appointment by id.
- `POST /tickets/:id/cancel` — cancels any cancellable ticket by id.
- `POST /public/propagandas/orders/:id/image` — attaches image to any eligible root-company order by id.

**Class C — public reads that expose PII (already public; note for data-exposure review, not necessarily 403 targets):**

- `GET /shops/:slug/queue`, `GET /shops/:slug/queue/next` — customer names/phones.
- `GET /shops/:slug/clients/remember` — name enumeration by phone.
- `GET /shops/:slug/barbers` — barber roster incl. revenue share for anonymous callers.

**Correctly-scoped reference implementations** to model fixes on: `PATCH/DELETE /tickets/:id`, `PATCH /tickets/:id/status`, `POST .../check-in`, `GET /analytics/me` (uses `requireBarberShop`), and every `companies.ts` / `company-shops.ts` / `ads.ts` route (compare `companyId`).

---

## 4. Negative-test list for SEC-001B (explicit)

Each row: **route**, **actor token**, **scenario**, **expected result**. "Shop A token" = a valid JWT for the shop the actor belongs to; the request targets **shop B** (a different shop, ideally under a different company). "Own shop" rows assert the happy path still passes (guard must not over-block).

### 4.1 Class A — authenticated cross-shop (must become 403)

| # | Route | Actor token | Scenario | Expected |
| --- | --- | --- | --- | --- |
| A1 | `PATCH /barbers/:id/presence` | owner @ Shop A | `:id` = a barber in Shop B | 403 |
| A2 | `PATCH /barbers/:id/status` | owner @ Shop A | `:id` = a barber in Shop B | 403 |
| A3 | `PATCH /barbers/:id/presence` | barber @ Shop A | `:id` = a barber in Shop B | 403 |
| A4 | `PATCH /barbers/:id` | owner @ Shop A | `:id` = a barber in Shop B (attempt password/username change) | 403 |
| A5 | `POST /shops/:slug/barbers/:id/set-password` | owner @ Shop A | `:slug` = Shop B, `:id` = Shop B barber | 403 |
| A6 | `POST /shops/:slug/barbers` | owner @ Shop A | `:slug` = Shop B | 403 |
| A7 | `DELETE /barbers/:id` | owner @ Shop A | `:id` = a barber in Shop B | 403 |
| A8 | `POST /shops/:slug/services` | owner @ Shop A | `:slug` = Shop B | 403 |
| A9 | `POST /shops/:slug/services/reorder` | owner @ Shop A | `:slug` = Shop B | 403 |
| A10 | `PATCH /services/:id` | owner @ Shop A | `:id` = a service in Shop B | 403 |
| A11 | `DELETE /services/:id` | owner @ Shop A | `:id` = a service in Shop B | 403 |
| A12 | `POST /shops/:slug/recalculate` | owner @ Shop A | `:slug` = Shop B | 403 |
| A13 | `POST /shops/:slug/tickets/appointment` | owner @ Shop A | `:slug` = Shop B | 403 |
| A14 | `POST /shops/:slug/tickets/appointment` | barber @ Shop A | `:slug` = Shop B | 403 |
| A15 | `DELETE /shops/:slug/tickets` | owner @ Shop A | `:slug` = Shop B (bulk wipe) | 403 |
| A16 | `PATCH /shops/:slug/temporary-status` | owner @ Shop A | `:slug` = Shop B | 403 |
| A17 | `DELETE /shops/:slug/temporary-status` | owner @ Shop A | `:slug` = Shop B | 403 |
| A18 | `GET /shops/:slug/clients/list` | owner @ Shop A | `:slug` = Shop B | 403 |
| A19 | `GET /shops/:slug/clients` (search) | owner @ Shop A | `:slug` = Shop B | 403 |
| A20 | `GET /shops/:slug/clients` (search) | staff @ Shop A | `:slug` = Shop B | 403 |
| A21 | `GET /shops/:slug/clients/:id` | owner @ Shop A | `:slug` = Shop B, `:id` = Shop B client | 403 |
| A22 | `GET /shops/:slug/clients/:id/reference-image` | staff @ Shop A | `:slug` = Shop B | 403 |
| A23 | `PATCH /shops/:slug/clients/:id` | owner @ Shop A | `:slug` = Shop B | 403 |
| A24 | `POST /shops/:slug/clients/:id/clip-notes` | staff @ Shop A | `:slug` = Shop B | 403 |
| A25 | `GET /shops/:slug/analytics` | owner @ Shop A | `:slug` = Shop B (revenue leak) | 403 |
| A26 | `GET /shops/:slug/analytics/barber-productivity-by-week` | owner @ Shop A | `:slug` = Shop B | 403 |
| A27 | `GET /shops/:slug/analytics/barbers/:barberId/history` | owner @ Shop A | `:slug` = Shop B, `:barberId` = Shop B barber | 403 |

### 4.2 Class B — unauthenticated IDOR

| # | Route | Actor token | Scenario | Expected (see note) |
| --- | --- | --- | --- | --- |
| B1 | `GET /tickets/:id` | none | `:id` = a ticket in any shop | 403/404 — must not return another shop's ticket PII to an unauthenticated caller (decide policy in SEC-001B; today returns 200). |
| B2 | `POST /tickets/:id/reschedule` | none | `:id` = a pending appointment in any shop | Requires ownership proof (device/token) or is deliberately public — SEC-001B must decide; test asserts the chosen policy. |
| B3 | `POST /tickets/:id/cancel` | none | `:id` = a waiting ticket in any shop | Same as B2 — assert chosen policy (ownership proof vs. intentionally public). |
| B4 | `POST /public/propagandas/orders/:id/image` | none | `:id` = an eligible root-company order created by someone else | Assert chosen policy (per-order upload token vs. intentionally open). |

> B1–B4 are flagged because they are cross-tenant-reachable by id with no auth. Some are intentional customer status-page flows (reschedule/cancel from an email link). **SEC-001B does not need to force 403 blindly**; it must (a) confirm the intended policy with the council and (b) add a negative test that pins that policy so it can't regress.

### 4.3 Positive (must-still-pass) guardrails

To prove new guards don't over-block, SEC-001B should pair each Class A fix with a same-shop success test:

| # | Route | Actor token | Scenario | Expected |
| --- | --- | --- | --- | --- |
| P1 | `PATCH /barbers/:id` | owner @ Shop A | `:id` = a barber in **Shop A** | 200 |
| P2 | `POST /shops/:slug/services` | owner @ Shop A | `:slug` = **Shop A** | 201 |
| P3 | `GET /shops/:slug/analytics` | owner @ Shop A | `:slug` = **Shop A** | 200 |
| P4 | `GET /shops/:slug/clients/list` | owner @ Shop A | `:slug` = **Shop A** | 200 |
| P5 | `POST /shops/:slug/recalculate` | owner @ Shop A | `:slug` = **Shop A** | 200 |
| P6 | `PATCH /barbers/:id/presence` | barber @ Shop A | `:id` = **own** barberId | 200 |

---

## 5. Notes for SEC-001B implementation (not done here)

- A `requireShopAccess(getShopId)` helper already exists but is wired into **zero** routes; its current logic (`owner` short-circuits to allow **any** shop) is itself the bug and must be changed so `owner` is also compared to `user.shopId`. Do not reuse it as-is.
- Routes keyed by bare id (`/barbers/:id`, `/services/:id`) need to resolve the resource first and compare its `shopId` to `user.shopId` (the `tickets.ts` pattern), since there is no slug to gate on in a pre-handler.
- Company-admin access to shop-scoped routes: several shop routes (`services.ts`) intentionally allow `company_admin` and already check `shop.companyId === user.companyId`. Any new owner/staff `shopId` guard must preserve that company-admin branch.

---

## 6. Verification

- **Change type:** documentation only (`docs/security/sec-001a-route-inventory.md`). No production code touched.
- **Test suite command (record):** `pnpm --filter api test:run` (alias for `vitest run` in `apps/api`).
- **Result in this worktree:** the command could not execute because dependencies are not installed here (`node_modules` absent → `'vitest' is not recognized`). Run `pnpm install` at the repo root first, then `pnpm --filter api test:run`. Because this task adds only a Markdown file and changes no code, the existing suites are unaffected by it.
