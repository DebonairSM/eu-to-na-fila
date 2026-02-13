import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Container, Heading, Text, Card, CardContent } from '@/components/design-system';
import { useLocale } from '@/contexts/LocaleContext';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { CustomerProfile, CustomerAppointmentsResponse } from '@/lib/api/auth';
import { cn } from '@/lib/utils';

function formatDate(iso: string | null): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CustomerAccountPage() {
  const shopSlug = useShopSlug();
  const { user, isCustomer } = useAuthContext();
  const { t } = useLocale();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [appointments, setAppointments] = useState<CustomerAppointmentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCustomer || !shopSlug) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([
      api.getCustomerProfile(shopSlug),
      api.getCustomerAppointments(shopSlug),
    ])
      .then(([p, a]) => {
        if (mounted) {
          setProfile(p);
          setAppointments(a);
        }
      })
      .catch(() => {
        if (mounted) setError(t('common.error'));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [isCustomer, shopSlug, t]);

  if (!isCustomer) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navigation />
        <Container className="pt-20 md:pt-28 lg:pt-32 pb-10">
          <div className="max-w-2xl mx-auto text-center">
            <Text variant="secondary">{t('auth.fillAllFields')}</Text>
            <Link to="/shop/login" className="text-[var(--shop-accent)] hover:underline mt-4 inline-block">
              {t('nav.login')}
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />
      <Container className="pt-20 md:pt-28 lg:pt-32 pb-10">
        <div className="max-w-2xl mx-auto space-y-8">
          <Heading level={1}>{t('account.title')}</Heading>

          {loading ? (
            <Text variant="secondary">{t('common.loading')}</Text>
          ) : error ? (
            <Text variant="secondary">{error}</Text>
          ) : (
            <>
              <Card variant="default" className="shadow-lg">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--shop-accent)]">person</span>
                    {t('account.profile')}
                  </h2>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-[var(--shop-text-secondary)]">{t('account.name')}</dt>
                      <dd className="font-medium">{profile?.name ?? user?.name ?? '–'}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--shop-text-secondary)]">{t('account.email')}</dt>
                      <dd className="font-medium">{profile?.email ?? user?.username ?? '–'}</dd>
                    </div>
                    {profile?.phone && (
                      <div>
                        <dt className="text-[var(--shop-text-secondary)]">{t('account.phone')}</dt>
                        <dd className="font-medium">{profile.phone}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>

              <Card variant="default" className="shadow-lg">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--shop-accent)]">event</span>
                    {t('account.appointments')}
                  </h2>
                  {appointments?.upcoming && appointments.upcoming.length > 0 ? (
                    <ul className="space-y-3">
                      {appointments.upcoming.map((a) => (
                        <li
                          key={a.id}
                          className={cn(
                            'flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg',
                            'bg-white/5 border border-white/10'
                          )}
                        >
                          <div>
                            <p className="font-medium">{a.serviceName ?? t('join.serviceLabel')}</p>
                            <p className="text-sm text-[var(--shop-text-secondary)]">
                              {a.type === 'appointment' && a.scheduledTime
                                ? formatDate(a.scheduledTime)
                                : a.status === 'waiting' || a.status === 'in_progress'
                                  ? `#${a.position} · ${a.estimatedWaitTime ?? '–'} ${t('status.minutes')}`
                                  : a.ticketNumber ?? `#${a.id}`}
                            </p>
                          </div>
                          <Link
                            to={`/status/${a.id}`}
                            className="text-sm font-medium px-3 py-2 rounded-lg bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] hover:opacity-90"
                          >
                            {a.status === 'pending' ? t('account.checkIn') : t('account.viewStatus')}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Text variant="secondary">{t('account.noUpcoming')}</Text>
                  )}
                  <Link
                    to="/join"
                    className="inline-flex items-center gap-2 mt-4 text-[var(--shop-accent)] hover:underline"
                  >
                    {t('nav.ctaJoin')}
                  </Link>
                  <span className="mx-2">·</span>
                  <Link
                    to="/schedule"
                    className="inline-flex items-center gap-2 text-[var(--shop-accent)] hover:underline"
                  >
                    {t('checkin.backToSchedule')}
                  </Link>
                </CardContent>
              </Card>

              <Card variant="default" className="shadow-lg">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--shop-accent)]">history</span>
                    {t('account.history')}
                  </h2>
                  {appointments?.past && appointments.past.length > 0 ? (
                    <ul className="space-y-2">
                      {appointments.past.slice(0, 10).map((a) => (
                        <li
                          key={a.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-white/10 last:border-0 text-sm"
                        >
                          <div>
                            <span className="font-medium">{a.serviceName ?? '–'}</span>
                            {a.barberName && (
                              <span className="text-[var(--shop-text-secondary)] ml-2">
                                {a.barberName}
                              </span>
                            )}
                          </div>
                          <span className="text-[var(--shop-text-secondary)]">
                            {a.completedAt ? formatDate(a.completedAt) : formatDate(a.createdAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Text variant="secondary">{t('account.noHistory')}</Text>
                  )}
                </CardContent>
              </Card>

              <Card variant="default" className="shadow-lg">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--shop-accent)]">tune</span>
                    {t('account.preferences')}
                  </h2>
                  <Text variant="secondary">{t('account.preferencesComingSoon')}</Text>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </Container>
    </div>
  );
}
