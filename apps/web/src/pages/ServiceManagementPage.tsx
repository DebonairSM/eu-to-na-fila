import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useErrorTimeout } from '@/hooks/useErrorTimeout';
import { useModal } from '@/hooks/useModal';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Navigation } from '@/components/Navigation';
import { Skeleton } from '@/components/design-system';
import { Modal } from '@/components/Modal';
import { formatDurationMinutes } from '@/lib/formatDuration';
import { formatCurrency } from '@/lib/format';
import { getErrorMessage } from '@/lib/utils';
import type { Service } from '@eutonafila/shared';

export function ServiceManagementPage() {
  const shopSlug = useShopSlug();
  const { t, locale } = useLocale();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const addModal = useModal();
  const editModal = useModal();
  const deleteModal = useModal();
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    duration: number;
    price: number;
  }>({
    name: '',
    description: '',
    duration: 30,
    price: 0,
  });

  useErrorTimeout(errorMessage, () => setErrorMessage(null));

  const loadServices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await api.getServices(shopSlug);
      setServices(list);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [shopSlug]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const openAdd = useCallback(() => {
    setFormData({ name: '', description: '', duration: 30, price: 0 });
    setEditingService(null);
    addModal.open();
  }, [addModal]);

  const openEdit = useCallback(
    (svc: Service) => {
      setEditingService(svc);
      setFormData({
        name: svc.name,
        description: svc.description ?? '',
        duration: svc.duration,
        price: svc.price != null ? svc.price / 100 : 0,
      });
      editModal.open();
    },
    [editModal]
  );

  const handleCreate = useCallback(async () => {
    if (!formData.name.trim()) return;
    try {
      await api.createService(shopSlug, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        duration: formData.duration,
        price: formData.price > 0 ? Math.round(formData.price * 100) : undefined,
      });
      addModal.close();
      await loadServices();
    } catch (err) {
      setErrorMessage(getErrorMessage(err, t('barber.createServiceError')));
    }
  }, [shopSlug, formData, loadServices, addModal, t]);

  const handleUpdate = useCallback(async () => {
    if (!editingService) return;
    try {
      await api.updateService(editingService.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        duration: formData.duration,
        price: formData.price > 0 ? Math.round(formData.price * 100) : null,
      });
      editModal.close();
      setEditingService(null);
      await loadServices();
    } catch (err) {
      setErrorMessage(getErrorMessage(err, t('barber.updateServiceError')));
    }
  }, [editingService, formData, loadServices, editModal, t]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!serviceToDelete) return;
    try {
      await api.deleteService(serviceToDelete.id);
      deleteModal.close();
      setServiceToDelete(null);
      await loadServices();
    } catch (err) {
      setErrorMessage(getErrorMessage(err, t('barber.deleteServiceError')));
    }
  }, [serviceToDelete, loadServices, deleteModal, t]);

  const handleToggleActive = useCallback(
    async (svc: Service) => {
      try {
        await api.updateService(svc.id, { isActive: !svc.isActive });
        await loadServices();
      } catch (err) {
        setErrorMessage(getErrorMessage(err, t('barber.updateServiceError')));
      }
    },
    [loadServices, t]
  );

  const moveService = useCallback(
    async (index: number, direction: 'up' | 'down') => {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= services.length) return;
      const reordered = [...services];
      const [removed] = reordered.splice(index, 1);
      reordered.splice(newIndex, 0, removed);
      const ids = reordered.map((s) => s.id);
      try {
        await api.reorderServices(shopSlug, ids);
        await loadServices();
      } catch (err) {
        setErrorMessage(getErrorMessage(err, t('barber.updateServiceError')));
      }
    },
    [services, shopSlug, loadServices, t]
  );

  const localeForCurrency = locale ?? 'pt-BR';

  return (
    <div className="min-h-screen h-full bg-[var(--shop-background)]">
      <Navigation />
      {errorMessage && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#ef4444] text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-2xl flex items-center gap-3 max-w-[calc(100%-2rem)] sm:max-w-md"
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
      <main className="container max-w-[800px] mx-auto px-4 sm:px-6 pt-24 pb-12 relative z-10">
        <div className="mb-8">
          <h1 className="font-['Playfair_Display',serif] text-2xl text-[var(--shop-accent)] mb-2">
            {t('servicesPage.title')}
          </h1>
          <p className="text-[var(--shop-text-secondary)] text-sm">
            {t('servicesPage.subtitle')}
          </p>
        </div>

        <Link
          to="/owner"
          className="inline-flex items-center gap-2 text-sm text-[var(--shop-text-secondary)] hover:text-[var(--shop-accent)] mb-6"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          {t('servicesPage.backToDashboard')}
        </Link>

        <button
          type="button"
          onClick={openAdd}
          className="flex items-center justify-center gap-2 w-full max-w-[280px] mx-auto mb-8 px-4 py-3 bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] border-none rounded-xl text-sm font-semibold hover:opacity-90 min-h-[48px]"
          aria-label={t('servicesPage.addService')}
        >
          <span className="material-symbols-outlined">add</span>
          {t('servicesPage.addService')}
        </button>

        {isLoading ? (
          <div className="space-y-4" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="card" className="h-24" />
            ))}
          </div>
        ) : error ? (
          <ErrorDisplay error={error} onRetry={loadServices} />
        ) : services.length === 0 ? (
          <div className="text-center py-12 text-[var(--shop-text-secondary)]">
            <span className="material-symbols-outlined text-4xl block mb-3 opacity-60">design_services</span>
            <p>{t('servicesPage.noServices')}</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {services.map((svc, index) => (
              <li
                key={svc.id}
                className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${svc.isActive ? 'text-[var(--shop-text-primary)]' : 'text-[var(--shop-text-secondary)] line-through'}`}>
                    {svc.name}
                  </p>
                  {svc.description && (
                    <p className="text-sm text-[var(--shop-text-secondary)] mt-0.5 truncate">{svc.description}</p>
                  )}
                  <p className="text-xs text-[var(--shop-text-secondary)] mt-1">
                    {formatDurationMinutes(svc.duration)}
                    {svc.price != null && svc.price > 0 && ` · ${formatCurrency(svc.price, localeForCurrency)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => moveService(index, 'up')}
                    disabled={index === 0}
                    className="p-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label={t('createShop.moveServiceUp')}
                  >
                    <span className="material-symbols-outlined text-lg">arrow_upward</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveService(index, 'down')}
                    disabled={index === services.length - 1}
                    className="p-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label={t('createShop.moveServiceDown')}
                  >
                    <span className="material-symbols-outlined text-lg">arrow_downward</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(svc)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      svc.isActive
                        ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                        : 'bg-white/10 text-[var(--shop-text-secondary)] border border-white/10'
                    }`}
                  >
                    {svc.isActive ? t('servicesPage.active') : t('servicesPage.inactive')}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(svc)}
                    className="p-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/5"
                    aria-label={`${t('servicesPage.edit')} ${svc.name}`}
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setServiceToDelete(svc);
                      deleteModal.open();
                    }}
                    className="p-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10"
                    aria-label={`${t('servicesPage.delete')} ${svc.name}`}
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <Modal
        isOpen={addModal.isOpen}
        onClose={addModal.close}
        title={t('servicesPage.addService')}
      >
        <ServiceForm
          formData={formData}
          setFormData={setFormData}
          onSave={handleCreate}
          onCancel={addModal.close}
          saveLabel={t('barber.add')}
          t={t}
        />
      </Modal>

      <Modal
        isOpen={editModal.isOpen}
        onClose={() => {
          editModal.close();
          setEditingService(null);
        }}
        title={t('servicesPage.edit')}
      >
        <ServiceForm
          formData={formData}
          setFormData={setFormData}
          onSave={handleUpdate}
          onCancel={() => {
            editModal.close();
            setEditingService(null);
          }}
          saveLabel={t('servicesPage.save')}
          t={t}
        />
      </Modal>

      <ConfirmationDialog
        isOpen={deleteModal.isOpen}
        onClose={() => {
          deleteModal.close();
          setServiceToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t('servicesPage.delete')}
        message={t('servicesPage.deleteConfirm')}
        confirmText={t('servicesPage.delete')}
        cancelText={t('servicesPage.cancel')}
        variant="destructive"
      />
    </div>
  );
}

function ServiceForm({
  formData,
  setFormData,
  onSave,
  onCancel,
  saveLabel,
  t,
}: {
  formData: { name: string; description: string; duration: number; price: number };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
  t: (key: string) => string;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-[var(--shop-text-primary)] mb-1">
          {t('servicesPage.name')} *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
          placeholder={t('createShop.serviceNamePlaceholder')}
          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-[var(--shop-text-primary)] placeholder:text-white/40"
          required
          maxLength={200}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--shop-text-primary)] mb-1">
          {t('servicesPage.description')}
        </label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData((d) => ({ ...d, description: e.target.value }))}
          placeholder={t('createShop.serviceDescPlaceholder')}
          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-[var(--shop-text-primary)] placeholder:text-white/40"
          maxLength={500}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--shop-text-primary)] mb-1">
            {t('servicesPage.duration')}
          </label>
          <input
            type="number"
            min={1}
            max={480}
            value={formData.duration}
            onChange={(e) => setFormData((d) => ({ ...d, duration: Number(e.target.value) || 30 }))}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-[var(--shop-text-primary)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--shop-text-primary)] mb-1">
            {t('servicesPage.price')}
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={formData.price || ''}
            onChange={(e) => setFormData((d) => ({ ...d, price: Number(e.target.value) || 0 }))}
            placeholder="0"
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-[var(--shop-text-primary)]"
          />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-white/20 text-[var(--shop-text-secondary)] hover:bg-white/5"
        >
          {t('servicesPage.cancel')}
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] font-medium"
        >
          {saveLabel}
        </button>
      </div>
    </form>
  );
}
