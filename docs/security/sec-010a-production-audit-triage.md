# SEC-010A — Production dependency audit triage

**Status:** Triage only; no dependency changes were made.
**Evidence date:** 2026-07-15
**Lockfile:** `pnpm-lock.yaml` (`lockfileVersion: 9.0`)

## Evidence and tooling note

The repository-pinned pnpm 10.13.1 currently calls npm's retired legacy audit endpoint and receives HTTP 410. To obtain current evidence without changing the lockfile, this triage used pnpm 11.13.0, whose audit client uses npm's supported bulk advisory endpoint:

```powershell
corepack pnpm@11.13.0 audit --prod --json
```

Result: **63 production findings** — 2 critical, 26 high, 30 moderate, and 5 low across 321 resolved production/optional dependencies. The critical and high findings collapse into the 12 package groups below; repeated advisories against the same installed version are grouped.

## Critical and high findings

| Package and installed version | Severity / fixed version | Dependency path | Runtime reachability in this app | Batch |
| --- | --- | --- | --- | --- |
| `jspdf@2.5.2` | 2 critical + 8 high advisories; latest required floor `>=4.2.1` | direct web dependency; also through `jspdf-autotable` | **Reachable.** `apps/web/src/lib/analyticsPdf.ts` creates PDFs from analytics data. The vulnerable HTML/PDF injection, file/path handling, JavaScript injection, and image-decoder paths make this the highest-priority browser-side upgrade. Major-version regression testing is required. | Breaking |
| `drizzle-orm@0.29.5` | high; `>=0.45.2` | direct API dependency | **Potentially reachable.** The advisory concerns improperly escaped dynamic SQL identifiers. Most app queries use typed schema identifiers, but every raw/dynamic identifier helper must be reviewed before declaring the path unreachable. Large ORM jump plus migration/query verification required. | Breaking |
| `fastify@4.29.1` | high; `>=5.7.2` | direct API dependency | **Reachable.** Fastify parses every API request; the advisory allows Content-Type tab characters to bypass body validation. Fastify 5 is a major upgrade requiring plugin compatibility and route-schema regression tests. | Breaking |
| `@fastify/multipart@7.7.3` | high; `>=8.3.1` | direct API dependency | **Reachable.** Multipart is registered globally and used by ad, customer reference-image, company-shop, and public propaganda uploads. Resource-consumption limits must be verified after upgrade. | Breaking |
| `jws@3.2.2` | high; `>=3.2.3` | `jsonwebtoken > jws` | **Reachable and auth-critical.** `apps/api/src/lib/jwt.ts` verifies bearer tokens for protected routes. Prefer a lockfile-level transitive refresh or `jsonwebtoken` patch/minor update that resolves `jws@3.2.3+`, then rerun negative JWT tests. | Safe patch |
| `@remix-run/router@1.23.0` | high; `>=1.23.2` | `react-router-dom` / `react-router` | **Reachable.** Client routing is active. The finding concerns XSS through open redirects; upgrade the React Router 6 line to a release resolving this and the related moderate redirect advisories, then test OAuth/login/status navigation. | Safe patch |
| `nodemailer@6.10.1` | 2 high advisories; `>=7.0.11` and `>=9.0.1` respectively | direct API dependency | **Partly reachable.** `EmailService.ts` sends application email. The app does not intentionally expose Nodemailer's raw message option, but address parsing is exercised by user-controlled recipients. The newest advisory has no fix below 9.0.1, so treat this as a major upgrade and explicitly set `disableFileAccess` / `disableUrlAccess`. | Breaking |
| `ws@8.18.3` | high; `>=8.21.0` | Fastify websocket, Supabase realtime, LibSQL | **Reachable.** `/ws` is registered by `apps/api/src/websocket/handler.ts`; the advisory is memory-exhaustion DoS from fragmented messages. A transitive lock refresh/override should be low risk, followed by websocket connection and broadcast tests. | Safe patch |
| `fast-uri@2.4.0, 3.1.0` | 2 high; `>=3.1.2` | Fastify/AJV compiler chains | **Framework-reachable, exploitability conditional.** Used during schema URI processing; no direct application import. Resolve through Fastify/AJV dependency updates or a compatible override and rerun route-schema tests. | Safe patch if override-compatible; otherwise Breaking |
| `glob@10.4.5` | high; `>=10.5.0` | `@fastify/static > glob` | **Not runtime-reachable in normal requests.** The advisory is specific to the glob CLI `-c/--cmd` option; this app does not invoke it. Still refresh transitively because the fix is patch-level. | Safe patch |
| `minimatch@5.1.6, 9.0.5` | 3 high advisories; `>=5.1.8` / `>=9.0.7` | Fastify static / Swagger UI glob chains | **Not directly runtime-reachable.** No app code accepts user glob patterns. Resolve transitively with Fastify/static updates or narrow overrides. | Safe patch |
| `form-data@4.0.4` | high; `>=4.0.6` | LibSQL's optional node-fetch type/fetch chain | **Low-confidence runtime reachability.** The vulnerable surface requires attacker-controlled multipart field names or filenames through this nested client; the app's uploads use Fastify multipart instead. A compatible override is appropriate. | Safe patch |

### Advisory identifiers

- jsPDF: `GHSA-f8cm-6447-x5h2`, `GHSA-7x6v-j9x4-qf24`, `GHSA-pqxr-3g65-p328`, `GHSA-95fx-jjr5-f39c`, `GHSA-9vjf-qc39-jprp`, `GHSA-p5xg-68wr-hm3m`, `GHSA-wfv2-pwc8-crg5`, `GHSA-67pg-wm7f-q7fj`, `GHSA-8mvj-3j78-4qmw`, `GHSA-w532-jxjh-hjhj`
- Drizzle: `GHSA-gpj5-g38j-94v9`; Fastify: `GHSA-jx2c-rxcm-jvmq`; multipart: `GHSA-27c6-mcxv-x3fh`
- jws: `GHSA-869p-cjfg-cm3x`; React Router: `GHSA-2w69-qvjg-hvjx`
- Nodemailer: `GHSA-p6gq-j5cr-w38f`, `GHSA-rcmh-qjqh-p98v`; ws: `GHSA-96hv-2xvq-fx4p`
- fast-uri: `GHSA-q3j6-qgpj-74h6`, `GHSA-v39h-62p7-jpjc`; glob: `GHSA-5j98-mcp5-4vw2`
- minimatch: `GHSA-23c5-xmqv-rm74`, `GHSA-3ppc-4f35-3m26`, `GHSA-7r86-cg39-jmmj`; form-data: `GHSA-hmw2-7cc7-3qxx`

## Follow-up implementation batches

### SEC-010B — Safe transitive and patch batch

Upgrade or override `jws`, `@remix-run/router`/React Router within the compatible 6.x line, `ws`, `fast-uri`, `glob`, `minimatch`, and `form-data`. Do not mix framework or ORM majors into this batch.

Verification:

```powershell
corepack pnpm@11.13.0 audit --prod --json
corepack pnpm@10.13.1 --filter api test:run
corepack pnpm@10.13.1 --filter web test:run
corepack pnpm@10.13.1 build
```

Add focused JWT rejection, router redirect, websocket connection/broadcast, and multipart smoke tests where coverage is missing.

### SEC-010C — Fastify 5 + multipart compatibility batch

Upgrade Fastify and its first-party plugins together, including multipart/static/websocket compatibility. Verify content-type validation, upload size/count limits, static assets, Swagger in non-production, websocket auth, and every API test.

### SEC-010D — Drizzle ORM upgrade batch

Upgrade Drizzle separately. Audit any `sql.raw`, dynamic identifier, migration, and query-builder use; run migrations against a disposable database plus all repository/service/API tests.

### SEC-010E — PDF generation major upgrade batch

Upgrade jsPDF to `>=4.2.1` and a compatible `jspdf-autotable`. Test analytics PDF output with long text, Unicode, images, tables, empty datasets, and attacker-controlled labels; manually inspect the generated PDF.

### SEC-010F — Nodemailer major upgrade batch

Upgrade Nodemailer to a version fixing the newest advisories (currently `>=9.0.1`). Confirm OAuth/SMTP configuration, force `disableFileAccess` and `disableUrlAccess`, test address parsing and header handling, and send only through a non-production mailbox during verification.

## Definition-of-done record

- Critical/high advisories, installed versions, fixed floors, dependency paths, and reachability are recorded above.
- Safe patch/transitive work is separated from Fastify, Drizzle, jsPDF, and Nodemailer breaking upgrades.
- No package, lockfile, or production code was changed by this triage.
