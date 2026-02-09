import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useBarbers } from '@/hooks/useBarbers';
import { useModal } from '@/hooks/useModal';
import { useErrorTimeout } from '@/hooks/useErrorTimeout';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Navigation } from '@/components/Navigation';
import { WaitTimeSimulator } from '@/components/WaitTimeSimulator';
import { getErrorMessage } from '@/lib/utils';
import type { Barber, Service } from '@eutonafila/shared';

export function BarberManagementPage() {
  const shopSlug = useShopSlug();
  const { isOwner } = useAuthContext();
  const navigate = useNavigate();
  const { barbers, isLoading, error, refetch } = useBarbers();
  const addModal = useModal();
  const editModal = useModal();
  const deleteConfirmModal = useModal();
  
  const [barberToDelete, setBarberToDelete] = useState<number | null>(null);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    avatarUrl: '',
    username: '',
    password: '',
    newPassword: '',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // -- Services state --
  const [shopServices, setShopServices] = useState<Service[]>([]);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [isAddingSvc, setIsAddingSvc] = useState(false);
  const [editingSvc, setEditingSvc] = useState<Service | null>(null);
  const [svcForm, setSvcForm] = useState({ name: '', description: '', duration: 30, price: 0 });

  // Auto-clear error messages after timeout
  useErrorTimeout(errorMessage, () => setErrorMessage(null));

  // Load services on mount
  const loadServices = useCallback(async () => {
    try {
      const svcs = await api.getServices(shopSlug);
      setShopServices(svcs);
    } catch { setShopServices([]); }
  }, [shopSlug]);

  useEffect(() => { loadServices(); }, [loadServices]);

  const handleAddSvc = useCallback(async () => {
    if (!svcForm.name.trim()) return;
    try {
      await api.createService(shopSlug, {
        name: svcForm.name,
        description: svcForm.description || undefined,
        duration: svcForm.duration,
        price: svcForm.price > 0 ? svcForm.price : undefined,
      });
      setSvcForm({ name: '', description: '', duration: 30, price: 0 });
      setIsAddingSvc(false);
      await loadServices();
    } catch (err) { setErrorMessage(getErrorMessage(err, 'Erro ao criar servico.')); }
  }, [shopSlug, svcForm, loadServices]);

  const handleUpdateSvc = useCallback(async () => {
    if (!editingSvc) return;
    try {
      await api.updateService(editingSvc.id, {
        name: svcForm.name || undefined,
        description: svcForm.description,
        duration: svcForm.duration,
        price: svcForm.price > 0 ? svcForm.price : null,
      });
      setEditingSvc(null);
      setSvcForm({ name: '', description: '', duration: 30, price: 0 });
      await loadServices();
    } catch (err) { setErrorMessage(getErrorMessage(err, 'Erro ao atualizar servico.')); }
  }, [editingSvc, svcForm, loadServices]);

  const handleDeleteSvc = useCallback(async (id: number) => {
    try { await api.deleteService(id); await loadServices(); }
    catch (err) { setErrorMessage(getErrorMessage(err, 'Erro ao remover servico.')); }
  }, [loadServices]);

  const handleToggleSvcActive = useCallback(async (svc: Service) => {
    try { await api.updateService(svc.id, { isActive: !svc.isActive }); await loadServices(); }
    catch (err) { setErrorMessage(getErrorMessage(err, 'Erro ao atualizar servico.')); }
  }, [loadServices]);

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
    if (formData.username.trim() && !formData.password) {
      setErrorMessage('Senha é obrigatória quando usuário é definido.');
      return;
    }
    if (formData.password && !formData.username.trim()) {
      setErrorMessage('Usuário é obrigatório quando senha é definida.');
      return;
    }

    try {
      await api.createBarber(shopSlug, {
        name: formData.name,
        avatarUrl: formData.avatarUrl || null,
        ...(formData.username.trim() && formData.password
          ? { username: formData.username.trim(), password: formData.password }
          : {}),
      });
      setFormData({ name: '', avatarUrl: '', username: '', password: '', newPassword: '' });
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
      const payload: { name: string; avatarUrl: string | null; username?: string | null; password?: string } = {
        name: formData.name,
        avatarUrl: formData.avatarUrl || null,
      };
      if (formData.username !== undefined) {
        payload.username = formData.username.trim() || null;
      }
      if (formData.newPassword.trim()) {
        payload.password = formData.newPassword;
      }
      await api.updateBarber(editingBarber.id, payload);
      setEditingBarber(null);
      setFormData({ name: '', avatarUrl: '', username: '', password: '', newPassword: '' });
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
      username: barber.username ?? '',
      password: '',
      newPassword: '',
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

        {/* Services Section (collapsible) */}
        <section className="mt-8 sm:mt-10">
          <button
            type="button"
            onClick={() => setServicesOpen(!servicesOpen)}
            className="flex items-center gap-2 text-[var(--shop-accent,#D4AF37)] mb-4 hover:underline"
          >
            <span className="material-symbols-outlined text-base">
              {servicesOpen ? 'expand_less' : 'expand_more'}
            </span>
            <h2 className="font-['Playfair_Display',serif] text-xl">Servicos</h2>
          </button>

          {servicesOpen && (
            <div className="space-y-4 bg-[rgba(36,36,36,0.6)] backdrop-blur-sm border border-[rgba(212,175,55,0.15)] rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-white/50 text-sm">Gerencie tempos estimados e precos dos servicos.</p>
                {!isAddingSvc && !editingSvc && (
                  <button
                    type="button"
                    onClick={() => { setIsAddingSvc(true); setSvcForm({ name: '', description: '', duration: 30, price: 0 }); }}
                    className="px-3 py-1.5 bg-[var(--shop-accent,#D4AF37)]/20 text-[var(--shop-accent,#D4AF37)] rounded-lg text-sm font-medium hover:bg-[var(--shop-accent,#D4AF37)]/30 transition-colors"
                  >
                    + Adicionar
                  </button>
                )}
              </div>

              {/* Add / Edit form */}
              {(isAddingSvc || editingSvc) && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-white/60 text-xs block mb-1">Nome *</label>
                      <input type="text" value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} className="form-input w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm" placeholder="Ex: Corte Masculino" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-white/60 text-xs block mb-1">Descricao</label>
                      <input type="text" value={svcForm.description} onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })} className="form-input w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm" placeholder="Descricao opcional" />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs block mb-1">Duracao (min) *</label>
                      <input type="number" min={1} value={svcForm.duration} onChange={(e) => setSvcForm({ ...svcForm, duration: parseInt(e.target.value) || 1 })} className="form-input w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm" />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs block mb-1">Preco (centavos)</label>
                      <input type="number" min={0} value={svcForm.price} onChange={(e) => setSvcForm({ ...svcForm, price: parseInt(e.target.value) || 0 })} className="form-input w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm" placeholder="0 = sem preco" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => { setIsAddingSvc(false); setEditingSvc(null); }} className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors">
                      Cancelar
                    </button>
                    <button type="button" onClick={editingSvc ? handleUpdateSvc : handleAddSvc} disabled={!svcForm.name.trim()} className="px-3 py-1.5 bg-[var(--shop-accent,#D4AF37)] text-[#0a0a0a] rounded-lg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50">
                      {editingSvc ? 'Salvar' : 'Criar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Services list */}
              {shopServices.length === 0 && !isAddingSvc ? (
                <p className="text-white/40 text-sm text-center py-6">Nenhum servico cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {shopServices.map((svc) => (
                    <div
                      key={svc.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors ${
                        svc.isActive ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 opacity-60'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium truncate">{svc.name}</span>
                          {!svc.isActive && <span className="text-xs text-white/40 bg-white/10 px-1.5 py-0.5 rounded">inativo</span>}
                        </div>
                        <div className="flex gap-3 text-xs text-white/50 mt-0.5">
                          <span>{svc.duration} min</span>
                          {svc.price != null && svc.price > 0 && <span>R$ {(svc.price / 100).toFixed(2)}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button type="button" onClick={() => handleToggleSvcActive(svc)} className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors" title={svc.isActive ? 'Desativar' : 'Ativar'}>
                          <span className="material-symbols-outlined text-base">{svc.isActive ? 'toggle_on' : 'toggle_off'}</span>
                        </button>
                        <button type="button" onClick={() => { setEditingSvc(svc); setIsAddingSvc(false); setSvcForm({ name: svc.name, description: svc.description || '', duration: svc.duration, price: svc.price ?? 0 }); }} className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors" title="Editar">
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button type="button" onClick={() => handleDeleteSvc(svc.id)} className="p-1.5 rounded text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Remover">
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Wait-time simulator */}
              <WaitTimeSimulator services={shopServices} />
            </div>
          )}
        </section>
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
              <div className="form-group mb-4 sm:mb-5">
                <p className="text-[rgba(255,255,255,0.5)] text-xs mb-2">
                  Login para o barbeiro acessar &quot;Meu desempenho&quot; (opcional)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="addUsername" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-1">
                      Usuário
                    </label>
                    <input
                      id="addUsername"
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Ex: joao"
                      autoComplete="off"
                      className="form-input w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-sm min-h-[40px] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div>
                    <label htmlFor="addPassword" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-1">
                      Senha
                    </label>
                    <input
                      id="addPassword"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Mín. 6 caracteres"
                      autoComplete="new-password"
                      className="form-input w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-sm min-h-[40px] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-actions flex gap-2 sm:gap-3 mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={() => {
                    addModal.close();
                    setFormData({ name: '', avatarUrl: '', username: '', password: '', newPassword: '' });
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
              <div className="form-group mb-4 sm:mb-5">
                <p className="text-[rgba(255,255,255,0.5)] text-xs mb-2">
                  Login para &quot;Meu desempenho&quot;
                </p>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="editUsername" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-1">
                      Usuário
                    </label>
                    <input
                      id="editUsername"
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Deixe vazio para remover login"
                      autoComplete="off"
                      className="form-input w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-sm min-h-[40px] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div>
                    <label htmlFor="editNewPassword" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-1">
                      Nova senha
                    </label>
                    <input
                      id="editNewPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      placeholder="Deixe em branco para manter a atual"
                      autoComplete="new-password"
                      className="form-input w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-sm min-h-[40px] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-actions flex gap-2 sm:gap-3 mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={() => {
                    editModal.close();
                    setEditingBarber(null);
                    setFormData({ name: '', avatarUrl: '', username: '', password: '', newPassword: '' });
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
