import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useLocale } from '@/contexts/LocaleContext';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { formatNameForDisplay } from '@/lib/utils';
import { getErrorMessage } from '@/lib/utils';
import type { ClientListItem } from '@/lib/api/clients';

export function ClientSearchPage() {
  const navigate = useNavigate();
  const shopSlug = useShopSlug();
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async () => {
    if (!shopSlug) return;
    const q = query.trim();
    if (!q) {
      setClients([]);
      setSearched(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await api.searchClients(shopSlug, q);
      setClients(res.clients);
    } catch (err) {
      setError(getErrorMessage(err, t('clients.searchError')));
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [shopSlug, query, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch();
  };

  return (
    <div className="min-h-screen bg-[var(--shop-background)] text-[var(--shop-text-primary)]">
      <Navigation />
      <main className="container max-w-2xl mx-auto pt-24 px-4 pb-20">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 -ml-2 text-[var(--shop-text-secondary)] hover:text-white"
        >
          <span className="material-symbols-outlined mr-1 align-middle">arrow_back</span>
          {t('common.back')}
        </Button>

        <h1 className="font-['Playfair_Display',serif] text-2xl font-semibold text-[var(--shop-accent)] mb-2">
          {t('clients.title')}
        </h1>
        <p className="text-[var(--shop-text-secondary)] text-sm mb-6">
          {t('clients.searchHint')}
        </p>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('clients.searchPlaceholder')}
            className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-[color-mix(in_srgb,var(--shop-surface-secondary)_80%,transparent)] border border-[color-mix(in_srgb,var(--shop-accent)_25%,transparent)] text-[var(--shop-text-primary)] placeholder:text-[var(--shop-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)]"
            aria-label={t('clients.searchPlaceholder')}
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-3 rounded-xl bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? t('clients.searching') : t('clients.search')}
          </Button>
        </form>

        {error && (
          <p className="text-red-400 text-sm mb-4" role="alert">
            {error}
          </p>
        )}

        {loading && (
          <p className="text-[var(--shop-text-secondary)] text-sm">{t('clients.searching')}</p>
        )}

        {!loading && searched && clients.length === 0 && (
          <p className="text-[var(--shop-text-secondary)] italic">{t('clients.noResults')}</p>
        )}

        {!loading && clients.length > 0 && (
          <ul className="space-y-2" role="list">
            {clients.map((client) => (
              <li key={client.id}>
                <Link
                  to={`/clients/${client.id}`}
                  className="block rounded-xl p-4 bg-[color-mix(in_srgb,var(--shop-surface-secondary)_90%,transparent)] border border-[color-mix(in_srgb,var(--shop-accent)_25%,transparent)] hover:border-[var(--shop-accent)] transition-colors"
                >
                  <span className="font-medium text-[var(--shop-text-primary)]">
                    {formatNameForDisplay(client.name)}
                  </span>
                  <span className="block text-sm text-[var(--shop-text-secondary)] mt-0.5">
                    {client.phone}
                    {client.email ? ` · ${client.email}` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!searched && !loading && (
          <p className="text-[var(--shop-text-secondary)] text-sm">
            {t('clients.enterQuery')}
          </p>
        )}
      </main>
    </div>
  );
}
