import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { CompanyNav } from '@/components/CompanyNav';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { api } from '@/lib/api';
import type { CompanyUsageResponse, CompanyUsageAlert, AdsUsageResponse } from '@/lib/api/companies';
import { getErrorMessage } from '@/lib/utils';
import { Container } from '@/components/design-system/Spacing/Container';

const DAYS = 30;

export function CompanyUsagePage() {
  const { user } = useAuthContext();
  const { t } = useLocale();
  const [usage, setUsage] = useState<CompanyUsageResponse | null>(null);
  const [alerts, setAlerts] = useState<CompanyUsageAlert[]>([]);
  const [adsUsage, setAdsUsage] = useState<AdsUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!user?.companyId) return;
    try {
      setLoading(true);
      setError(null);
      const [usageRes, alertsRes] = await Promise.all([
        api.getCompanyUsage(user.companyId, { days: DAYS }),
        api.getCompanyUsageAlerts(user.companyId, { resolved: 'false' }),
      ]);
      setUsage(usageRes);
      setAlerts(alertsRes.alerts);
      try {
        const adsUsageRes = await api.getAdsUsage();
        setAdsUsage(adsUsageRes);
      } catch {
        setAdsUsage(null);
      }
    } catch (err) {
      setError(getErrorMessage(err, t('company.loadError')));
    } finally {
      setLoading(false);
    }
  }, [user?.companyId, t]);

  useEffect(() => {
    if (user?.companyId) load();
  }, [user?.companyId, load]);

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
                          return (
                            <tr key={row.clientContext} className="border-b border-white/5 text-white/90">
                              <td className="py-2 pr-4">{clientContextLabel(row.clientContext)}</td>
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
                        {usage.topEndpoints.map((row) => (
                          <tr key={`${row.endpointTag}:${row.method}`} className="border-b border-white/5 text-white/90">
                            <td className="py-2 pr-4 font-mono">{row.endpointTag}</td>
                            <td className="py-2 pr-4">{row.method}</td>
                            <td className="py-2">{row.requestCount.toLocaleString()}</td>
                          </tr>
                        ))}
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
