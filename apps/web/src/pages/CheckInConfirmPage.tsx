import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Container, Heading, Text } from '@/components/design-system';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';

export function CheckInConfirmPage() {
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />
      <Container className="pt-20 md:pt-28 lg:pt-32 pb-10">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-[var(--shop-accent)]/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--shop-accent)]">check_circle</span>
          </div>
          <Heading level={1}>{t('checkin.title')}</Heading>
          <Text size="lg" variant="secondary">
            {t('checkin.description')}
          </Text>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link
              to="/join"
              className={cn(
                'inline-flex items-center justify-center gap-2 font-semibold rounded-lg min-h-[48px] px-6 py-3',
                'bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] hover:bg-[var(--shop-accent-hover)]'
              )}
            >
              {t('checkin.backToJoin')}
            </Link>
            <Link
              to="/schedule"
              className={cn(
                'inline-flex items-center justify-center gap-2 font-semibold rounded-lg min-h-[48px] px-6 py-3',
                'border border-white/25 text-white hover:border-[var(--shop-accent)] hover:text-[var(--shop-accent)]'
              )}
            >
              {t('checkin.backToSchedule')}
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
