import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useBarbers } from '@/hooks/useBarbers';
import { useModal } from '@/hooks/useModal';
import { useErrorTimeout } from '@/hooks/useErrorTimeout';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Navigation } from '@/components/Navigation';
import { getErrorMessage } from '@/lib/utils';
import type { Barber } from '@eutonafila/shared';

export function BarberManagementPage() {
  const shopSlug = useShopSlug();
  const { config: shopConfig } = useShopConfig();
  const { isOwner } = useAuthContext();
  const navigate = useNavigate();
  const { barbers, isLoading, error, refetch } = useBarbers();
  const addModal = useModal();
  const editModal = useModal();
  const deleteConfirmModal = useModal();
  
  const [barberToDelete, setBarberToDelete] = useState<number | null>(null);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [formData, setFormData] = useState({ name: '', avatarUrl: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-clear error messages after timeout
  useErrorTimeout(errorMessage, () => setErrorMessage(null));

  // Redirect if not owner
  if (!isOwner) {
    navigate('/staff');
    return null;
  }

  const handleAdd = useCallback(async () => {
    if (!formData.name.trim()) {
      setErrorMessage('Nome é obrigatório');
      return;
    }

    try {
      await api.createBarber?.(shopSlug, {
        name: formData.name,
        avatarUrl: formData.avatarUrl || null,
      });
      setFormData({ name: '', avatarUrl: '' });
      addModal.close();
      await refetch();
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'Erro ao adicionar barbeiro. Tente novamente.');
      setErrorMessage(errorMsg);
    }
  }, [formData, refetch, addModal, shopSlug]);

  const handleEdit = useCallback(async () => {
    if (!editingBarber || !formData.name.trim()) {
      setErrorMessage('Nome é obrigatório');
      return;
    }

    try {
      await api.updateBarber?.(editingBarber.id, {
        name: formData.name,
        avatarUrl: formData.avatarUrl || null,
      });
      setEditingBarber(null);
      setFormData({ name: '', avatarUrl: '' });
      editModal.close();
      await refetch();
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'Erro ao atualizar barbeiro. Tente novamente.');
      setErrorMessage(errorMsg);
    }
  }, [editingBarber, formData, refetch, editModal]);

  const handleDelete = useCallback(async () => {
    if (!barberToDelete) return;

    try {
      await api.deleteBarber?.(barberToDelete);
      deleteConfirmModal.close();
      setBarberToDelete(null);
      await refetch();
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'Erro ao remover barbeiro. Tente novamente.');
      setErrorMessage(errorMsg);
      deleteConfirmModal.close();
    }
  }, [barberToDelete, refetch, deleteConfirmModal]);

  const openEditModal = (barber: Barber) => {
    setEditingBarber(barber);
    setFormData({
      name: barber.name,
      avatarUrl: barber.avatarUrl || '',
    });
    editModal.open();
  };

  return (
    <div 
      className="min-h-screen h-full bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416]"
    >
      <Navigation />
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
      <main 
        className="container max-w-[1200px] mx-auto px-4 sm:px-6 pt-24 pb-10 relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="font-['Playfair_Display',serif] text-2xl text-[var(--shop-accent)] mb-3">
            Gerenciar Barbeiros
          </h1>
        </div>

        <button
          onClick={addModal.open}
          className="add-barber-btn flex items-center justify-center gap-2 sm:gap-3 w-full max-w-[300px] mx-auto mb-8 sm:mb-10 px-4 sm:px-6 py-3 sm:py-4 bg-[var(--shop-accent)] text-[#0a0a0a] border-none rounded-xl text-sm sm:text-base font-semibold transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(212,175,55,0.4)] min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
          aria-label="Adicionar novo barbeiro"
        >
          <span className="material-symbols-outlined text-lg sm:text-xl" aria-hidden="true">add</span>
          Adicionar Barbeiro
        </button>

        {/* Barbers Grid */}
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
          <ErrorDisplay error={error} onRetry={refetch} />
        ) : barbers.length === 0 ? (
          <div className="empty-state text-center py-12 sm:py-[60px] px-4 sm:px-5 text-[rgba(255,255,255,0.7)]">
            <span className="material-symbols-outlined text-[3rem] sm:text-[4rem] text-[rgba(255,255,255,0.5)] mb-3 sm:mb-4 block" aria-hidden="true">
              content_cut
            </span>
            <p className="text-sm sm:text-base">Nenhum barbeiro cadastrado</p>
          </div>
        ) : (
          <div className="barbers-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
            {barbers.map((barber) => (
              <article
                key={barber.id}
                className="barber-card bg-[rgba(36,36,36,0.8)] backdrop-blur-md border border-[rgba(212,175,55,0.2)] rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all hover:border-[#D4AF37] hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(212,175,55,0.2)] relative overflow-hidden"
                aria-labelledby={`barber-name-${barber.id}`}
              >
                <div className="barber-header flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
                  <button
                    type="button"
                    className="barber-avatar w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E8C547] flex items-center justify-center text-xl sm:text-2xl font-semibold text-[#0a0a0a] flex-shrink-0 cursor-pointer transition-all hover:scale-105 hover:shadow-[0_4px_12px_rgba(212,175,55,0.4)] relative focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#242424]"
                    onClick={() => openEditModal(barber)}
                    aria-label={`Editar ${barber.name}`}
                  >
                    {barber.avatarUrl ? (
                      <img
                        src={barber.avatarUrl}
                        alt=""
                        aria-hidden="true"
                        className="w-full h-full rounded-full object-cover"
                        loading="eager"
                        decoding="async"
                        width={64}
                        height={64}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span aria-hidden="true">{barber.name.charAt(0).toUpperCase()}</span>
                    )}
                  </button>
                  <div className="barber-info flex-1 min-w-0">
                    <h3 id={`barber-name-${barber.id}`} className="barber-name text-lg sm:text-xl font-semibold text-white mb-1 truncate">
                      {barber.name}
                    </h3>
                    <div
                      className={`barber-status inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-xl text-[10px] sm:text-xs font-medium ${
                        barber.isPresent
                          ? 'bg-[rgba(255,255,255,0.2)] text-white'
                          : 'bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.5)]'
                      }`}
                      aria-label={barber.isPresent ? 'Status: Presente' : 'Status: Ausente'}
                    >
                      <span className="material-symbols-outlined text-xs sm:text-sm" aria-hidden="true">
                        {barber.isPresent ? 'check_circle' : 'cancel'}
                      </span>
                      {barber.isPresent ? 'Presente' : 'Ausente'}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="barber-actions flex gap-2 sm:gap-3">
                  <button
                    onClick={() => openEditModal(barber)}
                    className="action-btn flex-1 px-2 sm:px-3 py-2.5 sm:py-3 border-none rounded-lg text-xs sm:text-sm font-semibold cursor-pointer transition-all min-h-[44px] bg-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(212,175,55,0.2)] hover:text-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#242424]"
                    aria-label={`Editar barbeiro ${barber.name}`}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      setBarberToDelete(barber.id);
                      deleteConfirmModal.open();
                    }}
                    className="action-btn delete flex-1 px-2 sm:px-3 py-2.5 sm:py-3 border border-[rgba(239,68,68,0.3)] rounded-lg text-xs sm:text-sm font-semibold cursor-pointer transition-all min-h-[44px] bg-[rgba(239,68,68,0.2)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.3)] focus:outline-none focus:ring-2 focus:ring-[#ef4444] focus:ring-offset-2 focus:ring-offset-[#242424]"
                    aria-label={`Remover barbeiro ${barber.name}`}
                  >
                    Remover
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Add Barber Modal */}
      {addModal.isOpen && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-5"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-modal-title"
        >
          <div className="modal-content bg-[#242424] border border-[rgba(212,175,55,0.3)] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 max-w-[500px] w-full min-w-[320px] animate-in slide-in-from-bottom-4">
            <h2 id="add-modal-title" className="modal-title font-['Playfair_Display',serif] text-xl sm:text-2xl text-[#D4AF37] mb-5 sm:mb-6">
              Adicionar Barbeiro
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAdd();
              }}
            >
              <div className="form-group mb-4 sm:mb-5">
                <label htmlFor="addName" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-2">
                  Nome
                </label>
                <input
                  id="addName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                />
              </div>
              <div className="form-group mb-4 sm:mb-5">
                <label htmlFor="addAvatar" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-2">
                  URL do Avatar (opcional)
                </label>
                <input
                  id="addAvatar"
                  type="url"
                  value={formData.avatarUrl}
                  onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 placeholder:text-[rgba(255,255,255,0.3)]"
                />
              </div>
              <div className="modal-actions flex gap-2 sm:gap-3 mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={() => {
                    addModal.close();
                    setFormData({ name: '', avatarUrl: '' });
                  }}
                  className="modal-btn secondary flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-all min-h-[44px] bg-[rgba(255,255,255,0.1)] text-white hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="modal-btn primary flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-all min-h-[44px] bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#242424]"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Barber Modal */}
      {editModal.isOpen && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-5"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
        >
          <div className="modal-content bg-[#242424] border border-[rgba(212,175,55,0.3)] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 max-w-[500px] w-full min-w-[320px] animate-in slide-in-from-bottom-4">
            <h2 id="edit-modal-title" className="modal-title font-['Playfair_Display',serif] text-xl sm:text-2xl text-[#D4AF37] mb-5 sm:mb-6">
              Editar Barbeiro
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEdit();
              }}
            >
              <div className="form-group mb-4 sm:mb-5">
                <label htmlFor="editName" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-2">
                  Nome
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
                <label htmlFor="editAvatar" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-2">
                  URL do Avatar (opcional)
                </label>
                <input
                  id="editAvatar"
                  type="url"
                  value={formData.avatarUrl}
                  onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 placeholder:text-[rgba(255,255,255,0.3)]"
                />
              </div>
              <div className="modal-actions flex gap-2 sm:gap-3 mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={() => {
                    editModal.close();
                    setEditingBarber(null);
                    setFormData({ name: '', avatarUrl: '' });
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
        title="Remover Barbeiro"
        message="Tem certeza que deseja remover este barbeiro? Todos os clientes atribuídos a ele serão desatribuídos."
        confirmText="Remover"
        cancelText="Cancelar"
        variant="destructive"
        icon="delete"
      />
    </div>
  );
}
