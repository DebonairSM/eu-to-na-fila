import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { ShopTheme, HomeContent, ShopAdminView, ShopSettings, ShopStyleConfig, OperatingHours } from '@eutonafila/shared';
import { DEFAULT_THEME, DEFAULT_HOME_CONTENT, DEFAULT_SETTINGS, shopStyleConfigSchema } from '@eutonafila/shared';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useModal } from '@/hooks/useModal';
import { useErrorTimeout } from '@/hooks/useErrorTimeout';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
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

type Shop = ShopAdminView;

export function ShopManagementPage() {
  const { user, isCompanyAdmin } = useAuthContext();
  const { t } = useLocale();
  const navigate = useNavigate();
  const editModal = useModal();
  const deleteConfirmModal = useModal();
  
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [shopToDelete, setShopToDelete] = useState<number | null>(null);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [editTab, setEditTab] = useState<'info' | 'appearance' | 'content' | 'settings' | 'credentials'>('info');
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
  type BarberAccessRow = { barberId: number; name: string; username: string; password: string; initialUsername: string };
  const [barberAccess, setBarberAccess] = useState<BarberAccessRow[]>([]);
  const [barberAccessLoading, setBarberAccessLoading] = useState(false);
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
      setEditingShop(null);
      setFormData({ name: '', slug: '', domain: '', path: '', apiBase: '', theme: { ...DEFAULT_THEME }, style: defaultStyle, homeContentByLocale: defaultHomeByLocale(), settings: { ...DEFAULT_SETTINGS }, ownerPassword: '', staffPassword: '' });
      setBarberAccess([]);
      setContentLocale('pt-BR');
      editModal.close();
      await loadShops();
    } catch (error) {
      const errorMsg = getErrorMessage(error, t('management.updateError'));
      setErrorMessage(errorMsg);
    }
  }, [editingShop, formData, barberAccess, user?.companyId, loadShops, editModal]);

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
            onClick={() => navigate('/company/shops/new')}
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
              <div className="modal-content bg-[#242424] border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 max-w-[min(90vw,700px)] w-full min-w-[320px] max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4">
                <h2 id="edit-modal-title-root" className="text-xl sm:text-2xl text-white mb-4">
                  Editar Barbearia
                </h2>
                <div className="flex gap-2 mb-5 border-b border-white/10 pb-3 overflow-x-auto">
                  {(['info', 'appearance', 'content', 'settings', 'credentials'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setEditTab(tab)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        editTab === tab ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {tab === 'info' && t('management.infoTab')}
                      {tab === 'appearance' && t('management.appearanceTab')}
                      {tab === 'content' && t('management.contentTab')}
                      {tab === 'settings' && t('management.settingsTab')}
                      {tab === 'credentials' && t('management.credentialsTab')}
                    </button>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }} className="flex-1 overflow-y-auto min-h-0 pr-1">
                  {editTab === 'info' && (
                    <section className="space-y-5">
                      <p className="text-white/60 text-sm">{t('management.infoIntro')}</p>
                      <div>
                        <label htmlFor="editNameRoot" className="block text-white/70 text-sm mb-2">{t('management.name')} *</label>
                        <input
                          id="editNameRoot"
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20"
                        />
                      </div>
                      <div>
                        <label htmlFor="editSlugRoot" className="block text-white/70 text-sm mb-2">{t('management.slug')} *</label>
                        <input
                          id="editSlugRoot"
                          type="text"
                          value={formData.slug}
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                          required
                          pattern="[a-z0-9-]+"
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20"
                        />
                      </div>
                      <div>
                        <label htmlFor="editDomainRoot" className="block text-white/50 text-sm mb-2">{t('management.domain')}</label>
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
                        <label htmlFor="editPathRoot" className="block text-white/50 text-sm mb-2">{t('management.path')}</label>
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
                        <label htmlFor="editApiBaseRoot" className="block text-white/50 text-sm mb-2">{t('management.apiBase')}</label>
                        <input
                          id="editApiBaseRoot"
                          type="url"
                          value={formData.apiBase}
                          onChange={(e) => setFormData({ ...formData, apiBase: e.target.value })}
                          placeholder={t('management.apiBasePlaceholder')}
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20 placeholder:text-white/30"
                        />
                      </div>
                    </section>
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
                    </div>
                    );
                  })()}
                  {editTab === 'settings' && (
                    <div className="space-y-6">
                      <section className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                        <h4 className="text-white font-medium">Fila</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-white/60 text-sm mb-2">Tamanho máximo da fila</label>
                            <input type="number" min={1} max={500} value={formData.settings.maxQueueSize} onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, maxQueueSize: parseInt(e.target.value) || 80 } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" />
                          </div>
                          <div>
                            <label className="block text-white/60 text-sm mb-2">Duração padrão do serviço (min)</label>
                            <input type="number" min={1} max={480} value={formData.settings.defaultServiceDuration} onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, defaultServiceDuration: parseInt(e.target.value) || 20 } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" />
                          </div>
                        </div>
                      </section>
                      <section className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                        <h4 className="text-white font-medium">Regras de atendimento</h4>
                        <ul className="space-y-4">
                          {([
                            { key: 'requirePhone' as const, label: 'Exigir telefone do cliente' },
                            { key: 'allowDuplicateNames' as const, label: 'Permitir nomes duplicados na fila' },
                            { key: 'deviceDeduplication' as const, label: 'Impedir múltiplos tickets por dispositivo' },
                            { key: 'allowCustomerCancelInProgress' as const, label: 'Permitir cliente cancelar atendimento em andamento' },
                            { key: 'allowAppointments' as const, label: 'Permitir agendamentos (fila híbrida com horário marcado)' },
                          ]).map(({ key, label }) => (
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
                                <span className="text-white/80 text-sm group-hover:text-white transition-colors">{label}</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </section>
                      <section className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                        <h4 className="text-white font-medium">Horário de funcionamento</h4>
                        <p className="text-white/60 text-sm">Usado para agendamentos. Deixe fechado os dias sem atendimento.</p>
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
                                <th className="py-2 pr-4">Dia</th>
                                <th className="py-2 pr-4 w-24">Aberto</th>
                                <th className="py-2 pr-4">Abertura</th>
                                <th className="py-2 pr-4">Fechamento</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => {
                                const labels: Record<typeof day, string> = { monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta', thursday: 'Quinta', friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo' };
                                const hours = formData.settings.operatingHours ?? ({} as OperatingHours);
                                const dayHours = hours[day];
                                const isOpen = dayHours != null;
                                const open = dayHours?.open ?? '09:00';
                                const close = dayHours?.close ?? '18:00';
                                return (
                                  <tr key={day} className="border-b border-white/5">
                                    <td className="py-2 pr-4 text-white/90">{labels[day]}</td>
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
                                        onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, operatingHours: { ...hours, [day]: { open: e.target.value, close } } } })}
                                        className="w-full max-w-[120px] px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm disabled:opacity-50"
                                      />
                                    </td>
                                    <td className="py-2 pr-4">
                                      <input
                                        type="time"
                                        value={close}
                                        disabled={!isOpen}
                                        onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, operatingHours: { ...hours, [day]: { open, close: e.target.value } } } })}
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
                      <p className="text-white/60 text-sm">Senhas para login na barbearia. Deixe em branco para não alterar. Mínimo 6 caracteres.</p>
                      <section className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                        <h4 className="text-white font-medium">Credenciais de acesso</h4>
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
                      <section className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                        <h4 className="text-white font-medium">Login por barbeiro</h4>
                        <p className="text-white/50 text-xs">Cada barbeiro pode ter usuário e senha para entrar na página da barbearia e ver apenas seu card e atribuir clientes a si.</p>
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
                    </div>
                  )}
                  <div className="flex gap-2 sm:gap-3 mt-5 sm:mt-6 flex-shrink-0 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => { editModal.close(); setEditingShop(null); setFormData({ name: '', slug: '', domain: '', path: '', apiBase: '', theme: { ...DEFAULT_THEME }, style: defaultStyle, homeContentByLocale: defaultHomeByLocale(), settings: { ...DEFAULT_SETTINGS }, ownerPassword: '', staffPassword: '' }); setContentLocale('pt-BR'); }}
                      className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-none rounded-lg text-sm sm:text-base font-medium cursor-pointer transition-all min-h-[44px] bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-none rounded-lg text-sm sm:text-base font-medium cursor-pointer transition-all min-h-[44px] bg-white text-[#0a0a0a] hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white/50">
                      Salvar
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
      <main className="container max-w-[1200px] mx-auto px-4 sm:px-6 pt-24 pb-10 relative z-10">
        <div className="text-center mb-8">
          <h1 className="font-['Playfair_Display',serif] text-2xl font-semibold text-[#D4AF37] mb-3">
            {t('company.manageShops')}
          </h1>
          <p className="text-white/60 mt-2 text-sm">
            {t('company.manageShopsSubtitle')}
          </p>
        </div>

        <button
          onClick={() => navigate('/company/shops/new')}
          className="flex items-center justify-center gap-2 sm:gap-3 w-full max-w-[300px] mx-auto mb-8 sm:mb-10 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] border-none rounded-xl text-sm sm:text-base font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(212,175,55,0.4)] min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
            {shops.map((shop) => (
              <article
                key={shop.id}
                className="bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.06)] border-2 border-[rgba(212,175,55,0.3)] rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all hover:border-[#D4AF37] hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(212,175,55,0.2)] relative overflow-hidden"
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
                    className="flex-1 px-2 sm:px-3 py-2.5 sm:py-3 border-none rounded-lg text-xs sm:text-sm font-semibold cursor-pointer transition-all min-h-[44px] bg-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(212,175,55,0.2)] hover:text-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#242424]"
                    aria-label={`Editar barbearia ${shop.name}`}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      setShopToDelete(shop.id);
                      deleteConfirmModal.open();
                    }}
                    className="flex-1 px-2 sm:px-3 py-2.5 sm:py-3 border border-[rgba(239,68,68,0.3)] rounded-lg text-xs sm:text-sm font-semibold cursor-pointer transition-all min-h-[44px] bg-[rgba(239,68,68,0.2)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.3)] focus:outline-none focus:ring-2 focus:ring-[#ef4444] focus:ring-offset-2 focus:ring-offset-[#242424]"
                    aria-label={`Remover barbearia ${shop.name}`}
                  >
                    Remover
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
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
          <div className="modal-content bg-[#242424] border border-[rgba(212,175,55,0.3)] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 max-w-[min(90vw,700px)] w-full min-w-[320px] max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4">
            <h2 id="edit-modal-title" className="modal-title font-['Playfair_Display',serif] text-xl sm:text-2xl text-[#D4AF37] mb-4">
              Editar Barbearia
            </h2>
            <div className="flex gap-2 mb-5 border-b border-white/10 pb-3 overflow-x-auto">
              {(['info', 'appearance', 'content', 'settings', 'credentials'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setEditTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    editTab === tab ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {tab === 'info' && t('management.infoTab')}
                  {tab === 'appearance' && t('management.appearanceTab')}
                  {tab === 'content' && t('management.contentTab')}
                  {tab === 'settings' && t('management.settingsTab')}
                  {tab === 'credentials' && t('management.credentialsTab')}
                </button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }} className="flex-1 overflow-y-auto min-h-0 pr-1">
              {editTab === 'info' && (
                <section className="space-y-5">
                  <p className="text-white/60 text-sm">{t('management.infoIntro')}</p>
                  <div><label htmlFor="editName" className="block text-[rgba(255,255,255,0.7)] text-sm mb-2">{t('management.name')} *</label><input id="editName" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20" /></div>
                  <div><label htmlFor="editSlug" className="block text-[rgba(255,255,255,0.7)] text-sm mb-2">{t('management.slug')} *</label><input id="editSlug" type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} required pattern="[a-z0-9-]+" className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20" /></div>
                  <div><label htmlFor="editDomain" className="block text-white/50 text-sm mb-2">{t('management.domain')}</label><input id="editDomain" type="text" value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} placeholder={t('management.domainPlaceholder')} className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 placeholder:text-white/30" /></div>
                  <div><label htmlFor="editPath" className="block text-white/50 text-sm mb-2">{t('management.path')}</label><input id="editPath" type="text" value={formData.path} onChange={(e) => setFormData({ ...formData, path: e.target.value })} placeholder={t('management.pathPlaceholder')} className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 placeholder:text-white/30" /></div>
                  <div><label htmlFor="editApiBase" className="block text-white/50 text-sm mb-2">{t('management.apiBase')}</label><input id="editApiBase" type="url" value={formData.apiBase} onChange={(e) => setFormData({ ...formData, apiBase: e.target.value })} placeholder={t('management.apiBasePlaceholder')} className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 placeholder:text-white/30" /></div>
                </section>
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
                    <h4 className="text-white font-medium">{t('management.aboutSection')}</h4>
                    <div className="space-y-3">
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.sectionTitle')}</label><input type="text" value={contentForm.about.sectionTitle} onChange={(e) => setContentForm({ about: { ...contentForm.about, sectionTitle: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                      <div>
                        <label className="block text-white/60 text-sm mb-1">{t('management.imageUrl')}</label>
                        <div className="flex flex-wrap gap-2 items-center">
                          <input type="url" value={contentForm.about.imageUrl} onChange={(e) => { setHomeImageError(null); setContentForm({ about: { ...contentForm.about, imageUrl: e.target.value } }); }} placeholder="https://..." className="form-input flex-1 min-w-[200px] w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder:text-white/30" />
                          <input ref={homeImageInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !user?.companyId || !editingShop) return;
                            setHomeImageError(null);
                            setHomeImageUploading(true);
                            try {
                              const { url } = await api.uploadShopHomeImage(user.companyId, editingShop.id, file);
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
                    </div>
                  </section>
                  <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                    <h4 className="text-white font-medium">Seção Serviços</h4>
                    <div className="space-y-3">
                      <div><label className="block text-white/60 text-sm mb-1">Título da seção</label><input type="text" value={contentForm.services.sectionTitle} onChange={(e) => setContentForm({ services: { ...contentForm.services, sectionTitle: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                    </div>
                  </section>
                  <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                    <h4 className="text-white font-medium">Localização</h4>
                    <div className="space-y-3">
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.address')}</label><textarea value={contentForm.location.address} onChange={(e) => setContentForm({ location: { ...contentForm.location, address: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm min-h-[60px]" /></div>
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.hours')}</label><textarea value={contentForm.location.hours} onChange={(e) => setContentForm({ location: { ...contentForm.location, hours: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.phone')}</label><input type="text" value={contentForm.location.phone} onChange={(e) => setContentForm({ location: { ...contentForm.location, phone: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.phoneLink')}</label><input type="text" value={contentForm.location.phoneHref} onChange={(e) => setContentForm({ location: { ...contentForm.location, phoneHref: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" placeholder="tel:+55..." /></div>
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.languages')}</label><input type="text" value={contentForm.location.languages} onChange={(e) => setContentForm({ location: { ...contentForm.location, languages: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                      <div><label className="block text-white/60 text-sm mb-1">{t('management.mapQuery')}</label><input type="text" value={contentForm.location.mapQuery} onChange={(e) => setContentForm({ location: { ...contentForm.location, mapQuery: e.target.value } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                    </div>
                  </section>
                </div>
                );
              })()}
              {editTab === 'settings' && (
                <div className="space-y-6">
                  <section className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4"><h4 className="text-white font-medium">Fila</h4><div className="grid grid-cols-2 gap-4"><div><label className="block text-white/60 text-sm mb-2">Tamanho máximo da fila</label><input type="number" min={1} max={500} value={formData.settings.maxQueueSize} onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, maxQueueSize: parseInt(e.target.value) || 80 } })} className="form-input w-full px-3 py-2.5 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-sm" /></div><div><label className="block text-white/60 text-sm mb-2">Duração padrão do serviço (min)</label><input type="number" min={1} max={480} value={formData.settings.defaultServiceDuration} onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, defaultServiceDuration: parseInt(e.target.value) || 20 } })} className="form-input w-full px-3 py-2.5 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-sm" /></div></div></section>
                  <section className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4"><h4 className="text-white font-medium">Regras de atendimento</h4><ul className="space-y-4">{[{ key: 'requirePhone' as const, label: 'Exigir telefone do cliente' }, { key: 'requireBarberChoice' as const, label: 'Exigir escolha de barbeiro' }, { key: 'allowDuplicateNames' as const, label: 'Permitir nomes duplicados na fila' }, { key: 'deviceDeduplication' as const, label: 'Impedir múltiplos tickets por dispositivo' }, { key: 'allowCustomerCancelInProgress' as const, label: 'Permitir cliente cancelar atendimento em andamento' }, { key: 'allowAppointments' as const, label: 'Permitir agendamentos (fila híbrida com horário marcado)' }, { key: 'allowQueueBeforeOpen' as const, label: 'Permitir entrada na fila antes do horário de abertura' }].map(({ key, label }) => (<li key={key}><label className="flex items-center gap-3 cursor-pointer group"><button type="button" role="switch" aria-checked={formData.settings[key]} onClick={() => setFormData({ ...formData, settings: { ...formData.settings, [key]: !formData.settings[key] } })} className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${formData.settings[key] ? 'bg-[#D4AF37]' : 'bg-white/20'}`}><span className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transition-transform ${formData.settings[key] ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white/60'}`} /></button><span className="text-white/80 text-sm group-hover:text-white transition-colors">{label}</span></label></li>))}</ul></section>
                  <section className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <h4 className="text-white font-medium">Horário de funcionamento</h4>
                    <p className="text-white/60 text-sm">Usado para agendamentos. Deixe fechado os dias sem atendimento.</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-white/60 border-b border-white/10">
                            <th className="py-2 pr-4">Dia</th>
                            <th className="py-2 pr-4 w-24">Aberto</th>
                            <th className="py-2 pr-4">Abertura</th>
                            <th className="py-2 pr-4">Fechamento</th>
                            <th className="py-2 pr-4 w-24">Almoço</th>
                            <th className="py-2 pr-4">Saída</th>
                            <th className="py-2 pr-4">Retorno</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => {
                            const labels: Record<typeof day, string> = { monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta', thursday: 'Quinta', friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo' };
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
                                <td className="py-2 pr-4 text-white/90">{labels[day]}</td>
                                
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
                  <p className="text-white/60 text-sm">Senhas para login na barbearia. Deixe em branco para não alterar. Mínimo 6 caracteres.</p>
                  <section className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <h4 className="text-white font-medium">Credenciais de acesso</h4>
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
                  <section className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <h4 className="text-white font-medium">Login por barbeiro</h4>
                    <p className="text-white/50 text-xs">Cada barbeiro pode ter usuário e senha para entrar na página da barbearia e ver apenas seu card e atribuir clientes a si.</p>
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
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="modal-btn primary flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-all min-h-[44px] bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#242424]"
                >
                  Salvar
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

