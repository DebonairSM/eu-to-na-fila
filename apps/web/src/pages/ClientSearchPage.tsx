import { useState, useCallback, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useLocale } from '@/contexts/LocaleContext';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { formatNameForDisplay } from '@/lib/utils';
import { getErrorMessage } from '@/lib/utils';
import type { ClientListItem } from '@/lib/api/clients';

function ageFromDateOfBirth(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function ClientSearchPage() {
  const navigate = useNavigate();
  const shopSlug = useShopSlug();
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const [allClients, setAllClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllClients = useCallback(async () => {
    if (!shopSlug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.searchClients(shopSlug, '');
      setAllClients(res.clients ?? []);
    } catch (err) {
      setError(getErrorMessage(err, t('clients.searchError')));
      setAllClients([]);
    } finally {
      setLoading(false);
    }
  }, [shopSlug, t]);

  useEffect(() => {
    loadAllClients();
  }, [loadAllClients]);

  const filteredClients = useMemo(() => {
    const q = query.trim();
    if (!q) return allClients;
    const normalizedQuery = normalizeForMatch(q);
    const terms = normalizedQuery.split(/\s+/).filter(Boolean);
    return allClients.filter((client) => {
      const name = normalizeForMatch(client.name);
      const phone = (client.phone ?? '').replace(/\D/g, '');
      const queryDigits = normalizedQuery.replace(/\D/g, '');
      const nameMatch = terms.every((term) => name.includes(term));
      const phoneMatch = queryDigits.length >= 3 && phone.includes(queryDigits);
      return nameMatch || phoneMatch;
    });
  }, [allClients, query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
        </form>

        {error && (
          <p className="text-red-400 text-sm mb-4" role="alert">
            {error}
          </p>
        )}

        {loading && (
          <p className="text-[var(--shop-text-secondary)] text-sm">{t('clients.searching')}</p>
        )}

        {!loading && query.trim() && filteredClients.length === 0 && (
          <p className="text-[var(--shop-text-secondary)] italic">{t('clients.noResults')}</p>
        )}

        {!loading && filteredClients.length > 0 && (
          <ul className="space-y-2" role="list">
            {filteredClients.map((client) => {
              const age = ageFromDateOfBirth(client.dateOfBirth);
              const genderLabel = client.gender === 'male' ? t('account.genderMale') : client.gender === 'female' ? t('account.genderFemale') : client.gender || null;
              const hasFullInfo = client.phone != null || client.email != null;
              const limitedMeta = [
                genderLabel,
                age != null ? `${age} ${t('clients.yearsOld')}` : null,
              ].filter(Boolean).join(' · ');
              return (
                <li key={client.id}>
                  <Link
                    to={`/clients/${client.id}`}
                    className="block rounded-xl p-4 bg-[color-mix(in_srgb,var(--shop-surface-secondary)_90%,transparent)] border border-[color-mix(in_srgb,var(--shop-accent)_25%,transparent)] hover:border-[var(--shop-accent)] transition-colors"
                  >
                    <span className="font-medium text-[var(--shop-text-primary)]">
                      {formatNameForDisplay(client.name)}
                    </span>
                    <span className="block text-sm text-[var(--shop-text-secondary)] mt-0.5">
                      {hasFullInfo ? `${client.phone ?? ''}${client.email ? ` · ${client.email}` : ''}` : limitedMeta || '—'}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
