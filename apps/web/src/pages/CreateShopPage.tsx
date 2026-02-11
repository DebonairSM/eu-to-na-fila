import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { api } from '@/lib/api';
import type { ShopTheme, HomeContent, ShopSettings, ShopStyleConfig, OperatingHours } from '@eutonafila/shared';
import { DEFAULT_THEME, DEFAULT_HOME_CONTENT, DEFAULT_SETTINGS, shopStyleConfigSchema } from '@eutonafila/shared';
import { useModal } from '@/hooks/useModal';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { CompanyNav } from '@/components/CompanyNav';
import { RootSiteNav } from '@/components/RootSiteNav';
import { AppearanceForm } from '@/components/AppearanceForm';
import { pickThreeRandomPaletteIndices } from '@/lib/presetPalettes';
import { isRootBuild } from '@/lib/build';
import { getErrorMessage } from '@/lib/utils';

// --- Types ---

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

const defaultStyle = shopStyleConfigSchema.parse({});

interface ShopFormData {
  name: string;
  slug: string;
  domain: string;
  path: string;
  apiBase: string;
  theme: ShopTheme;
  style: ShopStyleConfig;
  homeContent: HomeContent;
  settings: ShopSettings;
  services: ServiceItem[];
  barbers: BarberItem[];
}

// --- Template ---

const uid = () => Math.random().toString(36).substring(2, 9);

function getDefaultFormData(t: (key: string) => string): ShopFormData {
  return {
    name: '',
    slug: '',
    domain: '',
    path: '',
    apiBase: '',
    theme: { ...DEFAULT_THEME },
    style: defaultStyle,
    homeContent: JSON.parse(JSON.stringify(DEFAULT_HOME_CONTENT)),
    settings: { ...DEFAULT_SETTINGS },
    services: [
      { id: uid(), name: t('createShop.serviceNameHaircut'), description: t('createShop.serviceDescHaircut'), duration: 30, price: 3000 },
      { id: uid(), name: t('createShop.serviceNameBeard'), description: t('createShop.serviceDescBeard'), duration: 20, price: 2000 },
      { id: uid(), name: t('createShop.serviceNameCombo'), description: t('createShop.serviceDescCombo'), duration: 45, price: 4500 },
    ],
    barbers: [
      { id: uid(), name: '', email: '', phone: '' },
      { id: uid(), name: '', email: '', phone: '' },
    ],
  };
}

type CreateTab = 'info' | 'appearance' | 'content' | 'settings' | 'services' | 'barbers';

// --- Helpers ---

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

// --- Step: Services (tab) ---

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
        <p className="text-white/60 text-sm">
          {t('createShop.servicesIntro')}
        </p>
      </div>

      {errors.services && <p className="text-red-400 text-sm">{errors.services}</p>}

      <div className="space-y-4">
        {services.map((service, index) => (
          <div
            key={service.id}
            className="p-4 sm:p-5 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/40 text-xs font-medium uppercase tracking-wider">
                {t('createShop.serviceN')} {index + 1}
              </span>
              {services.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeService(service.id)}
                  className="text-red-400/60 hover:text-red-400 transition-colors p-1"
                  aria-label={t('createShop.removeService')}
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={service.name}
                  onChange={(e) => updateService(service.id, { name: e.target.value })}
                  placeholder={t('createShop.serviceNamePlaceholder')}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={service.description}
                  onChange={(e) => updateService(service.id, { description: e.target.value })}
                  placeholder={t('createShop.serviceDescPlaceholder')}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-white/50 text-xs mb-1">{t('createShop.durationMin')}</label>
                <input
                  type="number"
                  min={1}
                  value={service.duration}
                  onChange={(e) =>
                    updateService(service.id, { duration: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-white/50 text-xs mb-1">{t('createShop.priceReais')}</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={(service.price / 100).toFixed(2)}
                  onChange={(e) =>
                    updateService(service.id, {
                      price: Math.round(parseFloat(e.target.value || '0') * 100),
                    })
                  }
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addService}
        className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-white/20 rounded-xl text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all text-sm"
      >
        <span className="material-symbols-outlined text-lg">add</span>
        {t('createShop.addService')}
      </button>
    </div>
  );
}

// --- Step: Barbers (tab) ---

function StepBarbers({
  barbers,
  onChange,
  errors,
}: {
  barbers: BarberItem[];
  onChange: (barbers: BarberItem[]) => void;
  errors: Record<string, string>;
}) {
  const { t } = useLocale();
  const addBarber = () => {
    onChange([...barbers, { id: uid(), name: '', email: '', phone: '' }]);
  };

  const removeBarber = (id: string) => {
    if (barbers.length <= 1) return;
    onChange(barbers.filter((b) => b.id !== id));
  };

  const updateBarber = (id: string, patch: Partial<BarberItem>) => {
    onChange(barbers.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2">{t('createShop.barbersTab')}</h2>
        <p className="text-white/60 text-sm">
          {t('createShop.barbersIntro')}
        </p>
      </div>

      {errors.barbers && <p className="text-red-400 text-sm">{errors.barbers}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {barbers.map((barber, index) => (
          <div
            key={barber.id}
            className="p-4 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all relative"
          >
            {barbers.length > 1 && (
              <button
                type="button"
                onClick={() => removeBarber(barber.id)}
                className="absolute top-3 right-3 text-red-400/60 hover:text-red-400 transition-colors p-1"
                aria-label={t('createShop.removeBarber')}
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37]/30 to-[#D4AF37]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#D4AF37] text-lg">person</span>
              </div>
              <span className="text-white/40 text-xs font-medium uppercase tracking-wider">
                {t('createShop.barberN')} {index + 1}
              </span>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={barber.name}
                onChange={(e) => updateBarber(barber.id, { name: e.target.value })}
                placeholder={t('createShop.namePlaceholder')}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
              />
              <input
                type="email"
                value={barber.email}
                onChange={(e) => updateBarber(barber.id, { email: e.target.value })}
                placeholder={t('createShop.emailPlaceholder')}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
              />
              <input
                type="tel"
                value={barber.phone}
                onChange={(e) => updateBarber(barber.id, { phone: e.target.value })}
                placeholder={t('createShop.phonePlaceholder')}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addBarber}
        className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-white/20 rounded-xl text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all text-sm"
      >
        <span className="material-symbols-outlined text-lg">person_add</span>
        {t('createShop.addBarber')}
      </button>
    </div>
  );
}

// --- Main Page ---

const FORM_INPUT = 'form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 placeholder:text-white/30';

export function CreateShopPage() {
  const navigate = useNavigate();
  const { user, isCompanyAdmin } = useAuthContext();
  const { t } = useLocale();
  const cancelModal = useModal();

  const [createTab, setCreateTab] = useState<CreateTab>('info');
  const [data, setData] = useState<ShopFormData>(() => getDefaultFormData(t));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [paletteIndices, setPaletteIndices] = useState<[number, number, number]>(() =>
    pickThreeRandomPaletteIndices(data.style.preset)
  );
  const [savedPalettes, setSavedPalettes] = useState<Array<{ label: string; theme: ShopTheme }>>([]);
  const [placesLookupAddress, setPlacesLookupAddress] = useState('');
  const [placesLookupLoading, setPlacesLookupLoading] = useState(false);
  const [placesLookupMessage, setPlacesLookupMessage] = useState<string | null>(null);
  const [homeImageUploading, setHomeImageUploading] = useState(false);
  const [homeImageError, setHomeImageError] = useState<string | null>(null);
  const homeImageInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPaletteIndices(pickThreeRandomPaletteIndices(data.style.preset));
  }, [data.style.preset]);

  const useRootTheme = isRootBuild();
  const Nav = useRootTheme ? RootSiteNav : CompanyNav;

  const isDirty = useMemo(() => data.name !== '', [data.name]);

  const onChange = useCallback((patch: Partial<ShopFormData>) => {
    setData((prev) => ({ ...prev, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(patch).forEach((key) => delete next[key]);
      return next;
    });
  }, []);

  const handleCancel = useCallback(() => {
    if (isDirty) cancelModal.open();
    else navigate('/company/dashboard');
  }, [isDirty, cancelModal, navigate]);

  const validateForSubmit = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!data.name.trim()) errs.name = t('createShop.nameRequired');
    const hasEmptyService = data.services.some((s) => !s.name.trim());
    if (hasEmptyService || data.services.length === 0)
      errs.services = data.services.length === 0 ? t('createShop.addAtLeastOneService') : t('createShop.allServicesNeedName');
    const hasEmptyBarber = data.barbers.some((b) => !b.name.trim());
    if (hasEmptyBarber || data.barbers.length === 0)
      errs.barbers = data.barbers.length === 0 ? t('createShop.addAtLeastOneBarber') : t('createShop.allBarbersNeedName');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [data, t]);

  const handleSubmit = useCallback(async () => {
    if (!user?.companyId) return;
    if (!validateForSubmit()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await api.createFullShop(user.companyId, {
        name: data.name,
        slug: data.slug || undefined,
        domain: data.domain || undefined,
        theme: data.theme,
        homeContentByLocale: { 'pt-BR': data.homeContent, en: data.homeContent },
        settings: data.settings,
        services: data.services.map((s) => ({
          name: s.name,
          description: s.description || undefined,
          duration: s.duration,
          price: s.price || undefined,
        })),
        barbers: data.barbers.map((b) => ({
          name: b.name,
          email: b.email || undefined,
          phone: b.phone || undefined,
        })),
      });
      navigate('/company/dashboard');
    } catch (err) {
      setSubmitError(getErrorMessage(err, t('createShop.createError')));
    } finally {
      setIsSubmitting(false);
    }
  }, [user?.companyId, data, validateForSubmit, navigate, t]);

  if (!isCompanyAdmin || !user?.companyId) {
    return null;
  }

  const handleNameChange = (name: string) => {
    const patch: Partial<ShopFormData> = { name };
    if (!data.slug || data.slug === generateSlug(data.name)) patch.slug = generateSlug(name);
    onChange(patch);
  };

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
      const locationPatch: Partial<ShopFormData['homeContent']['location']> = {};
      if (typeof loc.address === 'string' && loc.address) locationPatch.address = loc.address;
      if (typeof loc.addressLink === 'string' && loc.addressLink) locationPatch.addressLink = loc.addressLink;
      if (typeof loc.mapQuery === 'string' && loc.mapQuery) locationPatch.mapQuery = loc.mapQuery;
      if (typeof loc.phone === 'string' && loc.phone) locationPatch.phone = loc.phone;
      if (typeof loc.phoneHref === 'string' && loc.phoneHref) locationPatch.phoneHref = loc.phoneHref;
      if (typeof loc.hours === 'string' && loc.hours) locationPatch.hours = loc.hours;
      if (Object.keys(locationPatch).length > 0) {
        onChange({
          homeContent: {
            ...data.homeContent,
            location: { ...data.homeContent.location, ...locationPatch },
          },
        });
      }
      if (typeof loc.name === 'string' && loc.name && !data.name.trim()) {
        handleNameChange(loc.name);
      }
      setPlacesLookupMessage(t('management.lookupSuccess'));
    } catch (err: unknown) {
      const statusCode = err && typeof err === 'object' && 'statusCode' in err ? (err as { statusCode: number }).statusCode : 0;
      const msg = statusCode === 503
        ? t('management.lookupUnavailable')
        : getErrorMessage(err, t('management.lookupError'));
      setPlacesLookupMessage(msg);
    } finally {
      setPlacesLookupLoading(false);
    }
  }, [user?.companyId, placesLookupAddress, data.homeContent, data.name, onChange, t]);

  const tabs: { id: CreateTab; label: string }[] = [
    { id: 'info', label: t('management.infoTab') },
    { id: 'appearance', label: t('management.appearanceTab') },
    { id: 'content', label: t('management.contentTab') },
    { id: 'settings', label: t('management.settingsTab') },
    { id: 'services', label: t('createShop.servicesTab') },
    { id: 'barbers', label: t('createShop.barbersTab') },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Nav />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.25em] text-white/60 mb-2">{t('createShop.newShop')}</p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white">{t('createShop.createShop')}</h1>
        </div>

        {submitError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            {submitError}
          </div>
        )}

        <div className="bg-[#242424] border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 overflow-hidden">
          <div className="flex gap-2 mb-5 border-b border-white/10 pb-3 overflow-x-auto">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setCreateTab(id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  createTab === id ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="min-h-[320px]">
            {createTab === 'info' && (
              <section className="space-y-5">
                <p className="text-white/60 text-sm">{t('management.infoIntro')}</p>
                <div>
                  <label htmlFor="createName" className="block text-[rgba(255,255,255,0.7)] text-sm mb-2">{t('management.name')} *</label>
                  <input
                    id="createName"
                    type="text"
                    value={data.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    className={FORM_INPUT}
                  />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="createSlug" className="block text-[rgba(255,255,255,0.7)] text-sm mb-2">{t('management.slug')} *</label>
                  <input
                    id="createSlug"
                    type="text"
                    value={data.slug}
                    onChange={(e) => onChange({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    required
                    pattern="[a-z0-9-]+"
                    className={FORM_INPUT}
                  />
                </div>
                <div>
                  <label htmlFor="createDomain" className="block text-white/50 text-sm mb-2">{t('management.domain')}</label>
                  <input id="createDomain" type="text" value={data.domain} onChange={(e) => onChange({ domain: e.target.value })} placeholder={t('management.domainPlaceholder')} className={FORM_INPUT} />
                </div>
                <div>
                  <label htmlFor="createPath" className="block text-white/50 text-sm mb-2">{t('management.path')}</label>
                  <input id="createPath" type="text" value={data.path} onChange={(e) => onChange({ path: e.target.value })} placeholder={t('management.pathPlaceholder')} className={FORM_INPUT} />
                </div>
                <div>
                  <label htmlFor="createApiBase" className="block text-white/50 text-sm mb-2">{t('management.apiBase')}</label>
                  <input id="createApiBase" type="url" value={data.apiBase} onChange={(e) => onChange({ apiBase: e.target.value })} placeholder={t('management.apiBasePlaceholder')} className={FORM_INPUT} />
                </div>
              </section>
            )}

            {createTab === 'appearance' && (
              <AppearanceForm
                formData={{ theme: data.theme, style: data.style }}
                setFormData={(updater) =>
                  setData((prev) => {
                    const next = typeof updater === 'function' ? updater({ theme: prev.theme, style: prev.style }) : updater;
                    return { ...prev, theme: next.theme, style: next.style };
                  })
                }
                variant="root"
                paletteIndices={paletteIndices}
                onRerollPalettes={() => setPaletteIndices(pickThreeRandomPaletteIndices(data.style.preset))}
                savedPalettes={savedPalettes}
                onSaveCurrentPalette={(label) =>
                  setSavedPalettes((prev) => [...prev, { label, theme: { ...data.theme } }])
                }
              />
            )}

            {createTab === 'content' && (
              <div className="space-y-6 max-h-[50vh] overflow-y-auto">
                <p className="text-white/60 text-sm">{t('management.contentIntro')}</p>
                <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-white font-medium">{t('management.storeIcons')}</h4>
                  <div className="space-y-3">
                    <div><label className="block text-white/60 text-sm mb-1">{t('management.favicon')}</label><input type="url" value={data.homeContent.branding.faviconUrl} onChange={(e) => onChange({ homeContent: { ...data.homeContent, branding: { ...data.homeContent.branding, faviconUrl: e.target.value } } })} placeholder="https://..." className={FORM_INPUT} /></div>
                    <div><label className="block text-white/60 text-sm mb-1">{t('management.headerIcon')}</label><input type="url" value={data.homeContent.branding.headerIconUrl} onChange={(e) => onChange({ homeContent: { ...data.homeContent, branding: { ...data.homeContent.branding, headerIconUrl: e.target.value } } })} placeholder="https://..." className={FORM_INPUT} /></div>
                  </div>
                </section>
                <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-white font-medium">{t('management.hero')}</h4>
                  <div className="space-y-3">
                    <div><label className="block text-white/60 text-sm mb-1">{t('management.heroBadge')}</label><input type="text" value={data.homeContent.hero.badge} onChange={(e) => onChange({ homeContent: { ...data.homeContent, hero: { ...data.homeContent.hero, badge: e.target.value } } })} className={FORM_INPUT} /></div>
                    <div><label className="block text-white/60 text-sm mb-1">{t('management.subtitle')}</label><input type="text" value={data.homeContent.hero.subtitle} onChange={(e) => onChange({ homeContent: { ...data.homeContent, hero: { ...data.homeContent.hero, subtitle: e.target.value } } })} className={FORM_INPUT} /></div>
                    <div><label className="block text-white/60 text-sm mb-1">{t('management.ctaJoin')}</label><input type="text" value={data.homeContent.hero.ctaJoin} onChange={(e) => onChange({ homeContent: { ...data.homeContent, hero: { ...data.homeContent.hero, ctaJoin: e.target.value } } })} className={FORM_INPUT} /></div>
                    <div><label className="block text-white/60 text-sm mb-1">{t('management.ctaLocation')}</label><input type="text" value={data.homeContent.hero.ctaLocation} onChange={(e) => onChange({ homeContent: { ...data.homeContent, hero: { ...data.homeContent.hero, ctaLocation: e.target.value } } })} className={FORM_INPUT} /></div>
                  </div>
                </section>
                <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-white font-medium">{t('management.aboutSection')}</h4>
                  <div className="space-y-3">
                    <div><label className="block text-white/60 text-sm mb-1">{t('management.sectionTitle')}</label><input type="text" value={data.homeContent.about.sectionTitle} onChange={(e) => onChange({ homeContent: { ...data.homeContent, about: { ...data.homeContent.about, sectionTitle: e.target.value } } })} className={FORM_INPUT} /></div>
                    <div>
                      <label className="block text-white/60 text-sm mb-1">{t('management.imageUrl')}</label>
                      <div className="flex flex-wrap gap-2 items-center">
                        <input type="url" value={data.homeContent.about.imageUrl} onChange={(e) => { setHomeImageError(null); onChange({ homeContent: { ...data.homeContent, about: { ...data.homeContent.about, imageUrl: e.target.value } } }); }} placeholder="https://..." className={FORM_INPUT + ' flex-1 min-w-[200px]'} />
                        <input ref={homeImageInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !user?.companyId) return;
                          setHomeImageError(null);
                          setHomeImageUploading(true);
                          try {
                            const { url } = await api.uploadDraftHomeImage(user.companyId, file);
                            onChange({ homeContent: { ...data.homeContent, about: { ...data.homeContent.about, imageUrl: url } } });
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
                    <div><label className="block text-white/60 text-sm mb-1">{t('management.imageAlt')}</label><input type="text" value={data.homeContent.about.imageAlt} onChange={(e) => onChange({ homeContent: { ...data.homeContent, about: { ...data.homeContent.about, imageAlt: e.target.value } } })} className={FORM_INPUT} /></div>
                  </div>
                </section>
                <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-white font-medium">{t('management.servicesSection')}</h4>
                  <div className="space-y-3">
                    <div><label className="block text-white/60 text-sm mb-1">{t('management.sectionTitle')}</label><input type="text" value={data.homeContent.services.sectionTitle} onChange={(e) => onChange({ homeContent: { ...data.homeContent, services: { ...data.homeContent.services, sectionTitle: e.target.value } } })} className={FORM_INPUT} /></div>
                  </div>
                </section>
                <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-white font-medium">{t('management.locationSection')}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-white/60 text-sm mb-1">{t('management.lookupByAddress')}</label>
                      <div className="flex gap-2 flex-wrap">
                        <input
                          type="text"
                          value={placesLookupAddress}
                          onChange={(e) => setPlacesLookupAddress(e.target.value)}
                          placeholder={t('management.addressPlaceholder')}
                          className={FORM_INPUT + ' flex-1 min-w-[200px]'}
                          disabled={placesLookupLoading}
                        />
                        <button
                          type="button"
                          onClick={handlePlacesLookup}
                          disabled={placesLookupLoading || !placesLookupAddress.trim()}
                          className="px-4 py-2.5 rounded-lg bg-[#D4AF37] text-[#0a0a0a] font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                        >
                          {placesLookupLoading ? t('management.searching') : t('management.search')}
                        </button>
                      </div>
                      {placesLookupMessage && (
                        <p className={`text-sm mt-1 ${placesLookupMessage === t('management.lookupSuccess') ? 'text-green-400' : 'text-amber-400'}`}>
                          {placesLookupMessage}
                        </p>
                      )}
                    </div>
                    <div><label className="block text-white/60 text-sm mb-1">{t('management.address')}</label><textarea value={data.homeContent.location.address} onChange={(e) => onChange({ homeContent: { ...data.homeContent, location: { ...data.homeContent.location, address: e.target.value } } })} className={FORM_INPUT + ' min-h-[60px]'} /></div>
                    <div><label className="block text-white/60 text-sm mb-1">{t('management.hours')}</label><textarea value={data.homeContent.location.hours} onChange={(e) => onChange({ homeContent: { ...data.homeContent, location: { ...data.homeContent.location, hours: e.target.value } } })} className={FORM_INPUT} /></div>
                    <div><label className="block text-white/60 text-sm mb-1">{t('management.phone')}</label><input type="text" value={data.homeContent.location.phone} onChange={(e) => onChange({ homeContent: { ...data.homeContent, location: { ...data.homeContent.location, phone: e.target.value } } })} className={FORM_INPUT} /></div>
                    <div><label className="block text-white/60 text-sm mb-1">{t('management.phoneLink')}</label><input type="text" value={data.homeContent.location.phoneHref} onChange={(e) => onChange({ homeContent: { ...data.homeContent, location: { ...data.homeContent.location, phoneHref: e.target.value } } })} className={FORM_INPUT} placeholder="tel:+55..." /></div>
                    <div><label className="block text-white/60 text-sm mb-1">{t('management.languages')}</label><input type="text" value={data.homeContent.location.languages} onChange={(e) => onChange({ homeContent: { ...data.homeContent, location: { ...data.homeContent.location, languages: e.target.value } } })} className={FORM_INPUT} /></div>
                    <div><label className="block text-white/60 text-sm mb-1">{t('management.mapQuery')}</label><input type="text" value={data.homeContent.location.mapQuery} onChange={(e) => onChange({ homeContent: { ...data.homeContent, location: { ...data.homeContent.location, mapQuery: e.target.value } } })} className={FORM_INPUT} /></div>
                  </div>
                </section>
              </div>
            )}

            {createTab === 'settings' && (
              <div className="space-y-6">
                <section className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                  <h4 className="text-white font-medium">{t('management.queueSection')}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-white/60 text-sm mb-2">{t('management.maxQueueSize')}</label><input type="number" min={1} max={500} value={data.settings.maxQueueSize} onChange={(e) => onChange({ settings: { ...data.settings, maxQueueSize: parseInt(e.target.value) || 80 } })} className={FORM_INPUT} /></div>
                    <div><label className="block text-white/60 text-sm mb-2">{t('management.defaultServiceDuration')}</label><input type="number" min={1} max={480} value={data.settings.defaultServiceDuration} onChange={(e) => onChange({ settings: { ...data.settings, defaultServiceDuration: parseInt(e.target.value) || 20 } })} className={FORM_INPUT} /></div>
                  </div>
                </section>
                <section className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                  <h4 className="text-white font-medium">{t('management.serviceRules')}</h4>
                  <ul className="space-y-4">
                    {[{ key: 'requirePhone' as const, labelKey: 'management.requirePhone' }, { key: 'requireBarberChoice' as const, labelKey: 'management.requireBarberChoice' }, { key: 'allowDuplicateNames' as const, labelKey: 'management.allowDuplicateNames' }, { key: 'deviceDeduplication' as const, labelKey: 'management.deviceDeduplication' }, { key: 'allowCustomerCancelInProgress' as const, labelKey: 'management.allowCustomerCancelInProgress' }, { key: 'allowAppointments' as const, labelKey: 'management.allowAppointments' }, { key: 'allowQueueBeforeOpen' as const, labelKey: 'management.allowQueueBeforeOpen' }].map(({ key, labelKey }) => (
                      <li key={key}>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <button type="button" role="switch" aria-checked={data.settings[key]} onClick={() => onChange({ settings: { ...data.settings, [key]: !data.settings[key] } })} className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${data.settings[key] ? 'bg-[#D4AF37]' : 'bg-white/20'}`}><span className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transition-transform ${data.settings[key] ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white/60'}`} /></button>
                          <span className="text-white/80 text-sm group-hover:text-white transition-colors">{t(labelKey)}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                  <h4 className="text-white font-medium">{t('management.operatingHours')}</h4>
                  <p className="text-white/60 text-sm">{t('management.operatingHoursHint')}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-white/60 border-b border-white/10">
                          <th className="py-2 pr-4">{t('management.day')}</th>
                          <th className="py-2 pr-4 w-24">{t('management.open')}</th>
                          <th className="py-2 pr-4">{t('management.opensAt')}</th>
                          <th className="py-2 pr-4">{t('management.closesAt')}</th>
                          <th className="py-2 pr-4 w-24">Almoço</th>
                          <th className="py-2 pr-4">Saída</th>
                          <th className="py-2 pr-4">Retorno</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => {
                          const labelKeys: Record<typeof day, string> = { monday: 'management.monday', tuesday: 'management.tuesday', wednesday: 'management.wednesday', thursday: 'management.thursday', friday: 'management.friday', saturday: 'management.saturday', sunday: 'management.sunday' };
                          const hours = data.settings.operatingHours ?? ({} as OperatingHours);
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
                                  onClick={() => onChange({ settings: { ...data.settings, operatingHours: { ...hours, [day]: isOpen ? null : { open, close } } } })}
                                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${isOpen ? 'bg-[#D4AF37]' : 'bg-white/20'}`}
                                >
                                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transition-transform ${isOpen ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white/60'}`} />
                                </button>
                              </td>
                              <td className="py-2 pr-4">
                                <input
                                  type="time"
                                  value={open}
                                  disabled={!isOpen}
                                  onChange={(e) => onChange({ settings: { ...data.settings, operatingHours: { ...hours, [day]: { ...dayHours!, open: e.target.value, close, lunchStart: dayHours?.lunchStart, lunchEnd: dayHours?.lunchEnd } } } })}
                                  className={`${FORM_INPUT} max-w-[120px] disabled:opacity-50`}
                                />
                              </td>
                              <td className="py-2 pr-4">
                                <input
                                  type="time"
                                  value={close}
                                  disabled={!isOpen}
                                  onChange={(e) => onChange({ settings: { ...data.settings, operatingHours: { ...hours, [day]: { ...dayHours!, open, close: e.target.value, lunchStart: dayHours?.lunchStart, lunchEnd: dayHours?.lunchEnd } } } })}
                                  className={`${FORM_INPUT} max-w-[120px] disabled:opacity-50`}
                                />
                              </td>
                              <td className="py-2 pr-4">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={hasLunch}
                                  disabled={!isOpen}
                                  onClick={() => onChange({ settings: { ...data.settings, operatingHours: { ...hours, [day]: hasLunch ? { open, close, lunchStart: undefined, lunchEnd: undefined } : { open, close, lunchStart, lunchEnd } } } })}
                                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${hasLunch ? 'bg-[#D4AF37]' : 'bg-white/20'} disabled:opacity-30`}
                                >
                                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transition-transform ${hasLunch ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white/60'}`} />
                                </button>
                              </td>
                              <td className="py-2 pr-4">
                                <input
                                  type="time"
                                  value={lunchStart}
                                  disabled={!isOpen || !hasLunch}
                                  onChange={(e) => onChange({ settings: { ...data.settings, operatingHours: { ...hours, [day]: { ...dayHours!, open, close, lunchStart: e.target.value, lunchEnd } } } })}
                                  className={`${FORM_INPUT} max-w-[120px] disabled:opacity-50`}
                                />
                              </td>
                              <td className="py-2 pr-4">
                                <input
                                  type="time"
                                  value={lunchEnd}
                                  disabled={!isOpen || !hasLunch}
                                  onChange={(e) => onChange({ settings: { ...data.settings, operatingHours: { ...hours, [day]: { ...dayHours!, open, close, lunchStart, lunchEnd: e.target.value } } } })}
                                  className={`${FORM_INPUT} max-w-[120px] disabled:opacity-50`}
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

            {createTab === 'services' && (
              <>
                {errors.services && <p className="text-red-400 text-sm mb-4">{errors.services}</p>}
                <StepServices services={data.services} onChange={(services) => onChange({ services })} errors={errors} />
              </>
            )}

            {createTab === 'barbers' && (
              <>
                {errors.barbers && <p className="text-red-400 text-sm mb-4">{errors.barbers}</p>}
                <StepBarbers barbers={data.barbers} onChange={(barbers) => onChange({ barbers })} errors={errors} />
              </>
            )}
          </div>

          <div className="flex gap-2 sm:gap-3 mt-6 pt-4 border-t border-white/10">
            <button type="button" onClick={handleCancel} className="modal-btn secondary flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-all min-h-[44px] bg-[rgba(255,255,255,0.1)] text-white hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/30">
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="modal-btn primary flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-all min-h-[44px] bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#242424] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0a0a0a]/30 border-t-[#0a0a0a] rounded-full animate-spin inline-block mr-2 align-middle" />
                  {t('createShop.creating')}
                </>
              ) : (
                <>{t('createShop.createBarbershop')}</>
              )}
            </button>
          </div>
        </div>
      </main>

      <ConfirmationDialog
        isOpen={cancelModal.isOpen}
        onClose={cancelModal.close}
        onConfirm={() => navigate('/company/dashboard')}
        title={t('createShop.cancelConfirmTitle')}
        message={t('createShop.cancelConfirmMessage')}
        confirmText={t('createShop.discard')}
        cancelText={t('createShop.continueEditing')}
        variant="destructive"
        icon="warning"
      />
    </div>
  );
}
