import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
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

type Shop = {
  id: number;
  slug: string;
  name: string;
  companyId: number | null;
  domain: string | null;
  path: string | null;
  apiBase: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

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
  const [formData, setFormData] = useState({ 
    name: '', 
    slug: '', 
    domain: '', 
    path: '', 
    apiBase: '' 
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
      });
      setEditingShop(null);
      setFormData({ name: '', slug: '', domain: '', path: '', apiBase: '' });
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
    });
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
          <div className="modal-content bg-[#242424] border border-[rgba(212,175,55,0.3)] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 max-w-[500px] w-full min-w-[320px] max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4">
            <h2 id="edit-modal-title" className="modal-title font-['Playfair_Display',serif] text-xl sm:text-2xl text-[#D4AF37] mb-5 sm:mb-6">
              Editar Barbearia
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEdit();
              }}
            >
              <div className="form-group mb-4 sm:mb-5">
                <label htmlFor="editName" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-2">
                  Nome *
                </label>
                <input
                  id="editName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                />
              </div>
              <div className="form-group mb-4 sm:mb-5">
                <label htmlFor="editSlug" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-2">
                  Slug *
                </label>
                <input
                  id="editSlug"
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  required
                  pattern="[a-z0-9-]+"
                  className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                />
              </div>
              <div className="form-group mb-4 sm:mb-5">
                <label htmlFor="editDomain" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-2">
                  Domínio (opcional)
                </label>
                <input
                  id="editDomain"
                  type="text"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="exemplo.com"
                  className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 placeholder:text-[rgba(255,255,255,0.3)]"
                />
              </div>
              <div className="form-group mb-4 sm:mb-5">
                <label htmlFor="editPath" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-2">
                  Caminho (opcional)
                </label>
                <input
                  id="editPath"
                  type="text"
                  value={formData.path}
                  onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                  placeholder="/caminho"
                  className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 placeholder:text-[rgba(255,255,255,0.3)]"
                />
              </div>
              <div className="form-group mb-4 sm:mb-5">
                <label htmlFor="editApiBase" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-2">
                  API Base URL (opcional)
                </label>
                <input
                  id="editApiBase"
                  type="url"
                  value={formData.apiBase}
                  onChange={(e) => setFormData({ ...formData, apiBase: e.target.value })}
                  placeholder="https://api.exemplo.com"
                  className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 placeholder:text-[rgba(255,255,255,0.3)]"
                />
              </div>
              <div className="modal-actions flex gap-2 sm:gap-3 mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={() => {
                    editModal.close();
                    setEditingShop(null);
                    setFormData({ name: '', slug: '', domain: '', path: '', apiBase: '' });
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

