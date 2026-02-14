import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/design-system/Spacing/Container';
import { RootSiteNav } from '@/components/RootSiteNav';
import { useLocale } from '@/contexts/LocaleContext';
import { LOGO_URL } from '@/lib/logo';
import { api } from '@/lib/api';
import type { ShopForAds } from '@/lib/api/propagandas';

const DURATIONS = [10, 15, 20, 30] as const;

export function PropagandasBuyPage() {
  const { t } = useLocale();
  const [shops, setShops] = useState<ShopForAds[]>([]);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [shopsError, setShopsError] = useState<string | null>(null);

  const [duration, setDuration] = useState<10 | 15 | 20 | 30>(15);
  const [shopIds, setShopIds] = useState<number[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [quote, setQuote] = useState<{ amount_cents: number; amount_display: string } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .getShopsForAds()
      .then(setShops)
      .catch(() => setShopsError(t('propagandas.errorShops')))
      .finally(() => setShopsLoading(false));
  }, [t]);

  useEffect(() => {
    setQuoteLoading(true);
    api
      .getQuote(duration, shopIds.length)
      .then(setQuote)
      .catch(() => setQuote(null))
      .finally(() => setQuoteLoading(false));
  }, [duration, shopIds.length]);

  const toggleShop = (id: number) => {
    setShopIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const selectAllShops = () => {
    if (shopIds.length === shops.length) setShopIds([]);
    else setShopIds(shops.map((s) => s.id));
  };

  const validate = (): string | null => {
    if (!DURATIONS.includes(duration)) return t('propagandas.invalidDuration');
    if (!name.trim()) return t('propagandas.invalidName');
    const emailTrim = email.trim();
    if (!emailTrim || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) return t('propagandas.invalidEmail');
    return null;
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const err = validate();
    if (err) {
      setSubmitError(err);
      return;
    }
    if (!quote || quote.amount_cents <= 0) {
      setSubmitError(t('propagandas.errorQuote'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.createCheckout({
        advertiser_name: name.trim(),
        advertiser_email: email.trim(),
        advertiser_phone: phone.trim() || undefined,
        duration_seconds: duration,
        shop_ids: shopIds,
      });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      setSubmitError(t('propagandas.errorOrder'));
    } catch (e) {
      const message = e instanceof Error ? e.message : t('propagandas.errorOrder');
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <RootSiteNav />
      <main className="py-20">
        <Container size="2xl">
          <header className="mb-12 text-center">
            <h1 className="text-4xl font-light mb-2">{t('propagandas.buyTitle')}</h1>
            <Link to="/propagandas" className="text-sm text-gray-500 hover:text-gray-400">
              {t('propagandas.backToPropagandas')}
            </Link>
          </header>

          <form onSubmit={handlePay} className="max-w-xl mx-auto space-y-8">
            {submitError && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {submitError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('propagandas.durationLabel')}
              </label>
              <div className="flex flex-wrap gap-3">
                {DURATIONS.map((d) => (
                  <label
                    key={d}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      duration === d
                        ? 'border-white/40 bg-white/10'
                        : 'border-white/20 hover:border-white/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="duration"
                      value={d}
                      checked={duration === d}
                      onChange={() => setDuration(d)}
                      className="sr-only"
                    />
                    <span>{d}s</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('propagandas.barbershopsLabel')}
              </label>
              {shopsLoading && <p className="text-gray-500 text-sm">{t('common.loading')}</p>}
              {shopsError && <p className="text-red-400 text-sm">{shopsError}</p>}
              {!shopsLoading && !shopsError && shops.length === 0 && (
                <p className="text-gray-500 text-sm">{t('propagandas.barbershopsEmpty')}</p>
              )}
              {!shopsLoading && shops.length > 0 && (
                <div className="space-y-2 border border-white/10 rounded-lg p-4 bg-white/5">
                  <button
                    type="button"
                    onClick={selectAllShops}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    {shopIds.length === shops.length
                      ? t('propagandas.barbershopsAll')
                      : t('propagandas.barbershopsAll')}
                  </button>
                  <div className="flex flex-wrap gap-2">
                    {shops.map((s) => (
                      <label
                        key={s.id}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                          shopIds.includes(s.id)
                            ? 'border-white/40 bg-white/10'
                            : 'border-white/20 hover:border-white/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={shopIds.includes(s.id)}
                          onChange={() => toggleShop(s.id)}
                          className="sr-only"
                        />
                        {s.name}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {shopIds.length === 0
                      ? t('propagandas.barbershopsAll')
                      : `${shopIds.length} ${t('propagandas.barbershopsLabel').toLowerCase()}`}
                  </p>
                </div>
              )}
            </div>

            <div>
              <h3 className="block text-sm font-medium text-gray-300 mb-3">
                {t('propagandas.accountLabel')}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('propagandas.nameLabel')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('propagandas.namePlaceholder')}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-gray-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('propagandas.emailLabel')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('propagandas.emailPlaceholder')}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-gray-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('propagandas.phoneLabel')}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('propagandas.phonePlaceholder')}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-gray-500 text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">{t('propagandas.paymentNote')}</p>
            </div>

            <div className="border border-white/10 rounded-lg p-4 bg-white/5">
              <p className="text-sm text-gray-400 mb-1">{t('propagandas.total')}</p>
              <p className="text-2xl font-medium text-white">
                {quoteLoading ? t('common.loading') : quote ? quote.amount_display : '—'}
              </p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting || shopsLoading || shops.length === 0 || quoteLoading || !quote || quote.amount_cents <= 0}
                className="w-full px-6 py-3.5 bg-white text-[#0a0a0a] font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
              >
                {submitting ? t('propagandas.submitting') : t('propagandas.payNow').replace('{amount}', quote?.amount_display ?? '—')}
              </button>
            </div>
          </form>
        </Container>
      </main>

      <footer className="border-t border-white/5 bg-black py-12 mt-24">
        <Container size="2xl">
          <div className="flex items-center justify-center gap-3">
            <img src={LOGO_URL} alt="EuTô NaFila" className="h-8 w-auto opacity-60" />
            <Link to="/propagandas" className="text-sm text-gray-500 hover:text-white">
              {t('root.propagandas')}
            </Link>
          </div>
        </Container>
      </footer>
    </div>
  );
}
