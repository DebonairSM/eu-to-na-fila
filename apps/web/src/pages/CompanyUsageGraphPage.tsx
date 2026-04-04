import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { CompanyNav } from '@/components/CompanyNav';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { api } from '@/lib/api';
import type { CompanyUsageDrilldownResponse } from '@/lib/api/companies';
import { getErrorMessage } from '@/lib/utils';
import { Container } from '@/components/design-system/Spacing/Container';

export function CompanyUsageGraphPage() {
  const { user } = useAuthContext();
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<CompanyUsageDrilldownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);

  const params = useMemo(() => {
    const daysRaw = searchParams.get('days');
    const limitRaw = searchParams.get('limit');
    return {
      days: daysRaw ? Number(daysRaw) : undefined,
      since: searchParams.get('since') ?? undefined,
      until: searchParams.get('until') ?? undefined,
      shopId: searchParams.get('shopId') ? Number(searchParams.get('shopId')) : undefined,
      group: (searchParams.get('group') as 'endpoint' | 'source' | null) ?? undefined,
      endpointTag: searchParams.get('endpointTag') ?? undefined,
      method: searchParams.get('method') ?? undefined,
      clientContext: (searchParams.get('clientContext') as 'web' | 'kiosk' | 'company_admin' | 'unknown' | null) ?? undefined,
      limit: limitRaw ? Number(limitRaw) : undefined,
    };
  }, [searchParams]);
  const backToUsageQuery = useMemo(() => {
    const q = new URLSearchParams();
    if (params.days != null) q.set('days', String(params.days));
    if (params.since) q.set('since', params.since);
    if (params.until) q.set('until', params.until);
    if (params.shopId != null) q.set('shopId', String(params.shopId));
    return q.toString();
  }, [params.days, params.since, params.until, params.shopId]);

  const clientContextLabel = (context: string | null): string => {
    if (!context) return '-';
    const key =
      context === 'web' || context === 'kiosk' || context === 'company_admin' || context === 'unknown'
        ? context
        : 'unknown';
    return t(`company.clientContext.${key}`);
  };

  useEffect(() => {
    if (!user?.companyId) return;
    let cancelled = false;
    setLoading(true);
    setEntered(false);
    setError(null);
    api.getCompanyUsageDrilldown(user.companyId, params)
      .then((res: CompanyUsageDrilldownResponse) => {
        if (cancelled) return;
        // #region agent log
        fetch('http://127.0.0.1:7715/ingest/c5f9b148-dd94-43ba-849b-22997c31e044',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1b841d'},body:JSON.stringify({sessionId:'1b841d',runId:'usage-drilldown-run',hypothesisId:'H6',location:'CompanyUsageGraphPage.tsx:drilldown:success',message:'graph page received drilldown payload',data:{group:res.group,scopeShopId:res.scope.shopId??null,filterClientContext:res.filters.clientContext??null,nodes:res.nodes.length,edges:res.edges.length,shopNodes:res.nodes.filter((n)=>n.type==='shop').length,detailNodes:res.nodes.filter((n)=>n.type==='detail').length,params},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        setData(res);
        setTimeout(() => setEntered(true), 30);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(getErrorMessage(err, t('company.loadError')));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.companyId, params, t]);

  const root = data?.nodes.find((n) => n.type === 'root');
  const shops = data?.nodes.filter((n) => n.type === 'shop') ?? [];
  const detailByParent = new Map<string, Array<{ id: string; label: string; requestCount: number; parentId: string | null }>>();
  (data?.nodes.filter((n) => n.type === 'detail') ?? []).forEach((n) => {
    if (!n.parentId) return;
    const list = detailByParent.get(n.parentId) ?? [];
    list.push(n);
    detailByParent.set(n.parentId, list);
  });
  useEffect(() => {
    if (loading || error || !data) return;
    if (shops.length > 0) return;
    // #region agent log
    fetch('http://127.0.0.1:7715/ingest/c5f9b148-dd94-43ba-849b-22997c31e044',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1b841d'},body:JSON.stringify({sessionId:'1b841d',runId:'usage-drilldown-run',hypothesisId:'H8',location:'CompanyUsageGraphPage.tsx:render:noShops',message:'graph rendered with zero shop nodes',data:{group:data.group,filters:data.filters,nodeCount:data.nodes.length,edgeCount:data.edges.length,scope:data.scope},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [loading, error, data, shops.length]);

  return (
    <div className="min-h-screen h-full bg-gradient-to-b from-[#060d1f] via-[#0a1730] to-[#0f2345] text-white">
      <CompanyNav />
      <main className="relative z-10 pt-20 sm:pt-24 pb-12 sm:pb-16 lg:pb-20">
        <Container size="2xl">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-white">{t('company.usageGraphTitle')}</h1>
              <p className="text-white/70 text-base sm:text-lg mt-1">{t('company.usageGraphSubtitle')}</p>
            </div>
            <Link to={`/company/usage${backToUsageQuery ? `?${backToUsageQuery}` : ''}`} className="text-[#D4AF37] hover:text-[#D4AF37]/90 text-sm font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              {t('company.backToUsage')}
            </Link>
          </div>

          {loading && <div className="text-center py-12"><LoadingSpinner text={t('company.loading')} /></div>}
          {error && <ErrorDisplay error={error} />}

          {!loading && !error && data && root && (
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-7 backdrop-blur-sm">
              <div className={`transition-all duration-500 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                <div className="text-xs uppercase tracking-[0.2em] text-white/60 mb-2">{t('company.graphRoot')}</div>
                <div className="rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-4 sm:p-5">
                  <div className="text-lg sm:text-xl font-semibold">{root.label}</div>
                  <div className="text-sm text-white/70 mt-1">{root.requestCount.toLocaleString()} {t('company.requestCount')}</div>
                  {data.group === 'source' && data.filters.clientContext && (
                    <div className="text-xs text-white/60 mt-2">
                      {t('company.source')}: {clientContextLabel(data.filters.clientContext)}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {shops.map((shop, shopIdx) => (
                  <div
                    key={shop.id}
                    style={{ transitionDelay: `${Math.min(shopIdx * 60, 300)}ms` }}
                    className={`rounded-xl border border-white/15 bg-white/[0.04] p-4 transition-all duration-500 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-medium text-white">{shop.label}</div>
                      <div className="text-sm text-[#D4AF37]">{shop.requestCount.toLocaleString()}</div>
                    </div>
                    <div className="mt-3 border-t border-white/10 pt-3 space-y-2">
                      {(detailByParent.get(shop.id) ?? []).slice(0, 12).map((d, i) => (
                        <div
                          key={d.id}
                          style={{ transitionDelay: `${Math.min(shopIdx * 60 + i * 40, 520)}ms` }}
                          className={`flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2 transition-all duration-500 ${entered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-3'}`}
                        >
                          <span className="text-sm text-white/85">{d.label}</span>
                          <span className="text-xs text-white/60">{d.requestCount.toLocaleString()}</span>
                        </div>
                      ))}
                      {(detailByParent.get(shop.id)?.length ?? 0) > 12 && (
                        <div className="text-xs text-white/60">
                          +{(detailByParent.get(shop.id)?.length ?? 0) - 12} {t('company.moreNodes')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </Container>
      </main>
    </div>
  );
}
