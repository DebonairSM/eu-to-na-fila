import { z } from 'zod';
import { shopStyleInputSchema } from './shopStyle.js';
import type { ShopStyleResolved } from './shopStyle.js';

/** Per-shop theme (colors). All elements overridable. */
export interface ShopTheme {
  primary: string;
  accent: string;
  background?: string;
  surfacePrimary?: string;
  surfaceSecondary?: string;
  navBg?: string;
  textPrimary?: string;
  textSecondary?: string;
  borderColor?: string;
  /** Text color on accent buttons/backgrounds (e.g. black on gold). */
  textOnAccent?: string;
  /** Hover state for accent (e.g. lighter gold). */
  accentHover?: string;
}

/** Per-shop branding: favicon (browser tab) and header logo. Optional URLs; empty string = use default. */
export interface HomeContentBranding {
  faviconUrl: string;
  headerIconUrl: string;
}

/** Per-shop home page content (hero, services, about, location, nav, accessibility). All elements overridable. */
export interface HomeContent {
  branding: HomeContentBranding;
  hero: { badge: string; subtitle: string; ctaJoin: string; ctaLocation: string };
  nav: {
    linkServices: string;
    linkAbout: string;
    linkLocation: string;
    ctaJoin: string;
    linkBarbers: string;
    linkAccount: string;
    labelDashboard: string;
    labelDashboardCompany: string;
    labelLogout: string;
    labelMenu: string;
  };
  services: { sectionTitle: string; loadingText: string; emptyText: string };
  about: {
    sectionTitle: string;
    imageUrl: string;
    imageAlt: string;
    features: Array<{ icon: string; text: string }>;
  };
  location: {
    sectionTitle: string;
    labelAddress: string;
    labelHours: string;
    labelPhone: string;
    labelLanguages: string;
    linkMaps: string;
    address: string;
    addressLink: string;
    hours: string;
    phone: string;
    phoneHref: string;
    languages: string;
    mapQuery: string;
  };
  accessibility: { skipLink: string; loading: string };
}

/** Per-locale home content. Keys are locale codes (e.g. "pt-BR", "en"). */
export type HomeContentByLocale = Record<string, HomeContent>;

const DEFAULT_LOCALE = 'pt-BR';

/**
 * Deep-merge partial home content with DEFAULT_HOME_CONTENT.
 * Used by getHomeContentForLocale and by API.
 */
function mergeHomeContentWithDefaults(partial: unknown): HomeContent {
  if (!partial || typeof partial !== 'object') return DEFAULT_HOME_CONTENT;
  const deepMerge = <T>(def: T, from: unknown): T => {
    if (from == null || typeof from !== 'object') return def;
    const o = from as Record<string, unknown>;
    const out = { ...def } as Record<string, unknown>;
    for (const k of Object.keys(def as object)) {
      const defVal = (def as Record<string, unknown>)[k];
      const fromVal = o[k];
      if (defVal && typeof defVal === 'object' && !Array.isArray(defVal) && fromVal && typeof fromVal === 'object' && !Array.isArray(fromVal)) {
        out[k] = deepMerge(defVal, fromVal);
      } else if (fromVal !== undefined) {
        out[k] = Array.isArray(fromVal) ? [...fromVal] : fromVal;
      }
    }
    return out as T;
  };
  return deepMerge(DEFAULT_HOME_CONTENT, partial);
}

/**
 * Returns true if the object looks like a locale-keyed record (has a locale as top-level key).
 * HomeContent has keys like "hero", "nav", "branding" - no locale code.
 */
function isLocaleRecord(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).some((k) => k === 'pt-BR' || k === 'en');
}

/**
 * Resolve home content for a given locale from stored value (legacy single object or locale-keyed record).
 */
export function getHomeContentForLocale(byLocale: unknown, locale: string): HomeContent {
  if (!byLocale || typeof byLocale !== 'object') return DEFAULT_HOME_CONTENT;
  const o = byLocale as Record<string, unknown>;
  if (isLocaleRecord(o)) {
    const content = o[locale] ?? o[DEFAULT_LOCALE] ?? o[Object.keys(o)[0]];
    return mergeHomeContentWithDefaults(content);
  }
  return mergeHomeContentWithDefaults(byLocale);
}

/** Zod schema for theme validation with defaults. Adding a new field here with a .default() is all you need. */
export const themeSchema = z.object({
  primary: z.string().max(50).default('#3E2723'),
  accent: z.string().max(50).default('#D4AF37'),
  background: z.string().max(50).default('#0a0a0a'),
  surfacePrimary: z.string().max(50).default('#0a0a0a'),
  surfaceSecondary: z.string().max(50).default('#1a1a1a'),
  navBg: z.string().max(50).default('#0a0a0a'),
  textPrimary: z.string().max(100).default('#ffffff'),
  textSecondary: z.string().max(100).default('rgba(255,255,255,0.7)'),
  borderColor: z.string().max(100).default('rgba(255,255,255,0.08)'),
  textOnAccent: z.string().max(100).default('#0a0a0a'),
  accentHover: z.string().max(50).default('#E8C547'),
});

/** Zod schema for partial theme input (all fields optional, used for PATCH). */
export const themeInputSchema = z.object({
  primary: z.string().max(50).optional(),
  accent: z.string().max(50).optional(),
  background: z.string().max(50).optional(),
  surfacePrimary: z.string().max(50).optional(),
  surfaceSecondary: z.string().max(50).optional(),
  navBg: z.string().max(50).optional(),
  textPrimary: z.string().max(100).optional(),
  textSecondary: z.string().max(100).optional(),
  borderColor: z.string().max(100).optional(),
  textOnAccent: z.string().max(100).optional(),
  accentHover: z.string().max(50).optional(),
  /**
   * Style preset configuration, stored inside the theme JSON under `style`.
   * Parsed separately from colors by the API/frontend.
   */
  style: shopStyleInputSchema,
}).optional();

/** Zod schema for partial home content input (all fields optional, used for PATCH). */
export const homeContentInputSchema = z.object({
  branding: z.object({
    faviconUrl: z.string().max(2000).optional().or(z.literal('')),
    headerIconUrl: z.string().max(2000).optional().or(z.literal('')),
  }).optional(),
  hero: z.object({
    badge: z.string().max(500).optional(),
    subtitle: z.string().max(500).optional(),
    ctaJoin: z.string().max(100).optional(),
    ctaLocation: z.string().max(100).optional(),
  }).optional(),
  nav: z.object({
    linkServices: z.string().max(100).optional(),
    linkAbout: z.string().max(100).optional(),
    linkLocation: z.string().max(100).optional(),
    ctaJoin: z.string().max(100).optional(),
    linkBarbers: z.string().max(100).optional(),
    linkAccount: z.string().max(100).optional(),
    labelDashboard: z.string().max(100).optional(),
    labelDashboardCompany: z.string().max(100).optional(),
    labelLogout: z.string().max(100).optional(),
    labelMenu: z.string().max(100).optional(),
  }).optional(),
  services: z.object({
    sectionTitle: z.string().max(200).optional(),
    loadingText: z.string().max(200).optional(),
    emptyText: z.string().max(200).optional(),
  }).optional(),
  about: z.object({
    sectionTitle: z.string().max(200).optional(),
    imageUrl: z.string().url().max(1000).optional().or(z.literal('')),
    imageAlt: z.string().max(200).optional(),
    features: z.array(z.object({
      icon: z.string().max(50),
      text: z.string().max(500),
    })).optional(),
  }).optional(),
  location: z.object({
    sectionTitle: z.string().max(200).optional(),
    labelAddress: z.string().max(100).optional(),
    labelHours: z.string().max(100).optional(),
    labelPhone: z.string().max(100).optional(),
    labelLanguages: z.string().max(100).optional(),
    linkMaps: z.string().max(100).optional(),
    address: z.string().max(500).optional(),
    addressLink: z.string().url().max(1000).optional().or(z.literal('')),
    hours: z.string().max(500).optional(),
    phone: z.string().max(50).optional(),
    phoneHref: z.string().max(100).optional(),
    languages: z.string().max(200).optional(),
    mapQuery: z.string().max(500).optional(),
  }).optional(),
  accessibility: z.object({
    skipLink: z.string().max(200).optional(),
    loading: z.string().max(200).optional(),
  }).optional(),
}).optional();

/** PATCH body: home content keyed by locale. Each value is partial (same shape as homeContentInputSchema). */
export const homeContentByLocaleInputSchema = z.record(z.string(), homeContentInputSchema).optional();

/** Single day open/close times (e.g. { open: "09:00", close: "19:00" }). */
export interface DayHours {
  open: string;
  close: string;
  lunchStart?: string;
  lunchEnd?: string;
}

/** Operating hours per day. Missing or null = closed. */
export interface OperatingHours {
  monday?: DayHours | null;
  tuesday?: DayHours | null;
  wednesday?: DayHours | null;
  thursday?: DayHours | null;
  friday?: DayHours | null;
  saturday?: DayHours | null;
  sunday?: DayHours | null;
}

const dayHoursSchema = z.object({
  open: z.string(),
  close: z.string(),
  lunchStart: z.string().optional(),
  lunchEnd: z.string().optional(),
});

const operatingHoursSchema = z
  .object({
    monday: dayHoursSchema.nullable().optional(),
    tuesday: dayHoursSchema.nullable().optional(),
    wednesday: dayHoursSchema.nullable().optional(),
    thursday: dayHoursSchema.nullable().optional(),
    friday: dayHoursSchema.nullable().optional(),
    saturday: dayHoursSchema.nullable().optional(),
    sunday: dayHoursSchema.nullable().optional(),
  })
  .optional();

/** Per-shop business rules. All fields have defaults matching current hardcoded behavior. */
export interface ShopSettings {
  maxQueueSize: number;
  defaultServiceDuration: number;
  requirePhone: boolean;
  requireBarberChoice: boolean;
  allowBarberPreference: boolean;
  allowDuplicateNames: boolean;
  deviceDeduplication: boolean;
  allowCustomerCancelInProgress: boolean;
  allowAppointments: boolean;
  operatingHours?: OperatingHours;
  /** IANA timezone (e.g. America/Sao_Paulo) for operating hours and appointment slots. */
  timezone?: string;
  /** Allow customers to join queue before opening hours */
  allowQueueBeforeOpen: boolean;
  /** When allowQueueBeforeOpen is true: how many hours before opening time check-in is allowed (e.g. 1 = from 1 hour before opening until closing). */
  checkInHoursBeforeOpen?: number;
  /** Temporary manual override of shop open/closed status */
  temporaryStatusOverride?: {
    isOpen: boolean;
    until: string;
    reason?: string;
  } | null;
  /** Kiosk mode access credentials */
  kioskUsername?: string;
  kioskPassword?: string;
}

/** Zod schema for settings validation with defaults. Adding a new field here with a .default() is all you need. */
export const shopSettingsSchema = z.object({
  maxQueueSize: z.number().int().min(1).max(500).default(80),
  defaultServiceDuration: z.number().int().min(1).max(480).default(20),
  requirePhone: z.boolean().default(false),
  requireBarberChoice: z.boolean().default(false),
  allowBarberPreference: z.boolean().default(true),
  allowDuplicateNames: z.boolean().default(false),
  deviceDeduplication: z.boolean().default(true),
  allowCustomerCancelInProgress: z.boolean().default(false),
  allowAppointments: z.boolean().default(false),
  operatingHours: operatingHoursSchema,
  timezone: z.string().max(100).default('America/Sao_Paulo'),
  allowQueueBeforeOpen: z.boolean().default(false),
  checkInHoursBeforeOpen: z.number().min(0).max(24).default(1),
  temporaryStatusOverride: z.object({
    isOpen: z.boolean(),
    until: z.string(),
    reason: z.string().optional(),
  }).nullable().optional(),
  kioskUsername: z.string().max(100).optional(),
  kioskPassword: z.string().max(100).optional(),
});

/** Partial input for PATCH (all optional, shallow-merged with existing). */
export const shopSettingsInputSchema = z.object({
  maxQueueSize: z.number().int().min(1).max(500).optional(),
  defaultServiceDuration: z.number().int().min(1).max(480).optional(),
  requirePhone: z.boolean().optional(),
  requireBarberChoice: z.boolean().optional(),
  allowBarberPreference: z.boolean().optional(),
  allowDuplicateNames: z.boolean().optional(),
  deviceDeduplication: z.boolean().optional(),
  allowCustomerCancelInProgress: z.boolean().optional(),
  allowAppointments: z.boolean().optional(),
  operatingHours: operatingHoursSchema.optional(),
  timezone: z.string().max(100).optional(),
  allowQueueBeforeOpen: z.boolean().optional(),
  checkInHoursBeforeOpen: z.number().min(0).max(24).optional(),
  kioskUsername: z.string().max(100).optional(),
  kioskPassword: z.string().max(100).optional(),
  temporaryStatusOverride: z.object({
    isOpen: z.boolean(),
    until: z.string(),
    reason: z.string().optional(),
  }).nullable().optional(),
}).optional();

/** Default settings values. Single source of truth. */
export const DEFAULT_SETTINGS: ShopSettings = shopSettingsSchema.parse({});

/** Default theme values. Single source of truth. */
export const DEFAULT_THEME: Required<ShopTheme> = {
  primary: '#3E2723',
  accent: '#D4AF37',
  background: '#0a0a0a',
  surfacePrimary: '#0a0a0a',
  surfaceSecondary: '#1a1a1a',
  navBg: '#0a0a0a',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.7)',
  borderColor: 'rgba(255,255,255,0.08)',
  textOnAccent: '#0a0a0a',
  accentHover: '#E8C547',
};

/** Default home content. Single source of truth. */
export const DEFAULT_HOME_CONTENT: HomeContent = {
  branding: {
    faviconUrl: '',
    headerIconUrl: '',
  },
  hero: {
    badge: 'Sangão, Santa Catarina',
    subtitle: 'Entre na fila online',
    ctaJoin: 'Entrar na Fila',
    ctaLocation: 'Como Chegar',
  },
  nav: {
    linkServices: 'Serviços',
    linkAbout: 'Sobre',
    linkLocation: 'Localização',
    ctaJoin: 'Entrar na Fila',
    linkBarbers: 'Entrar',
    linkAccount: 'Conta',
    labelDashboard: 'Dashboard',
    labelDashboardCompany: 'Dashboard Empresarial',
    labelLogout: 'Sair',
    labelMenu: 'Menu',
  },
  services: {
    sectionTitle: 'Serviços',
    loadingText: 'Carregando serviços...',
    emptyText: 'Nenhum serviço cadastrado.',
  },
  about: {
    sectionTitle: 'Sobre',
    imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&h=1000&fit=crop&q=80',
    imageAlt: 'Interior da barbearia',
    features: [
      { icon: 'schedule', text: 'Fila online' },
      { icon: 'workspace_premium', text: 'Produtos premium' },
      { icon: 'groups', text: 'Equipe experiente' },
      { icon: 'local_parking', text: 'Estacionamento fácil' },
    ],
  },
  location: {
    sectionTitle: 'Localização',
    labelAddress: 'Endereço',
    labelHours: 'Horário de Funcionamento',
    labelPhone: 'Telefone',
    labelLanguages: 'Idiomas',
    linkMaps: 'Ver no Google Maps',
    address: 'R. João M Silvano, 281 - Morro Grande\nSangão - SC, 88717-000',
    addressLink: 'https://www.google.com/maps/search/?api=1&query=R.+João+M+Silvano,+281+-+Morro+Grande,+Sangão+-+SC,+88717-000',
    hours: 'Segunda a Sábado: 9:00 - 19:00\nDomingo: Fechado',
    phone: '(48) 99835-4097',
    phoneHref: 'tel:+5548998354097',
    languages: 'Português & English',
    mapQuery: 'R.+João+M+Silvano,+281+-+Morro+Grande,+Sangão+-+SC,+88717-000',
  },
  accessibility: {
    skipLink: 'Pular para o conteúdo principal',
    loading: 'Carregando…',
  },
};

// ---------------------------------------------------------------------------
// Narrow view types (ISP) -- consumers depend only on the slice they need
// ---------------------------------------------------------------------------

/** What the public landing page needs. Returned by GET /shops/:slug/config. */
export interface ShopPublicConfig {
  name: string;
  theme: Required<ShopTheme>;
  style: ShopStyleResolved;
  path: string;
  /** Per-locale content; use getHomeContentForLocale with current locale. */
  homeContentByLocale?: Record<string, HomeContent>;
  /** Default locale content for backward compatibility. */
  homeContent: HomeContent;
  settings: ShopSettings;
}

/** What shop listing pages need (company dashboard, project list). */
export interface ShopListItem {
  id: number;
  slug: string;
  name: string;
  domain: string | null;
  createdAt: Date | string;
}

/** Full shop row for company admin editing (includes theme JSON, homeContent, PINs). */
export interface ShopAdminView {
  id: number;
  slug: string;
  name: string;
  companyId: number | null;
  domain: string | null;
  path: string | null;
  apiBase: string | null;
  theme: string | null;
  homeContent: HomeContent | Record<string, unknown> | null;
  settings: ShopSettings | Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}
