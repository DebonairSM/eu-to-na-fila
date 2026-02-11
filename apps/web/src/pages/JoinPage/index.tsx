import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { JoinForm } from './JoinForm';
import { Container, Heading } from '@/components/design-system';
import { useLocale } from '@/contexts/LocaleContext';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { ShopStatusBanner } from '@/components/ShopStatusBanner';

function hasScheduleEnabled(settings: { allowAppointments?: boolean; operatingHours?: unknown }): boolean {
  if (!settings?.allowAppointments) return false;
  const hours = settings.operatingHours as Record<string, { open?: string; close?: string } | null> | undefined;
  if (!hours || typeof hours !== 'object') return false;
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
  return days.some((d) => {
    const h = hours[d];
    return h != null && typeof h === 'object' && h.open != null && h.close != null;
  });
}

/**
 * JoinPage component - renders the join form.
 *
 * Active ticket checking is handled by JoinPageGuard, which wraps this component.
 * This component only handles rendering the form UI.
 */
export function JoinPage() {
  const { t } = useLocale();
  const { config } = useShopConfig();
  const showSchedule = hasScheduleEnabled(config.settings ?? {});

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />

      <Container className="pt-20 md:pt-28 lg:pt-32 pb-10 join-page-content">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <Heading level={1} className="section-title section-title--layout mb-8 text-3xl">
              {t('join.joinTitle')}
            </Heading>
          </div>

          <ShopStatusBanner />

          <JoinForm />

          {showSchedule && (
            <p className="text-center">
              <Link to="/schedule" className="text-[var(--shop-accent)] hover:underline hover:text-[var(--shop-accent-hover)]">
                {t('join.scheduleForLater')}
              </Link>
            </p>
          )}

          <p className="text-center text-sm text-[rgba(255,255,255,0.7)]">
            <Link to="/home" className="text-[var(--shop-accent)] hover:underline hover:text-[var(--shop-accent-hover)]">
              {t('join.viewStatus')}
            </Link>
          </p>
        </div>
      </Container>
    </div>
  );
}
