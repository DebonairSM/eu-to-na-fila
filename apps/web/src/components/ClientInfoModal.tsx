import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useLocale } from '@/contexts/LocaleContext';
import type { ClientDetailResponse } from '@/lib/api/clients';

interface ClientInfoModalProps {
  clientId: number | null;
  onClose: () => void;
}

export function ClientInfoModal({ clientId, onClose }: ClientInfoModalProps) {
  const shopSlug = useShopSlug();
  const { t, locale } = useLocale();
  const [data, setData] = useState<ClientDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shopSlug || !clientId) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .getClient(shopSlug, clientId)
      .then((res) => setData(res))
      .catch(() => setError('Failed to load client'))
      .finally(() => setLoading(false));
  }, [shopSlug, clientId]);

  if (!clientId) return null;

  const client = data?.client;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-info-title"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--shop-surface-secondary)] border border-[var(--shop-border-color)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--shop-border-color)]">
          <h2 id="client-info-title" className="font-['Playfair_Display',serif] text-xl text-white">
            {t('analytics.clientInfo')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label={t('common.close')}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {loading && (
            <p className="text-white/70 text-sm">{t('common.loading')}</p>
          )}
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
          {client && !loading && (
            <>
              <div>
                <span className="text-xs text-white/50 uppercase tracking-wider block mb-1">{t('clients.name')}</span>
                <p className="text-white font-medium">{client.name}</p>
              </div>
              <div>
                <span className="text-xs text-white/50 uppercase tracking-wider block mb-1">{t('clients.phone')}</span>
                <p className="text-white">{client.phone}</p>
              </div>
              {client.email && (
                <div>
                  <span className="text-xs text-white/50 uppercase tracking-wider block mb-1">{t('clients.email')}</span>
                  <p className="text-white">{client.email}</p>
                </div>
              )}
              {client.address && (
                <div>
                  <span className="text-xs text-white/50 uppercase tracking-wider block mb-1">{t('clients.address')}</span>
                  <p className="text-white whitespace-pre-wrap">{client.address}</p>
                </div>
              )}
              {client.dateOfBirth && (
                <div>
                  <span className="text-xs text-white/50 uppercase tracking-wider block mb-1">{t('clients.dateOfBirth')}</span>
                  <p className="text-white">
                    {new Date(client.dateOfBirth).toLocaleDateString(locale, { dateStyle: 'medium' })}
                  </p>
                </div>
              )}
              {client.gender && (
                <div>
                  <span className="text-xs text-white/50 uppercase tracking-wider block mb-1">{t('clients.gender')}</span>
                  <p className="text-white">{client.gender}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
