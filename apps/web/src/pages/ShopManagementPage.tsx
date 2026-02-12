import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { ShopTheme, HomeContent, ShopAdminView, ShopSettings, ShopStyleConfig, OperatingHours } from '@eutonafila/shared';
import { DEFAULT_THEME, DEFAULT_HOME_CONTENT, DEFAULT_SETTINGS, shopStyleConfigSchema, BARBERSHOP_FEATURES } from '@eutonafila/shared';
import { useAuthContext } from '@/contexts/AuthContext';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useModal } from '@/hooks/useModal';
import { useErrorTimeout } from '@/hooks/useErrorTimeout';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Modal } from '@/components/Modal';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { CompanyNav } from '@/components/CompanyNav';
import { RootSiteNav } from '@/components/RootSiteNav';
import { getErrorMessage } from '@/lib/utils';
import { isRootBuild } from '@/lib/build';
import { getTimezoneOptions, getBrowserTimezone } from '@/lib/timezones';
import { SUPPORTED_LOCALES } from '@/lib/constants';
import { Container } from '@/components/design-system/Spacing/Container';
import { AppearanceForm } from '@/components/AppearanceForm';
import { pickThreeRandomPaletteIndices } from '@/lib/presetPalettes';

// DEFAULT_THEME and DEFAULT_HOME_CONTENT imported from @eutonafila/shared

function mergeTheme(stored: string | null): ShopTheme {
  if (!stored) return { ...DEFAULT_THEME };
  try {
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    const { style: _style, ...colors } = parsed;
    return { ...DEFAULT_THEME, ...colors } as ShopTheme;
  } catch {
    return { ...DEFAULT_THEME };
  }
}

function mergeStyleForEdit(stored: string | null): ShopStyleConfig {
  if (!stored) return shopStyleConfigSchema.parse({});
  try {
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    const raw = parsed?.style ?? {};
    return shopStyleConfigSchema.parse(raw);
  } catch {
    return shopStyleConfigSchema.parse({});
  }
}

function mergeHomeContentForEdit(stored: HomeContent | Record<string, unknown> | null): HomeContent {
  if (!stored || typeof stored !== 'object') return JSON.parse(JSON.stringify(DEFAULT_HOME_CONTENT));
  const s = stored as Record<string, unknown>;
  return {
    branding: { ...DEFAULT_HOME_CONTENT.branding, ...(s.branding as object ?? {}) },
    hero: { ...DEFAULT_HOME_CONTENT.hero, ...(s.hero as object ?? {}) },
    nav: { ...DEFAULT_HOME_CONTENT.nav, ...(s.nav as object ?? {}) },
    services: { ...DEFAULT_HOME_CONTENT.services, ...(s.services as object ?? {}) },
    about: {
      ...DEFAULT_HOME_CONTENT.about,
      ...(s.about as object ?? {}),
      features: Array.isArray((s.about as Record<string, unknown>)?.features)
        ? (s.about as Record<string, unknown>).features as HomeContent['about']['features']
        : DEFAULT_HOME_CONTENT.about.features,
    },
    location: { ...DEFAULT_HOME_CONTENT.location, ...(s.location as object ?? {}) },
    accessibility: { ...DEFAULT_HOME_CONTENT.accessibility, ...(s.accessibility as object ?? {}) },
  };
}

function isLocaleRecord(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).some((k) => k === 'pt-BR' || k === 'en');
}

/** Normalize API homeContent (legacy single object or locale record) to Record<string, HomeContent>. */
function normalizeToHomeContentByLocaleForEdit(stored: HomeContent | Record<string, unknown> | null): Record<string, HomeContent> {
  if (!stored || typeof stored !== 'object') {
    const def = JSON.parse(JSON.stringify(DEFAULT_HOME_CONTENT));
    return Object.fromEntries(SUPPORTED_LOCALES.map((loc) => [loc, def]));
  }
  const s = stored as Record<string, unknown>;
  if (isLocaleRecord(s)) {
    const out: Record<string, HomeContent> = {};
    for (const loc of SUPPORTED_LOCALES) {
      const val = s[loc];
      out[loc] = mergeHomeContentForEdit(val as Record<string, unknown> | null);
    }
    return out;
  }
  const merged = mergeHomeContentForEdit(s);
  return Object.fromEntries(SUPPORTED_LOCALES.map((loc) => [loc, JSON.parse(JSON.stringify(merged))]));
}

function mergeSettingsForEdit(stored: ShopSettings | Record<string, unknown> | null | undefined): ShopSettings {
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...(stored as Partial<ShopSettings>) };
}

// --- Create shop: types and helpers ---
interface ServiceItem {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}
interface BarberItem {
  id: string;
  name: string;
  email: string;
  phone: string;
}
const uid = () => Math.random().toString(36).substring(2, 9);
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}
function getDefaultServices(t: (key: string) => string): ServiceItem[] {
  return [
    { id: uid(), name: t('createShop.serviceNameHaircut'), description: t('createShop.serviceDescHaircut'), duration: 30, price: 3000 },
    { id: uid(), name: t('createShop.serviceNameBeard'), description: t('createShop.serviceDescBeard'), duration: 20, price: 2000 },
    { id: uid(), name: t('createShop.serviceNameCombo'), description: t('createShop.serviceDescCombo'), duration: 45, price: 4500 },
  ];
}
function getDefaultBarbers(_t: (key: string) => string): BarberItem[] {
  return [
    { id: uid(), name: '', email: '', phone: '' },
    { id: uid(), name: '', email: '', phone: '' },
  ];
}

// --- Step: Services (create mode) ---
function StepServices({
  services,
  onChange,
  errors,
}: {
  services: ServiceItem[];
  onChange: (services: ServiceItem[]) => void;
  errors: Record<string, string>;
}) {
  const { t } = useLocale();
  const addService = () => {
    onChange([...services, { id: uid(), name: '', description: '', duration: 30, price: 0 }]);
  };
  const removeService = (id: string) => {
    if (services.length <= 1) return;
    onChange(services.filter((s) => s.id !== id));
  };
  const updateService = (id: string, patch: Partial<ServiceItem>) => {
    onChange(services.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2">{t('createShop.servicesTab')}</h2>
        <p className="text-white/60 text-sm">{t('createShop.servicesIntro')}</p>
      </div>
      {errors.services && <p className="text-red-400 text-sm">{errors.services}</p>}
      <div className="space-y-4">
        {services.map((service, index) => (
          <div key={service.id} className="p-4 sm:p-5 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/40 text-xs font-medium uppercase tracking-wider">{t('createShop.serviceN')} {index + 1}</span>
              {services.length > 1 && (
                <button type="button" onClick={() => removeService(service.id)} className="text-red-400/60 hover:text-red-400 transition-colors p-1" aria-label={t('createShop.removeService')}>
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <input type="text" value={service.name} onChange={(e) => updateService(service.id, { name: e.target.value })} placeholder={t('createShop.serviceNamePlaceholder')} className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm" />
              </div>
              <div className="sm:col-span-2">
                <input type="text" value={service.description} onChange={(e) => updateService(service.id, { description: e.target.value })} placeholder={t('createShop.serviceDescPlaceholder')} className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm" />
              </div>
              <div>
                <label className="block text-white/50 text-xs mb-1">{t('createShop.durationMin')}</label>
                <input type="number" min={1} value={service.duration} onChange={(e) => updateService(service.id, { duration: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-all text-sm" />
              </div>
              <div>
                <label className="block text-white/50 text-xs mb-1">{t('createShop.priceReais')}</label>
                <input type="number" min={0} step="0.01" value={(service.price / 100).toFixed(2)} onChange={(e) => updateService(service.id, { price: Math.round(parseFloat(e.target.value || '0') * 100) })} className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-all text-sm" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addService} className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-white/20 rounded-xl text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all text-sm">
        <span className="material-symbols-outlined text-lg">add</span>
        {t('createShop.addService')}
      </button>
    </div>
  );
}

// --- Step: Barbers (create mode) ---
function StepBarbers({ barbers, onChange, errors }: { barbers: BarberItem[]; onChange: (barbers: BarberItem[]) => void; errors: Record<string, string> }) {
  const { t } = useLocale();
  const addBarber = () => onChange([...barbers, { id: uid(), name: '', email: '', phone: '' }]);
  const removeBarber = (id: string) => {
    if (barbers.length <= 1) return;
    onChange(barbers.filter((b) => b.id !== id));
  };
  const updateBarber = (id: string, patch: Partial<BarberItem>) => onChange(barbers.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2">{t('createShop.barbersTab')}</h2>
        <p className="text-white/60 text-sm">{t('createShop.barbersIntro')}</p>
      </div>
      {errors.barbers && <p className="text-red-400 text-sm">{errors.barbers}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {barbers.map((barber, index) => (
          <div key={barber.id} className="p-4 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all relative">
            {barbers.length > 1 && (
              <button type="button" onClick={() => removeBarber(barber.id)} className="absolute top-3 right-3 text-red-400/60 hover:text-red-400 transition-colors p-1" aria-label={t('createShop.removeBarber')}>
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37]/30 to-[#D4AF37]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#D4AF37] text-lg">person</span>
              </div>
              <span className="text-white/40 text-xs font-medium uppercase tracking-wider">{t('createShop.barberN')} {index + 1}</span>
            </div>
            <div className="space-y-3">
              <input type="text" value={barber.name} onChange={(e) => updateBarber(barber.id, { name: e.target.value })} placeholder={t('createShop.namePlaceholder')} className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm" />
              <input type="email" value={barber.email} onChange={(e) => updateBarber(barber.id, { email: e.target.value })} placeholder={t('createShop.emailPlaceholder')} className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm" />
              <input type="tel" value={barber.phone} onChange={(e) => updateBarber(barber.id, { phone: e.target.value })} placeholder={t('createShop.phonePlaceholder')} className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm" />
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addBarber} className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-white/20 rounded-xl text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all text-sm">
        <span className="material-symbols-outlined text-lg">person_add</span>
        {t('createShop.addBarber')}
      </button>
    </div>
  );
}

type Shop = ShopAdminView;

export function ShopManagementPage() {
  const { user, isCompanyAdmin } = useAuthContext();
  const { invalidateConfig } = useShopConfig();
  const { t } = useLocale();
  const navigate = useNavigate();
  const editModal = useModal();
  const deleteConfirmModal = useModal();
  
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [shopToDelete, setShopToDelete] = useState<number | null>(null);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  type EditTab = 'info' | 'appearance' | 'content' | 'settings' | 'credentials' | 'services' | 'barbers';
  const [editTab, setEditTab] = useState<EditTab>('info');
  /** Unified tabs for both create and edit so there are no discrepancies. */
  const editModalTabs: EditTab[] = ['info', 'appearance', 'content', 'settings', 'services', 'barbers', 'credentials'];
  const [createServices, setCreateServices] = useState<ServiceItem[]>([]);
  const [createBarbers, setCreateBarbers] = useState<BarberItem[]>([]);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [homeImageUploading, setHomeImageUploading] = useState(false);
  const [homeImageError, setHomeImageError] = useState<string | null>(null);
  const homeImageInputRef = React.useRef<HTMLInputElement>(null);
  const defaultStyle = shopStyleConfigSchema.parse({});
  const defaultHomeByLocale = (): Record<string, HomeContent> =>
    Object.fromEntries(SUPPORTED_LOCALES.map((loc) => [loc, JSON.parse(JSON.stringify(DEFAULT_HOME_CONTENT))]));
  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    domain: string;
    path: string;
    apiBase: string;
    theme: ShopTheme;
    style: ShopStyleConfig;
    homeContentByLocale: Record<string, HomeContent>;
    settings: ShopSettings;
    ownerPassword: string;
    staffPassword: string;
  }>({
    name: '',
    slug: '',
    domain: '',
    path: '',
    apiBase: '',
    theme: { ...DEFAULT_THEME },
    style: defaultStyle,
    homeContentByLocale: defaultHomeByLocale(),
    settings: { ...DEFAULT_SETTINGS },
    ownerPassword: '',
    staffPassword: '',
  });
  const [contentLocale, setContentLocale] = useState<string>('pt-BR');
  const [featureSelectorOpen, setFeatureSelectorOpen] = useState(false);
  const [customFeatureForm, setCustomFeatureForm] = useState<{ icon: string; text: string }>({ icon: '', text: '' });
  type BarberAccessRow = { barberId: number; name: string; username: string; password: string; initialUsername: string };
  const [barberAccess, setBarberAccess] = useState<BarberAccessRow[]>([]);
  const [barberAccessLoading, setBarberAccessLoading] = useState(false);
  type EditServiceRow = { id: number; name: string; description: string | null; duration: number; price: number | null };
  type EditBarberRow = { id: number; name: string; email: string | null; phone: string | null };
  const [editServices, setEditServices] = useState<EditServiceRow[]>([]);
  const [editServicesLoading, setEditServicesLoading] = useState(false);
  const [editBarbers, setEditBarbers] = useState<EditBarberRow[]>([]);
  const [editBarbersLoading, setEditBarbersLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paletteIndices, setPaletteIndices] = useState<[number, number, number]>(() => pickThreeRandomPaletteIndices(formData.style.preset));
  const [savedPalettes, setSavedPalettes] = useState<Array<{ label: string; theme: ShopTheme }>>([]);
  const [placesLookupAddress, setPlacesLookupAddress] = useState('');
  const [placesLookupLoading, setPlacesLookupLoading] = useState(false);
  const [placesLookupMessage, setPlacesLookupMessage] = useState<string | null>(null);

  // Re-roll suggested palettes when preset changes
  useEffect(() => {
    setPaletteIndices(pickThreeRandomPaletteIndices(formData.style.preset));
  }, [formData.style.preset]);

  // Auto-clear error messages after timeout
  useErrorTimeout(errorMessage, () => setErrorMessage(null));

  // Redirect if not company admin
  useEffect(() => {
    if (!isCompanyAdmin || !user?.companyId) {
      navigate('/company/login');
    }
  }, [isCompanyAdmin, user, navigate]);

  const loadShops = useCallback(async () => {
    if (!user?.companyId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getCompanyShops(user.companyId);
      setShops(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(t('management.loadShopsError')));
    } finally {
      setIsLoading(false);
    }
  }, [user?.companyId, t]);

  useEffect(() => {
    if (user?.companyId) {
      loadShops();
    }
  }, [user?.companyId, loadShops]);

  useEffect(() => {
    if (editTab !== 'credentials' || !editingShop?.slug) {
      setBarberAccess([]);
      return;
    }
    let cancelled = false;
    setBarberAccessLoading(true);
    api.getBarbers(editingShop.slug)
      .then((list) => {
        if (!cancelled) {
          setBarberAccess(list.map((b) => ({
            barberId: b.id,
            name: b.name,
            username: b.username ?? '',
            password: '',
            initialUsername: b.username ?? '',
          })));
        }
      })
      .catch(() => {
        if (!cancelled) setBarberAccess([]);
      })
      .finally(() => {
        if (!cancelled) setBarberAccessLoading(false);
      });
    return () => { cancelled = true; };
  }, [editTab, editingShop?.slug]);

  useEffect(() => {
    if (editTab !== 'services' || !editingShop?.slug) {
      setEditServices([]);
      return;
    }
    let cancelled = false;
    setEditServicesLoading(true);
    api.getServices(editingShop.slug)
      .then((list) => {
        if (!cancelled) {
          setEditServices(list.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description ?? null,
            duration: s.duration,
            price: s.price ?? null,
          })));
        }
      })
      .catch(() => {
        if (!cancelled) setEditServices([]);
      })
      .finally(() => {
        if (!cancelled) setEditServicesLoading(false);
      });
    return () => { cancelled = true; };
  }, [editTab, editingShop?.slug]);

  useEffect(() => {
    if (editTab !== 'barbers' || !editingShop?.slug) {
      setEditBarbers([]);
      return;
    }
    let cancelled = false;
    setEditBarbersLoading(true);
    api.getBarbers(editingShop.slug)
      .then((list) => {
        if (!cancelled) {
          setEditBarbers(list.map((b) => ({
            id: b.id,
            name: b.name,
            email: b.email ?? null,
            phone: b.phone ?? null,
          })));
        }
      })
      .catch(() => {
        if (!cancelled) setEditBarbers([]);
      })
      .finally(() => {
        if (!cancelled) setEditBarbersLoading(false);
      });
    return () => { cancelled = true; };
  }, [editTab, editingShop?.slug]);

  const openCreateModal = useCallback(() => {
    setEditingShop(null);
    setFormData({
      name: '',
      slug: '',
      domain: '',
      path: '',
      apiBase: '',
      theme: { ...DEFAULT_THEME },
      style: defaultStyle,
      homeContentByLocale: defaultHomeByLocale(),
      settings: { ...DEFAULT_SETTINGS },
      ownerPassword: '',
      staffPassword: '',
    });
    setCreateServices(getDefaultServices(t));
    setCreateBarbers(getDefaultBarbers(t));
    setCreateErrors({});
    setEditTab('info');
    setPlacesLookupAddress('');
    setPlacesLookupMessage(null);
    setErrorMessage(null);
    editModal.open();
  }, [t, editModal]);

  const handleCreate = useCallback(async () => {
    if (!user?.companyId) return;
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = t('createShop.nameRequired') || t('management.nameRequired');
    if (!formData.ownerPassword.trim()) errs.ownerPassword = t('management.ownerPasswordRequired');
    else if (formData.ownerPassword.length < 6) errs.ownerPassword = t('management.ownerPasswordMin');
    if (!formData.staffPassword.trim()) errs.staffPassword = t('management.staffPasswordRequired');
    else if (formData.staffPassword.length < 6) errs.staffPassword = t('management.staffPasswordMin');
    const hasEmptyService = createServices.some((s) => !s.name.trim());
    if (hasEmptyService || createServices.length === 0) {
      errs.services = createServices.length === 0 ? t('createShop.addAtLeastOneService') : t('createShop.allServicesNeedName');
    }
    const hasEmptyBarber = createBarbers.some((b) => !b.name.trim());
    if (hasEmptyBarber || createBarbers.length === 0) {
      errs.barbers = createBarbers.length === 0 ? t('createShop.addAtLeastOneBarber') : t('createShop.allBarbersNeedName');
    }
    setCreateErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstKey = (['name', 'ownerPassword', 'staffPassword', 'services', 'barbers'] as const).find((k) => errs[k]);
      if (firstKey) {
        const tabForKey: EditTab = firstKey === 'services' ? 'services' : firstKey === 'barbers' ? 'barbers' : firstKey === 'ownerPassword' || firstKey === 'staffPassword' ? 'credentials' : 'info';
        setEditTab(tabForKey);
        const rootIds: Record<string, string> = { name: 'editNameRoot', ownerPassword: 'createOwnerPasswordRoot', staffPassword: 'createStaffPasswordRoot', services: 'create-services-section', barbers: 'create-barbers-section' };
        const mineiroIds: Record<string, string> = { name: 'editName', ownerPassword: 'createOwnerPasswordMineiro', staffPassword: 'createStaffPasswordMineiro', services: 'create-services-section', barbers: 'create-barbers-section' };
        const sectionIds = ['services', 'barbers'];
        setTimeout(() => {
          const id = rootIds[firstKey] ?? mineiroIds[firstKey];
          const el = id ? document.getElementById(id) : null;
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            if (!sectionIds.includes(firstKey)) (el as HTMLInputElement).focus?.();
          }
        }, 100);
      }
      return;
    }
    setIsSubmittingCreate(true);
    setErrorMessage(null);
    try {
      await api.createFullShop(user.companyId, {
        name: formData.name,
        slug: formData.slug || undefined,
        domain: formData.domain || undefined,
        path: formData.path || undefined,
        apiBase: formData.apiBase || undefined,
        ownerPassword: formData.ownerPassword,
        staffPassword: formData.staffPassword,
        theme: formData.theme,
        homeContentByLocale: formData.homeContentByLocale,
        settings: formData.settings,
        services: createServices.map((s) => ({
          name: s.name,
          description: s.description || undefined,
          duration: s.duration,
          price: s.price || undefined,
        })),
        barbers: createBarbers.map((b) => ({
          name: b.name,
          email: b.email || undefined,
          phone: b.phone || undefined,
        })),
      });
      setEditingShop(null);
      setFormData({ name: '', slug: '', domain: '', path: '', apiBase: '', theme: { ...DEFAULT_THEME }, style: defaultStyle, homeContentByLocale: defaultHomeByLocale(), settings: { ...DEFAULT_SETTINGS }, ownerPassword: '', staffPassword: '' });
      setCreateServices(getDefaultServices(t));
      setCreateBarbers(getDefaultBarbers(t));
      setCreateErrors({});
      editModal.close();
      await loadShops();
    } catch (err) {
      setErrorMessage(getErrorMessage(err, t('createShop.createError')));
    } finally {
      setIsSubmittingCreate(false);
    }
  }, [user?.companyId, formData, createServices, createBarbers, t, loadShops, editModal, setEditTab]);

  const handleEdit = useCallback(async () => {
    if (!user?.companyId || !editingShop || !formData.name.trim()) {
      setErrorMessage(t('management.nameRequired'));
      return;
    }
    const op = formData.ownerPassword.trim();
    const sp = formData.staffPassword.trim();
    if (op && op.length < 6) {
      setErrorMessage(t('management.ownerPasswordMin'));
      return;
    }
    if (sp && sp.length < 6) {
      setErrorMessage(t('management.staffPasswordMin'));
      return;
    }
    for (const row of barberAccess) {
      if (row.password.trim() && row.username.trim().length < 1) {
        setErrorMessage(`Barbeiro "${row.name}": ${t('management.barberUserRequired')}`);
        return;
      }
      if (row.password.trim() && row.password.trim().length < 6) {
        setErrorMessage(`Barbeiro "${row.name}": ${t('management.barberPasswordMin')}`);
        return;
      }
    }

    try {
      await api.updateCompanyShop(user.companyId, editingShop.id, {
        name: formData.name,
        slug: formData.slug || undefined,
        domain: formData.domain || null,
        path: formData.path || null,
        apiBase: formData.apiBase || null,
        theme: { ...formData.theme, style: formData.style },
        homeContentByLocale: formData.homeContentByLocale,
        settings: formData.settings,
        ...(op && { ownerPassword: op }),
        ...(sp && { staffPassword: sp }),
      });
      for (const row of barberAccess) {
        const un = row.username.trim();
        const pw = row.password.trim();
        const changed = un !== row.initialUsername || pw.length > 0;
        if (changed) {
          await api.updateCompanyShopBarber(user.companyId, editingShop.id, row.barberId, {
            username: un.length > 0 ? un : null,
            ...(pw.length > 0 ? { password: pw } : undefined),
          });
        }
      }
      for (const s of editServices) {
        if (s.id > 0) {
          await api.updateService(s.id, {
            name: s.name,
            description: s.description ?? undefined,
            duration: s.duration,
            price: s.price ?? undefined,
          });
        } else if (s.name.trim()) {
          await api.createService(editingShop.slug, {
            name: s.name.trim(),
            description: s.description ?? undefined,
            duration: s.duration,
            price: s.price ?? undefined,
          });
        }
      }
      for (const b of editBarbers) {
        if (b.id > 0) {
          await api.updateBarber(b.id, { name: b.name.trim() || b.name });
        } else if (b.name.trim()) {
          await api.createBarber(editingShop.slug, { name: b.name.trim() });
        }
      }
      setEditingShop(null);
      setFormData({ name: '', slug: '', domain: '', path: '', apiBase: '', theme: { ...DEFAULT_THEME }, style: defaultStyle, homeContentByLocale: defaultHomeByLocale(), settings: { ...DEFAULT_SETTINGS }, ownerPassword: '', staffPassword: '' });
      setBarberAccess([]);
      setEditServices([]);
      setEditBarbers([]);
      setContentLocale('pt-BR');
      editModal.close();
      invalidateConfig(editingShop.slug);
      await loadShops();
    } catch (error) {
      const errorMsg = getErrorMessage(error, t('management.updateError'));
      setErrorMessage(errorMsg);
    }
  }, [editingShop, formData, barberAccess, editServices, editBarbers, user?.companyId, loadShops, editModal, invalidateConfig, t]);

  const handleDelete = useCallback(async () => {
    if (!user?.companyId || !shopToDelete) return;

    const idToDelete = shopToDelete;
    deleteConfirmModal.close();
    setShopToDelete(null);
    setShops((prev) => prev.filter((s) => s.id !== idToDelete));

    try {
      await api.deleteCompanyShop(user.companyId, idToDelete);
      const data = await api.getCompanyShops(user.companyId);
      setShops(data);
    } catch (error) {
      const errorMsg = getErrorMessage(error, t('management.deleteError'));
      setErrorMessage(errorMsg);
      const data = await api.getCompanyShops(user.companyId);
      setShops(data);
    }
  }, [shopToDelete, user?.companyId, deleteConfirmModal]);

  const handlePlacesLookup = useCallback(async () => {
    const address = placesLookupAddress.trim();
    if (!address || !user?.companyId) return;
    setPlacesLookupMessage(null);
    setPlacesLookupLoading(true);
    try {
      const result = await api.lookupPlacesByAddress(user.companyId, address);
      const loc = result.location;
      const hasAny = loc.name ?? loc.address ?? loc.phone ?? loc.phoneHref ?? loc.hours ?? loc.mapQuery ?? loc.addressLink;
      if (!hasAny) {
        setPlacesLookupMessage(t('management.noResults'));
        return;
      }
      setFormData((prev) => {
        const updates: Partial<HomeContent['location']> = {};
        if (typeof loc.address === 'string' && loc.address) updates.address = loc.address;
        if (typeof loc.addressLink === 'string' && loc.addressLink) updates.addressLink = loc.addressLink;
        if (typeof loc.mapQuery === 'string' && loc.mapQuery) updates.mapQuery = loc.mapQuery;
        if (typeof loc.phone === 'string' && loc.phone) updates.phone = loc.phone;
        if (typeof loc.phoneHref === 'string' && loc.phoneHref) updates.phoneHref = loc.phoneHref;
        if (typeof loc.hours === 'string' && loc.hours) updates.hours = loc.hours;
        const namePatch = typeof loc.name === 'string' && loc.name && !prev.name.trim()
          ? { name: loc.name }
          : {};
        const cur = prev.homeContentByLocale[contentLocale] ?? JSON.parse(JSON.stringify(DEFAULT_HOME_CONTENT));
        return {
          ...prev,
          ...namePatch,
          homeContentByLocale: {
            ...prev.homeContentByLocale,
            [contentLocale]: { ...cur, location: { ...cur.location, ...updates } },
          },
        };
      });
      setPlacesLookupMessage('success:' + t('management.lookupSuccess'));
    } catch (err: unknown) {
      const statusCode = err && typeof err === 'object' && 'statusCode' in err ? (err as { statusCode: number }).statusCode : 0;
      const msg = statusCode === 503
        ? t('management.lookupUnavailable')
        : getErrorMessage(err, t('management.lookupError'));
      setPlacesLookupMessage(msg);
    } finally {
      setPlacesLookupLoading(false);
    }
  }, [user?.companyId, placesLookupAddress, contentLocale]);

  const openEditModal = (shop: Shop) => {
    setEditingShop(shop);
    const nextStyle = mergeStyleForEdit(shop.theme ?? null);
    setFormData({
      name: shop.name,
      slug: shop.slug,
      domain: shop.domain || '',
      path: shop.path || '',
      apiBase: shop.apiBase || '',
      theme: mergeTheme(shop.theme ?? null),
      style: nextStyle,
      homeContentByLocale: normalizeToHomeContentByLocaleForEdit(shop.homeContent ?? null),
      settings: mergeSettingsForEdit(shop.settings ?? null),
      ownerPassword: '',
      staffPassword: '',
    });
    setContentLocale('pt-BR');
    setPaletteIndices(pickThreeRandomPaletteIndices(nextStyle.preset));
    setEditTab('info');
    setPlacesLookupAddress('');
    setPlacesLookupMessage(null);
    editModal.open();
  };

  if (!isCompanyAdmin || !user?.companyId) {
    return null;
  }

  const useRootTheme = isRootBuild();

  if (useRootTheme) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <RootSiteNav />
        {/* Error Message Toast */}
        {errorMessage && (
          <div 
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#ef4444] text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 max-w-[calc(100%-2rem)] sm:max-w-md"
            role="alert"
            aria-live="assertive"
          >
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            <p className="flex-1 text-sm sm:text-base">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-white/80 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={t('management.closeErrorAria')}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}
        <main className="py-20">
          <Container size="2xl">
          <div className="text-center mb-16">
            <h1 className="text-5xl sm:text-6xl font-light mb-6 tracking-tight">{t('company.manageShops')}</h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
              {t('company.manageShopsSubtitle')}
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 sm:gap-3 w-full max-w-[300px] mx-auto mb-8 sm:mb-10 px-4 sm:px-6 py-3 sm:py-4 bg-white text-[#0a0a0a] border-none rounded-xl text-sm sm:text-base font-medium transition-all hover:bg-gray-100 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-white/30"
            aria-label={t('management.addShopAria')}
          >
            <span className="material-symbols-outlined text-lg sm:text-xl" aria-hidden="true">add</span>
            {t('company.addShop')}
          </button>

        {/* Shops Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10" aria-busy="true" aria-live="polite">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-[200px] rounded-xl bg-white/5 border border-white/10 animate-pulse"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : error ? (
          <ErrorDisplay error={error} onRetry={loadShops} />
        ) : shops.length === 0 ? (
          <div className="empty-state text-center py-12 sm:py-[60px] px-4 sm:px-5 text-[rgba(255,255,255,0.7)]">
            <span className="material-symbols-outlined text-[3rem] sm:text-[4rem] text-[rgba(255,255,255,0.5)] mb-3 sm:mb-4 block" aria-hidden="true">
              store
            </span>
            <p className="text-sm sm:text-base">{t('management.noShopsRegistered')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 sm:mb-10">
            {shops.map((shop) => (
              <article
                key={shop.id}
                className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all hover:border-white/20 hover:bg-white/10 relative overflow-hidden"
                aria-labelledby={`shop-name-${shop.id}`}
              >
                <div className="shop-header mb-4 sm:mb-5">
                  <div className="text-3xl text-blue-400 mb-2">
                    <span className="material-symbols-outlined">store</span>
                  </div>
                  <h3 id={`shop-name-${shop.id}`} className="text-lg sm:text-xl font-light text-white mb-2">
                    {shop.name}
                  </h3>
                  <div className="text-xs sm:text-sm text-gray-400 mb-1">
                    <span className="font-medium">Slug:</span> {shop.slug}
                  </div>
                  {shop.domain && (
                    <div className="text-xs sm:text-sm text-gray-400 mb-1">
                      <span className="font-medium">Domínio:</span> {shop.domain}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => openEditModal(shop)}
                    className="flex-1 px-2 sm:px-3 py-2.5 sm:py-3 border border-white/20 rounded-lg text-xs sm:text-sm font-medium cursor-pointer transition-all min-h-[44px] bg-white/5 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
                    aria-label={`Editar barbearia ${shop.name}`}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      setShopToDelete(shop.id);
                      deleteConfirmModal.open();
                    }}
                    className="flex-1 px-2 sm:px-3 py-2.5 sm:py-3 border border-[rgba(239,68,68,0.3)] rounded-lg text-xs sm:text-sm font-medium cursor-pointer transition-all min-h-[44px] bg-[rgba(239,68,68,0.2)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.3)] focus:outline-none focus:ring-2 focus:ring-[#ef4444] focus:ring-offset-2 focus:ring-offset-[#242424]"
                    aria-label={`Remover barbearia ${shop.name}`}
                  >
                    Remover
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

          {/* Edit Shop Modal - Root theme */}
          {editModal.isOpen && (
            <div
              className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-5"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-modal-title-root"
            >
              <div className="modal-content bg-[#242424] border border-white/20 rounded-2xl p-5 sm:p-6 lg:p-8 max-w-[min(90vw,720px)] w-full min-w-[320px] max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 shadow-2xl">
                <header className="flex-shrink-0 mb-6">
                  <h2 id="edit-modal-title-root" className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                    {editingShop ? t('management.editShop') ?? 'Editar Barbearia' : t('createShop.createShop')}
                  </h2>
                  <p className="text-white/50 text-sm mt-1">
                    {editingShop ? t('management.infoIntro') : t('createShop.newShop')}
                  </p>
                </header>
                <nav className="flex-shrink-0 border-b border-white/15 overflow-x-auto -mx-1 px-1" aria-label={t('management.settingsTab')}>
                  <div className="flex gap-0 min-w-max">
                    {editModalTabs.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setEditTab(tab as EditTab)}
                        className={`relative py-3 px-4 text-sm font-medium transition-colors whitespace-nowrap rounded-t-lg ${
                          editTab === tab
                            ? 'text-white'
                            : 'text-white/55 hover:text-white/85'
                        }`}
                        aria-current={editTab === tab ? 'page' : undefined}
                      >
                        {tab === 'info' && t('management.infoTab')}
                        {tab === 'appearance' && t('management.appearanceTab')}
                        {tab === 'content' && t('management.contentTab')}
                        {tab === 'settings' && t('management.settingsTab')}
                        {tab === 'credentials' && t('management.credentialsTab')}
                        {tab === 'services' && t('createShop.servicesTab')}
                        {tab === 'barbers' && t('createShop.barbersTab')}
                        {editTab === tab && (
                          <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full min-w-[4px]" aria-hidden="true" />
                        )}
                      </button>
                    ))}
                  </div>
                </nav>
                <form onSubmit={(e) => { e.preventDefault(); editingShop ? handleEdit() : handleCreate(); }} className="flex-1 overflow-y-auto min-h-0 pr-1 mt-5">
                  {editTab === 'info' && (
                    <section className="space-y-6">
                      <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-5 space-y-4">
                        <h3 className="text-sm font-medium text-white/90 uppercase tracking-wider">{t('management.infoTab')}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="editNameRoot" className="block text-white/70 text-sm mb-1.5">{t('management.name')} *</label>
                            <input
                              id="editNameRoot"
                              type="text"
                              value={formData.name}
                              onChange={(e) => {
                                const name = e.target.value;
                                setFormData((prev) => ({
                                  ...prev,
                                  name,
                                  ...(!editingShop && (!prev.slug || prev.slug === generateSlug(prev.name)) ? { slug: generateSlug(name) } : {}),
                                }));
                              }}
                              required
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20"
                            />
                            {!editingShop && createErrors.name && <p className="text-red-400 text-xs mt-1">{createErrors.name}</p>}
                          </div>
                          <div>
                            <label htmlFor="editSlugRoot" className="block text-white/70 text-sm mb-1.5">{t('management.slug')} *</label>
                            <input
                              id="editSlugRoot"
                              type="text"
                              value={formData.slug}
                              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                              required
                              pattern="[-a-z0-9]+"
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-5 space-y-4">
                        <h3 className="text-sm font-medium text-white/90 uppercase tracking-wider">{t('management.domain')}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <label htmlFor="editDomainRoot" className="block text-white/60 text-sm mb-1.5">{t('management.domain')}</label>
                            <input
                              id="editDomainRoot"
                              type="text"
                              value={formData.domain}
                              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                              placeholder={t('management.domainPlaceholder')}
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20 placeholder:text-white/30"
                            />
                          </div>
                          <div>
                            <label htmlFor="editPathRoot" className="block text-white/60 text-sm mb-1.5">{t('management.path')}</label>
                            <input
                              id="editPathRoot"
                              type="text"
                              value={formData.path}
                              onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                              placeholder={t('management.pathPlaceholder')}
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20 placeholder:text-white/30"
                            />
                          </div>
                          <div>
                            <label htmlFor="editApiBaseRoot" className="block text-white/60 text-sm mb-1.5">{t('management.apiBase')}</label>
                            <input
                              id="editApiBaseRoot"
                              type="url"
                              value={formData.apiBase}
                              onChange={(e) => setFormData({ ...formData, apiBase: e.target.value })}
                              placeholder={t('management.apiBasePlaceholder')}
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20 placeholder:text-white/30"
                            />
                          </div>
                        </div>
                      </div>
                    </section>
                  )}
                  {editTab === 'credentials' && !editingShop && (
                    <div className="space-y-6 rounded-xl bg-white/5 border border-white/10 p-4 sm:p-5">
                      <h3 className="text-sm font-medium text-white/90 uppercase tracking-wider">{t('management.accessCredentials')}</h3>
                      <div>
                        <label htmlFor="createOwnerPasswordRoot" className="block text-white/70 text-sm mb-2">{t('management.ownerPassword')} *</label>
                        <input id="createOwnerPasswordRoot" type="password" value={formData.ownerPassword} onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })} required minLength={6} placeholder={t('management.ownerPasswordPlaceholder')} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white text-base min-h-[44px] placeholder:text-white/30" />
                        {createErrors.ownerPassword && <p className="text-red-400 text-xs mt-1">{createErrors.ownerPassword}</p>}
                      </div>
                      <div>
                        <label htmlFor="createStaffPasswordRoot" className="block text-white/70 text-sm mb-2">{t('management.staffPassword')} *</label>
                        <input id="createStaffPasswordRoot" type="password" value={formData.staffPassword} onChange={(e) => setFormData({ ...formData, staffPassword: e.target.value })} required minLength={6} placeholder={t('management.staffPasswordPlaceholder')} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white text-base min-h-[44px] placeholder:text-white/30" />
                        {createErrors.staffPassword && <p className="text-red-400 text-xs mt-1">{createErrors.staffPassword}</p>}
                      </div>
                      <div className="pt-4 border-t border-white/10">
                        <h4 className="text-sm font-medium text-white/90 uppercase tracking-wider mb-2">{t('management.kioskAccess')}</h4>
                        <p className="text-white/60 text-sm mb-3">{t('management.kioskAccessHint')}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-white/60 text-sm mb-2">{t('management.kioskUsername')}</label>
                            <input type="text" value={formData.settings.kioskUsername || ''} onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, kioskUsername: e.target.value || undefined } })} placeholder={t('management.kioskUsernamePlaceholder')} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" />
                          </div>
                          <div>
                            <label className="block text-white/60 text-sm mb-2">{t('management.kioskPassword')}</label>
                            <input type="password" value={formData.settings.kioskPassword || ''} onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, kioskPassword: e.target.value || undefined } })} placeholder={t('management.kioskPasswordPlaceholder')} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {editTab === 'services' && (
                    <div id="create-services-section" className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-5">
                      {!editingShop && createErrors.services && <p className="text-red-400 text-sm mb-4">{createErrors.services}</p>}
                      {!editingShop && <StepServices services={createServices} onChange={setCreateServices} errors={createErrors} />}
                      {editingShop && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2">{t('createShop.servicesTab')}</h2>
                            <p className="text-white/60 text-sm">{t('createShop.servicesIntro')}</p>
                          </div>
                          {editServicesLoading ? (
                            <p className="text-white/50 text-sm">{t('common.loading')}</p>
                          ) : (
                            <>
                              <div className="space-y-4">
                                {editServices.map((s, index) => (
                                  <div key={s.id} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2 relative">
                                    {editServices.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (s.id > 0) {
                                            try {
                                              await api.deleteService(s.id);
                                              setEditServices((prev) => prev.filter((x) => x.id !== s.id));
                                            } catch (err) {
                                              setErrorMessage(getErrorMessage(err, t('management.updateError')));
                                            }
                                          } else {
                                            setEditServices((prev) => prev.filter((x) => x.id !== s.id));
                                          }
                                        }}
                                        className="absolute top-3 right-3 text-red-400/60 hover:text-red-400 transition-colors p-1"
                                        aria-label={t('createShop.removeService')}
                                      >
                                        <span className="material-symbols-outlined text-lg">close</span>
                                      </button>
                                    )}
                                    <span className="text-white/40 text-xs font-medium uppercase tracking-wider">{t('createShop.serviceN')} {index + 1}</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="sm:col-span-2">
                                        <input
                                          type="text"
                                          value={s.name}
                                          onChange={(e) => setEditServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)))}
                                          placeholder={t('createShop.serviceNamePlaceholder')}
                                          className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                                        />
                                      </div>
                                      <div className="sm:col-span-2">
                                        <input
                                          type="text"
                                          value={s.description ?? ''}
                                          onChange={(e) => setEditServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, description: e.target.value || null } : x)))}
                                          placeholder={t('createShop.serviceDescPlaceholder')}
                                          className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-white/50 text-xs mb-1">{t('createShop.durationMin')}</label>
                                        <input
                                          type="number"
                                          min={1}
                                          value={s.duration}
                                          onChange={(e) => setEditServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, duration: parseInt(e.target.value, 10) || 1 } : x)))}
                                          className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-white/50 text-xs mb-1">{t('createShop.priceReais')}</label>
                                        <input
                                          type="number"
                                          min={0}
                                          step="0.01"
                                          value={s.price != null ? (s.price / 100).toFixed(2) : ''}
                                          onChange={(e) => setEditServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, price: Math.round(parseFloat(e.target.value || '0') * 100) } : x)))}
                                          className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditServices((prev) => [...prev, { id: 0, name: '', description: null, duration: 30, price: null }])}
                                className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-white/20 rounded-xl text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all text-sm"
                              >
                                <span className="material-symbols-outlined text-lg">add</span>
                                {t('createShop.addService')}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {editTab === 'barbers' && (
                    <div id="create-barbers-section" className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-5">
                      {!editingShop && createErrors.barbers && <p className="text-red-400 text-sm mb-4">{createErrors.barbers}</p>}
                      {!editingShop && <StepBarbers barbers={createBarbers} onChange={setCreateBarbers} errors={createErrors} />}
                      {editingShop && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2">{t('createShop.barbersTab')}</h2>
                            <p className="text-white/60 text-sm">{t('createShop.barbersIntro')}</p>
                          </div>
                          {editBarbersLoading ? (
                            <p className="text-white/50 text-sm">{t('common.loading')}</p>
                          ) : (
                            <>
                              <div className="space-y-4">
                                {editBarbers.map((b, index) => (
                                  <div key={b.id} className="rounded-lg border border-white/10 bg-white/5 p-4 relative">
                                    {editBarbers.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (b.id > 0) {
                                            try {
                                              await api.deleteBarber(b.id);
                                              setEditBarbers((prev) => prev.filter((x) => x.id !== b.id));
                                            } catch (err) {
                                              setErrorMessage(getErrorMessage(err, t('management.updateError')));
                                            }
                                          } else {
                                            setEditBarbers((prev) => prev.filter((x) => x.id !== b.id));
                                          }
                                        }}
                                        className="absolute top-3 right-3 text-red-400/60 hover:text-red-400 transition-colors p-1"
                                        aria-label={t('createShop.removeBarber')}
                                      >
                                        <span className="material-symbols-outlined text-lg">close</span>
                                      </button>
                                    )}
                                    <span className="text-white/40 text-xs font-medium uppercase tracking-wider">{t('createShop.barberN')} {index + 1}</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                      <div className="sm:col-span-2">
                                        <input
                                          type="text"
                                          value={b.name}
                                          onChange={(e) => setEditBarbers((prev) => prev.map((x) => (x.id === b.id ? { ...x, name: e.target.value } : x)))}
                                          placeholder={t('createShop.namePlaceholder')}
                                          className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                                        />
                                      </div>
                                      {b.email != null && b.email !== '' && (
                                        <p className="text-white/60 text-sm sm:col-span-2">{b.email}</p>
                                      )}
                                      {b.phone != null && b.phone !== '' && (
                                        <p className="text-white/60 text-sm sm:col-span-2">{b.phone}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditBarbers((prev) => [...prev, { id: 0, name: '', email: null, phone: null }])}
                                className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-white/20 rounded-xl text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all text-sm"
                              >
                                <span className="material-symbols-outlined text-lg">add</span>
                                {t('createShop.addBarber')}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {editTab === 'appearance' && (
                    <AppearanceForm
                      formData={formData}
                      setFormData={setFormData as React.Dispatch<React.SetStateAction<{ theme: ShopTheme; style: ShopStyleConfig }>>}
                      variant="root"
                      paletteIndices={paletteIndices}
                      onRerollPalettes={() => setPaletteIndices(pickThreeRandomPaletteIndices(formData.style.preset))}
                      savedPalettes={savedPalettes}
                      onSaveCurrentPalette={(label) =>
                        setSavedPalettes((prev) => [...prev, { label, theme: { ...formData.theme } }])
                      }
                    />
                  )}
                  {editTab === 'content' && (() => {
                    const contentForm = formData.homeContentByLocale[contentLocale] ?? JSON.parse(JSON.stringify(DEFAULT_HOME_CONTENT));
                    const setContentForm = (patch: Partial<HomeContent> | ((prev: HomeContent) => HomeContent)) => setFormData((prev) => {
                      const cur = prev.homeContentByLocale[contentLocale] ?? JSON.parse(JSON.stringify(DEFAULT_HOME_CONTENT));
                      const next = typeof patch === 'function' ? patch(cur) : { ...cur, ...patch };
                      return { ...prev, homeContentByLocale: { ...prev.homeContentByLocale, [contentLocale]: next } };
                    });
                    return (
                    <div className="space-y-6 max-h-[50vh] overflow-y-auto">
                      <p className="text-white/60 text-sm">{t('management.contentIntro')}</p>
                      <div className="flex gap-2 border-b border-white/10 pb-2">
                        {SUPPORTED_LOCALES.map((loc) => (
                          <button key={loc} type="button" onClick={() => setContentLocale(loc)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${contentLocale === loc ? 'bg-[#D4AF37] text-[#0a0a0a]' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}>{t(`locale.${loc}`)}</button>
                        ))}
                      </div>
                      <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-white font-medium">{t('management.storeIcons')}</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-white/60 text-sm mb-1">{t('management.favicon')}</label>
                            <input type="url" value={contentForm.branding.faviconUrl} onChange={(e) => setContentForm({ branding: { ...contentForm.branding, faviconUrl: e.target.value } })} placeholder="https://..." className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder:text-white/30" />
                          </div>
                          <div>
                            <label className="block text-white/60 text-sm mb-1">{t('management.headerIcon')}</label>
                            <input type="url" value={contentForm.branding.headerIconUrl} onChange={(e) => setContentForm({ branding: { ...contentForm.branding, headerIconUrl: e.target.value } })} placeholder="https://..." className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder:text-white/30" />
                          </div>
                        </div>
                      </section>
                      <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-white font-medium">Hero</h4>
                        <div className="space-y-3">
                          <div><label className="block text-white/60 text-sm mb-1">{t('management.heroBadge')}</label><input type="text" value={contentForm.hero.badge} onChange={(e) => setContentForm({ hero: { ...contentForm.hero, badge: e.target.value } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          <div><label className="block text-white/60 text-sm mb-1">{t('management.subtitle')}</label><input type="text" value={contentForm.hero.subtitle} onChange={(e) => setContentForm({ hero: { ...contentForm.hero, subtitle: e.target.value } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          <div><label className="block text-white/60 text-sm mb-1">{t('management.ctaJoin')}</label><input type="text" value={contentForm.hero.ctaJoin} onChange={(e) => setContentForm({ hero: { ...contentForm.hero, ctaJoin: e.target.value } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          <div><label className="block text-white/60 text-sm mb-1">{t('management.ctaLocation')}</label><input type="text" value={contentForm.hero.ctaLocation} onChange={(e) => setContentForm({ hero: { ...contentForm.hero, ctaLocation: e.target.value } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                        </div>
                      </section>
                      <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-white font-medium">{t('management.navSection')}</h4>
                        <div className="space-y-3">
                          {([{ key: 'linkServices' as const, label: t('management.linkServices') }, { key: 'linkAbout' as const, label: t('management.linkAbout') }, { key: 'linkLocation' as const, label: t('management.linkLocation') }, { key: 'ctaJoin' as const, label: t('management.ctaJoinLabel') }, { key: 'linkBarbers' as const, label: t('management.linkBarbers') }]).map(({ key, label }) => (
                            <div key={key}><label className="block text-white/60 text-sm mb-1">{label}</label><input type="text" value={contentForm.nav[key]} onChange={(e) => setContentForm({ nav: { ...contentForm.nav, [key]: e.target.value } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          ))}
                        </div>
                      </section>
                      <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-white font-medium">{t('management.aboutSection')}</h4>
                        <div className="space-y-3">
                          <div><label className="block text-white/60 text-sm mb-1">{t('management.sectionTitle')}</label><input type="text" value={contentForm.about.sectionTitle} onChange={(e) => setContentForm({ about: { ...contentForm.about, sectionTitle: e.target.value } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          <div>
                            <label className="block text-white/60 text-sm mb-1">{t('management.imageUrl')}</label>
                            <div className="flex flex-wrap gap-2 items-center">
                              <input type="url" value={contentForm.about.imageUrl} onChange={(e) => { setHomeImageError(null); setContentForm({ about: { ...contentForm.about, imageUrl: e.target.value } }); }} placeholder="https://..." className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm flex-1 min-w-[200px] placeholder:text-white/30" />
                              <input ref={homeImageInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file || !user?.companyId) return;
                                setHomeImageError(null);
                                setHomeImageUploading(true);
                                try {
                                  const { url } = editingShop ? await api.uploadShopHomeImage(user.companyId, editingShop.id, file) : await api.uploadDraftHomeImage(user.companyId, file);
                                  setContentForm({ about: { ...contentForm.about, imageUrl: url } });
                                } catch (err) {
                                  setHomeImageError(getErrorMessage(err, t('management.uploadError')));
                                } finally {
                                  setHomeImageUploading(false);
                                  e.target.value = '';
                                }
                              }} />
                              <button type="button" onClick={() => homeImageInputRef.current?.click()} disabled={homeImageUploading} className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium disabled:opacity-50 min-h-[44px]">{homeImageUploading ? t('common.loading') : t('management.uploadImage')}</button>
                            </div>
                            {homeImageError && <p className="text-sm text-red-400 mt-1">{homeImageError}</p>}
                          </div>
                          <div><label className="block text-white/60 text-sm mb-1">{t('management.imageAlt')}</label><input type="text" value={contentForm.about.imageAlt} onChange={(e) => setContentForm({ about: { ...contentForm.about, imageAlt: e.target.value } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          <div>
                            <label className="block text-white/60 text-sm mb-2">{t('management.features')}</label>
                            <div className="space-y-2">
                              {contentForm.about.features.map((feature, idx) => (
                                <div key={idx} className="flex gap-2 items-start">
                                  <span className="material-symbols-outlined text-white/60 text-xl mt-2">{feature.icon}</span>
                                  <input type="text" value={feature.text} readOnly className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
                                  <button type="button" onClick={() => { const newFeatures = contentForm.about.features.filter((_, i) => i !== idx); setContentForm({ about: { ...contentForm.about, features: newFeatures } }); }} className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm"><span className="material-symbols-outlined text-base">delete</span></button>
                                </div>
                              ))}
                              <button type="button" onClick={() => { setCustomFeatureForm({ icon: '', text: '' }); setFeatureSelectorOpen(true); }} className="w-full py-2 border border-dashed border-white/20 rounded-lg text-white/60 hover:text-white hover:border-white/40 transition-colors text-sm flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-base">add</span>
                                {t('management.addFeature')}
                              </button>
                            </div>
                          </div>
                        </div>
                      </section>
                      <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-white font-medium">{t('management.servicesSection')}</h4>
                        <div className="space-y-3">
                          <div><label className="block text-white/60 text-sm mb-1">{t('management.sectionTitle')}</label><input type="text" value={contentForm.services.sectionTitle} onChange={(e) => setContentForm({ services: { ...contentForm.services, sectionTitle: e.target.value } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          <div><label className="block text-white/60 text-sm mb-1">{t('management.loadingText')}</label><input type="text" value={contentForm.services.loadingText} onChange={(e) => setContentForm({ services: { ...contentForm.services, loadingText: e.target.value } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          <div><label className="block text-white/60 text-sm mb-1">{t('management.emptyText')}</label><input type="text" value={contentForm.services.emptyText} onChange={(e) => setContentForm({ services: { ...contentForm.services, emptyText: e.target.value } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                        </div>
                      </section>
                      <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-white font-medium">{t('management.locationSection')}</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-white/60 text-sm mb-1">{t('management.lookupByAddress')}</label>
                            <div className="flex gap-2 flex-wrap">
                              <input type="text" value={placesLookupAddress} onChange={(e) => setPlacesLookupAddress(e.target.value)} placeholder={t('management.addressPlaceholder')} className="flex-1 min-w-[200px] w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20" disabled={placesLookupLoading} />
                              <button type="button" onClick={handlePlacesLookup} disabled={placesLookupLoading || !placesLookupAddress.trim()} className="px-4 py-2.5 rounded-lg bg-[#D4AF37] text-[#0a0a0a] font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]">{placesLookupLoading ? t('management.searching') : t('management.search')}</button>
                            </div>
                            {placesLookupMessage && <p className={`text-sm mt-1 ${placesLookupMessage.startsWith('success:') ? 'text-green-400' : 'text-amber-400'}`}>{placesLookupMessage.startsWith('success:') ? placesLookupMessage.slice(8) : placesLookupMessage}</p>}
                          </div>
                          <div><label className="block text-white/60 text-sm mb-1">{t('management.address')}</label><textarea value={contentForm.location.address} onChange={(e) => setContentForm({ location: { ...contentForm.location, address: e.target.value } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm min-h-[60px]" /></div>
                          <div><label className="block text-white/60 text-sm mb-1">{t('management.hours')}</label><textarea value={contentForm.location.hours} onChange={(e) => setContentForm({ location: { ...contentForm.location, hours: e.target.value } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          <div><label className="block text-white/60 text-sm mb-1">{t('management.phone')}</label><input type="text" value={contentForm.location.phone} onChange={(e) => setContentForm({ location: { ...contentForm.location, phone: e.target.value } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          <div><label className="block text-white/60 text-sm mb-1">{t('management.phoneLink')}</label><input type="text" value={contentForm.location.phoneHref} onChange={(e) => setContentForm({ location: { ...contentForm.location, phoneHref: e.target.value } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" placeholder="tel:+55..." /></div>
                          <div><label className="block text-white/60 text-sm mb-1">{t('management.languages')}</label><input type="text" value={contentForm.location.languages} onChange={(e) => setContentForm({ location: { ...contentForm.location, languages: e.target.value } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          <div><label className="block text-white/60 text-sm mb-1">{t('management.mapQuery')}</label><input type="text" value={contentForm.location.mapQuery} onChange={(e) => setContentForm({ location: { ...contentForm.location, mapQuery: e.target.value } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                        </div>
                      </section>
                      <Modal isOpen={featureSelectorOpen} onClose={() => setFeatureSelectorOpen(false)} title={t('management.selectFeature')} className="max-w-2xl">
                        <div className="space-y-4">
                          {['service', 'amenity', 'payment', 'special'].map((category) => {
                            const categoryFeatures = BARBERSHOP_FEATURES.filter(f => f.category === category);
                            const categoryLabels: Record<string, { pt: string; en: string }> = { service: { pt: 'Serviços', en: 'Services' }, amenity: { pt: 'Comodidades', en: 'Amenities' }, payment: { pt: 'Pagamento', en: 'Payment' }, special: { pt: 'Especiais', en: 'Special' } };
                            const categoryLabel = contentLocale === 'pt-BR' ? categoryLabels[category]?.pt : categoryLabels[category]?.en;
                            return (
                              <div key={category}>
                                <h5 className="text-white/80 font-medium text-sm mb-2">{categoryLabel}</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {categoryFeatures.map((feature) => (
                                    <button key={feature.id} type="button" onClick={() => { const text = contentLocale === 'pt-BR' ? feature.labelPtBR : feature.labelEn; setContentForm({ about: { ...contentForm.about, features: [...contentForm.about.features, { icon: feature.icon, text }] } }); setFeatureSelectorOpen(false); }} className="flex items-center gap-3 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-left transition-colors">
                                      <span className="material-symbols-outlined text-white/80">{feature.icon}</span>
                                      <span className="text-white text-sm">{contentLocale === 'pt-BR' ? feature.labelPtBR : feature.labelEn}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          <div className="pt-4 border-t border-white/10">
                            <h5 className="text-white/80 font-medium text-sm mb-3">{t('management.customFeature')}</h5>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-white/60 text-sm mb-1">{t('management.customFeatureIcon')}</label>
                                <input type="text" value={customFeatureForm.icon} onChange={(e) => setCustomFeatureForm({ ...customFeatureForm, icon: e.target.value })} placeholder="star" className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm" />
                              </div>
                              <div>
                                <label className="block text-white/60 text-sm mb-1">{t('management.customFeatureText')}</label>
                                <input type="text" value={customFeatureForm.text} onChange={(e) => setCustomFeatureForm({ ...customFeatureForm, text: e.target.value })} placeholder="Ex: Ambiente familiar" className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm" />
                              </div>
                              <button type="button" onClick={() => { if (customFeatureForm.icon.trim() && customFeatureForm.text.trim()) { setContentForm({ about: { ...contentForm.about, features: [...contentForm.about.features, { icon: customFeatureForm.icon.trim(), text: customFeatureForm.text.trim() }] } }); setCustomFeatureForm({ icon: '', text: '' }); setFeatureSelectorOpen(false); } }} disabled={!customFeatureForm.icon.trim() || !customFeatureForm.text.trim()} className="w-full px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                {t('management.addCustomFeature')}
                              </button>
                            </div>
                          </div>
                        </div>
                      </Modal>
                    </div>
                    );
                  })()}
                  {editTab === 'settings' && (
                    <div className="space-y-6">
                      <section className="p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
                        <h3 className="text-sm font-medium text-white/90 uppercase tracking-wider">{t('management.queueSection')}</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-white/60 text-sm mb-2">{t('management.maxQueueSize')}</label>
                            <input type="number" min={1} max={500} value={formData.settings.maxQueueSize} onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, maxQueueSize: parseInt(e.target.value) || 80 } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" />
                          </div>
                          <div>
                            <label className="block text-white/60 text-sm mb-2">{t('management.defaultServiceDuration')}</label>
                            <input type="number" min={1} max={480} value={formData.settings.defaultServiceDuration} onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, defaultServiceDuration: parseInt(e.target.value) || 20 } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" />
                          </div>
                        </div>
                      </section>
                      <section className="p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
                        <h3 className="text-sm font-medium text-white/90 uppercase tracking-wider">{t('management.serviceRules')}</h3>
                        <ul className="space-y-4">
                          {([
                            { key: 'requirePhone' as const, labelKey: 'management.requirePhone' },
                            { key: 'allowBarberPreference' as const, labelKey: 'management.allowBarberPreference' },
                            { key: 'requireBarberChoice' as const, labelKey: 'management.requireBarberChoice' },
                            { key: 'allowDuplicateNames' as const, labelKey: 'management.allowDuplicateNames' },
                            { key: 'deviceDeduplication' as const, labelKey: 'management.deviceDeduplication' },
                            { key: 'allowCustomerCancelInProgress' as const, labelKey: 'management.allowCustomerCancelInProgress' },
                            { key: 'allowAppointments' as const, labelKey: 'management.allowAppointments' },
                          ]).map(({ key, labelKey }) => (
                            <li key={key}>
                              <label className="flex items-center gap-3 cursor-pointer group">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={formData.settings[key]}
                                  onClick={() => setFormData({ ...formData, settings: { ...formData.settings, [key]: !formData.settings[key] } })}
                                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${formData.settings[key] ? 'bg-white' : 'bg-white/20'}`}
                                >
                                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transition-transform ${formData.settings[key] ? 'translate-x-5 bg-[#0a0a0a]' : 'translate-x-0 bg-white/60'}`} />
                                </button>
                                <span className="text-white/80 text-sm group-hover:text-white transition-colors">{t(labelKey)}</span>
                              </label>
                            </li>
                          ))}
                          <li>
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={formData.settings.allowQueueBeforeOpen}
                                onClick={() => setFormData({ ...formData, settings: { ...formData.settings, allowQueueBeforeOpen: !formData.settings.allowQueueBeforeOpen } })}
                                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${formData.settings.allowQueueBeforeOpen ? 'bg-white' : 'bg-white/20'}`}
                              >
                                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transition-transform ${formData.settings.allowQueueBeforeOpen ? 'translate-x-5 bg-[#0a0a0a]' : 'translate-x-0 bg-white/60'}`} />
                              </button>
                              <span className="text-white/80 text-sm group-hover:text-white transition-colors">{t('management.allowQueueBeforeOpen')}</span>
                              {formData.settings.allowQueueBeforeOpen && (
                                <span className="flex items-center gap-1.5 text-white/60 text-sm">
                                  <label htmlFor="checkInHoursBeforeOpen" className="sr-only">{t('management.checkInHoursBeforeOpen')}</label>
                                  <input
                                    id="checkInHoursBeforeOpen"
                                    type="number"
                                    min={0}
                                    max={24}
                                    step={0.5}
                                    value={formData.settings.checkInHoursBeforeOpen ?? 1}
                                    onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, checkInHoursBeforeOpen: Math.max(0, Math.min(24, parseFloat(e.target.value) || 0)) } })}
                                    className="w-14 px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm"
                                  />
                                  <span>{t('management.hoursBeforeOpen')}</span>
                                </span>
                              )}
                            </label>
                          </li>
                        </ul>
                      </section>
                      <section className="p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
                        <h3 className="text-sm font-medium text-white/90 uppercase tracking-wider">{t('management.operatingHours')}</h3>
                        <p className="text-white/60 text-sm">{t('management.operatingHoursHint')}</p>
                        {formData.settings.allowAppointments && (
                          <div className="flex flex-wrap items-end gap-2">
                            <div className="min-w-[200px]">
                              <label htmlFor="editTimezone" className="block text-white/60 text-sm mb-1">{t('management.timezone')}</label>
                              <select
                                id="editTimezone"
                                value={formData.settings.timezone ?? 'America/Sao_Paulo'}
                                onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, timezone: e.target.value || undefined } })}
                                className="w-full max-w-[280px] px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                              >
                                {(() => {
                                  const value = formData.settings.timezone ?? 'America/Sao_Paulo';
                                  const options = getTimezoneOptions();
                                  const list = options.includes(value) ? options : [value, ...options];
                                  return list.map((tz) => (
                                    <option key={tz} value={tz}>
                                      {tz}
                                    </option>
                                  ));
                                })()}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const tz = getBrowserTimezone();
                                setFormData({ ...formData, settings: { ...formData.settings, timezone: tz } });
                              }}
                              className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm hover:bg-white/15"
                            >
                              {t('management.useMyTimezone')}
                            </button>
                          </div>
                        )}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-white/60 border-b border-white/10">
                                <th className="py-2 pr-4">{t('management.day')}</th>
                                <th className="py-2 pr-4 w-24">{t('management.open')}</th>
                                <th className="py-2 pr-4">{t('management.opensAt')}</th>
                                <th className="py-2 pr-4">{t('management.closesAt')}</th>
                                <th className="py-2 pr-4 w-24">{t('management.lunch')}</th>
                                <th className="py-2 pr-4">{t('management.lunchStart')}</th>
                                <th className="py-2 pr-4">{t('management.lunchEnd')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => {
                                const labelKeys: Record<typeof day, string> = { monday: 'management.monday', tuesday: 'management.tuesday', wednesday: 'management.wednesday', thursday: 'management.thursday', friday: 'management.friday', saturday: 'management.saturday', sunday: 'management.sunday' };
                                const hours = formData.settings.operatingHours ?? ({} as OperatingHours);
                                const dayHours = hours[day];
                                const isOpen = dayHours != null;
                                const open = dayHours?.open ?? '09:00';
                                const close = dayHours?.close ?? '18:00';
                                const hasLunch = dayHours?.lunchStart != null && dayHours?.lunchEnd != null;
                                const lunchStart = dayHours?.lunchStart ?? '12:00';
                                const lunchEnd = dayHours?.lunchEnd ?? '13:00';
                                return (
                                  <tr key={day} className="border-b border-white/5">
                                    <td className="py-2 pr-4 text-white/90">{t(labelKeys[day])}</td>
                                    <td className="py-2 pr-4">
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={isOpen}
                                        onClick={() => setFormData({ ...formData, settings: { ...formData.settings, operatingHours: { ...hours, [day]: isOpen ? null : { open, close } } } })}
                                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${isOpen ? 'bg-white' : 'bg-white/20'}`}
                                      >
                                        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transition-transform ${isOpen ? 'translate-x-5 bg-[#0a0a0a]' : 'translate-x-0 bg-white/60'}`} />
                                      </button>
                                    </td>
                                    <td className="py-2 pr-4">
                                      <input
                                        type="time"
                                        value={open}
                                        disabled={!isOpen}
                                        onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, operatingHours: { ...hours, [day]: { ...dayHours!, open: e.target.value, close, lunchStart: dayHours?.lunchStart, lunchEnd: dayHours?.lunchEnd } } } })}
                                        className="w-full max-w-[120px] px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm disabled:opacity-50"
                                      />
                                    </td>
                                    <td className="py-2 pr-4">
                                      <input
                                        type="time"
                                        value={close}
                                        disabled={!isOpen}
                                        onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, operatingHours: { ...hours, [day]: { ...dayHours!, open, close: e.target.value, lunchStart: dayHours?.lunchStart, lunchEnd: dayHours?.lunchEnd } } } })}
                                        className="w-full max-w-[120px] px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm disabled:opacity-50"
                                      />
                                    </td>
                                    <td className="py-2 pr-4">
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={hasLunch}
                                        disabled={!isOpen}
                                        onClick={() => setFormData({ ...formData, settings: { ...formData.settings, operatingHours: { ...hours, [day]: hasLunch ? { open, close, lunchStart: undefined, lunchEnd: undefined } : { open, close, lunchStart, lunchEnd } } } })}
                                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${hasLunch ? 'bg-white' : 'bg-white/20'} disabled:opacity-30`}
                                      >
                                        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transition-transform ${hasLunch ? 'translate-x-5 bg-[#0a0a0a]' : 'translate-x-0 bg-white/60'}`} />
                                      </button>
                                    </td>
                                    <td className="py-2 pr-4">
                                      <input
                                        type="time"
                                        value={lunchStart}
                                        disabled={!isOpen || !hasLunch}
                                        onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, operatingHours: { ...hours, [day]: { ...dayHours!, open, close, lunchStart: e.target.value, lunchEnd } } } })}
                                        className="w-full max-w-[120px] px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm disabled:opacity-50"
                                      />
                                    </td>
                                    <td className="py-2 pr-4">
                                      <input
                                        type="time"
                                        value={lunchEnd}
                                        disabled={!isOpen || !hasLunch}
                                        onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, operatingHours: { ...hours, [day]: { ...dayHours!, open, close, lunchStart, lunchEnd: e.target.value } } } })}
                                        className="w-full max-w-[120px] px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm disabled:opacity-50"
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    </div>
                  )}
                  {editTab === 'credentials' && (
                    <div className="space-y-6">
                      <p className="text-white/55 text-sm">{t('management.credentialsIntro')}</p>
                      <section className="p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
                        <h3 className="text-sm font-medium text-white/90 uppercase tracking-wider">{t('management.accessCredentials')}</h3>
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="editOwnerPassword" className="block text-white/60 text-sm mb-2">Senha do dono (owner)</label>
                            <input
                              id="editOwnerPassword"
                              type="password"
                              autoComplete="new-password"
                              value={formData.ownerPassword}
                              onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
                              placeholder={t('management.leaveBlankToNotChange')}
                              className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm min-h-[44px] placeholder:text-white/40"
                            />
                            <p className="text-white/50 text-xs mt-1">Usada na página de login da barbearia (usuário em branco).</p>
                          </div>
                          <div>
                            <label htmlFor="editStaffPassword" className="block text-white/60 text-sm mb-2">Senha do funcionário (staff)</label>
                            <input
                              id="editStaffPassword"
                              type="password"
                              autoComplete="new-password"
                              value={formData.staffPassword}
                              onChange={(e) => setFormData({ ...formData, staffPassword: e.target.value })}
                              placeholder={t('management.leaveBlankToNotChange')}
                              className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm min-h-[44px] placeholder:text-white/40"
                            />
                            <p className="text-white/50 text-xs mt-1">Usada na página de login da barbearia (usuário em branco).</p>
                          </div>
                        </div>
                      </section>
                      <section className="p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
                        <h3 className="text-sm font-medium text-white/90 uppercase tracking-wider">{t('management.barberLogin')}</h3>
                        <p className="text-white/50 text-xs">{t('management.barberLoginHint')}</p>
                        {barberAccessLoading ? (
                          <p className="text-white/50 text-sm">Carregando barbeiros...</p>
                        ) : barberAccess.length === 0 ? (
                          <p className="text-white/50 text-sm">{t('management.noBarbersInShop')}</p>
                        ) : (
                          <ul className="space-y-4">
                            {barberAccess.map((row) => (
                              <li key={row.barberId} className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
                                <p className="text-white font-medium text-sm">{row.name}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-white/50 text-xs mb-1">Usuário</label>
                                    <input
                                      type="text"
                                      value={row.username}
                                      onChange={(e) => setBarberAccess((prev) => prev.map((r) => r.barberId === row.barberId ? { ...r, username: e.target.value } : r))}
                                      placeholder={t('management.usernamePlaceholder')}
                                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm min-h-[40px] placeholder:text-white/40"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-white/50 text-xs mb-1">Senha</label>
                                    <input
                                      type="password"
                                      autoComplete="new-password"
                                      value={row.password}
                                      onChange={(e) => setBarberAccess((prev) => prev.map((r) => r.barberId === row.barberId ? { ...r, password: e.target.value } : r))}
                                      placeholder={t('management.leaveBlankToNotChange')}
                                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm min-h-[40px] placeholder:text-white/40"
                                    />
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                      <section className="p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
                        <h3 className="text-sm font-medium text-white/90 uppercase tracking-wider">{t('management.kioskAccess')}</h3>
                        <p className="text-white/60 text-sm">{t('management.kioskAccessHint')}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-white/60 text-sm mb-2">{t('management.kioskUsername')}</label>
                            <input
                              type="text"
                              value={formData.settings.kioskUsername || ''}
                              onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, kioskUsername: e.target.value || undefined } })}
                              placeholder={t('management.kioskUsernamePlaceholder')}
                              className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-white/60 text-sm mb-2">{t('management.kioskPassword')}</label>
                            <input
                              type="password"
                              value={formData.settings.kioskPassword || ''}
                              onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, kioskPassword: e.target.value || undefined } })}
                              placeholder={t('management.kioskPasswordPlaceholder')}
                              className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                            />
                          </div>
                        </div>
                      </section>
                    </div>
                  )}
                  <div className="flex gap-2 sm:gap-3 mt-5 sm:mt-6 flex-shrink-0 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => { editModal.close(); setEditingShop(null); setFormData({ name: '', slug: '', domain: '', path: '', apiBase: '', theme: { ...DEFAULT_THEME }, style: defaultStyle, homeContentByLocale: defaultHomeByLocale(), settings: { ...DEFAULT_SETTINGS }, ownerPassword: '', staffPassword: '' }); setContentLocale('pt-BR'); }}
                      className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-none rounded-lg text-sm sm:text-base font-medium cursor-pointer transition-all min-h-[44px] bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
                    >
                      {t('common.cancel')}
                    </button>
                    <button type="submit" disabled={!editingShop && isSubmittingCreate} className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-none rounded-lg text-sm sm:text-base font-medium cursor-pointer transition-all min-h-[44px] bg-white text-[#0a0a0a] hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed">
                      {!editingShop ? (isSubmittingCreate ? t('createShop.creating') : t('createShop.createBarbershop')) : (t('common.save') ?? 'Salvar')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation - Root theme */}
          <ConfirmationDialog
            isOpen={deleteConfirmModal.isOpen}
            onClose={deleteConfirmModal.close}
            onConfirm={handleDelete}
            title={t('management.removeShopTitle')}
            message="Tem certeza que deseja remover esta barbearia? Esta ação não pode ser desfeita."
            confirmText="Remover"
            cancelText="Cancelar"
            variant="destructive"
            icon="delete"
          />
          </Container>
        </main>
      </div>
    );
  }

  // Mineiro build - keep existing styling
  return (
    <div className="min-h-screen h-full bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <CompanyNav />
      {/* Error Message Toast */}
      {errorMessage && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#ef4444] text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 max-w-[calc(100%-2rem)] sm:max-w-md"
          role="alert"
          aria-live="assertive"
        >
          <span className="material-symbols-outlined" aria-hidden="true">error</span>
          <p className="flex-1 text-sm sm:text-base">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-white/80 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={t('management.closeErrorAria')}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}
      <main className="relative z-10 pt-20 sm:pt-24 pb-12 sm:pb-16 lg:pb-20">
        <Container size="2xl">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-white">
              {t('company.manageShops')}
            </h1>
            <p className="text-white/70 text-base max-w-2xl mx-auto mt-2">
              {t('company.manageShopsSubtitle')}
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 sm:gap-3 w-full max-w-[300px] mx-auto mb-8 sm:mb-10 px-4 sm:px-6 py-3 sm:py-4 bg-[#D4AF37] text-[#0a0a0a] border-none rounded-xl text-sm sm:text-base font-semibold transition-all hover:bg-[#E8C547] min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#0b1a33]"
            aria-label={t('management.addShopAria')}
          >
            <span className="material-symbols-outlined text-lg sm:text-xl" aria-hidden="true">add</span>
            {t('company.addShop')}
          </button>

          {/* Shops Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10" aria-busy="true" aria-live="polite">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-[200px] rounded-xl bg-white/5 border border-white/10 animate-pulse"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : error ? (
            <ErrorDisplay error={error} onRetry={loadShops} />
          ) : shops.length === 0 ? (
            <div className="empty-state text-center py-12 sm:py-[60px] px-4 sm:px-5 text-white/70">
              <span className="material-symbols-outlined text-[3rem] sm:text-[4rem] text-white/50 mb-3 sm:mb-4 block" aria-hidden="true">
                store
              </span>
              <p className="text-sm sm:text-base">{t('management.noShopsRegistered')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
              {shops.map((shop) => (
                <article
                  key={shop.id}
                  className="border border-white/10 bg-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all hover:border-white/20 hover:bg-white/[0.07] relative overflow-hidden"
                  aria-labelledby={`shop-name-${shop.id}`}
                >
                  <div className="shop-header mb-4 sm:mb-5">
                    <div className="text-3xl text-[#D4AF37] mb-2">
                      <span className="material-symbols-outlined">store</span>
                    </div>
                    <h3 id={`shop-name-${shop.id}`} className="text-lg sm:text-xl font-semibold text-white mb-2">
                      {shop.name}
                    </h3>
                    <div className="text-xs sm:text-sm text-white/60 mb-1">
                      <span className="font-medium">Slug:</span> {shop.slug}
                    </div>
                    {shop.domain && (
                      <div className="text-xs sm:text-sm text-white/60 mb-1">
                        <span className="font-medium">Domínio:</span> {shop.domain}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={() => openEditModal(shop)}
                      className="flex-1 px-2 sm:px-3 py-2.5 sm:py-3 border border-white/20 rounded-lg text-xs sm:text-sm font-medium cursor-pointer transition-all min-h-[44px] bg-white/5 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#242424]"
                      aria-label={`Editar barbearia ${shop.name}`}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setShopToDelete(shop.id);
                        deleteConfirmModal.open();
                      }}
                      className="flex-1 px-2 sm:px-3 py-2.5 sm:py-3 border border-red-500/50 rounded-lg text-xs sm:text-sm font-medium cursor-pointer transition-all min-h-[44px] bg-red-500/20 text-[#ef4444] hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-[#ef4444] focus:ring-offset-2 focus:ring-offset-[#242424]"
                      aria-label={`Remover barbearia ${shop.name}`}
                    >
                      Remover
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Container>
      </main>

      {/* Edit Shop Modal */}
      {editModal.isOpen && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-5"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
        >
          <div className="modal-content bg-[#242424] border border-white/10 rounded-2xl p-5 sm:p-6 lg:p-8 max-w-[min(90vw,720px)] w-full min-w-[320px] max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 shadow-2xl">
            <header className="flex-shrink-0 mb-6">
            <h2 id="edit-modal-title" className="modal-title text-xl sm:text-2xl font-semibold text-white tracking-tight">
              {editingShop ? t('management.editShop') ?? 'Editar Barbearia' : t('createShop.createShop')}
            </h2>
            <p className="text-white/50 text-sm mt-1">
              {editingShop ? t('management.infoIntro') : t('createShop.newShop')}
            </p>
          </header>
          <nav className="flex-shrink-0 border-b border-white/15 overflow-x-auto -mx-1 px-1" aria-label={t('management.settingsTab')}>
              <div className="flex gap-0 min-w-max">
                {editModalTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setEditTab(tab as EditTab)}
                    className={`relative py-3 px-4 text-sm font-medium transition-colors whitespace-nowrap rounded-t-lg ${
                      editTab === tab ? 'text-white' : 'text-white/55 hover:text-white/85'
                    }`}
                    aria-current={editTab === tab ? 'page' : undefined}
                  >
                    {tab === 'info' && t('management.infoTab')}
                    {tab === 'appearance' && t('management.appearanceTab')}
                    {tab === 'content' && t('management.contentTab')}
                    {tab === 'settings' && t('management.settingsTab')}
                    {tab === 'credentials' && t('management.credentialsTab')}
                    {tab === 'services' && t('createShop.servicesTab')}
                    {tab === 'barbers' && t('createShop.barbersTab')}
                    {editTab === tab && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4AF37] rounded-full min-w-[4px]" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            </nav>
            <form onSubmit={(e) => { e.preventDefault(); editingShop ? handleEdit() : handleCreate(); }} className="flex-1 overflow-y-auto min-h-0 pr-1 mt-5">
              {editTab === 'info' && (
                <section className="space-y-6">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-5 space-y-4">
                    <h3 className="text-sm font-medium text-white/90 uppercase tracking-wider">{t('management.infoTab')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="editName" className="block text-white/70 text-sm mb-1.5">{t('management.name')} *</label>
                        <input
                          id="editName"
                          type="text"
                          value={formData.name}
                          onChange={(e) => {
                            const name = e.target.value;
                            setFormData((prev) => ({ ...prev, name, ...(!editingShop && (!prev.slug || prev.slug === generateSlug(prev.name)) ? { slug: generateSlug(name) } : {}) }));
                          }}
                          required
                          className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                        />
                        {!editingShop && createErrors.name && <p className="text-red-400 text-xs mt-1">{createErrors.name}</p>}
                      </div>
                      <div>
                        <label htmlFor="editSlug" className="block text-white/70 text-sm mb-1.5">{t('management.slug')} *</label>
                        <input id="editSlug" type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} required pattern="[-a-z0-9]+" className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20" />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-5 space-y-4">
                    <h3 className="text-sm font-medium text-white/90 uppercase tracking-wider">{t('management.domain')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label htmlFor="editDomain" className="block text-white/60 text-sm mb-1.5">{t('management.domain')}</label>
                        <input id="editDomain" type="text" value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} placeholder={t('management.domainPlaceholder')} className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 placeholder:text-white/30" />
                      </div>
                      <div>
                        <label htmlFor="editPath" className="block text-white/60 text-sm mb-1.5">{t('management.path')}</label>
                        <input id="editPath" type="text" value={formData.path} onChange={(e) => setFormData({ ...formData, path: e.target.value })} placeholder={t('management.pathPlaceholder')} className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 placeholder:text-white/30" />
                      </div>
                      <div>
                        <label htmlFor="editApiBase" className="block text-white/60 text-sm mb-1.5">{t('management.apiBase')}</label>
                        <input id="editApiBase" type="url" value={formData.apiBase} onChange={(e) => setFormData({ ...formData, apiBase: e.target.value })} placeholder={t('management.apiBasePlaceholder')} className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 placeholder:text-white/30" />
                      </div>
                    </div>
                  </div>
                </section>
              )}
              {editTab === 'credentials' && !editingShop && (
                <div className="space-y-6 rounded-xl bg-white/5 border border-white/10 p-4 sm:p-5">
                  <h3 className="text-sm font-medium text-white/90 uppercase tracking-wider">{t('management.accessCredentials')}</h3>
                  <div>
                    <label htmlFor="createOwnerPasswordMineiro" className="block text-white/70 text-sm mb-2">{t('management.ownerPassword')} *</label>
                    <input id="createOwnerPasswordMineiro" type="password" value={formData.ownerPassword} onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })} required minLength={6} placeholder={t('management.ownerPasswordPlaceholder')} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm min-h-[44px] placeholder:text-white/30" />
                    {createErrors.ownerPassword && <p className="text-red-400 text-xs mt-1">{createErrors.ownerPassword}</p>}
                  </div>
                  <div>
                    <label htmlFor="createStaffPasswordMineiro" className="block text-white/70 text-sm mb-2">{t('management.staffPassword')} *</label>
                    <input id="createStaffPasswordMineiro" type="password" value={formData.staffPassword} onChange={(e) => setFormData({ ...formData, staffPassword: e.target.value })} required minLength={6} placeholder={t('management.staffPasswordPlaceholder')} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm min-h-[44px] placeholder:text-white/30" />
                    {createErrors.staffPassword && <p className="text-red-400 text-xs mt-1">{createErrors.staffPassword}</p>}
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <h4 className="text-sm font-medium text-white/90 uppercase tracking-wider mb-2">{t('management.kioskAccess')}</h4>
                    <p className="text-white/60 text-sm mb-3">{t('management.kioskAccessHint')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white/60 text-sm mb-2">{t('management.kioskUsername')}</label>
                        <input type="text" value={formData.settings.kioskUsername || ''} onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, kioskUsername: e.target.value || undefined } })} placeholder={t('management.kioskUsernamePlaceholder')} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" />
                      </div>
                      <div>
                        <label className="block text-white/60 text-sm mb-2">{t('management.kioskPassword')}</label>
                        <input type="password" value={formData.settings.kioskPassword || ''} onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, kioskPassword: e.target.value || undefined } })} placeholder={t('management.kioskPasswordPlaceholder')} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {editTab === 'services' && (
                <div id="create-services-section" className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-5">
                  {!editingShop && createErrors.services && <p className="text-red-400 text-sm mb-4">{createErrors.services}</p>}
                  {!editingShop && <StepServices services={createServices} onChange={setCreateServices} errors={createErrors} />}
                  {editingShop && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2">{t('createShop.servicesTab')}</h2>
                        <p className="text-white/60 text-sm">{t('createShop.servicesIntro')}</p>
                      </div>
                      {editServicesLoading ? (
                        <p className="text-white/50 text-sm">{t('common.loading')}</p>
                      ) : (
                        <>
                          <div className="space-y-4">
                            {editServices.map((s, index) => (
                              <div key={s.id} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2 relative">
                                {editServices.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (s.id > 0) {
                                        try {
                                          await api.deleteService(s.id);
                                          setEditServices((prev) => prev.filter((x) => x.id !== s.id));
                                        } catch (err) {
                                          setErrorMessage(getErrorMessage(err, t('management.updateError')));
                                        }
                                      } else {
                                        setEditServices((prev) => prev.filter((x) => x.id !== s.id));
                                      }
                                    }}
                                    className="absolute top-3 right-3 text-red-400/60 hover:text-red-400 transition-colors p-1"
                                    aria-label={t('createShop.removeService')}
                                  >
                                    <span className="material-symbols-outlined text-lg">close</span>
                                  </button>
                                )}
                                <span className="text-white/40 text-xs font-medium uppercase tracking-wider">{t('createShop.serviceN')} {index + 1}</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="sm:col-span-2">
                                    <input
                                      type="text"
                                      value={s.name}
                                      onChange={(e) => setEditServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)))}
                                      placeholder={t('createShop.serviceNamePlaceholder')}
                                      className="form-input w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <input
                                      type="text"
                                      value={s.description ?? ''}
                                      onChange={(e) => setEditServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, description: e.target.value || null } : x)))}
                                      placeholder={t('createShop.serviceDescPlaceholder')}
                                      className="form-input w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-white/50 text-xs mb-1">{t('createShop.durationMin')}</label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={s.duration}
                                      onChange={(e) => setEditServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, duration: parseInt(e.target.value, 10) || 1 } : x)))}
                                      className="form-input w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-white/50 text-xs mb-1">{t('createShop.priceReais')}</label>
                                    <input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      value={s.price != null ? (s.price / 100).toFixed(2) : ''}
                                      onChange={(e) => setEditServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, price: Math.round(parseFloat(e.target.value || '0') * 100) } : x)))}
                                      className="form-input w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditServices((prev) => [...prev, { id: 0, name: '', description: null, duration: 30, price: null }])}
                            className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-white/20 rounded-xl text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all text-sm"
                          >
                            <span className="material-symbols-outlined text-lg">add</span>
                            {t('createShop.addService')}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              {editTab === 'barbers' && (
                <div id="create-barbers-section" className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-5">
                  {!editingShop && createErrors.barbers && <p className="text-red-400 text-sm mb-4">{createErrors.barbers}</p>}
                  {!editingShop && <StepBarbers barbers={createBarbers} onChange={setCreateBarbers} errors={createErrors} />}
                  {editingShop && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2">{t('createShop.barbersTab')}</h2>
                        <p className="text-white/60 text-sm">{t('createShop.barbersIntro')}</p>
                      </div>
                      {editBarbersLoading ? (
                        <p className="text-white/50 text-sm">{t('common.loading')}</p>
                      ) : (
                        <>
                          <div className="space-y-4">
                            {editBarbers.map((b, index) => (
                              <div key={b.id} className="rounded-lg border border-white/10 bg-white/5 p-4 relative">
                                {editBarbers.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (b.id > 0) {
                                        try {
                                          await api.deleteBarber(b.id);
                                          setEditBarbers((prev) => prev.filter((x) => x.id !== b.id));
                                        } catch (err) {
                                          setErrorMessage(getErrorMessage(err, t('management.updateError')));
                                        }
                                      } else {
                                        setEditBarbers((prev) => prev.filter((x) => x.id !== b.id));
                                      }
                                    }}
                                    className="absolute top-3 right-3 text-red-400/60 hover:text-red-400 transition-colors p-1"
                                    aria-label={t('createShop.removeBarber')}
                                  >
                                    <span className="material-symbols-outlined text-lg">close</span>
                                  </button>
                                )}
                                <span className="text-white/40 text-xs font-medium uppercase tracking-wider">{t('createShop.barberN')} {index + 1}</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                  <div className="sm:col-span-2">
                                    <input
                                      type="text"
                                      value={b.name}
                                      onChange={(e) => setEditBarbers((prev) => prev.map((x) => (x.id === b.id ? { ...x, name: e.target.value } : x)))}
                                      placeholder={t('createShop.namePlaceholder')}
                                      className="form-input w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <input
                                      type="text"
                                      value={b.email ?? ''}
                                      onChange={(e) => setEditBarbers((prev) => prev.map((x) => (x.id === b.id ? { ...x, email: e.target.value || null } : x)))}
                                      placeholder={t('createShop.emailPlaceholder')}
                                      className="form-input w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <input
                                      type="text"
                                      value={b.phone ?? ''}
                                      onChange={(e) => setEditBarbers((prev) => prev.map((x) => (x.id === b.id ? { ...x, phone: e.target.value || null } : x)))}
                                      placeholder={t('createShop.phonePlaceholder')}
                                      className="form-input w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditBarbers((prev) => [...prev, { id: 0, name: '', email: null, phone: null }])}
                            className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-white/20 rounded-xl text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all text-sm"
                          >
                            <span className="material-symbols-outlined text-lg">add</span>
                            {t('createShop.addBarber')}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              {editTab === 'appearance' && (
                <AppearanceForm
                  formData={formData}
                  setFormData={setFormData as React.Dispatch<React.SetStateAction<{ theme: ShopTheme; style: ShopStyleConfig }>>}
                  variant="mineiro"
                  paletteIndices={paletteIndices}
                  onRerollPalettes={() => setPaletteIndices(pickThreeRandomPaletteIndices(formData.style.preset))}
                  savedPalettes={savedPalettes}
                  onSaveCurrentPalette={(label) =>
                    setSavedPalettes((prev) => [...prev, { label, theme: { ...formData.theme } }])
                  }
                />
              )}
              {editTab === 'content' && (() => {
                const contentForm = formData.homeContentByLocale[contentLocale] ?? JSON.parse(JSON.stringify(DEFAULT_HOME_CONTENT));
                const setContentForm = (patch: Partial<HomeContent> | ((prev: HomeContent) => HomeContent)) => setFormData((prev) => {
                  const cur = prev.homeContentByLocale[contentLocale] ?? JSON.parse(JSON.stringify(DEFAULT_HOME_CONTENT));
                  const next = typeof patch === 'function' ? patch(cur) : { ...cur, ...patch };
                  return { ...prev, homeContentByLocale: { ...prev.homeContentByLocale, [contentLocale]: next } };
                });
                return (
                <div className="space-y-6 max-h-[50vh] overflow-y-auto">
                  <p className="text-white/60 text-sm">{t('management.contentIntro')}</p>
                  <div className="flex gap-2 border-b border-white/10 pb-2">
                    {SUPPORTED_LOCALES.map((loc) => (
                      <button key={loc} type="button" onClick={() => setContentLocale(loc)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${contentLocale === loc ? 'bg-[#D4AF37] text-[#0a0a0a]' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}>{t(`locale.${loc}`)}</button>
                    ))}
                  </div>
                  <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                    <h4 className="text-white font-medium">{t('management.storeIcons')}</h4>
                    <div className="space-y-3">
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.favicon')}</label><input type="url" value={contentForm.branding.faviconUrl} onChange={(e) => setContentForm({ branding: { ...contentForm.branding, faviconUrl: e.target.value } })} placeholder="https://..." className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder:text-white/30" /></div>
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.headerIcon')}</label><input type="url" value={contentForm.branding.headerIconUrl} onChange={(e) => setContentForm({ branding: { ...contentForm.branding, headerIconUrl: e.target.value } })} placeholder="https://..." className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder:text-white/30" /></div>
                    </div>
                  </section>
                  <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                    <h4 className="text-white font-medium">Hero</h4>
                    <div className="space-y-3">
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.heroBadge')}</label><input type="text" value={contentForm.hero.badge} onChange={(e) => setContentForm({ hero: { ...contentForm.hero, badge: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.subtitle')}</label><input type="text" value={contentForm.hero.subtitle} onChange={(e) => setContentForm({ hero: { ...contentForm.hero, subtitle: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.ctaJoin')}</label><input type="text" value={contentForm.hero.ctaJoin} onChange={(e) => setContentForm({ hero: { ...contentForm.hero, ctaJoin: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.ctaLocation')}</label><input type="text" value={contentForm.hero.ctaLocation} onChange={(e) => setContentForm({ hero: { ...contentForm.hero, ctaLocation: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                    </div>
                  </section>
                  <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                    <h4 className="text-white font-medium">{t('management.navSection')}</h4>
                    <div className="space-y-3">
                      {([{ key: 'linkServices' as const, label: t('management.linkServices') }, { key: 'linkAbout' as const, label: t('management.linkAbout') }, { key: 'linkLocation' as const, label: t('management.linkLocation') }, { key: 'ctaJoin' as const, label: t('management.ctaJoinLabel') }, { key: 'linkBarbers' as const, label: t('management.linkBarbers') }]).map(({ key, label }) => (
                        <div key={key}><label className="block text-white/60 text-sm mb-1">{label}</label><input type="text" value={contentForm.nav[key]} onChange={(e) => setContentForm({ nav: { ...contentForm.nav, [key]: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                      ))}
                    </div>
                  </section>
                  <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                    <h4 className="text-white font-medium">{t('management.aboutSection')}</h4>
                    <div className="space-y-3">
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.sectionTitle')}</label><input type="text" value={contentForm.about.sectionTitle} onChange={(e) => setContentForm({ about: { ...contentForm.about, sectionTitle: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                      <div>
                        <label className="block text-white/60 text-sm mb-1">{t('management.imageUrl')}</label>
                        <div className="flex flex-wrap gap-2 items-center">
                          <input type="url" value={contentForm.about.imageUrl} onChange={(e) => { setHomeImageError(null); setContentForm({ about: { ...contentForm.about, imageUrl: e.target.value } }); }} placeholder="https://..." className="form-input flex-1 min-w-[200px] w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder:text-white/30" />
                          <input ref={homeImageInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !user?.companyId) return;
                            setHomeImageError(null);
                            setHomeImageUploading(true);
                            try {
                              const { url } = editingShop
                                ? await api.uploadShopHomeImage(user.companyId, editingShop.id, file)
                                : await api.uploadDraftHomeImage(user.companyId, file);
                              setContentForm({ about: { ...contentForm.about, imageUrl: url } });
                            } catch (err) {
                              setHomeImageError(getErrorMessage(err, t('management.uploadError')));
                            } finally {
                              setHomeImageUploading(false);
                              e.target.value = '';
                            }
                          }} />
                          <button type="button" onClick={() => homeImageInputRef.current?.click()} disabled={homeImageUploading} className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium disabled:opacity-50 min-h-[44px]">{homeImageUploading ? t('common.loading') : t('management.uploadImage')}</button>
                        </div>
                        {homeImageError && <p className="text-sm text-[#ef4444] mt-1">{homeImageError}</p>}
                      </div>
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.imageAlt')}</label><input type="text" value={contentForm.about.imageAlt} onChange={(e) => setContentForm({ about: { ...contentForm.about, imageAlt: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                      
                      {/* Features Editor */}
                      <div>
                        <label className="block text-white/60 text-sm mb-2">{t('management.features')}</label>
                        <div className="space-y-2">
                          {contentForm.about.features.map((feature, idx) => (
                            <div key={idx} className="flex gap-2 items-start">
                              <span className="material-symbols-outlined text-white/60 text-xl mt-2">{feature.icon}</span>
                              <input
                                type="text"
                                value={feature.text}
                                readOnly
                                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newFeatures = contentForm.about.features.filter((_, i) => i !== idx);
                                  setContentForm({ about: { ...contentForm.about, features: newFeatures } });
                                }}
                                className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            </div>
                          ))}
                          
                          {/* Add Feature Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setCustomFeatureForm({ icon: '', text: '' });
                              setFeatureSelectorOpen(true);
                            }}
                            className="w-full py-2 border border-dashed border-white/20 rounded-lg text-white/60 hover:text-white hover:border-white/40 transition-colors text-sm flex items-center justify-center gap-2"
                          >
                            <span className="material-symbols-outlined text-base">add</span>
                            {t('management.addFeature')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                  <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                    <h4 className="text-white font-medium">{t('management.servicesSection')}</h4>
                    <div className="space-y-3">
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.sectionTitle')}</label><input type="text" value={contentForm.services.sectionTitle} onChange={(e) => setContentForm({ services: { ...contentForm.services, sectionTitle: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.loadingText')}</label><input type="text" value={contentForm.services.loadingText} onChange={(e) => setContentForm({ services: { ...contentForm.services, loadingText: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.emptyText')}</label><input type="text" value={contentForm.services.emptyText} onChange={(e) => setContentForm({ services: { ...contentForm.services, emptyText: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                    </div>
                  </section>
                  <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                    <h4 className="text-white font-medium">{t('management.locationSection')}</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-white/60 text-sm mb-1">{t('management.lookupByAddress')}</label>
                        <div className="flex gap-2 flex-wrap">
                          <input type="text" value={placesLookupAddress} onChange={(e) => setPlacesLookupAddress(e.target.value)} placeholder={t('management.addressPlaceholder')} className="form-input flex-1 min-w-[200px] w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder:text-white/30" disabled={placesLookupLoading} />
                          <button type="button" onClick={handlePlacesLookup} disabled={placesLookupLoading || !placesLookupAddress.trim()} className="px-4 py-2.5 rounded-lg bg-[#D4AF37] text-[#0a0a0a] font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]">{placesLookupLoading ? t('management.searching') : t('management.search')}</button>
                        </div>
                        {placesLookupMessage && <p className={`text-sm mt-1 ${placesLookupMessage.startsWith('success:') ? 'text-green-400' : 'text-amber-400'}`}>{placesLookupMessage.startsWith('success:') ? placesLookupMessage.slice(8) : placesLookupMessage}</p>}
                      </div>
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.address')}</label><textarea value={contentForm.location.address} onChange={(e) => setContentForm({ location: { ...contentForm.location, address: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm min-h-[60px]" /></div>
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.hours')}</label><textarea value={contentForm.location.hours} onChange={(e) => setContentForm({ location: { ...contentForm.location, hours: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.phone')}</label><input type="text" value={contentForm.location.phone} onChange={(e) => setContentForm({ location: { ...contentForm.location, phone: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.phoneLink')}</label><input type="text" value={contentForm.location.phoneHref} onChange={(e) => setContentForm({ location: { ...contentForm.location, phoneHref: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" placeholder="tel:+55..." /></div>
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.languages')}</label><input type="text" value={contentForm.location.languages} onChange={(e) => setContentForm({ location: { ...contentForm.location, languages: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.mapQuery')}</label><input type="text" value={contentForm.location.mapQuery} onChange={(e) => setContentForm({ location: { ...contentForm.location, mapQuery: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                    </div>
                  </section>

                  {/* Feature Selector Modal */}
                  <Modal
                    isOpen={featureSelectorOpen}
                    onClose={() => setFeatureSelectorOpen(false)}
                    title={t('management.selectFeature')}
                    className="max-w-2xl"
                  >
                    <div className="space-y-4">
                      {/* Predefined Features by Category */}
                      {['service', 'amenity', 'payment', 'special'].map((category) => {
                        const categoryFeatures = BARBERSHOP_FEATURES.filter(f => f.category === category);
                        const categoryLabels = {
                          service: { pt: 'Serviços', en: 'Services' },
                          amenity: { pt: 'Comodidades', en: 'Amenities' },
                          payment: { pt: 'Pagamento', en: 'Payment' },
                          special: { pt: 'Especiais', en: 'Special' }
                        };
                        const categoryLabel = contentLocale === 'pt-BR' 
                          ? categoryLabels[category as keyof typeof categoryLabels].pt 
                          : categoryLabels[category as keyof typeof categoryLabels].en;
                        
                        return (
                          <div key={category}>
                            <h5 className="text-white/80 font-medium text-sm mb-2">{categoryLabel}</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {categoryFeatures.map((feature) => (
                                <button
                                  key={feature.id}
                                  type="button"
                                  onClick={() => {
                                    const text = contentLocale === 'pt-BR' ? feature.labelPtBR : feature.labelEn;
                                    setContentForm({
                                      about: {
                                        ...contentForm.about,
                                        features: [...contentForm.about.features, { icon: feature.icon, text }]
                                      }
                                    });
                                    setFeatureSelectorOpen(false);
                                  }}
                                  className="flex items-center gap-3 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-left transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[#D4AF37]">{feature.icon}</span>
                                  <span className="text-white text-sm">{contentLocale === 'pt-BR' ? feature.labelPtBR : feature.labelEn}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* Custom Feature */}
                      <div className="pt-4 border-t border-white/10">
                        <h5 className="text-white/80 font-medium text-sm mb-3">{t('management.customFeature')}</h5>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-white/60 text-sm mb-1">{t('management.customFeatureIcon')}</label>
                            <input
                              type="text"
                              value={customFeatureForm.icon}
                              onChange={(e) => setCustomFeatureForm({ ...customFeatureForm, icon: e.target.value })}
                              placeholder="star"
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                            />
                            <p className="text-white/40 text-xs mt-1">
                              <a href="https://fonts.google.com/icons" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/60">
                                Ver ícones disponíveis
                              </a>
                            </p>
                          </div>
                          <div>
                            <label className="block text-white/60 text-sm mb-1">{t('management.customFeatureText')}</label>
                            <input
                              type="text"
                              value={customFeatureForm.text}
                              onChange={(e) => setCustomFeatureForm({ ...customFeatureForm, text: e.target.value })}
                              placeholder="Ex: Ambiente familiar"
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (customFeatureForm.icon.trim() && customFeatureForm.text.trim()) {
                                setContentForm({
                                  about: {
                                    ...contentForm.about,
                                    features: [...contentForm.about.features, { 
                                      icon: customFeatureForm.icon.trim(), 
                                      text: customFeatureForm.text.trim() 
                                    }]
                                  }
                                });
                                setCustomFeatureForm({ icon: '', text: '' });
                                setFeatureSelectorOpen(false);
                              }
                            }}
                            disabled={!customFeatureForm.icon.trim() || !customFeatureForm.text.trim()}
                            className="w-full px-4 py-2 bg-[#D4AF37] hover:bg-[#E8C547] text-[#0a0a0a] rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {t('management.addCustomFeature')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </Modal>
                </div>
                );
              })()}
              {editTab === 'settings' && (
                <div className="space-y-6">
                  <section className="p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <h3 className="text-sm font-medium text-white/90 uppercase tracking-wider">{t('management.queueSection')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white/60 text-sm mb-2">{t('management.maxQueueSize')}</label>
                        <input type="number" min={1} max={500} value={formData.settings.maxQueueSize} onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, maxQueueSize: parseInt(e.target.value) || 80 } })} className="form-input w-full px-3 py-2.5 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-sm" />
                      </div>
                      <div>
                        <label className="block text-white/60 text-sm mb-2">{t('management.defaultServiceDuration')}</label>
                        <input type="number" min={1} max={480} value={formData.settings.defaultServiceDuration} onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, defaultServiceDuration: parseInt(e.target.value) || 20 } })} className="form-input w-full px-3 py-2.5 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-sm" />
                      </div>
                    </div>
                  </section>
                  <section className="p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <h3 className="text-sm font-medium text-white/90 uppercase tracking-wider">{t('management.serviceRules')}</h3>
                    <ul className="space-y-4">
                      {[{ key: 'requirePhone' as const, labelKey: 'management.requirePhone' }, { key: 'allowBarberPreference' as const, labelKey: 'management.allowBarberPreference' }, { key: 'requireBarberChoice' as const, labelKey: 'management.requireBarberChoice' }, { key: 'allowDuplicateNames' as const, labelKey: 'management.allowDuplicateNames' }, { key: 'deviceDeduplication' as const, labelKey: 'management.deviceDeduplication' }, { key: 'allowCustomerCancelInProgress' as const, labelKey: 'management.allowCustomerCancelInProgress' }, { key: 'allowAppointments' as const, labelKey: 'management.allowAppointments' }].map(({ key, labelKey }) => (
                        <li key={key}>
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <button type="button" role="switch" aria-checked={formData.settings[key]} onClick={() => setFormData({ ...formData, settings: { ...formData.settings, [key]: !formData.settings[key] } })} className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${formData.settings[key] ? 'bg-[#D4AF37]' : 'bg-white/20'}`}><span className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transition-transform ${formData.settings[key] ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white/60'}`} /></button>
                            <span className="text-white/80 text-sm group-hover:text-white transition-colors">{t(labelKey)}</span>
                          </label>
                        </li>
                      ))}
                      <li>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <button type="button" role="switch" aria-checked={formData.settings.allowQueueBeforeOpen} onClick={() => setFormData({ ...formData, settings: { ...formData.settings, allowQueueBeforeOpen: !formData.settings.allowQueueBeforeOpen } })} className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${formData.settings.allowQueueBeforeOpen ? 'bg-[#D4AF37]' : 'bg-white/20'}`}><span className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transition-transform ${formData.settings.allowQueueBeforeOpen ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white/60'}`} /></button>
                          <span className="text-white/80 text-sm group-hover:text-white transition-colors">{t('management.allowQueueBeforeOpen')}</span>
                          {formData.settings.allowQueueBeforeOpen && (
                            <span className="flex items-center gap-1.5 text-white/60 text-sm">
                              <input type="number" min={0} max={24} step={0.5} value={formData.settings.checkInHoursBeforeOpen ?? 1} onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, checkInHoursBeforeOpen: Math.max(0, Math.min(24, parseFloat(e.target.value) || 0)) } })} className="w-14 px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm" />
                              <span>{t('management.hoursBeforeOpen')}</span>
                            </span>
                          )}
                        </label>
                      </li>
                    </ul>
                  </section>
                  <section className="p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <h3 className="text-sm font-medium text-white/90 uppercase tracking-wider">{t('management.operatingHours')}</h3>
                    <p className="text-white/60 text-sm">{t('management.operatingHoursHint')}</p>
                    {formData.settings.allowAppointments && (
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-[200px]">
                          <label htmlFor="editTimezoneMobile" className="block text-white/60 text-sm mb-1">{t('management.timezone')}</label>
                          <select
                            id="editTimezoneMobile"
                            value={formData.settings.timezone ?? 'America/Sao_Paulo'}
                            onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, timezone: e.target.value || undefined } })}
                            className="w-full max-w-[280px] px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                          >
                            {(() => {
                              const value = formData.settings.timezone ?? 'America/Sao_Paulo';
                              const options = getTimezoneOptions();
                              const list = options.includes(value) ? options : [value, ...options];
                              return list.map((tz) => (
                                <option key={tz} value={tz}>
                                  {tz}
                                </option>
                              ));
                            })()}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const tz = getBrowserTimezone();
                            setFormData({ ...formData, settings: { ...formData.settings, timezone: tz } });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm hover:bg-white/15"
                        >
                          {t('management.useMyTimezone')}
                        </button>
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-white/60 border-b border-white/10">
                            <th className="py-2 pr-4">{t('management.day')}</th>
                            <th className="py-2 pr-4 w-24">{t('management.open')}</th>
                            <th className="py-2 pr-4">{t('management.opensAt')}</th>
                            <th className="py-2 pr-4">{t('management.closesAt')}</th>
                            <th className="py-2 pr-4 w-24">{t('management.lunch')}</th>
                            <th className="py-2 pr-4">{t('management.lunchStart')}</th>
                            <th className="py-2 pr-4">{t('management.lunchEnd')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => {
                            const labelKeys: Record<typeof day, string> = { monday: 'management.monday', tuesday: 'management.tuesday', wednesday: 'management.wednesday', thursday: 'management.thursday', friday: 'management.friday', saturday: 'management.saturday', sunday: 'management.sunday' };
                            const hours = formData.settings.operatingHours ?? ({} as OperatingHours);
                            const dayHours = hours[day];
                            const isOpen = dayHours != null;
                            const open = dayHours?.open ?? '09:00';
                            const close = dayHours?.close ?? '18:00';
                            const hasLunch = dayHours?.lunchStart != null && dayHours?.lunchEnd != null;
                            const lunchStart = dayHours?.lunchStart ?? '12:00';
                            const lunchEnd = dayHours?.lunchEnd ?? '13:00';
                            
                            return (
                              <tr key={day} className="border-b border-white/5">
                                <td className="py-2 pr-4 text-white/90">{t(labelKeys[day])}</td>
                                
                                {/* Open/Closed Toggle */}
                                <td className="py-2 pr-4">
                                  <button 
                                    type="button" 
                                    role="switch" 
                                    aria-checked={isOpen}
                                    onClick={() => setFormData({ 
                                      ...formData, 
                                      settings: { 
                                        ...formData.settings, 
                                        operatingHours: { 
                                          ...hours, 
                                          [day]: isOpen ? null : { open, close } 
                                        } 
                                      } 
                                    })}
                                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${isOpen ? 'bg-[#D4AF37]' : 'bg-white/20'}`}
                                  >
                                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transition-transform ${isOpen ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white/60'}`} />
                                  </button>
                                </td>
                                
                                {/* Opening Time */}
                                <td className="py-2 pr-4">
                                  <input 
                                    type="time" 
                                    value={open} 
                                    disabled={!isOpen}
                                    onChange={(e) => setFormData({ 
                                      ...formData, 
                                      settings: { 
                                        ...formData.settings, 
                                        operatingHours: { 
                                          ...hours, 
                                          [day]: { ...dayHours!, open: e.target.value, close, lunchStart: dayHours?.lunchStart, lunchEnd: dayHours?.lunchEnd } 
                                        } 
                                      } 
                                    })}
                                    className="w-full max-w-[120px] px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm disabled:opacity-50"
                                  />
                                </td>
                                
                                {/* Closing Time */}
                                <td className="py-2 pr-4">
                                  <input 
                                    type="time" 
                                    value={close} 
                                    disabled={!isOpen}
                                    onChange={(e) => setFormData({ 
                                      ...formData, 
                                      settings: { 
                                        ...formData.settings, 
                                        operatingHours: { 
                                          ...hours, 
                                          [day]: { ...dayHours!, open, close: e.target.value, lunchStart: dayHours?.lunchStart, lunchEnd: dayHours?.lunchEnd } 
                                        } 
                                      } 
                                    })}
                                    className="w-full max-w-[120px] px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm disabled:opacity-50"
                                  />
                                </td>
                                
                                {/* Lunch Toggle */}
                                <td className="py-2 pr-4">
                                  <button 
                                    type="button" 
                                    role="switch" 
                                    aria-checked={hasLunch}
                                    disabled={!isOpen}
                                    onClick={() => setFormData({ 
                                      ...formData, 
                                      settings: { 
                                        ...formData.settings, 
                                        operatingHours: { 
                                          ...hours, 
                                          [day]: hasLunch 
                                            ? { open, close, lunchStart: undefined, lunchEnd: undefined }
                                            : { open, close, lunchStart, lunchEnd }
                                        } 
                                      } 
                                    })}
                                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${hasLunch ? 'bg-[#D4AF37]' : 'bg-white/20'} disabled:opacity-30`}
                                  >
                                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transition-transform ${hasLunch ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white/60'}`} />
                                  </button>
                                </td>
                                
                                {/* Lunch Start */}
                                <td className="py-2 pr-4">
                                  <input 
                                    type="time" 
                                    value={lunchStart} 
                                    disabled={!isOpen || !hasLunch}
                                    onChange={(e) => setFormData({ 
                                      ...formData, 
                                      settings: { 
                                        ...formData.settings, 
                                        operatingHours: { 
                                          ...hours, 
                                          [day]: { ...dayHours!, open, close, lunchStart: e.target.value, lunchEnd } 
                                        } 
                                      } 
                                    })}
                                    className="w-full max-w-[120px] px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm disabled:opacity-50"
                                  />
                                </td>
                                
                                {/* Lunch End */}
                                <td className="py-2 pr-4">
                                  <input 
                                    type="time" 
                                    value={lunchEnd} 
                                    disabled={!isOpen || !hasLunch}
                                    onChange={(e) => setFormData({ 
                                      ...formData, 
                                      settings: { 
                                        ...formData.settings, 
                                        operatingHours: { 
                                          ...hours, 
                                          [day]: { ...dayHours!, open, close, lunchStart, lunchEnd: e.target.value } 
                                        } 
                                      } 
                                    })}
                                    className="w-full max-w-[120px] px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm disabled:opacity-50"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              )}
              {editTab === 'credentials' && (
                <div className="space-y-6">
                  <p className="text-white/55 text-sm">{t('management.credentialsIntro')}</p>
                  <section className="p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <h3 className="text-sm font-medium text-white/90 uppercase tracking-wider">{t('management.accessCredentials')}</h3>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="editOwnerPasswordMineiro" className="block text-white/60 text-sm mb-2">Senha do dono (owner)</label>
                        <input
                          id="editOwnerPasswordMineiro"
                          type="password"
                          autoComplete="new-password"
                          value={formData.ownerPassword}
                          onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
                          placeholder={t('management.leaveBlankToNotChange')}
                          className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm min-h-[44px] placeholder:text-white/40"
                        />
                        <p className="text-white/50 text-xs mt-1">Usada na página de login da barbearia (usuário em branco).</p>
                      </div>
                      <div>
                        <label htmlFor="editStaffPasswordMineiro" className="block text-white/60 text-sm mb-2">Senha do funcionário (staff)</label>
                        <input
                          id="editStaffPasswordMineiro"
                          type="password"
                          autoComplete="new-password"
                          value={formData.staffPassword}
                          onChange={(e) => setFormData({ ...formData, staffPassword: e.target.value })}
                          placeholder={t('management.leaveBlankToNotChange')}
                          className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm min-h-[44px] placeholder:text-white/40"
                        />
                        <p className="text-white/50 text-xs mt-1">Usada na página de login da barbearia (usuário em branco).</p>
                      </div>
                    </div>
                  </section>
                  <section className="p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <h3 className="text-sm font-medium text-white/90 uppercase tracking-wider">{t('management.barberLogin')}</h3>
                    <p className="text-white/50 text-xs">{t('management.barberLoginHint')}</p>
                    {barberAccessLoading ? (
                      <p className="text-white/50 text-sm">Carregando barbeiros...</p>
                    ) : barberAccess.length === 0 ? (
                      <p className="text-white/50 text-sm">{t('management.noBarbersInShop')}</p>
                    ) : (
                      <ul className="space-y-4">
                        {barberAccess.map((row) => (
                          <li key={row.barberId} className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
                            <p className="text-white font-medium text-sm">{row.name}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-white/50 text-xs mb-1">Usuário</label>
                                <input
                                  type="text"
                                  value={row.username}
                                  onChange={(e) => setBarberAccess((prev) => prev.map((r) => r.barberId === row.barberId ? { ...r, username: e.target.value } : r))}
                                  placeholder={t('management.usernamePlaceholder')}
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm min-h-[40px] placeholder:text-white/40"
                                />
                              </div>
                              <div>
                                <label className="block text-white/50 text-xs mb-1">Senha</label>
                                <input
                                  type="password"
                                  autoComplete="new-password"
                                  value={row.password}
                                  onChange={(e) => setBarberAccess((prev) => prev.map((r) => r.barberId === row.barberId ? { ...r, password: e.target.value } : r))}
                                  placeholder={t('management.leaveBlankToNotChange')}
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm min-h-[40px] placeholder:text-white/40"
                                />
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section className="p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <h3 className="text-sm font-medium text-white/90 uppercase tracking-wider">{t('management.kioskAccess')}</h3>
                    <p className="text-white/60 text-sm">{t('management.kioskAccessHint')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white/60 text-sm mb-2">{t('management.kioskUsername')}</label>
                        <input
                          type="text"
                          value={formData.settings.kioskUsername || ''}
                          onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, kioskUsername: e.target.value || undefined } })}
                          placeholder={t('management.kioskUsernamePlaceholder')}
                          className="form-input w-full px-3 py-2.5 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-white/60 text-sm mb-2">{t('management.kioskPassword')}</label>
                        <input
                          type="password"
                          value={formData.settings.kioskPassword || ''}
                          onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, kioskPassword: e.target.value || undefined } })}
                          placeholder={t('management.kioskPasswordPlaceholder')}
                          className="form-input w-full px-3 py-2.5 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-sm"
                        />
                      </div>
                    </div>
                  </section>
                </div>
              )}
              <div className="modal-actions flex gap-2 sm:gap-3 mt-5 sm:mt-6 flex-shrink-0 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    editModal.close();
                    setEditingShop(null);
                    setFormData({ name: '', slug: '', domain: '', path: '', apiBase: '', theme: { ...DEFAULT_THEME }, style: defaultStyle, homeContentByLocale: defaultHomeByLocale(), settings: { ...DEFAULT_SETTINGS }, ownerPassword: '', staffPassword: '' }); setContentLocale('pt-BR');
                  }}
                  className="modal-btn secondary flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-all min-h-[44px] bg-[rgba(255,255,255,0.1)] text-white hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!editingShop && isSubmittingCreate}
                  className="modal-btn primary flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-all min-h-[44px] bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#242424] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!editingShop ? (isSubmittingCreate ? t('createShop.creating') : t('createShop.createBarbershop')) : (t('common.save') ?? 'Salvar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={deleteConfirmModal.isOpen}
        onClose={deleteConfirmModal.close}
        onConfirm={handleDelete}
        title={t('management.removeShopTitle')}
        message="Tem certeza que deseja remover esta barbearia? Esta ação não pode ser desfeita."
        confirmText="Remover"
        cancelText="Cancelar"
        variant="destructive"
        icon="delete"
      />
    </div>
  );
}

