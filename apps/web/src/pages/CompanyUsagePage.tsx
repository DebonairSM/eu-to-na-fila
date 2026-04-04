import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { CompanyNav } from '@/components/CompanyNav';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { api } from '@/lib/api';
import type { CompanyUsageResponse, CompanyUsageAlert, AdsUsageResponse } from '@/lib/api/companies';
import { getErrorMessage } from '@/lib/utils';
import { Container } from '@/components/design-system/Spacing/Container';

type Preset = '7' | '30' | '90' | 'custom';

export function CompanyUsagePage() {
  const { user } = useAuthContext();
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const [usage, setUsage] = useState<CompanyUsageResponse | null>(null);
  const [alerts, setAlerts] = useState<CompanyUsageAlert[]>([]);
  const [adsUsage, setAdsUsage] = useState<AdsUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [shopOptions, setShopOptions] = useState<Array<{ id: number; name: string; slug: string }>>([]);
  const [selectedShopId, setSelectedShopId] = useState<'all' | number>('all');
  const [preset, setPreset] = useState<Preset>('30');
  const [customSince, setCustomSince] = useState('');
  const [customUntil, setCustomUntil] = useState('');
  const loadSeqRef = useRef(0);
  const [queryReady, setQueryReady] = useState(false);

  useEffect(() => {
    const shopIdRaw = searchParams.get('shopId');
    if (shopIdRaw) {
      const parsed = Number(shopIdRaw);
      if (Number.isFinite(parsed) && parsed > 0) setSelectedShopId(parsed);
    } else {
      setSelectedShopId('all');
    }

    const sinceRaw = searchParams.get('since');
    const untilRaw = searchParams.get('until');
    const daysRaw = searchParams.get('days');

    if (sinceRaw && untilRaw) {
      setPreset('custom');
      setCustomSince(sinceRaw.slice(0, 10));
      setCustomUntil(untilRaw.slice(0, 10));
    } else if (daysRaw === '7' || daysRaw === '30' || daysRaw === '90') {
      setPreset(daysRaw);
      setCustomSince('');
      setCustomUntil('');
    }
    setQueryReady(true);
  }, [searchParams]);

  const usageParams = useMemo(() => {
    if (preset === 'custom' && customSince && customUntil) {
      return {
        since: new Date(`${customSince}T00:00:00.000Z`).toISOString(),
        until: new Date(`${customUntil}T23:59:59.999Z`).toISOString(),
      };
    }
    return { days: Number(preset) };
  }, [preset, customSince, customUntil]);

  const load = useCallback(async () => {
    if (!user?.companyId) return;
    if (preset === 'custom' && (!customSince || !customUntil)) return;
    const requestId = ++loadSeqRef.current;
    try {
      setLoading(true);
      setError(null);
      const usageQuery: { days?: number; since?: string; until?: string; shopId?: number } = {
        ...usageParams,
      };
      if (selectedShopId !== 'all') usageQuery.shopId = selectedShopId;
      const [usageRes, alertsRes] = await Promise.all([
        api.getCompanyUsage(user.companyId, usageQuery),
        api.getCompanyUsageAlerts(user.companyId, { resolved: 'false' }),
      ]);
      if (requestId !== loadSeqRef.current) return;
      setUsage(usageRes);
      setAlerts(alertsRes.alerts);
      try {
        const adsUsageRes = await api.getAdsUsage();
        if (requestId !== loadSeqRef.current) return;
        setAdsUsage(adsUsageRes);
      } catch {
        if (requestId !== loadSeqRef.current) return;
        setAdsUsage(null);
      }
    } catch (err) {
      if (requestId !== loadSeqRef.current) return;
      setError(getErrorMessage(err, t('company.loadError')));
    } finally {
      if (requestId === loadSeqRef.current) setLoading(false);
    }
  }, [user?.companyId, t, usageParams, selectedShopId, preset, customSince, customUntil]);

  useEffect(() => {
    if (!user?.companyId) return;
    api.getCompanyShops(user.companyId)
      .then((shops) => setShopOptions(shops.map((s) => ({ id: s.id, name: s.name, slug: s.slug }))))
      .catch(() => setShopOptions([]));
  }, [user?.companyId]);

  useEffect(() => {
    if (!user?.companyId || !queryReady) return;
    const timeout = window.setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(timeout);
  }, [user?.companyId, load, queryReady]);

  const handleResolve = async (alertId: number) => {
    if (!user?.companyId) return;
    try {
      setResolvingId(alertId);
      await api.resolveUsageAlert(user.companyId, alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } finally {
      setResolvingId(null);
    }
  };

  const totalRequests7d =
    usage?.timeSeries?.slice(-7).reduce((sum, d) => sum + d.requestCount, 0) ?? 0;
  const totalRequests30d = usage?.totalRequests ?? 0;
  const shopsWithTraffic = usage?.perShop?.length ?? 0;
  const maxInChart = Math.max(
    1,
    ...(usage?.timeSeries?.map((d) => d.requestCount) ?? [])
  );
  const formatBytes = (bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };
  const clientContextLabel = (context: string): string => {
    const key =
      context === 'web' || context === 'kiosk' || context === 'company_admin' || context === 'unknown'
        ? context
        : 'unknown';
    return t(`company.clientContext.${key}`);
  };
  const graphQueryBase = useMemo(() => {
    const p = new URLSearchParams();
    if (selectedShopId !== 'all') p.set('shopId', String(selectedShopId));
    if ('days' in usageParams) p.set('days', String(usageParams.days));
    if ('since' in usageParams && usageParams.since) p.set('since', usageParams.since);
    if ('until' in usageParams && usageParams.until) p.set('until', usageParams.until);
    return p;
  }, [selectedShopId, usageParams]);

  return (
    <div className="min-h-screen h-full bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <CompanyNav />
      <main className="relative z-10 pt-20 sm:pt-24 pb-12 sm:pb-16 lg:pb-20">
        <Container size="2xl">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-white">
                {t('company.usageTitle')}
              </h1>
              <p className="text-white/70 text-base sm:text-lg mt-1">
                {t('company.usageSubtitle')}
              </p>
            </div>
            <Link
              to="/company/dashboard"
              className="text-[#D4AF37] hover:text-[#D4AF37]/90 text-sm font-medium flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              {t('company.backToDashboard')}
            </Link>
          </div>

          {loading && (
            <div className="text-center py-12">
              <LoadingSpinner text={t('company.loading')} />
            </div>
          )}

          {error && (
            <ErrorDisplay error={error} onRetry={load} className="mb-6" />
          )}

          {!loading && !error && usage && (
            <>
              <section className="border border-white/10 bg-white/5 rounded-xl p-4 sm:p-6 mb-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm text-white/70 mb-2">{t('company.timeSpan')}</p>
                    <div className="flex flex-wrap gap-2">
                      {(['7', '30', '90', 'custom'] as Preset[]).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setPreset(opt)}
                          className={`px-3 py-1.5 rounded border text-sm transition ${
                            preset === opt
                              ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10'
                              : 'border-white/20 text-white/80 hover:bg-white/10'
                          }`}
                        >
                          {opt === 'custom' ? t('company.customRange') : t(`company.timeSpan${opt}d`)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="min-w-[220px]">
                    <label className="text-sm text-white/70 mb-2 block">{t('company.scopeShop')}</label>
                    <select
                      value={selectedShopId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSelectedShopId(v === 'all' ? 'all' : Number(v));
                      }}
                      className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
                    >
                      <option value="all">{t('company.scopeAllShops')}</option>
                      {shopOptions.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.slug})</option>
                      ))}
                    </select>
                  </div>
                </div>
                {preset === 'custom' && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="text-sm text-white/80">
                      {t('company.since')}
                      <input
                        type="date"
                        value={customSince}
                        onChange={(e) => setCustomSince(e.target.value)}
                        className="mt-1 w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
                      />
                    </label>
                    <label className="text-sm text-white/80">
                      {t('company.until')}
                      <input
                        type="date"
                        value={customUntil}
                        onChange={(e) => setCustomUntil(e.target.value)}
                        className="mt-1 w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
                      />
                    </label>
                  </div>
                )}
              </section>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="border border-white/10 bg-white/5 rounded-xl p-6">
                  <div className="text-3xl text-[#D4AF37] mb-2">
                    <span className="material-symbols-outlined">trending_up</span>
                  </div>
                  <div className="text-2xl font-semibold text-white mb-1">
                    {totalRequests7d.toLocaleString()}
                  </div>
                  <div className="text-sm text-white/60">
                    {t('company.totalRequests7d')}
                  </div>
                </div>
                <div className="border border-white/10 bg-white/5 rounded-xl p-6">
                  <div className="text-3xl text-[#D4AF37] mb-2">
                    <span className="material-symbols-outlined">bar_chart</span>
                  </div>
                  <div className="text-2xl font-semibold text-white mb-1">
                    {totalRequests30d.toLocaleString()}
                  </div>
                  <div className="text-sm text-white/60">
                    {t('company.totalRequests30d')}
                  </div>
                </div>
                <div className="border border-white/10 bg-white/5 rounded-xl p-6">
                  <div className="text-3xl text-[#D4AF37] mb-2">
                    <span className="material-symbols-outlined">store</span>
                  </div>
                  <div className="text-2xl font-semibold text-white mb-1">
                    {shopsWithTraffic}
                  </div>
                  <div className="text-sm text-white/60">
                    {t('company.shopsWithTraffic')}
                  </div>
                </div>
              </div>

              <section className="border border-white/10 bg-white/5 rounded-xl p-6 mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">
                  {t('company.trafficBySource')}
                </h2>
                {usage.byClientContext && usage.byClientContext.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-white/70 border-b border-white/10">
                          <th className="py-2 pr-4">{t('company.source')}</th>
                          <th className="py-2 pr-4">{t('company.requestCount')}</th>
                          <th className="py-2">{t('company.share')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usage.byClientContext.map((row) => {
                          const share = totalRequests30d > 0
                            ? `${((row.requestCount / totalRequests30d) * 100).toFixed(1)}%`
                            : '—';
                          const query = new URLSearchParams(graphQueryBase);
                          query.set('group', 'source');
                          query.set('clientContext', row.clientContext);
                          return (
                            <tr key={row.clientContext} className="border-b border-white/5 text-white/90">
                              <td className="py-2 pr-4">
                                <Link
                                  to={`/company/usage/graph?${query.toString()}`}
                                  className="text-[#D4AF37] hover:text-[#e5c35a] transition-colors"
                                >
                                  {clientContextLabel(row.clientContext)}
                                </Link>
                              </td>
                              <td className="py-2 pr-4">{row.requestCount.toLocaleString()}</td>
                              <td className="py-2">{share}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-white/60">{t('company.usageNoClientContextData')}</p>
                )}
              </section>

              <section className="border border-white/10 bg-white/5 rounded-xl p-6 mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">
                  {t('company.topApiGroups')}
                </h2>
                {usage.topEndpoints && usage.topEndpoints.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-white/70 border-b border-white/10">
                          <th className="py-2 pr-4">{t('company.endpointGroup')}</th>
                          <th className="py-2 pr-4">{t('company.method')}</th>
                          <th className="py-2">{t('company.requestCount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usage.topEndpoints.map((row) => {
                          const query = new URLSearchParams(graphQueryBase);
                          query.set('group', 'endpoint');
                          query.set('endpointTag', row.endpointTag);
                          query.set('method', row.method);
                          return (
                            <tr key={`${row.endpointTag}:${row.method}`} className="border-b border-white/5 text-white/90">
                              <td className="py-2 pr-4 font-mono">
                                <Link
                                  to={`/company/usage/graph?${query.toString()}`}
                                  className="text-[#D4AF37] hover:text-[#e5c35a] transition-colors"
                                >
                                  {row.endpointTag}
                                </Link>
                              </td>
                              <td className="py-2 pr-4">{row.method}</td>
                              <td className="py-2">{row.requestCount.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-white/60">{t('company.usageNoEndpointData')}</p>
                )}
              </section>

              {usage.timeSeries && usage.timeSeries.length > 0 && (
                <section className="border border-white/10 bg-white/5 rounded-xl p-6 mb-8">
                  <h2 className="text-lg font-semibold text-white mb-4">
                    {t('company.requestsOverTime')}
                  </h2>
                  <div
                    className="flex items-end gap-1 sm:gap-2 overflow-x-auto py-4"
                    style={{ minHeight: '180px' }}
                  >
                    {usage.timeSeries.map((d) => (
                      <div
                        key={d.date}
                        className="flex flex-col items-center flex-shrink-0 min-w-[28px] sm:min-w-[36px]"
                      >
                        <div
                          className="w-4 sm:w-6 rounded-t bg-[#D4AF37]/70 hover:bg-[#D4AF37] transition-colors"
                          style={{
                            height: `${Math.max(4, (d.requestCount / maxInChart) * 140)}px`,
                          }}
                          title={`${d.date}: ${d.requestCount}`}
                        />
                        <span className="text-[10px] sm:text-xs text-white/60 mt-1 truncate max-w-full">
                          {d.date.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="border border-white/10 bg-white/5 rounded-xl p-6 mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">
                  {t('company.perShopUsage')}
                </h2>
                {usage.perShop && usage.perShop.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-white/70 border-b border-white/10">
                          <th className="py-3 pr-4">{t('company.shopName')}</th>
                          <th className="py-3 pr-4">{t('company.shopSlug')}</th>
                          <th className="py-3">{t('company.requestCount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usage.perShop.map((shop) => (
                          <tr
                            key={shop.shopId}
                            className="border-b border-white/5 text-white/90"
                          >
                            <td className="py-3 pr-4">{shop.shopName}</td>
                            <td className="py-3 pr-4 font-mono text-white/70">
                              {shop.shopSlug}
                            </td>
                            <td className="py-3">
                              {shop.requestCount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-white/60">{t('company.noShopsWithTraffic')}</p>
                )}
              </section>

              {adsUsage && (
                <section className="border border-white/10 bg-white/5 rounded-xl p-6 mb-8">
                  <h2 className="text-lg font-semibold text-white mb-4">
                    Ad/media usage
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/60 mb-1">Ad media estimated bytes</div>
                      <div className="text-xl font-semibold text-white">{formatBytes(adsUsage.adMedia.estimatedBytes)}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/60 mb-1">Redirect ratio</div>
                      <div className="text-xl font-semibold text-white">
                        {adsUsage.adMedia.requests > 0
                          ? `${Math.round((adsUsage.adMedia.redirects / adsUsage.adMedia.requests) * 100)}%`
                          : '0%'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/60 mb-1">Upload mix (video/image)</div>
                      <div className="text-xl font-semibold text-white">
                        {adsUsage.uploads.videoCount}/{adsUsage.uploads.imageCount}
                      </div>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-white/90 mb-2">Top ad byte contributors</h3>
                  {adsUsage.topAds.length > 0 ? (
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-white/70 border-b border-white/10">
                            <th className="py-2 pr-4">Ad</th>
                            <th className="py-2 pr-4">Requests</th>
                            <th className="py-2 pr-4">Redirects</th>
                            <th className="py-2 pr-4">Estimated bytes</th>
                            <th className="py-2">Last seen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adsUsage.topAds.slice(0, 10).map((ad) => (
                            <tr key={ad.adId} className="border-b border-white/5 text-white/90">
                              <td className="py-2 pr-4 font-mono">#{ad.adId}</td>
                              <td className="py-2 pr-4">{ad.requests.toLocaleString()}</td>
                              <td className="py-2 pr-4">{ad.redirects.toLocaleString()}</td>
                              <td className="py-2 pr-4">{formatBytes(ad.estimatedBytes)}</td>
                              <td className="py-2">{new Date(ad.lastSeenAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-white/60 text-sm mb-4">No ad media traffic captured yet.</p>
                  )}
                </section>
              )}

              <section className="border border-white/10 bg-white/5 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                  {t('company.alerts')}
                </h2>
                {alerts.length > 0 ? (
                  <ul className="space-y-3">
                    {alerts.map((alert) => (
                      <li
                        key={alert.id}
                        className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4"
                      >
                        <span className="material-symbols-outlined text-amber-400">
                          warning
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-white">
                            {alert.shopName ?? alert.shopSlug ?? `Shop #${alert.shopId}`}
                          </span>
                          <span className="text-white/70 ml-2">
                            {new Date(alert.triggeredAt).toLocaleString()} –{' '}
                            {t('company.alertSpike')} ({alert.requestCount} vs{' '}
                            {alert.baselineCount} {t('company.baseline')})
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={resolvingId === alert.id}
                          onClick={() => handleResolve(alert.id)}
                          className="px-3 py-1.5 rounded border border-white/20 text-sm text-white/90 hover:bg-white/10 disabled:opacity-50"
                        >
                          {resolvingId === alert.id
                            ? t('company.resolving')
                            : t('company.markResolved')}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-white/60 flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400">
                      check_circle
                    </span>
                    {t('company.noAlerts')}
                  </p>
                )}
              </section>
            </>
          )}
        </Container>
      </main>
    </div>
  );
}
