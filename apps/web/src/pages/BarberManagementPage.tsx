import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { useAuthContext } from '@/contexts/AuthContext';
import { useBarbers } from '@/hooks/useBarbers';
import { useModal } from '@/hooks/useModal';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Navigation } from '@/components/Navigation';

export function BarberManagementPage() {
  const { isOwner } = useAuthContext();
  const navigate = useNavigate();
  const { barbers, isLoading, error, refetch } = useBarbers();
  const addModal = useModal();
  const editModal = useModal();
  const deleteConfirmModal = useModal();
  const [barberToDelete, setBarberToDelete] = useState<number | null>(null);
  const [editingBarber, setEditingBarber] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', avatarUrl: '' });

  // Redirect if not owner
  if (!isOwner) {
    navigate('/staff');
    return null;
  }

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      alert('Nome é obrigatório');
      return;
    }

    try {
      await api.createBarber?.(config.slug, {
        name: formData.name,
        avatarUrl: formData.avatarUrl || null,
      });
      setFormData({ name: '', avatarUrl: '' });
      addModal.close();
      await refetch();
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else if (error && typeof error === 'object' && 'error' in error) {
        alert((error as { error: string }).error);
      } else {
        alert('Erro ao adicionar barbeiro. Tente novamente.');
      }
    }
  };

  const handleEdit = async () => {
    if (!editingBarber || !formData.name.trim()) {
      alert('Nome é obrigatório');
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
      if (error instanceof Error) {
        alert(error.message);
      } else if (error && typeof error === 'object' && 'error' in error) {
        alert((error as { error: string }).error);
      } else {
        alert('Erro ao atualizar barbeiro. Tente novamente.');
      }
    }
  };

  const handleDelete = async () => {
    if (!barberToDelete) return;

    try {
      await api.deleteBarber?.(barberToDelete);
      deleteConfirmModal.close();
      setBarberToDelete(null);
      await refetch();
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else if (error && typeof error === 'object' && 'error' in error) {
        alert((error as { error: string }).error);
      } else {
        alert('Erro ao remover barbeiro. Tente novamente.');
      }
    }
  };

  const openEditModal = (barber: any) => {
    setEditingBarber(barber);
    setFormData({
      name: barber.name,
      avatarUrl: barber.avatarUrl || '',
    });
    editModal.open();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,0.05)_0%,transparent_50%)] animate-spin-slow pointer-events-none z-0" />
      <Navigation />
      <div className="container max-w-[1200px] mx-auto px-6 pt-[100px] pb-10 relative z-10">
        {/* Header */}
        <div className="header text-center mb-10">
          <h1 className="font-['Playfair_Display',serif] text-[2.5rem] text-[#D4AF37] mb-3">
            Gerenciar Barbeiros
          </h1>
          <p className="text-[rgba(255,255,255,0.7)] text-lg">
            Adicione, edite ou remova barbeiros
          </p>
        </div>

        {/* Add Barber Button */}
        <button
          onClick={addModal.open}
          className="add-barber-btn flex items-center justify-center gap-2 w-full max-w-[300px] mx-auto mb-10 px-6 py-4 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] border-none rounded-xl text-base font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(212,175,55,0.4)] min-h-[48px]"
        >
          <span className="material-symbols-outlined">add</span>
          Adicionar Barbeiro
        </button>

        {/* Barbers Grid */}
        {isLoading ? (
          <div className="loading text-center py-10 text-[rgba(255,255,255,0.7)]">
            <LoadingSpinner size="lg" text="Carregando barbeiros..." />
          </div>
        ) : error ? (
          <ErrorDisplay error={error} onRetry={refetch} />
        ) : barbers.length === 0 ? (
          <div className="empty-state text-center py-[60px] px-5 text-[rgba(255,255,255,0.7)]">
            <span className="material-symbols-outlined text-[4rem] text-[rgba(255,255,255,0.5)] mb-4 block">
              content_cut
            </span>
            <p>Nenhum barbeiro cadastrado</p>
          </div>
        ) : (
          <div className="barbers-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {barbers.map((barber) => (
              <div
                key={barber.id}
                className="barber-card bg-[rgba(36,36,36,0.8)] backdrop-blur-md border border-[rgba(212,175,55,0.2)] rounded-2xl p-6 transition-all hover:border-[#D4AF37] hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(212,175,55,0.2)] relative overflow-hidden"
              >
                <div className="barber-header flex items-center gap-4 mb-5">
                  <div
                    className="barber-avatar w-16 h-16 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E8C547] flex items-center justify-center text-2xl font-semibold text-[#0a0a0a] flex-shrink-0 cursor-pointer transition-all hover:scale-105 hover:shadow-[0_4px_12px_rgba(212,175,55,0.4)] relative"
                    onClick={() => openEditModal(barber)}
                  >
                    {barber.avatarUrl ? (
                      <img
                        src={barber.avatarUrl}
                        alt={barber.name}
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span>{barber.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="barber-info flex-1">
                    <div className="barber-name text-xl font-semibold text-white mb-1">
                      {barber.name}
                    </div>
                    <div
                      className={`barber-status inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium ${
                        barber.isPresent
                          ? 'bg-[rgba(34,197,94,0.2)] text-[#22c55e]'
                          : 'bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.5)]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {barber.isPresent ? 'check_circle' : 'cancel'}
                      </span>
                      {barber.isPresent ? 'Presente' : 'Ausente'}
                    </div>
                  </div>
                </div>

                {/* Analytics Stats */}
                <div className="barber-stats grid grid-cols-2 gap-4 mb-5">
                  <div className="stat-item text-center p-3 bg-[rgba(255,255,255,0.05)] rounded-lg">
                    <div className="stat-value text-2xl font-bold text-[#D4AF37] mb-1">--</div>
                    <div className="stat-label text-xs text-[rgba(255,255,255,0.5)] uppercase tracking-wider">
                      Atendimentos
                    </div>
                  </div>
                  <div className="stat-item text-center p-3 bg-[rgba(255,255,255,0.05)] rounded-lg">
                    <div className="stat-value text-2xl font-bold text-[#D4AF37] mb-1">--</div>
                    <div className="stat-label text-xs text-[rgba(255,255,255,0.5)] uppercase tracking-wider">
                      Média
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="barber-actions flex gap-3">
                  <button
                    onClick={() => openEditModal(barber)}
                    className="action-btn flex-1 px-3 py-3 border-none rounded-lg text-sm font-semibold cursor-pointer transition-all min-h-[44px] bg-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(212,175,55,0.2)] hover:text-[#D4AF37]"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      setBarberToDelete(barber.id);
                      deleteConfirmModal.open();
                    }}
                    className="action-btn delete flex-1 px-3 py-3 border border-[rgba(239,68,68,0.3)] rounded-lg text-sm font-semibold cursor-pointer transition-all min-h-[44px] bg-[rgba(239,68,68,0.2)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.3)]"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Barber Modal */}
      {addModal.isOpen && (
        <div className="modal fixed inset-0 bg-[rgba(0,0,0,0.8)] backdrop-blur-sm z-[1000] flex items-center justify-center p-5">
          <div className="modal-content bg-[#242424] border border-[rgba(212,175,55,0.3)] rounded-2xl p-8 max-w-[500px] w-full animate-in slide-in-from-bottom-4">
            <h2 className="modal-title font-['Playfair_Display',serif] text-2xl text-[#D4AF37] mb-6">
              Adicionar Barbeiro
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAdd();
              }}
            >
              <div className="form-group mb-5">
                <label htmlFor="addName" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-2">
                  Nome *
                </label>
                <input
                  id="addName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="form-input w-full px-4 py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div className="form-group mb-5">
                <label htmlFor="addAvatar" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-2">
                  URL do Avatar (opcional)
                </label>
                <input
                  id="addAvatar"
                  type="url"
                  value={formData.avatarUrl}
                  onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="form-input w-full px-4 py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div className="modal-actions flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    addModal.close();
                    setFormData({ name: '', avatarUrl: '' });
                  }}
                  className="modal-btn secondary flex-1 px-6 py-3 border-none rounded-lg text-base font-semibold cursor-pointer transition-all min-h-[44px] bg-[rgba(255,255,255,0.1)] text-white hover:-translate-y-0.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="modal-btn primary flex-1 px-6 py-3 border-none rounded-lg text-base font-semibold cursor-pointer transition-all min-h-[44px] bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] hover:-translate-y-0.5"
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
        <div className="modal fixed inset-0 bg-[rgba(0,0,0,0.8)] backdrop-blur-sm z-[1000] flex items-center justify-center p-5">
          <div className="modal-content bg-[#242424] border border-[rgba(212,175,55,0.3)] rounded-2xl p-8 max-w-[500px] w-full animate-in slide-in-from-bottom-4">
            <h2 className="modal-title font-['Playfair_Display',serif] text-2xl text-[#D4AF37] mb-6">
              Editar Barbeiro
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEdit();
              }}
            >
              <div className="form-group mb-5">
                <label htmlFor="editName" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-2">
                  Nome *
                </label>
                <input
                  id="editName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="form-input w-full px-4 py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div className="form-group mb-5">
                <label htmlFor="editAvatar" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-2">
                  URL do Avatar (opcional)
                </label>
                <input
                  id="editAvatar"
                  type="url"
                  value={formData.avatarUrl}
                  onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="form-input w-full px-4 py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div className="modal-actions flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    editModal.close();
                    setEditingBarber(null);
                    setFormData({ name: '', avatarUrl: '' });
                  }}
                  className="modal-btn secondary flex-1 px-6 py-3 border-none rounded-lg text-base font-semibold cursor-pointer transition-all min-h-[44px] bg-[rgba(255,255,255,0.1)] text-white hover:-translate-y-0.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="modal-btn primary flex-1 px-6 py-3 border-none rounded-lg text-base font-semibold cursor-pointer transition-all min-h-[44px] bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] hover:-translate-y-0.5"
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
