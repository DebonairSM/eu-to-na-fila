import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CompanyNav } from '@/components/CompanyNav';
import { Container } from '@/components/design-system/Spacing/Container';
import { useLocale } from '@/contexts/LocaleContext';

export function ContactPage() {
  const { t } = useLocale();
  return (
    <div className="min-h-screen bg-[var(--shop-background)] text-[var(--shop-text-primary)]">
      <CompanyNav />
      <Container size="2xl" className="py-12 sm:py-16 lg:py-20 space-y-10">
        <header className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-[var(--shop-accent)]">{t('contact.title')}</p>
          <h1 className="text-3xl sm:text-4xl font-semibold">{t('contact.subtitle')}</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-white/5 border border-white/10 rounded-xl min-w-[320px]">
            <CardContent className="p-4 sm:p-6 space-y-4">
              <h2 className="text-xl font-semibold">{t('contact.message')}</h2>
              <form className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    id="name"
                    type="text"
                    className="w-full rounded-lg bg-white/5 border border-[var(--shop-border-color)] px-3 py-2.5 text-base text-[var(--shop-text-primary)] min-h-[44px] placeholder:text-[var(--shop-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)]"
                    placeholder={t('contact.namePlaceholder')}
                  />
                  <input
                    id="email"
                    type="email"
                    className="w-full rounded-lg bg-white/5 border border-[var(--shop-border-color)] px-3 py-2.5 text-base text-[var(--shop-text-primary)] min-h-[44px] placeholder:text-[var(--shop-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)]"
                    placeholder={t('contact.emailPlaceholder')}
                  />
                </div>
                <input
                  id="company"
                  type="text"
                  className="w-full rounded-lg bg-white/5 border border-[var(--shop-border-color)] px-3 py-2.5 text-base text-[var(--shop-text-primary)] min-h-[44px] placeholder:text-[var(--shop-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)]"
                  placeholder={t('contact.companyPlaceholder')}
                />
                <textarea
                  id="message"
                  rows={4}
                  className="w-full rounded-lg bg-white/5 border border-[var(--shop-border-color)] px-3 py-2.5 text-base text-[var(--shop-text-primary)] placeholder:text-[var(--shop-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent)]"
                  placeholder={t('contact.messagePlaceholder')}
                />
                <Button type="button" className="bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] hover:bg-[var(--shop-accent-hover)]">
                  {t('contact.send')}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="bg-white/5 border border-white/10 rounded-xl">
              <CardContent className="p-5 space-y-2">
                <p className="text-sm text-[var(--shop-accent)] uppercase tracking-[0.15em]">{t('contact.callNow')}</p>
                <h3 className="text-lg font-semibold">{t('contact.commercial')}</h3>
                <p className="text-[var(--shop-text-primary)]">eutonafila@gmail.com</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border border-white/10 rounded-xl">
              <CardContent className="p-5 space-y-2">
                <p className="text-sm text-[#8ad6b0] uppercase tracking-[0.15em]">Suporte</p>
                <h3 className="text-lg font-semibold">Técnico</h3>
                <p className="text-[var(--shop-text-primary)]">eutonafila@gmail.com</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border border-white/10 rounded-xl">
              <CardContent className="p-5 space-y-2">
                <p className="text-sm text-[var(--shop-text-secondary)] uppercase tracking-[0.15em]">Base</p>
                <h3 className="text-lg font-semibold">Florianópolis, SC</h3>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}

