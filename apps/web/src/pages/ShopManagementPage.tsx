import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { ShopTheme, HomeContent, ShopAdminView, ShopSettings } from '@eutonafila/shared';
import { DEFAULT_THEME, DEFAULT_HOME_CONTENT, DEFAULT_SETTINGS } from '@eutonafila/shared';
import { useAuthContext } from '@/contexts/AuthContext';
import { useModal } from '@/hooks/useModal';
import { useErrorTimeout } from '@/hooks/useErrorTimeout';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { CompanyNav } from '@/components/CompanyNav';
import { RootSiteNav } from '@/components/RootSiteNav';
import { getErrorMessage } from '@/lib/utils';
import { isRootBuild } from '@/lib/build';
import { Container } from '@/components/design-system/Spacing/Container';

// DEFAULT_THEME and DEFAULT_HOME_CONTENT imported from @eutonafila/shared

function mergeTheme(stored: string | null): ShopTheme {
  if (!stored) return { ...DEFAULT_THEME };
  try {
    const parsed = JSON.parse(stored) as Record<string, string>;
    return { ...DEFAULT_THEME, ...parsed };
  } catch {
    return { ...DEFAULT_THEME };
  }
}

function mergeHomeContentForEdit(stored: HomeContent | Record<string, unknown> | null): HomeContent {
  if (!stored || typeof stored !== 'object') return JSON.parse(JSON.stringify(DEFAULT_HOME_CONTENT));
  const s = stored as Record<string, unknown>;
  return {
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

function mergeSettingsForEdit(stored: ShopSettings | Record<string, unknown> | null | undefined): ShopSettings {
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...(stored as Partial<ShopSettings>) };
}

type Shop = ShopAdminView;

export function ShopManagementPage() {
  const { user, isCompanyAdmin } = useAuthContext();
  const navigate = useNavigate();
  const editModal = useModal();
  const deleteConfirmModal = useModal();
  
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [shopToDelete, setShopToDelete] = useState<number | null>(null);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [editTab, setEditTab] = useState<'info' | 'appearance' | 'content' | 'settings'>('info');
  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    domain: string;
    path: string;
    apiBase: string;
    theme: ShopTheme;
    homeContent: HomeContent;
    settings: ShopSettings;
  }>({
    name: '',
    slug: '',
    domain: '',
    path: '',
    apiBase: '',
    theme: { ...DEFAULT_THEME },
    homeContent: JSON.parse(JSON.stringify(DEFAULT_HOME_CONTENT)),
    settings: { ...DEFAULT_SETTINGS },
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setError(err instanceof Error ? err : new Error('Erro ao carregar barbearias'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.companyId]);

  useEffect(() => {
    if (user?.companyId) {
      loadShops();
    }
  }, [user?.companyId, loadShops]);

  const handleEdit = useCallback(async () => {
    if (!user?.companyId || !editingShop || !formData.name.trim()) {
      setErrorMessage('Nome é obrigatório');
      return;
    }

    try {
      await api.updateCompanyShop(user.companyId, editingShop.id, {
        name: formData.name,
        slug: formData.slug || undefined,
        domain: formData.domain || null,
        path: formData.path || null,
        apiBase: formData.apiBase || null,
        theme: formData.theme,
        homeContent: formData.homeContent,
        settings: formData.settings,
      });
      setEditingShop(null);
      setFormData({ name: '', slug: '', domain: '', path: '', apiBase: '', theme: { ...DEFAULT_THEME }, homeContent: JSON.parse(JSON.stringify(DEFAULT_HOME_CONTENT)), settings: { ...DEFAULT_SETTINGS } });
      editModal.close();
      await loadShops();
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'Erro ao atualizar barbearia. Tente novamente.');
      setErrorMessage(errorMsg);
    }
  }, [editingShop, formData, user?.companyId, loadShops, editModal]);

  const handleDelete = useCallback(async () => {
    if (!user?.companyId || !shopToDelete) return;

    try {
      await api.deleteCompanyShop(user.companyId, shopToDelete);
      deleteConfirmModal.close();
      setShopToDelete(null);
      await loadShops();
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'Erro ao remover barbearia. Tente novamente.');
      setErrorMessage(errorMsg);
      deleteConfirmModal.close();
    }
  }, [shopToDelete, user?.companyId, loadShops, deleteConfirmModal]);

  const openEditModal = (shop: Shop) => {
    setEditingShop(shop);
    setFormData({
      name: shop.name,
      slug: shop.slug,
      domain: shop.domain || '',
      path: shop.path || '',
      apiBase: shop.apiBase || '',
      theme: mergeTheme(shop.theme ?? null),
      homeContent: mergeHomeContentForEdit(shop.homeContent ?? null),
      settings: mergeSettingsForEdit(shop.settings ?? null),
    });
    setEditTab('info');
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
              aria-label="Fechar mensagem de erro"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}
        <main className="py-20">
          <Container size="2xl">
          <div className="text-center mb-16">
            <h1 className="text-5xl sm:text-6xl font-light mb-6 tracking-tight">Gerenciar Barbearias</h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
              Adicione, edite ou remova barbearias da sua empresa
            </p>
          </div>

          <button
            onClick={() => navigate('/company/shops/new')}
            className="flex items-center justify-center gap-2 sm:gap-3 w-full max-w-[300px] mx-auto mb-8 sm:mb-10 px-4 sm:px-6 py-3 sm:py-4 bg-white text-[#0a0a0a] border-none rounded-xl text-sm sm:text-base font-medium transition-all hover:bg-gray-100 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-white/30"
            aria-label="Adicionar nova barbearia"
          >
            <span className="material-symbols-outlined text-lg sm:text-xl" aria-hidden="true">add</span>
            Adicionar Barbearia
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
            <p className="text-sm sm:text-base">Nenhuma barbearia cadastrada</p>
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
                  {(['info', 'appearance', 'content', 'settings'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setEditTab(tab)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        editTab === tab ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {tab === 'info' && 'Informações'}
                      {tab === 'appearance' && 'Aparência'}
                      {tab === 'content' && 'Conteúdo'}
                      {tab === 'settings' && 'Configurações'}
                    </button>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }} className="flex-1 overflow-y-auto min-h-0 pr-1">
                  {editTab === 'info' && (
                    <section className="space-y-5">
                      <p className="text-white/60 text-sm">Dados básicos da barbearia.</p>
                      <div>
                        <label htmlFor="editNameRoot" className="block text-white/70 text-sm mb-2">Nome *</label>
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
                        <label htmlFor="editSlugRoot" className="block text-white/70 text-sm mb-2">Slug *</label>
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
                        <label htmlFor="editDomainRoot" className="block text-white/50 text-sm mb-2">Domínio (opcional)</label>
                        <input
                          id="editDomainRoot"
                          type="text"
                          value={formData.domain}
                          onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                          placeholder="exemplo.com"
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20 placeholder:text-white/30"
                        />
                      </div>
                      <div>
                        <label htmlFor="editPathRoot" className="block text-white/50 text-sm mb-2">Caminho (opcional)</label>
                        <input
                          id="editPathRoot"
                          type="text"
                          value={formData.path}
                          onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                          placeholder="/caminho"
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20 placeholder:text-white/30"
                        />
                      </div>
                      <div>
                        <label htmlFor="editApiBaseRoot" className="block text-white/50 text-sm mb-2">API Base URL (opcional)</label>
                        <input
                          id="editApiBaseRoot"
                          type="url"
                          value={formData.apiBase}
                          onChange={(e) => setFormData({ ...formData, apiBase: e.target.value })}
                          placeholder="https://api.exemplo.com"
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20 placeholder:text-white/30"
                        />
                      </div>
                    </section>
                  )}
                  {editTab === 'appearance' && (
                    <div className="space-y-6">
                      <p className="text-white/60 text-sm">Cores do tema da página inicial.</p>
                      <div className="space-y-4">
                        <h4 className="text-white/80 text-sm font-medium border-b border-white/10 pb-2">Principal e destaque</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {(['primary', 'accent'] as const).map((key) => (
                            <div key={key} className="flex items-center gap-3">
                              <div className="w-10 h-10 shrink-0 rounded-lg border border-white/20" style={{ backgroundColor: formData.theme[key] || '#333' }} />
                              <div className="min-w-0 flex-1">
                                <label className="block text-white/60 text-xs mb-1">{key}</label>
                                <input type="text" value={formData.theme[key] ?? ''} onChange={(e) => setFormData({ ...formData, theme: { ...formData.theme, [key]: e.target.value } })} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-white/80 text-sm font-medium border-b border-white/10 pb-2">Fundo e superfícies</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {(['background', 'surfacePrimary', 'surfaceSecondary'] as const).map((key) => (
                            <div key={key} className="flex items-center gap-3">
                              <div className="w-10 h-10 shrink-0 rounded-lg border border-white/20" style={{ backgroundColor: formData.theme[key] || '#333' }} />
                              <div className="min-w-0 flex-1">
                                <label className="block text-white/60 text-xs mb-1">{key}</label>
                                <input type="text" value={formData.theme[key] ?? ''} onChange={(e) => setFormData({ ...formData, theme: { ...formData.theme, [key]: e.target.value } })} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-white/80 text-sm font-medium border-b border-white/10 pb-2">Navegação e texto</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {(['navBg', 'textPrimary', 'textSecondary', 'borderColor'] as const).map((key) => (
                            <div key={key} className="flex items-center gap-3">
                              <div className="w-10 h-10 shrink-0 rounded-lg border border-white/20" style={{ backgroundColor: formData.theme[key] || '#333' }} />
                              <div className="min-w-0 flex-1">
                                <label className="block text-white/60 text-xs mb-1">{key}</label>
                                <input type="text" value={formData.theme[key] ?? ''} onChange={(e) => setFormData({ ...formData, theme: { ...formData.theme, [key]: e.target.value } })} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-white/80 text-sm font-medium border-b border-white/10 pb-2">Destaque (extras)</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {(['textOnAccent', 'accentHover'] as const).map((key) => (
                            <div key={key} className="flex items-center gap-3">
                              <div className="w-10 h-10 shrink-0 rounded-lg border border-white/20" style={{ backgroundColor: formData.theme[key] || '#333' }} />
                              <div className="min-w-0 flex-1">
                                <label className="block text-white/60 text-xs mb-1">{key}</label>
                                <input type="text" value={formData.theme[key] ?? ''} onChange={(e) => setFormData({ ...formData, theme: { ...formData.theme, [key]: e.target.value } })} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {editTab === 'content' && (
                    <div className="space-y-6 max-h-[50vh] overflow-y-auto">
                      <p className="text-white/60 text-sm">Textos e conteúdo da página inicial. Todos opcionais.</p>
                      <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-white font-medium">Hero</h4>
                        <div className="space-y-3">
                          <div><label className="block text-white/60 text-sm mb-1">Badge do hero</label><input type="text" value={formData.homeContent.hero.badge} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, hero: { ...formData.homeContent.hero, badge: e.target.value } } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          <div><label className="block text-white/60 text-sm mb-1">Subtítulo</label><input type="text" value={formData.homeContent.hero.subtitle} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, hero: { ...formData.homeContent.hero, subtitle: e.target.value } } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          <div><label className="block text-white/60 text-sm mb-1">Botão Entrar</label><input type="text" value={formData.homeContent.hero.ctaJoin} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, hero: { ...formData.homeContent.hero, ctaJoin: e.target.value } } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          <div><label className="block text-white/60 text-sm mb-1">Botão Localização</label><input type="text" value={formData.homeContent.hero.ctaLocation} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, hero: { ...formData.homeContent.hero, ctaLocation: e.target.value } } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                        </div>
                      </section>
                      <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-white font-medium">Navegação</h4>
                        <div className="space-y-3">
                          {([
                            { key: 'linkServices' as const, label: 'Link Serviços' },
                            { key: 'linkAbout' as const, label: 'Link Sobre' },
                            { key: 'linkLocation' as const, label: 'Link Localização' },
                            { key: 'ctaJoin' as const, label: 'Botão Entrar' },
                            { key: 'linkBarbers' as const, label: 'Link Barbeiros' },
                          ]).map(({ key, label }) => (
                            <div key={key}><label className="block text-white/60 text-sm mb-1">{label}</label><input type="text" value={formData.homeContent.nav[key]} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, nav: { ...formData.homeContent.nav, [key]: e.target.value } } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          ))}
                        </div>
                      </section>
                      <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-white font-medium">Seção Serviços</h4>
                        <div className="space-y-3">
                          <div><label className="block text-white/60 text-sm mb-1">Título da seção</label><input type="text" value={formData.homeContent.services.sectionTitle} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, services: { ...formData.homeContent.services, sectionTitle: e.target.value } } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          <div><label className="block text-white/60 text-sm mb-1">Texto ao carregar</label><input type="text" value={formData.homeContent.services.loadingText} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, services: { ...formData.homeContent.services, loadingText: e.target.value } } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          <div><label className="block text-white/60 text-sm mb-1">Texto quando vazio</label><input type="text" value={formData.homeContent.services.emptyText} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, services: { ...formData.homeContent.services, emptyText: e.target.value } } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                        </div>
                      </section>
                      <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-white font-medium">Localização</h4>
                        <div className="space-y-3">
                          <div><label className="block text-white/60 text-sm mb-1">Endereço</label><textarea value={formData.homeContent.location.address} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, location: { ...formData.homeContent.location, address: e.target.value } } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm min-h-[60px]" /></div>
                          <div><label className="block text-white/60 text-sm mb-1">Horário</label><textarea value={formData.homeContent.location.hours} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, location: { ...formData.homeContent.location, hours: e.target.value } } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          <div><label className="block text-white/60 text-sm mb-1">Telefone</label><input type="text" value={formData.homeContent.location.phone} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, location: { ...formData.homeContent.location, phone: e.target.value } } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          <div><label className="block text-white/60 text-sm mb-1">Link do telefone</label><input type="text" value={formData.homeContent.location.phoneHref} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, location: { ...formData.homeContent.location, phoneHref: e.target.value } } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" placeholder="tel:+55..." /></div>
                          <div><label className="block text-white/60 text-sm mb-1">Idiomas</label><input type="text" value={formData.homeContent.location.languages} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, location: { ...formData.homeContent.location, languages: e.target.value } } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                          <div><label className="block text-white/60 text-sm mb-1">Consulta do mapa</label><input type="text" value={formData.homeContent.location.mapQuery} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, location: { ...formData.homeContent.location, mapQuery: e.target.value } } })} className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>
                        </div>
                      </section>
                    </div>
                  )}
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
                            { key: 'requireBarberChoice' as const, label: 'Exigir escolha de barbeiro' },
                            { key: 'allowDuplicateNames' as const, label: 'Permitir nomes duplicados na fila' },
                            { key: 'deviceDeduplication' as const, label: 'Impedir múltiplos tickets por dispositivo' },
                            { key: 'allowCustomerCancelInProgress' as const, label: 'Permitir cliente cancelar atendimento em andamento' },
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
                    </div>
                  )}
                  <div className="flex gap-2 sm:gap-3 mt-5 sm:mt-6 flex-shrink-0 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => { editModal.close(); setEditingShop(null); setFormData({ name: '', slug: '', domain: '', path: '', apiBase: '', theme: { ...DEFAULT_THEME }, homeContent: JSON.parse(JSON.stringify(DEFAULT_HOME_CONTENT)), settings: { ...DEFAULT_SETTINGS } }); }}
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
            title="Remover Barbearia"
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
            aria-label="Fechar mensagem de erro"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}
      <main className="container max-w-[1200px] mx-auto px-4 sm:px-6 pt-24 pb-10 relative z-10">
        <div className="text-center mb-8">
          <h1 className="font-['Playfair_Display',serif] text-2xl font-semibold text-[#D4AF37] mb-3">
            Gerenciar Barbearias
          </h1>
          <p className="text-white/60 mt-2 text-sm">
            Adicione, edite ou remova barbearias da sua empresa
          </p>
        </div>

        <button
          onClick={() => navigate('/company/shops/new')}
          className="flex items-center justify-center gap-2 sm:gap-3 w-full max-w-[300px] mx-auto mb-8 sm:mb-10 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] border-none rounded-xl text-sm sm:text-base font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(212,175,55,0.4)] min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
          aria-label="Adicionar nova barbearia"
        >
          <span className="material-symbols-outlined text-lg sm:text-xl" aria-hidden="true">add</span>
          Adicionar Barbearia
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
            <p className="text-sm sm:text-base">Nenhuma barbearia cadastrada</p>
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
              {(['info', 'appearance', 'content', 'settings'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setEditTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    editTab === tab ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {tab === 'info' && 'Informações'}
                  {tab === 'appearance' && 'Aparência'}
                  {tab === 'content' && 'Conteúdo'}
                  {tab === 'settings' && 'Configurações'}
                </button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }} className="flex-1 overflow-y-auto min-h-0 pr-1">
              {editTab === 'info' && (
                <section className="space-y-5">
                  <p className="text-white/60 text-sm">Dados básicos da barbearia.</p>
                  <div><label htmlFor="editName" className="block text-[rgba(255,255,255,0.7)] text-sm mb-2">Nome *</label><input id="editName" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20" /></div>
                  <div><label htmlFor="editSlug" className="block text-[rgba(255,255,255,0.7)] text-sm mb-2">Slug *</label><input id="editSlug" type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} required pattern="[a-z0-9-]+" className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20" /></div>
                  <div><label htmlFor="editDomain" className="block text-white/50 text-sm mb-2">Domínio (opcional)</label><input id="editDomain" type="text" value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} placeholder="exemplo.com" className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 placeholder:text-white/30" /></div>
                  <div><label htmlFor="editPath" className="block text-white/50 text-sm mb-2">Caminho (opcional)</label><input id="editPath" type="text" value={formData.path} onChange={(e) => setFormData({ ...formData, path: e.target.value })} placeholder="/caminho" className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 placeholder:text-white/30" /></div>
                  <div><label htmlFor="editApiBase" className="block text-white/50 text-sm mb-2">API Base URL (opcional)</label><input id="editApiBase" type="url" value={formData.apiBase} onChange={(e) => setFormData({ ...formData, apiBase: e.target.value })} placeholder="https://api.exemplo.com" className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 placeholder:text-white/30" /></div>
                </section>
              )}
              {editTab === 'appearance' && (
                <div className="space-y-6">
                  <p className="text-white/60 text-sm">Cores do tema da página inicial.</p>
                  <div className="space-y-4"><h4 className="text-white/80 text-sm font-medium border-b border-white/10 pb-2">Principal e destaque</h4><div className="grid grid-cols-2 gap-4">{(['primary', 'accent'] as const).map((key) => (<div key={key} className="flex items-center gap-3"><div className="w-10 h-10 shrink-0 rounded-lg border border-white/20" style={{ backgroundColor: formData.theme[key] || '#333' }} /><div className="min-w-0 flex-1"><label className="block text-white/60 text-xs mb-1">{key}</label><input type="text" value={formData.theme[key] ?? ''} onChange={(e) => setFormData({ ...formData, theme: { ...formData.theme, [key]: e.target.value } })} className="form-input w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-sm" /></div></div>))}</div></div>
                  <div className="space-y-4"><h4 className="text-white/80 text-sm font-medium border-b border-white/10 pb-2">Fundo e superfícies</h4><div className="grid grid-cols-2 gap-4">{(['background', 'surfacePrimary', 'surfaceSecondary'] as const).map((key) => (<div key={key} className="flex items-center gap-3"><div className="w-10 h-10 shrink-0 rounded-lg border border-white/20" style={{ backgroundColor: formData.theme[key] || '#333' }} /><div className="min-w-0 flex-1"><label className="block text-white/60 text-xs mb-1">{key}</label><input type="text" value={formData.theme[key] ?? ''} onChange={(e) => setFormData({ ...formData, theme: { ...formData.theme, [key]: e.target.value } })} className="form-input w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-sm" /></div></div>))}</div></div>
                  <div className="space-y-4"><h4 className="text-white/80 text-sm font-medium border-b border-white/10 pb-2">Navegação e texto</h4><div className="grid grid-cols-2 gap-4">{(['navBg', 'textPrimary', 'textSecondary', 'borderColor'] as const).map((key) => (<div key={key} className="flex items-center gap-3"><div className="w-10 h-10 shrink-0 rounded-lg border border-white/20" style={{ backgroundColor: formData.theme[key] || '#333' }} /><div className="min-w-0 flex-1"><label className="block text-white/60 text-xs mb-1">{key}</label><input type="text" value={formData.theme[key] ?? ''} onChange={(e) => setFormData({ ...formData, theme: { ...formData.theme, [key]: e.target.value } })} className="form-input w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-sm" /></div></div>))}</div></div>
                  <div className="space-y-4"><h4 className="text-white/80 text-sm font-medium border-b border-white/10 pb-2">Destaque (extras)</h4><div className="grid grid-cols-2 gap-4">{(['textOnAccent', 'accentHover'] as const).map((key) => (<div key={key} className="flex items-center gap-3"><div className="w-10 h-10 shrink-0 rounded-lg border border-white/20" style={{ backgroundColor: formData.theme[key] || '#333' }} /><div className="min-w-0 flex-1"><label className="block text-white/60 text-xs mb-1">{key}</label><input type="text" value={formData.theme[key] ?? ''} onChange={(e) => setFormData({ ...formData, theme: { ...formData.theme, [key]: e.target.value } })} className="form-input w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-sm" /></div></div>))}</div></div>
                </div>
              )}
              {editTab === 'content' && (
                <div className="space-y-6 max-h-[50vh] overflow-y-auto">
                  <p className="text-white/60 text-sm">Textos e conteúdo da página inicial. Todos opcionais.</p>
                  <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10"><h4 className="text-white font-medium">Hero</h4><div className="space-y-3"><div><label className="block text-white/60 text-sm mb-1">Badge do hero</label><input type="text" value={formData.homeContent.hero.badge} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, hero: { ...formData.homeContent.hero, badge: e.target.value } } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div><div><label className="block text-white/60 text-sm mb-1">Subtítulo</label><input type="text" value={formData.homeContent.hero.subtitle} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, hero: { ...formData.homeContent.hero, subtitle: e.target.value } } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div><div><label className="block text-white/60 text-sm mb-1">Botão Entrar</label><input type="text" value={formData.homeContent.hero.ctaJoin} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, hero: { ...formData.homeContent.hero, ctaJoin: e.target.value } } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div><div><label className="block text-white/60 text-sm mb-1">Botão Localização</label><input type="text" value={formData.homeContent.hero.ctaLocation} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, hero: { ...formData.homeContent.hero, ctaLocation: e.target.value } } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div></div></section>
                  <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10"><h4 className="text-white font-medium">Navegação</h4><div className="space-y-3">{[{ key: 'linkServices' as const, label: 'Link Serviços' }, { key: 'linkAbout' as const, label: 'Link Sobre' }, { key: 'linkLocation' as const, label: 'Link Localização' }, { key: 'ctaJoin' as const, label: 'Botão Entrar' }, { key: 'linkBarbers' as const, label: 'Link Barbeiros' }].map(({ key, label }) => (<div key={key}><label className="block text-white/60 text-sm mb-1">{label}</label><input type="text" value={formData.homeContent.nav[key]} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, nav: { ...formData.homeContent.nav, [key]: e.target.value } } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div>))}</div></section>
                  <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10"><h4 className="text-white font-medium">Seção Serviços</h4><div className="space-y-3"><div><label className="block text-white/60 text-sm mb-1">Título da seção</label><input type="text" value={formData.homeContent.services.sectionTitle} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, services: { ...formData.homeContent.services, sectionTitle: e.target.value } } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div><div><label className="block text-white/60 text-sm mb-1">Texto ao carregar</label><input type="text" value={formData.homeContent.services.loadingText} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, services: { ...formData.homeContent.services, loadingText: e.target.value } } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div><div><label className="block text-white/60 text-sm mb-1">Texto quando vazio</label><input type="text" value={formData.homeContent.services.emptyText} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, services: { ...formData.homeContent.services, emptyText: e.target.value } } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div></div></section>
                  <section className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10"><h4 className="text-white font-medium">Localização</h4><div className="space-y-3"><div><label className="block text-white/60 text-sm mb-1">Endereço</label><textarea value={formData.homeContent.location.address} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, location: { ...formData.homeContent.location, address: e.target.value } } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm min-h-[60px]" /></div><div><label className="block text-white/60 text-sm mb-1">Horário</label><textarea value={formData.homeContent.location.hours} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, location: { ...formData.homeContent.location, hours: e.target.value } } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div><div><label className="block text-white/60 text-sm mb-1">Telefone</label><input type="text" value={formData.homeContent.location.phone} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, location: { ...formData.homeContent.location, phone: e.target.value } } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div><div><label className="block text-white/60 text-sm mb-1">Link do telefone</label><input type="text" value={formData.homeContent.location.phoneHref} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, location: { ...formData.homeContent.location, phoneHref: e.target.value } } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" placeholder="tel:+55..." /></div><div><label className="block text-white/60 text-sm mb-1">Idiomas</label><input type="text" value={formData.homeContent.location.languages} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, location: { ...formData.homeContent.location, languages: e.target.value } } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div><div><label className="block text-white/60 text-sm mb-1">Consulta do mapa</label><input type="text" value={formData.homeContent.location.mapQuery} onChange={(e) => setFormData({ ...formData, homeContent: { ...formData.homeContent, location: { ...formData.homeContent.location, mapQuery: e.target.value } } })} className="form-input w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm" /></div></div></section>
                </div>
              )}
              {editTab === 'settings' && (
                <div className="space-y-6">
                  <section className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4"><h4 className="text-white font-medium">Fila</h4><div className="grid grid-cols-2 gap-4"><div><label className="block text-white/60 text-sm mb-2">Tamanho máximo da fila</label><input type="number" min={1} max={500} value={formData.settings.maxQueueSize} onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, maxQueueSize: parseInt(e.target.value) || 80 } })} className="form-input w-full px-3 py-2.5 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-sm" /></div><div><label className="block text-white/60 text-sm mb-2">Duração padrão do serviço (min)</label><input type="number" min={1} max={480} value={formData.settings.defaultServiceDuration} onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, defaultServiceDuration: parseInt(e.target.value) || 20 } })} className="form-input w-full px-3 py-2.5 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-sm" /></div></div></section>
                  <section className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4"><h4 className="text-white font-medium">Regras de atendimento</h4><ul className="space-y-4">{[{ key: 'requirePhone' as const, label: 'Exigir telefone do cliente' }, { key: 'requireBarberChoice' as const, label: 'Exigir escolha de barbeiro' }, { key: 'allowDuplicateNames' as const, label: 'Permitir nomes duplicados na fila' }, { key: 'deviceDeduplication' as const, label: 'Impedir múltiplos tickets por dispositivo' }, { key: 'allowCustomerCancelInProgress' as const, label: 'Permitir cliente cancelar atendimento em andamento' }].map(({ key, label }) => (<li key={key}><label className="flex items-center gap-3 cursor-pointer group"><button type="button" role="switch" aria-checked={formData.settings[key]} onClick={() => setFormData({ ...formData, settings: { ...formData.settings, [key]: !formData.settings[key] } })} className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${formData.settings[key] ? 'bg-[#D4AF37]' : 'bg-white/20'}`}><span className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transition-transform ${formData.settings[key] ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white/60'}`} /></button><span className="text-white/80 text-sm group-hover:text-white transition-colors">{label}</span></label></li>))}</ul></section>
                </div>
              )}
              <div className="modal-actions flex gap-2 sm:gap-3 mt-5 sm:mt-6 flex-shrink-0 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    editModal.close();
                    setEditingShop(null);
                    setFormData({ name: '', slug: '', domain: '', path: '', apiBase: '', theme: { ...DEFAULT_THEME }, homeContent: JSON.parse(JSON.stringify(DEFAULT_HOME_CONTENT)), settings: { ...DEFAULT_SETTINGS } });
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
        title="Remover Barbearia"
        message="Tem certeza que deseja remover esta barbearia? Esta ação não pode ser desfeita."
        confirmText="Remover"
        cancelText="Cancelar"
        variant="destructive"
        icon="delete"
      />
    </div>
  );
}

