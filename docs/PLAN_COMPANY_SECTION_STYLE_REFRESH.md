# Company Section Style Refresh (Qminder-Inspired) — Thorough Plan

This plan fits the current codebase and build system. It is the single source of truth for the company section style refresh.

---

## 1. System context (must preserve)

**Build detection**: `apps/web/src/lib/build.ts`. `isRootBuild()` is true when `pathname.startsWith('/company')` OR when `BASE_URL === '/'`. It is false when `pathname.startsWith('/projects/mineiro')`. So:

- **Root build** (e.g. root-main or main app with path `/company/*`): pathname like `/company/dashboard` → `isRootBuild() === true` → pages render Root theme (RootSiteNav, `bg-[#0a0a0a]`, blue accents, `Container size="2xl"`).
- **Mineiro build** (main app under `/projects/mineiro/`): pathname like `/projects/mineiro/company/dashboard` → `isRootBuild() === false` → Mineiro theme (CompanyNav, gradient `#071124`→`#0b1a33`→`#0e1f3d`, gold `#D4AF37`).

**Entry points**:

- `apps/web/src/App.tsx`: routes `/`, `/home`, `/about`, `/contact`, `/network`, `/company/dashboard`, `/company/shops`, `/company/ads`, `/company/shops/new`. Theme chosen at runtime via `isRootBuild()`.
- `apps/web/src/root-main.tsx`: routes `/`, `/projects`, `/about`, `/contact`, `/company/login`, `/company/dashboard`, etc. Always root theme for company routes.

**Company section (this plan)** = when Mineiro theme is active: CompanyNav plus all pages that branch on `useRootTheme = isRootBuild()` and render the non-root branch, plus public pages that use CompanyNav (About, Contact, Network in main app).

**CSS variables**: `apps/web/src/contexts/ShopConfigContext.tsx` sets `--shop-accent`, `--shop-background`, `--shop-text-primary`, etc. on `document.documentElement`. AboutPage, ContactPage, NetworkPage use `var(--shop-background)` and `var(--shop-accent)`. Do not remove or break variable usage on those pages.

**CompanyLoginPage**: `apps/web/src/pages/CompanyLoginPage/index.tsx`. Mineiro branch uses `Navigation`, not CompanyNav; same gradient background. Optional: align background with company section; no CompanyNav change.

---

## 2. Scope (exact list)

**Pages to refresh**:

| Page | File | Notes |
|------|------|--------|
| AboutPage | `apps/web/src/pages/AboutPage.tsx` | Single return, always CompanyNav; `max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16`, `bg-[var(--shop-background)]` |
| ContactPage | `apps/web/src/pages/ContactPage.tsx` | Same pattern |
| NetworkPage | `apps/web/src/pages/NetworkPage.tsx` | Same pattern |
| CompanyDashboard | `apps/web/src/pages/CompanyDashboard.tsx` | Mineiro branch only (lines 161–261) |
| ShopManagementPage | `apps/web/src/pages/ShopManagementPage.tsx` | Mineiro branch only (from line 913; modal from 1032) |
| AdManagementPage | `apps/web/src/pages/AdManagementPage.tsx` | Mineiro branch only (lines 368–516) |
| CreateShopPage | `apps/web/src/pages/CreateShopPage.tsx` | Single return; when `Nav === CompanyNav` use company-section wrapper and Container |

**Not in scope**: LandingPage, Root build branches, root-main.tsx, CompanyLoginPage structure (optional background only).

---

## 3. Design direction (Qminder-inspired)

- **Header**: Minimal; logo + tagline grouped left; nav links text-only, subtle active state; no pill/chunky active; optional Dashboard link when company admin.
- **Typography**: One page title + one supporting line; consistent scale.
- **Layout**: One background; single max-width `Container size="2xl"` (1400px); consistent main padding and section spacing.
- **Cards**: `border border-white/10 bg-white/5 rounded-xl`; gold only for icon or one CTA.
- **Modals**: Same card-like treatment; no heavy gold borders.

---

## 4. Standard tokens (use everywhere in company section)

- **Page wrapper (Mineiro company)**: `min-h-screen text-white bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d]`
- **Main content**: `<Container size="2xl">`; main padding `pt-20 sm:pt-24 pb-12 sm:pb-16 lg:pb-20` (or `py-12 sm:py-16 lg:py-20`)
- **Page title block**: title `text-3xl sm:text-4xl font-light tracking-tight text-white`; subtitle `text-white/70 text-base sm:text-lg max-w-2xl mx-auto mt-2` (or `text-white/70 text-sm mt-2`)
- **Standard card**: `border border-white/10 bg-white/5 rounded-xl p-6`; hover `hover:border-white/20 hover:bg-white/[0.07]`
- **Accent (gold)**: Only for icon `text-[#D4AF37]` or `text-[var(--shop-accent)]`, primary CTA, or thin left border. No full-card gradients.
- **Secondary button**: `border border-white/20 text-white/80 hover:text-white hover:bg-white/5 rounded-lg`

---

## 5. CompanyNav — exact changes

**File**: `apps/web/src/components/CompanyNav.tsx`.

**Layout bug**: The flex with `justify-between` has three children: (1) div with logo, (2) div with two paragraphs (tagline), (3) div with LanguageSwitcher + nav + mobile. Wrap (1) and (2) in one child: e.g. `<div className="flex items-center gap-3">` containing logo div + tagline div.

**Nav link style**: Replace active `bg-white/10 text-[#D4AF37] border border-white/10 shadow-[0_0_0_1px_rgba(212,175,55,0.2)]` and default `text-white/85 hover:text-[#D4AF37] hover:bg-white/5` with text-only: active e.g. `text-[#D4AF37] border-b border-[#D4AF37]/50 pb-1` or `text-white font-medium`; default `text-white/80 hover:text-white`. Remove pill `px-3 py-2 rounded-lg` from links (keep minimal padding for touch). Align with RootSiteNav (lines 33–42): `text-sm font-medium`, active `text-white border-b border-white/20 pb-1`.

**Header**: Keep `border-b border-white/10 bg-[#071124]`; Container already used. Optional: `sticky top-0 z-50`.

**Optional Dashboard link**: If `useAuthContext().isCompanyAdmin`, show link to `/company/dashboard` (e.g. `nav.dashboardCompany`). Same text style; after Contact or separate right group.

**Mobile**: Same menu button + dropdown; panel `border border-white/10 bg-[#0b1a33]`; links `text-white hover:text-[#D4AF37]`. Keep LanguageSwitcher with nav.

**Locale keys**: `companyNav.home`, `companyNav.about`, `companyNav.gallery`, `companyNav.contact`, `companyNav.menu`, `companyNav.tagline`, `accessibility.openMenu` — do not remove or rename.

---

## 6. CompanyDashboard (Mineiro branch only)

**File**: `apps/web/src/pages/CompanyDashboard.tsx`. Touch only the block from line 161 (`// Mineiro build`).

- **Wrapper**: Keep gradient.
- **Main**: Replace `main className="container max-w-[800px] mx-auto relative z-10 pt-24 px-4 sm:px-6 lg:px-10 pb-12"` with `main className="relative z-10 pt-20 sm:pt-24 pb-12 sm:pb-16 lg:pb-20"` and wrap contents in `<Container size="2xl">`.
- **Title block**: Replace Playfair `text-2xl` + `text-white/60 mt-2 text-sm` with standard: e.g. title `text-3xl sm:text-4xl font-light tracking-tight text-white`, subtitle `text-white/70 text-base sm:text-lg max-w-2xl mx-auto mt-2`. Optionally drop Playfair.
- **Stat cards (lines 188–216)**: Replace `bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-xl p-6` with standard card; keep icon `text-[#D4AF37]`.
- **Action cards (lines 218–251)**: Replace gradient and hover shadow/translate with standard card + hover; keep icon and arrow `text-[#D4AF37]`.
- **Logout**: Keep secondary; can use standard secondary button class.

---

## 7. ShopManagementPage (Mineiro branch only)

**File**: `apps/web/src/pages/ShopManagementPage.tsx`. Mineiro from line 913; edit modal from 1032.

- **Main**: Replace `main className="container max-w-[1200px] mx-auto px-4 sm:px-6 pt-24 pb-10 relative z-10"` with `main className="relative z-10 pt-20 sm:pt-24 pb-12 sm:pb-16 lg:pb-20"` and wrap content in `<Container size="2xl">`.
- **Title block**: Replace Playfair `text-2xl font-semibold text-[#D4AF37]` + `text-white/60 mt-2 text-sm` with standard title + subtitle.
- **Add shop button**: Keep primary CTA; can keep gold or use solid `bg-[#D4AF37]`. Preserve aria-label, min-h, focus.
- **Shop cards**: Replace `bg-gradient-to-br from-[rgba(212,175,55,0.12)]... border-2 border-[rgba(212,175,55,0.3)]... hover:border-[#D4AF37] hover:-translate-y-1 hover:shadow-[0_10px_30px_...]` with standard card; keep store icon `text-[#D4AF37]`. Editar/Remover: keep semantics; style as secondary + destructive.
- **Error toast**: Keep behavior; style optional.
- **Edit modal**: Panel replace `border border-[rgba(212,175,55,0.3)]` with `border border-white/10`. Modal title: `text-white` or keep Playfair only on title. Tabs: active `bg-white/10 text-white` instead of `bg-[#D4AF37]/20 text-[#D4AF37]`. Inner form sections already use `bg-white/5 border border-white/10` in places; align all to standard card. Do not change AppearanceForm `variant="mineiro"` or form logic.

---

## 8. AdManagementPage (Mineiro branch only)

**File**: `apps/web/src/pages/AdManagementPage.tsx`. Mineiro lines 368–516.

- **Main**: Replace `main className="container max-w-[800px] mx-auto relative z-10 pt-24 px-4 sm:px-6 lg:px-10 pb-12"` with `main className="relative z-10 pt-20 sm:pt-24 pb-12 sm:pb-16 lg:pb-20"` and wrap in `<Container size="2xl">`.
- **Title block**: Replace Playfair + `text-[var(--shop-accent)]` and subtitle with standard title + subtitle.
- **Upload section**: Replace gradient + `border-2 border-[color-mix(...)]` with standard card; keep accent on icon/state only.
- **Ad list cards**: Replace gradient and border with standard card; thumbnail border `border-white/10`. Toggle/Delete keep semantics and status colors.
- **Back button**: Standard secondary button.
- **Empty state**: Standard card or bordered block.

---

## 9. CreateShopPage (when Mineiro: Nav === CompanyNav)

**File**: `apps/web/src/pages/CreateShopPage.tsx`. Single return; `Nav = useRootTheme ? RootSiteNav : CompanyNav`. Currently outer div always `min-h-screen bg-[#0a0a0a]`, main `max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16`.

- **Conditional wrapper**: When `!useRootTheme`, use company background: `min-h-screen text-white bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d]`. When `useRootTheme`, keep `bg-[#0a0a0a]`.
- **Main**: When Mineiro, wrap in `<Container size="2xl">` and use `pt-20 sm:pt-24 pb-12 sm:pb-16 lg:pb-20`. When Root, keep current max-w-3xl and padding.
- **Title block**: When Mineiro use standard title + subtitle; when Root keep current.
- **Form card**: When Mineiro, form container can use standard card; primary submit can stay gold.

---

## 10. AboutPage, ContactPage, NetworkPage

- **AboutPage**: Keep `bg-[var(--shop-background)]`. Replace `max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16` with `<Container size="2xl">` and `py-12 sm:py-16 lg:py-20`. Header: optional title size `text-3xl sm:text-4xl`. Cards: ensure `rounded-xl`, `border-white/10`; timeline and “Equipe central” use standard card.
- **ContactPage**: Same: Container, padding, keep variables; form/sidebar cards align border and `rounded-xl`.
- **NetworkPage**: Same: Container, padding; shop cards keep Card + `bg-white/5 border-white/10` and `rounded-xl`; keep `var(--shop-accent)` for avatar if desired.

---

## 11. Locale keys (do not break)

Used in company section: `companyNav.*`, `company.*`, `management.*`, `ads.*`, `createShop.*`, `about.*`, `contact.*`, `network.*`, `companyLogin.*`, `accessibility.openMenu`. No renames or removals.

---

## 12. Files and change summary

| File | Changes |
|------|--------|
| `CompanyNav.tsx` | Layout fix (wrap logo+tagline), simplified nav and mobile, optional sticky and Dashboard link |
| `CompanyDashboard.tsx` | Mineiro only: Container, padding, title block, stat/action cards to standard card + accent |
| `ShopManagementPage.tsx` | Mineiro only: Container, padding, title, Add shop button, shop cards, edit modal panel/tabs |
| `AdManagementPage.tsx` | Mineiro only: Container, padding, title, upload section and ad cards to standard card |
| `CreateShopPage.tsx` | Conditional wrapper and main when `!useRootTheme`; optional form card and title |
| `AboutPage.tsx` | Container, padding, card consistency |
| `ContactPage.tsx` | Container, padding, card consistency |
| `NetworkPage.tsx` | Container, padding, card consistency |

**Out of scope**: Root build branches, root-main.tsx, LandingPage, Navigation, CompanyLoginPage (optional background only), new copy or new sections.
