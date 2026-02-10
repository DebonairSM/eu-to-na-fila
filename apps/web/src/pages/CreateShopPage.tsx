import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { ShopTheme, HomeContent, ShopSettings, ShopStyleConfig } from '@eutonafila/shared';
import { DEFAULT_THEME, DEFAULT_HOME_CONTENT, DEFAULT_SETTINGS, resolveShopStyle, shopStyleConfigSchema } from '@eutonafila/shared';
import { useModal } from '@/hooks/useModal';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { CompanyNav } from '@/components/CompanyNav';
import { RootSiteNav } from '@/components/RootSiteNav';
import { AppearanceForm } from '@/components/AppearanceForm';
import { ShopPreview } from '@/components/ShopPreview';
import type { ShopConfig } from '@/contexts/ShopConfigContext';
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

const TEMPLATE: ShopFormData = {
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
    { id: uid(), name: 'Corte de Cabelo', description: 'Corte tradicional', duration: 30, price: 3000 },
    { id: uid(), name: 'Barba', description: 'Aparar e modelar barba', duration: 20, price: 2000 },
    { id: uid(), name: 'Corte + Barba', description: 'Combo completo', duration: 45, price: 4500 },
  ],
  barbers: [
    { id: uid(), name: '', email: '', phone: '' },
    { id: uid(), name: '', email: '', phone: '' },
  ],
};

type CreateTab = 'info' | 'appearance' | 'content' | 'preview' | 'settings' | 'services' | 'barbers';

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
        <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2">Servicos</h2>
        <p className="text-white/60 text-sm">
          Personalize os servicos oferecidos. Ja vieram pré-preenchidos como modelo.
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
                Servico {index + 1}
              </span>
              {services.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeService(service.id)}
                  className="text-red-400/60 hover:text-red-400 transition-colors p-1"
                  aria-label="Remover servico"
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
                  placeholder="Nome do servico"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={service.description}
                  onChange={(e) => updateService(service.id, { description: e.target.value })}
                  placeholder="Descricao (opcional)"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-white/50 text-xs mb-1">Duracao (min)</label>
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
                <label className="block text-white/50 text-xs mb-1">Preco (R$)</label>
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
        Adicionar Servico
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
        <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2">Barbeiros</h2>
        <p className="text-white/60 text-sm">
          Adicione os barbeiros da equipe. Voce pode adicionar mais depois.
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
                aria-label="Remover barbeiro"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37]/30 to-[#D4AF37]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#D4AF37] text-lg">person</span>
              </div>
              <span className="text-white/40 text-xs font-medium uppercase tracking-wider">
                Barbeiro {index + 1}
              </span>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={barber.name}
                onChange={(e) => updateBarber(barber.id, { name: e.target.value })}
                placeholder="Nome *"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
              />
              <input
                type="email"
                value={barber.email}
                onChange={(e) => updateBarber(barber.id, { email: e.target.value })}
                placeholder="Email (opcional)"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
              />
              <input
                type="tel"
                value={barber.phone}
                onChange={(e) => updateBarber(barber.id, { phone: e.target.value })}
                placeholder="Telefone (opcional)"
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
        Adicionar Barbeiro
      </button>
    </div>
  );
}

// --- Main Page ---

const FORM_INPUT = 'form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 placeholder:text-white/30';

export function CreateShopPage() {
  const navigate = useNavigate();
  const { user, isCompanyAdmin } = useAuthContext();
  const cancelModal = useModal();

  const [createTab, setCreateTab] = useState<CreateTab>('info');
  const [data, setData] = useState<ShopFormData>(() => ({ ...TEMPLATE }));
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
    if (!data.name.trim()) errs.name = 'Nome é obrigatório';
    const hasEmptyService = data.services.some((s) => !s.name.trim());
    if (hasEmptyService || data.services.length === 0)
      errs.services = data.services.length === 0 ? 'Adicione pelo menos 1 serviço' : 'Todos os serviços precisam de um nome';
    const hasEmptyBarber = data.barbers.some((b) => !b.name.trim());
    if (hasEmptyBarber || data.barbers.length === 0)
      errs.barbers = data.barbers.length === 0 ? 'Adicione pelo menos 1 barbeiro' : 'Todos os barbeiros precisam de um nome';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [data]);

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
        homeContent: data.homeContent,
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
      setSubmitError(getErrorMessage(err, 'Erro ao criar barbearia. Tente novamente.'));
    } finally {
      setIsSubmitting(false);
    }
  }, [user?.companyId, data, validateForSubmit, navigate]);

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
        setPlacesLookupMessage('Nenhum resultado encontrado para este endereço.');
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
      setPlacesLookupMessage('Dados preenchidos. Revise e ajuste se necessário.');
    } catch (err: unknown) {
      const statusCode = err && typeof err === 'object' && 'statusCode' in err ? (err as { statusCode: number }).statusCode : 0;
      const msg = statusCode === 503
        ? 'Busca por endereço não está configurada.'
        : getErrorMessage(err, 'Não foi possível buscar o endereço. Tente novamente.');
      setPlacesLookupMessage(msg);
    } finally {
      setPlacesLookupLoading(false);
    }
  }, [user?.companyId, placesLookupAddress, data.homeContent, data.name, onChange]);

  const tabs: { id: CreateTab; label: string }[] = [
    { id: 'info', label: 'Informações' },
    { id: 'appearance', label: 'Aparência' },
    { id: 'content', label: 'Conteúdo' },
    { id: 'preview', label: 'Pré-visualização' },
    { id: 'settings', label: 'Configurações' },
    { id: 'services', label: 'Serviços' },
    { id: 'barbers', label: 'Barbeiros' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Nav />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.25em] text-white/60 mb-2">Nova Barbearia</p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white">Criar barbearia</h1>
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
                <p className="text-white/60 text-sm">Dados básicos da barbearia.</p>
                <div>
                  <label htmlFor="createName" className="block text-[rgba(255,255,255,0.7)] text-sm mb-2">Nome *</label>
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
                  <label htmlFor="createSlug" className="block text-[rgba(255,255,255,0.7)] text-sm mb-2">Slug *</label>
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
                  <label htmlFor="createDomain" className="block text-white/50 text-sm mb-2">Domínio (opcional)</label>
                  <input id="createDomain" type="text" value={data.domain} onChange={(e) => onChange({ domain: e.target.value })} placeholder="exemplo.com" className={FORM_INPUT} />
                </div>
                <div>
                  <label htmlFor="createPath" className="block text-white/50 text-sm mb-2">Caminho (opcional)</label>
                  <input id="createPath" type="text" value={data.path} onChange={(e) => onChange({ path: e.target.value })} placeholder="/caminho" className={FORM_INPUT} />
                </div>
                <div>
                  <label htmlFor="createApiBase" className="block text-white/50 text-sm mb-2">API Base URL (opcional)</label>
                  <input id="createApiBase" type="url" value={data.apiBase} onChange={(e) => onChange({ apiBase: e.target.value })} placeholder="https://api.exemplo.com" className={FORM_INPUT} />
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
                <p className="text-white/60 text-sm">Textos e conteúdo da página inicial. Todos opcionais.</p>
                <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-white font-medium">Ícones da loja</h4>
                  <div className="space-y-3">
                    <div><label className="block text-white/60 text-sm mb-1">Favicon (ícone da aba do navegador)</label><input type="url" value={data.homeContent.branding.faviconUrl} onChange={(e) => onChange({ homeContent: { ...data.homeContent, branding: { ...data.homeContent.branding, faviconUrl: e.target.value } } })} placeholder="https://..." className={FORM_INPUT} /></div>
                    <div><label className="block text-white/60 text-sm mb-1">Logo do cabeçalho (ícone no topo da página)</label><input type="url" value={data.homeContent.branding.headerIconUrl} onChange={(e) => onChange({ homeContent: { ...data.homeContent, branding: { ...data.homeContent.branding, headerIconUrl: e.target.value } } })} placeholder="https://..." className={FORM_INPUT} /></div>
                  </div>
                </section>
                <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-white font-medium">Hero</h4>
                  <div className="space-y-3">
                    <div><label className="block text-white/60 text-sm mb-1">Badge do hero</label><input type="text" value={data.homeContent.hero.badge} onChange={(e) => onChange({ homeContent: { ...data.homeContent, hero: { ...data.homeContent.hero, badge: e.target.value } } })} className={FORM_INPUT} /></div>
                    <div><label className="block text-white/60 text-sm mb-1">Subtítulo</label><input type="text" value={data.homeContent.hero.subtitle} onChange={(e) => onChange({ homeContent: { ...data.homeContent, hero: { ...data.homeContent.hero, subtitle: e.target.value } } })} className={FORM_INPUT} /></div>
                    <div><label className="block text-white/60 text-sm mb-1">Botão Entrar</label><input type="text" value={data.homeContent.hero.ctaJoin} onChange={(e) => onChange({ homeContent: { ...data.homeContent, hero: { ...data.homeContent.hero, ctaJoin: e.target.value } } })} className={FORM_INPUT} /></div>
                    <div><label className="block text-white/60 text-sm mb-1">Botão Localização</label><input type="text" value={data.homeContent.hero.ctaLocation} onChange={(e) => onChange({ homeContent: { ...data.homeContent, hero: { ...data.homeContent.hero, ctaLocation: e.target.value } } })} className={FORM_INPUT} /></div>
                  </div>
                </section>
                <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-white font-medium">Seção Sobre</h4>
                  <div className="space-y-3">
                    <div><label className="block text-white/60 text-sm mb-1">Título da seção</label><input type="text" value={data.homeContent.about.sectionTitle} onChange={(e) => onChange({ homeContent: { ...data.homeContent, about: { ...data.homeContent.about, sectionTitle: e.target.value } } })} className={FORM_INPUT} /></div>
                    <div><label className="block text-white/60 text-sm mb-1">Imagem (URL)</label><input type="url" value={data.homeContent.about.imageUrl} onChange={(e) => onChange({ homeContent: { ...data.homeContent, about: { ...data.homeContent.about, imageUrl: e.target.value } } })} placeholder="https://..." className={FORM_INPUT} /></div>
                    <div><label className="block text-white/60 text-sm mb-1">Texto alternativo da imagem</label><input type="text" value={data.homeContent.about.imageAlt} onChange={(e) => onChange({ homeContent: { ...data.homeContent, about: { ...data.homeContent.about, imageAlt: e.target.value } } })} className={FORM_INPUT} /></div>
                  </div>
                </section>
                <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-white font-medium">Seção Serviços</h4>
                  <div className="space-y-3">
                    <div><label className="block text-white/60 text-sm mb-1">Título da seção</label><input type="text" value={data.homeContent.services.sectionTitle} onChange={(e) => onChange({ homeContent: { ...data.homeContent, services: { ...data.homeContent.services, sectionTitle: e.target.value } } })} className={FORM_INPUT} /></div>
                  </div>
                </section>
                <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-white font-medium">Localização</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-white/60 text-sm mb-1">Buscar dados pelo endereço</label>
                      <div className="flex gap-2 flex-wrap">
                        <input
                          type="text"
                          value={placesLookupAddress}
                          onChange={(e) => setPlacesLookupAddress(e.target.value)}
                          placeholder="Endereço ou nome do estabelecimento"
                          className={FORM_INPUT + ' flex-1 min-w-[200px]'}
                          disabled={placesLookupLoading}
                        />
                        <button
                          type="button"
                          onClick={handlePlacesLookup}
                          disabled={placesLookupLoading || !placesLookupAddress.trim()}
                          className="px-4 py-2.5 rounded-lg bg-[#D4AF37] text-[#0a0a0a] font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                        >
                          {placesLookupLoading ? 'Buscando...' : 'Buscar'}
                        </button>
                      </div>
                      {placesLookupMessage && (
                        <p className={`text-sm mt-1 ${placesLookupMessage.startsWith('Dados preenchidos') ? 'text-green-400' : 'text-amber-400'}`}>
                          {placesLookupMessage}
                        </p>
                      )}
                    </div>
                    <div><label className="block text-white/60 text-sm mb-1">Endereço</label><textarea value={data.homeContent.location.address} onChange={(e) => onChange({ homeContent: { ...data.homeContent, location: { ...data.homeContent.location, address: e.target.value } } })} className={FORM_INPUT + ' min-h-[60px]'} /></div>
                    <div><label className="block text-white/60 text-sm mb-1">Horário</label><textarea value={data.homeContent.location.hours} onChange={(e) => onChange({ homeContent: { ...data.homeContent, location: { ...data.homeContent.location, hours: e.target.value } } })} className={FORM_INPUT} /></div>
                    <div><label className="block text-white/60 text-sm mb-1">Telefone</label><input type="text" value={data.homeContent.location.phone} onChange={(e) => onChange({ homeContent: { ...data.homeContent, location: { ...data.homeContent.location, phone: e.target.value } } })} className={FORM_INPUT} /></div>
                    <div><label className="block text-white/60 text-sm mb-1">Link do telefone</label><input type="text" value={data.homeContent.location.phoneHref} onChange={(e) => onChange({ homeContent: { ...data.homeContent, location: { ...data.homeContent.location, phoneHref: e.target.value } } })} className={FORM_INPUT} placeholder="tel:+55..." /></div>
                    <div><label className="block text-white/60 text-sm mb-1">Idiomas</label><input type="text" value={data.homeContent.location.languages} onChange={(e) => onChange({ homeContent: { ...data.homeContent, location: { ...data.homeContent.location, languages: e.target.value } } })} className={FORM_INPUT} /></div>
                    <div><label className="block text-white/60 text-sm mb-1">Consulta do mapa</label><input type="text" value={data.homeContent.location.mapQuery} onChange={(e) => onChange({ homeContent: { ...data.homeContent, location: { ...data.homeContent.location, mapQuery: e.target.value } } })} className={FORM_INPUT} /></div>
                  </div>
                </section>
              </div>
            )}

            {createTab === 'preview' && (
              <div className="flex flex-col min-h-[50vh]">
                <p className="text-white/60 text-sm mb-3">Visualização da página inicial com os dados atuais do formulário.</p>
                <ShopPreview
                  config={
                    {
                      name: data.name || 'Nome da barbearia',
                      theme: data.theme,
                      style: resolveShopStyle(data.style),
                      path: data.path || '/',
                      homeContent: data.homeContent,
                      settings: data.settings,
                    } satisfies ShopConfig
                  }
                  className="flex-1 min-h-[50vh] overflow-hidden"
                />
              </div>
            )}

            {createTab === 'settings' && (
              <div className="space-y-6">
                <section className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                  <h4 className="text-white font-medium">Fila</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-white/60 text-sm mb-2">Tamanho máximo da fila</label><input type="number" min={1} max={500} value={data.settings.maxQueueSize} onChange={(e) => onChange({ settings: { ...data.settings, maxQueueSize: parseInt(e.target.value) || 80 } })} className={FORM_INPUT} /></div>
                    <div><label className="block text-white/60 text-sm mb-2">Duração padrão do serviço (min)</label><input type="number" min={1} max={480} value={data.settings.defaultServiceDuration} onChange={(e) => onChange({ settings: { ...data.settings, defaultServiceDuration: parseInt(e.target.value) || 20 } })} className={FORM_INPUT} /></div>
                  </div>
                </section>
                <section className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                  <h4 className="text-white font-medium">Regras de atendimento</h4>
                  <ul className="space-y-4">
                    {[{ key: 'requirePhone' as const, label: 'Exigir telefone do cliente' }, { key: 'requireBarberChoice' as const, label: 'Exigir escolha de barbeiro' }, { key: 'allowDuplicateNames' as const, label: 'Permitir nomes duplicados na fila' }, { key: 'deviceDeduplication' as const, label: 'Impedir múltiplos tickets por dispositivo' }, { key: 'allowCustomerCancelInProgress' as const, label: 'Permitir cliente cancelar atendimento em andamento' }].map(({ key, label }) => (
                      <li key={key}>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <button type="button" role="switch" aria-checked={data.settings[key]} onClick={() => onChange({ settings: { ...data.settings, [key]: !data.settings[key] } })} className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${data.settings[key] ? 'bg-[#D4AF37]' : 'bg-white/20'}`}><span className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transition-transform ${data.settings[key] ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white/60'}`} /></button>
                          <span className="text-white/80 text-sm group-hover:text-white transition-colors">{label}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
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
              Cancelar
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
                  Criando...
                </>
              ) : (
                <>Criar Barbearia</>
              )}
            </button>
          </div>
        </div>
      </main>

      <ConfirmationDialog
        isOpen={cancelModal.isOpen}
        onClose={cancelModal.close}
        onConfirm={() => navigate('/company/dashboard')}
        title="Descartar alterações?"
        message="Todos os dados preenchidos serão perdidos. Tem certeza?"
        confirmText="Descartar"
        cancelText="Continuar editando"
        variant="destructive"
        icon="warning"
      />
    </div>
  );
}
