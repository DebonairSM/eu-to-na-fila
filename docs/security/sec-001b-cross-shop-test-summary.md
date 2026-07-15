# SEC-001B — Cross-Shop Authorization Test Summary

**Date:** 2026-07-15

**Test file:** `apps/api/src/__tests__/routes/sec-001-cross-shop-authorization.test.ts`

**Source inventory:** `docs/security/sec-001a-route-inventory.md`, section 4.1

## Coverage

The `SEC-001 cross-shop authorization` suite contains one integration test for
each authenticated Class A scenario (A1–A27) in SEC-001A. Every test sends a
real JWT through Fastify's request pipeline and asserts the secure response.

The suite also locks existing boundaries for customer, company-admin, and kiosk
actors:

- Customer A cannot use Shop B's customer-profile or ticket check-in routes.
- Company admin A cannot list Company B shops, edit a Company B shop, or create
  a service in a Company B shop.
- Kiosk A cannot invoke an owner-only Shop B queue mutation. SEC-001A found no
  kiosk-authorized management route, so role rejection is the applicable kiosk
  boundary.

The four unauthenticated Class B IDOR cases are not included here. SEC-001A
marks their desired policy as unresolved, and the ticket cancel/reschedule cases
belong to the separate SEC-012 public-action-token work. SEC-001B does not choose
that policy implicitly.

## Expected failing tests before SEC-001C

The table records the behavior observed in a database-backed run. All rows below
fail because the test expects the secure 403 contract.

| Test | Route | Abuse scenario | Current behavior / reason |
| --- | --- | --- | --- |
| A1 | `PATCH /barbers/:id/presence` | Owner A toggles Barber B presence. | **200** — barber is loaded by id; owner `shopId` is never compared. |
| A2 | `PATCH /barbers/:id/status` | Owner A changes Barber B active status. | **200** — barber is loaded by id; owner `shopId` is never compared. |
| A3 | `PATCH /barbers/:id/presence` | Barber A targets Barber B. | **400** — self-id validation runs before any tenant check; the required cross-shop contract is 403. |
| A4 | `PATCH /barbers/:id` | Owner A changes Barber B profile/login. | **200** — barber is loaded by id with only an owner role check. |
| A5 | `POST /shops/:slug/barbers/:id/set-password` | Owner A resets Barber B's password. | **200** — slug and barber agree with each other, but are never compared with the owner token. |
| A6 | `POST /shops/:slug/barbers` | Owner A creates a barber in Shop B. | **200** — the route trusts the requested slug after an owner role check. |
| A7 | `DELETE /barbers/:id` | Owner A deletes Barber B. | **200** — barber is loaded and deleted by id without token shop scoping. |
| A8 | `POST /shops/:slug/services` | Owner A creates a service in Shop B. | **201** — company admins are scoped; the owner branch has no `shopId` check. |
| A9 | `POST /shops/:slug/services/reorder` | Owner A reorders Shop B services. | **200** — company admins are scoped; the owner branch has no `shopId` check. |
| A10 | `PATCH /services/:id` | Owner A changes a Shop B service. | **200** — company admins are scoped; the owner branch accepts any service id. |
| A11 | `DELETE /services/:id` | Owner A deletes a Shop B service. | **200** — company admins are scoped; the owner branch accepts any service id. |
| A12 | `POST /shops/:slug/recalculate` | Owner A recalculates Shop B's queue. | **200** — the route trusts the requested slug after an owner role check. |
| A13 | `POST /shops/:slug/tickets/appointment` | Owner A creates a Shop B appointment. | **201** — role is checked, but token `shopId` is not compared with the slug. |
| A14 | `POST /shops/:slug/tickets/appointment` | Barber A creates a Shop B appointment. | **201** — role is checked, but neither `shopId` nor `barberId` is scoped to the slug. |
| A15 | `DELETE /shops/:slug/tickets` | Owner A wipes Shop B's queue. | **200** — the handler deletes by the requested shop id without checking the token shop. |
| A16 | `PATCH /shops/:slug/temporary-status` | Owner A closes or opens Shop B. | **200** — the route trusts the requested slug after an owner role check. |
| A17 | `DELETE /shops/:slug/temporary-status` | Owner A clears Shop B's override. | **200** — the route trusts the requested slug after an owner role check. |
| A18 | `GET /shops/:slug/clients/list` | Owner A lists Shop B clients. | **200** — the list query scopes to the slug, not to the token shop. |
| A19 | `GET /shops/:slug/clients` | Owner A searches Shop B clients. | **200** — only the barber branch performs a tenant check. |
| A20 | `GET /shops/:slug/clients` | Staff A searches Shop B clients. | **200** — only the barber branch performs a tenant check. |
| A21 | `GET /shops/:slug/clients/:id` | Owner A reads Client B details/history. | **200** — client and slug are mutually scoped, but the owner token is not scoped to the slug. |
| A22 | `GET /shops/:slug/clients/:id/reference-image` | Staff A reads Client B's reference image. | **302** — staff is not compared with the slug's shop, so the foreign reference image is disclosed by redirect. |
| A23 | `PATCH /shops/:slug/clients/:id` | Owner A edits Client B. | **200** — barber is blocked, but owner/staff tokens are not scoped to the slug. |
| A24 | `POST /shops/:slug/clients/:id/clip-notes` | Staff A adds a note to Client B. | **201** — only the barber branch performs a tenant check. |
| A25 | `GET /shops/:slug/analytics` | Owner A reads Shop B analytics/revenue. | **200** — the route checks owner role only. |
| A26 | `GET /shops/:slug/analytics/barber-productivity-by-week` | Owner A reads Shop B productivity. | **200** — the route checks owner role only. |
| A27 | `GET /shops/:slug/analytics/barbers/:barberId/history` | Owner A reads Barber B history. | **200** — barber and slug are mutually scoped, but the owner token is not scoped to the slug. |

## Verification record

Post-rebase commands:

```powershell
pnpm --filter api build
git diff --name-only origin/main
```

Current results:

- The API build emits **no TypeScript diagnostics attributable to the SEC-001B
  test file**. The two post-rebase client insert errors were resolved by assigning
  Client A to Company A and Client B to Company B through the required
  `companyId`; the obsolete optional `shopId` assignment is not used.
- The overall API build remains non-zero with 12 unrelated diagnostics in
  `barberPresenceJob.ts`, `referencePresets.ts`, `ads.ts`, `auth.ts`,
  `barbers.ts`, `server.ts`, and `ClientService.ts`. None of those files is part
  of this branch's diff from `origin/main`.
- `git diff --name-only origin/main` contains only this test and this summary.

The local PostgreSQL test database is unavailable, so the integration suite was
not rerun after the rebase. The pre-rebase database-backed baseline was **27
expected failures / 6 passes**: A1–A27 were RED, while the customer,
company-admin, and kiosk regression locks were green. This card intentionally
does not change production schema, routes, or authorization enforcement.
