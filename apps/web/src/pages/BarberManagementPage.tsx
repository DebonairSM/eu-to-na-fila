import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useBarbers } from '@/hooks/useBarbers';
import { useModal } from '@/hooks/useModal';
import { useErrorTimeout } from '@/hooks/useErrorTimeout';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Navigation } from '@/components/Navigation';
import { WaitTimeSimulator } from '@/components/WaitTimeSimulator';
import { Modal } from '@/components/Modal';
import { getErrorMessage } from '@/lib/utils';
import type { Barber, Service } from '@eutonafila/shared';

export function BarberManagementPage() {
  const shopSlug = useShopSlug();
  const { isOwner, isBarber, user } = useAuthContext();
  const { t } = useLocale();
  const navigate = useNavigate();
  const { barbers, isLoading, error, refetch } = useBarbers();
  const displayBarbers = isBarber && user ? barbers.filter((b) => b.id === user.id) : barbers;
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
    revenueSharePercent: 100,
  });
  const [applyToAllPercent, setApplyToAllPercent] = useState(50);
  const [applyingToAll, setApplyingToAll] = useState(false);
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
    } catch (err) { setErrorMessage(getErrorMessage(err, t('barber.createServiceError'))); }
  }, [shopSlug, svcForm, loadServices, t]);

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
    } catch (err) { setErrorMessage(getErrorMessage(err, t('barber.updateServiceError'))); }
  }, [editingSvc, svcForm, loadServices, t]);

  const handleDeleteSvc = useCallback(async (id: number) => {
    try { await api.deleteService(id); await loadServices(); }
    catch (err) { setErrorMessage(getErrorMessage(err, t('barber.deleteServiceError'))); }
  }, [loadServices, t]);

  const handleToggleSvcActive = useCallback(async (svc: Service) => {
    try { await api.updateService(svc.id, { isActive: !svc.isActive }); await loadServices(); }
    catch (err) { setErrorMessage(getErrorMessage(err, t('barber.updateServiceError'))); }
  }, [loadServices, t]);

  // Shop status override state (owner only)
  const [overrideModal, setOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    isOpen: true,
    durationMinutes: 60,
    reason: '',
  });
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  const handleSetOverride = useCallback(async () => {
    setOverrideSubmitting(true);
    try {
      await api.setTemporaryStatus(shopSlug, overrideForm);
      setOverrideModal(false);
      setOverrideForm({ isOpen: true, durationMinutes: 60, reason: '' });
      window.location.reload();
    } catch (err) {
      setErrorMessage(getErrorMessage(err, 'Erro ao definir status temporário'));
    } finally {
      setOverrideSubmitting(false);
    }
  }, [shopSlug, overrideForm]);

  const handleClearOverride = useCallback(async () => {
    try {
      await api.clearTemporaryStatus(shopSlug);
      window.location.reload();
    } catch (err) {
      setErrorMessage(getErrorMessage(err, 'Erro ao limpar status temporário'));
    }
  }, [shopSlug]);

  // Staff (no owner/barber) goes to queue manager; barber and owner stay
  if (!isOwner && !isBarber) {
    navigate('/manage');
    return null;
  }

  const handleAdd = useCallback(async () => {
    if (!formData.name.trim()) {
      setErrorMessage(t('barber.nameRequired'));
      return;
    }
    if (formData.username.trim() && !formData.password) {
      setErrorMessage(t('barber.passwordRequiredWithUser'));
      return;
    }
    if (formData.password && !formData.username.trim()) {
      setErrorMessage(t('barber.userRequiredWithPassword'));
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
      setFormData({ name: '', avatarUrl: '', username: '', password: '', newPassword: '', revenueSharePercent: 100 });
      addModal.close();
      await refetch();
    } catch (error) {
      const errorMsg = getErrorMessage(error, t('barber.createBarberError'));
      setErrorMessage(errorMsg);
    }
  }, [formData, refetch, addModal, shopSlug, t]);

  const handleEdit = useCallback(async () => {
    if (!editingBarber || !formData.name.trim()) {
      setErrorMessage(t('barber.nameRequired'));
      return;
    }

    try {
      const payload: { name: string; avatarUrl: string | null; username?: string | null; password?: string; revenueSharePercent?: number | null } = {
        name: formData.name,
        avatarUrl: formData.avatarUrl || null,
      };
      if (formData.username !== undefined) {
        payload.username = formData.username.trim() || null;
      }
      if (formData.newPassword.trim()) {
        payload.password = formData.newPassword;
      }
      if (formData.revenueSharePercent !== undefined) {
        payload.revenueSharePercent = formData.revenueSharePercent;
      }
      await api.updateBarber(editingBarber.id, payload);
      setEditingBarber(null);
      setFormData({ name: '', avatarUrl: '', username: '', password: '', newPassword: '', revenueSharePercent: 100 });
      editModal.close();
      await refetch();
    } catch (error) {
      const errorMsg = getErrorMessage(error, t('barber.updateBarberError'));
      setErrorMessage(errorMsg);
    }
  }, [editingBarber, formData, refetch, editModal, t]);

  const handleDelete = useCallback(async () => {
    if (!barberToDelete) return;

    try {
      await api.deleteBarber?.(barberToDelete);
      deleteConfirmModal.close();
      setBarberToDelete(null);
      await refetch();
    } catch (error) {
      const errorMsg = getErrorMessage(error, t('barber.deleteBarberError'));
      setErrorMessage(errorMsg);
      deleteConfirmModal.close();
    }
  }, [barberToDelete, refetch, deleteConfirmModal, t]);

  const openEditModal = (barber: Barber) => {
    setEditingBarber(barber);
    setFormData({
      name: barber.name,
      avatarUrl: barber.avatarUrl || '',
      username: barber.username ?? '',
      password: '',
      newPassword: '',
      revenueSharePercent: barber.revenueSharePercent ?? 100,
    });
    editModal.open();
  };

  const handleApplyRevenueToAll = useCallback(async () => {
    if (displayBarbers.length === 0) return;
    setApplyingToAll(true);
    setErrorMessage(null);
    try {
      for (const barber of displayBarbers) {
        await api.updateBarber(barber.id, { revenueSharePercent: applyToAllPercent });
      }
      await refetch();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('barber.updateBarberError')));
    } finally {
      setApplyingToAll(false);
    }
  }, [displayBarbers, applyToAllPercent, refetch, t]);

  return (
    <div 
      className="min-h-screen h-full bg-[var(--shop-background)]"
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
            aria-label={t('barber.closeError')}
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
            {t('dashboard.manageBarbers')}
          </h1>
        </div>

        {isOwner && displayBarbers.length > 0 && (
          <section className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <h2 className="text-white font-medium mb-3">{t('barber.applyRevenueShareToAll')}</h2>
            <p className="text-white/60 text-sm mb-3">{t('barber.applyRevenueShareHint')}</p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={applyToAllPercent}
                onChange={(e) => setApplyToAllPercent(Number(e.target.value))}
                className="flex-1 min-w-[120px] max-w-[200px] h-2 rounded-lg appearance-none bg-white/20 accent-[var(--shop-accent)]"
              />
              <span className="text-white font-medium w-10">{applyToAllPercent}%</span>
              <button
                type="button"
                onClick={handleApplyRevenueToAll}
                disabled={applyingToAll}
                className="px-4 py-2 rounded-lg bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {applyingToAll ? t('common.saving') : t('barber.applyToAllBarbers')}
              </button>
            </div>
          </section>
        )}

        {isOwner && (
        <>
          {/* Shop Status Override Controls */}
          <section className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-white font-medium mb-1">Status da Loja</h3>
                <p className="text-white/60 text-sm">
                  Controle temporário de abertura/fechamento
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setOverrideForm({ isOpen: true, durationMinutes: 60, reason: '' });
                    setOverrideModal(true);
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Abrir Agora
                </button>
                <button
                  onClick={() => {
                    setOverrideForm({ isOpen: false, durationMinutes: 60, reason: '' });
                    setOverrideModal(true);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Fechar Agora
                </button>
                <button
                  onClick={handleClearOverride}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Limpar Override
                </button>
              </div>
            </div>
          </section>

          <button
            onClick={addModal.open}
            className="add-barber-btn flex items-center justify-center gap-2 sm:gap-3 w-full max-w-[300px] mx-auto mb-8 sm:mb-10 px-4 sm:px-6 py-3 sm:py-4 bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] border-none rounded-xl text-sm sm:text-base font-semibold transition-all hover:opacity-90 hover:-translate-y-0.5 hover:-translate-y-0.5 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 focus:ring-offset-[var(--shop-background)]"
            aria-label={t('barber.addNewBarber')}
          >
            <span className="material-symbols-outlined text-lg sm:text-xl" aria-hidden="true">add</span>
            {t('barber.addBarber')}
          </button>
        </>
        )}

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
        ) : displayBarbers.length === 0 ? (
          <div className="empty-state text-center py-12 sm:py-[60px] px-4 sm:px-5 text-[rgba(255,255,255,0.7)]">
            <span className="material-symbols-outlined text-[3rem] sm:text-[4rem] text-[rgba(255,255,255,0.5)] mb-3 sm:mb-4 block" aria-hidden="true">
              content_cut
            </span>
            <p className="text-sm sm:text-base">{isBarber ? t('barber.noBarberFound') : t('barber.noBarbers')}</p>
          </div>
        ) : (
          <div className="barbers-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
            {displayBarbers.map((barber) => (
              <article
                key={barber.id}
                className="barber-card bg-[color-mix(in_srgb,var(--shop-surface-secondary)_80%,transparent)] backdrop-blur-md border border-[color-mix(in_srgb,var(--shop-accent)_20%,transparent)] rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all hover:border-[var(--shop-accent)] hover:-translate-y-1 hover:-translate-y-1 relative overflow-hidden"
                aria-labelledby={`barber-name-${barber.id}`}
              >
                <div className="barber-header flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
                  {isOwner ? (
                  <button
                    type="button"
                    className="barber-avatar w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[var(--shop-accent)] to-[var(--shop-accent-hover)] flex items-center justify-center text-xl sm:text-2xl font-semibold text-[var(--shop-text-on-accent)] flex-shrink-0 cursor-pointer transition-all hover:scale-105 relative focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 focus:ring-offset-[var(--shop-surface-secondary)]"
                    onClick={() => openEditModal(barber)}
                    aria-label={t('barber.editAria').replace('{name}', barber.name)}
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
                  ) : (
                  <div className="barber-avatar w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[var(--shop-accent)] to-[var(--shop-accent-hover)] flex items-center justify-center text-xl sm:text-2xl font-semibold text-[var(--shop-text-on-accent)] flex-shrink-0">
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
                  </div>
                  )}
                  <div className="barber-info flex-1 min-w-0">
                    <h3 id={`barber-name-${barber.id}`} className="barber-name text-lg sm:text-xl font-semibold text-white mb-1 truncate">
                      {barber.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div
                        className={`barber-status inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-xl text-[10px] sm:text-xs font-medium ${
                          barber.isPresent
                            ? 'bg-[rgba(255,255,255,0.2)] text-white'
                            : 'bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.5)]'
                        }`}
                        aria-label={barber.isPresent ? t('barber.statusPresent') : t('barber.statusAbsent')}
                      >
                        <span className="material-symbols-outlined text-xs sm:text-sm" aria-hidden="true">
                          {barber.isPresent ? 'check_circle' : 'cancel'}
                        </span>
                        {barber.isPresent ? t('barber.present') : t('barber.absent')}
                      </div>
                      {isOwner && (
                        <span className="text-[10px] sm:text-xs text-white/50">
                          {(barber.revenueSharePercent ?? 100)}% {t('barber.revenueShareShort')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions: owner only (barber sees read-only card) */}
                {isOwner && (
                <div className="barber-actions flex gap-2 sm:gap-3">
                  <button
                    onClick={() => openEditModal(barber)}
                    className="action-btn flex-1 px-2 sm:px-3 py-2.5 sm:py-3 border-none rounded-lg text-xs sm:text-sm font-semibold cursor-pointer transition-all min-h-[44px] bg-[rgba(255,255,255,0.1)] text-white hover:bg-[color-mix(in_srgb,var(--shop-accent)_20%,transparent)] hover:text-[var(--shop-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 focus:ring-offset-[var(--shop-surface-secondary)]"
                    aria-label={t('barber.editBarberAria').replace('{name}', barber.name)}
                  >
                    {t('barber.edit')}
                  </button>
                  <button
                    onClick={() => {
                      setBarberToDelete(barber.id);
                      deleteConfirmModal.open();
                    }}
                    className="action-btn delete flex-1 px-2 sm:px-3 py-2.5 sm:py-3 border border-[rgba(239,68,68,0.3)] rounded-lg text-xs sm:text-sm font-semibold cursor-pointer transition-all min-h-[44px] bg-[rgba(239,68,68,0.2)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.3)] focus:outline-none focus:ring-2 focus:ring-[#ef4444] focus:ring-offset-2 focus:ring-offset-[var(--shop-surface-secondary)]"
                    aria-label={t('barber.removeAria').replace('{name}', barber.name)}
                  >
                    {t('barber.remove')}
                  </button>
                </div>
                )}
              </article>
            ))}
          </div>
        )}

        {/* Services Section (owner only) */}
        {isOwner && (
        <section className="mt-8 sm:mt-10">
          <button
            type="button"
            onClick={() => setServicesOpen(!servicesOpen)}
            className="flex items-center gap-2 text-[var(--shop-accent)] mb-4 hover:underline"
          >
            <span className="material-symbols-outlined text-base">
              {servicesOpen ? 'expand_less' : 'expand_more'}
            </span>
            <h2 className="font-['Playfair_Display',serif] text-xl">{t('barber.services')}</h2>
          </button>

          {servicesOpen && (
            <div className="space-y-4 bg-[color-mix(in_srgb,var(--shop-surface-secondary)_60%,transparent)] backdrop-blur-sm border border-[color-mix(in_srgb,var(--shop-accent)_15%,transparent)] rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-white/50 text-sm">{t('barber.manageServicesDesc')}</p>
                {!isAddingSvc && !editingSvc && (
                  <button
                    type="button"
                    onClick={() => { setIsAddingSvc(true); setSvcForm({ name: '', description: '', duration: 30, price: 0 }); }}
                    className="px-3 py-1.5 bg-[var(--shop-accent)]/20 text-[var(--shop-accent)] rounded-lg text-sm font-medium hover:bg-[var(--shop-accent)]/30 transition-colors"
                  >
                    {t('barber.addService')}
                  </button>
                )}
              </div>

              {/* Add / Edit form */}
              {(isAddingSvc || editingSvc) && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-white/60 text-xs block mb-1">{t('management.name')} *</label>
                      <input type="text" value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} className="form-input w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm" placeholder={t('barber.serviceNamePlaceholder')} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-white/60 text-xs block mb-1">{t('barber.description')}</label>
                      <input type="text" value={svcForm.description} onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })} className="form-input w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm" placeholder={t('barber.descriptionOptional')} />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs block mb-1">{t('barber.durationMin')}</label>
                      <input type="number" min={1} value={svcForm.duration} onChange={(e) => setSvcForm({ ...svcForm, duration: parseInt(e.target.value) || 1 })} className="form-input w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm" />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs block mb-1">{t('barber.priceCents')}</label>
                      <input type="number" min={0} value={svcForm.price} onChange={(e) => setSvcForm({ ...svcForm, price: parseInt(e.target.value) || 0 })} className="form-input w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm" placeholder={t('barber.pricePlaceholder')} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => { setIsAddingSvc(false); setEditingSvc(null); }} className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors">
                      {t('common.cancel')}
                    </button>
                    <button type="button" onClick={editingSvc ? handleUpdateSvc : handleAddSvc} disabled={!svcForm.name.trim()} className="px-3 py-1.5 bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] rounded-lg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50">
                      {editingSvc ? t('common.save') : t('barber.create')}
                    </button>
                  </div>
                </div>
              )}

              {/* Services list */}
              {shopServices.length === 0 && !isAddingSvc ? (
                <p className="text-white/40 text-sm text-center py-6">{t('barber.noServices')}</p>
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
                          {!svc.isActive && <span className="text-xs text-white/40 bg-white/10 px-1.5 py-0.5 rounded">{t('barber.inactive')}</span>}
                        </div>
                        <div className="flex gap-3 text-xs text-white/50 mt-0.5">
                          <span>{svc.duration} min</span>
                          {svc.price != null && svc.price > 0 && <span>R$ {(svc.price / 100).toFixed(2)}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button type="button" onClick={() => handleToggleSvcActive(svc)} className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors" title={svc.isActive ? t('barber.deactivate') : t('barber.activate')}>
                          <span className="material-symbols-outlined text-base">{svc.isActive ? 'toggle_on' : 'toggle_off'}</span>
                        </button>
                        <button type="button" onClick={() => { setEditingSvc(svc); setIsAddingSvc(false); setSvcForm({ name: svc.name, description: svc.description || '', duration: svc.duration, price: svc.price ?? 0 }); }} className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors" title={t('barber.edit')}>
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button type="button" onClick={() => handleDeleteSvc(svc.id)} className="p-1.5 rounded text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors" title={t('barber.remove')}>
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
          <div className="modal-content bg-[var(--shop-surface-secondary)] border border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 max-w-[500px] w-full min-w-[320px] animate-in slide-in-from-bottom-4">
            <h2 id="add-modal-title" className="modal-title font-['Playfair_Display',serif] text-xl sm:text-2xl text-[var(--shop-accent)] mb-5 sm:mb-6">
              {t('barber.addBarber')}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAdd();
              }}
            >
              <div className="form-group mb-4 sm:mb-5">
                <label htmlFor="addName" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-2">
                  {t('management.name')}
                </label>
                <input
                  id="addName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[var(--shop-accent)] focus:ring-2 focus:ring-[var(--shop-accent)]"
                />
              </div>
              <div className="form-group mb-4 sm:mb-5">
                <label htmlFor="addAvatar" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-2">
                  {t('barber.avatarUrl')}
                </label>
                <input
                  id="addAvatar"
                  type="url"
                  value={formData.avatarUrl}
                  onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                  placeholder={t('barber.avatarUrlPlaceholder')}
                  className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[var(--shop-accent)] focus:ring-2 focus:ring-[var(--shop-accent)] placeholder:text-[rgba(255,255,255,0.3)]"
                />
              </div>
              <div className="form-group mb-4 sm:mb-5">
                <p className="text-[rgba(255,255,255,0.5)] text-xs mb-2">
                  {t('barber.loginOptionalHint')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="addUsername" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-1">
                      {t('auth.username')}
                    </label>
                    <input
                      id="addUsername"
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder={t('barber.nameExamplePlaceholder')}
                      autoComplete="off"
                      className="form-input w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-[var(--shop-text-primary)] text-sm min-h-[40px] focus:outline-none focus:border-[var(--shop-accent)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="addPassword" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-1">
                      {t('auth.password')}
                    </label>
                    <input
                      id="addPassword"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={t('barber.passwordMinPlaceholder')}
                      autoComplete="new-password"
                      className="form-input w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-[var(--shop-text-primary)] text-sm min-h-[40px] focus:outline-none focus:border-[var(--shop-accent)]"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-actions flex gap-2 sm:gap-3 mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={() => {
                    addModal.close();
                    setFormData({ name: '', avatarUrl: '', username: '', password: '', newPassword: '', revenueSharePercent: 100 });
                  }}
                  className="modal-btn secondary flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-all min-h-[44px] bg-[rgba(255,255,255,0.1)] text-white hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="modal-btn primary flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-all min-h-[44px] bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)] text-[var(--shop-text-on-accent)] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 focus:ring-offset-[var(--shop-surface-secondary)]"
                >
                  {t('barber.addButton')}
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
          <div className="modal-content bg-[var(--shop-surface-secondary)] border border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 max-w-[500px] w-full min-w-[320px] animate-in slide-in-from-bottom-4">
            <h2 id="edit-modal-title" className="modal-title font-['Playfair_Display',serif] text-xl sm:text-2xl text-[var(--shop-accent)] mb-5 sm:mb-6">
              {t('barber.editBarber')}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEdit();
              }}
            >
              <div className="form-group mb-4 sm:mb-5">
                <label htmlFor="editName" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-2">
                  {t('management.name')}
                </label>
                <input
                  id="editName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[var(--shop-accent)] focus:ring-2 focus:ring-[var(--shop-accent)]"
                />
              </div>
              <div className="form-group mb-4 sm:mb-5">
                <label htmlFor="editAvatar" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-2">
                  {t('barber.avatarUrl')}
                </label>
                <input
                  id="editAvatar"
                  type="url"
                  value={formData.avatarUrl}
                  onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                  placeholder={t('barber.avatarUrlPlaceholder')}
                  className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-base min-h-[44px] focus:outline-none focus:border-[var(--shop-accent)] focus:ring-2 focus:ring-[var(--shop-accent)] placeholder:text-[rgba(255,255,255,0.3)]"
                />
              </div>
              <div className="form-group mb-4 sm:mb-5">
                <p className="text-[rgba(255,255,255,0.5)] text-xs mb-2">
                  {t('barber.loginForPerformance')}
                </p>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="editUsername" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-1">
                      {t('auth.username')}
                    </label>
                    <input
                      id="editUsername"
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder={t('barber.removeLoginPlaceholder')}
                      autoComplete="off"
                      className="form-input w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-[var(--shop-text-primary)] text-sm min-h-[40px] focus:outline-none focus:border-[var(--shop-accent)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="editNewPassword" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-1">
                      {t('barber.newPassword')}
                    </label>
                    <input
                      id="editNewPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      placeholder={t('barber.keepPasswordPlaceholder')}
                      autoComplete="new-password"
                      className="form-input w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-[var(--shop-text-primary)] text-sm min-h-[40px] focus:outline-none focus:border-[var(--shop-accent)]"
                    />
                  </div>
                </div>
              </div>
              {isOwner && (
                <div className="form-group mb-4 sm:mb-5">
                  <label htmlFor="editRevenueShare" className="form-label block text-[rgba(255,255,255,0.7)] text-sm mb-2">
                    {t('barber.revenueSharePercent')}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="editRevenueShare"
                      type="range"
                      min={0}
                      max={100}
                      value={formData.revenueSharePercent}
                      onChange={(e) => setFormData({ ...formData, revenueSharePercent: Number(e.target.value) })}
                      className="flex-1 h-2 rounded-lg appearance-none bg-white/20 accent-[var(--shop-accent)]"
                    />
                    <span className="text-white font-medium w-10 text-right">{formData.revenueSharePercent}%</span>
                  </div>
                  <p className="text-[rgba(255,255,255,0.5)] text-xs mt-1">{t('barber.revenueShareHint')}</p>
                </div>
              )}
              <div className="modal-actions flex gap-2 sm:gap-3 mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={() => {
                    editModal.close();
                    setEditingBarber(null);
                    setFormData({ name: '', avatarUrl: '', username: '', password: '', newPassword: '', revenueSharePercent: 100 });
                  }}
                  className="modal-btn secondary flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-all min-h-[44px] bg-[rgba(255,255,255,0.1)] text-white hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="modal-btn primary flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-all min-h-[44px] bg-gradient-to-r from-[var(--shop-accent)] to-[var(--shop-accent-hover)] text-[var(--shop-text-on-accent)] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)] focus:ring-offset-2 focus:ring-offset-[var(--shop-surface-secondary)]"
                >
                  {t('common.save')}
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
        title={t('barber.deleteBarberTitle')}
        message={t('barber.deleteBarberMessage')}
        confirmText={t('barber.removeButton')}
        cancelText={t('common.cancel')}
        variant="destructive"
        icon="delete"
      />

      {/* Override Modal */}
      {overrideModal && (
        <Modal
          isOpen={overrideModal}
          onClose={() => setOverrideModal(false)}
          title={overrideForm.isOpen ? 'Abrir Loja Temporariamente' : 'Fechar Loja Temporariamente'}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm mb-2">
                Duração (minutos)
              </label>
              <input
                type="number"
                min={1}
                max={1440}
                value={overrideForm.durationMinutes}
                onChange={(e) => setOverrideForm({ 
                  ...overrideForm, 
                  durationMinutes: parseInt(e.target.value) || 60 
                })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
              />
              <p className="text-white/50 text-xs mt-1">
                Máximo: 1440 minutos (24 horas)
              </p>
            </div>
            
            <div>
              <label className="block text-white/80 text-sm mb-2">
                Motivo (opcional)
              </label>
              <input
                type="text"
                maxLength={200}
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm({ 
                  ...overrideForm, 
                  reason: e.target.value 
                })}
                placeholder="Ex: Manutenção, Evento especial..."
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setOverrideModal(false)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSetOverride}
                disabled={overrideSubmitting}
                className="flex-1 px-4 py-2 bg-[var(--shop-accent)] hover:bg-[var(--shop-accent-hover)] text-[var(--shop-text-on-accent)] rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {overrideSubmitting ? 'Aplicando...' : 'Aplicar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
