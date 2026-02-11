import { Card, CardContent } from '@/components/ui/card';
import { CompanyNav } from '@/components/CompanyNav';
import { Container } from '@/components/design-system/Spacing/Container';
import { useLocale } from '@/contexts/LocaleContext';

export function AboutPage() {
  const { t } = useLocale();
  const values = [
    { title: t('about.value1Title'), desc: t('about.value1Desc') },
    { title: t('about.value2Title'), desc: t('about.value2Desc') },
    { title: t('about.value3Title'), desc: t('about.value3Desc') },
  ];
  const milestones = [
    { year: '2024', label: t('about.milestone1Label'), detail: t('about.milestone1Detail') },
    { year: '2025', label: t('about.milestone2Label'), detail: t('about.milestone2Detail') },
  ];
  return (
    <div className="min-h-screen bg-[var(--shop-background)] text-[var(--shop-text-primary)]">
      <CompanyNav />
      <Container size="2xl" className="py-12 sm:py-16 lg:py-20 space-y-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.25em] text-[var(--shop-accent)]">{t('about.aboutUs')}</p>
          <h1 className="text-3xl sm:text-4xl font-semibold">{t('about.brandName')}</h1>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {values.map((v) => (
            <Card key={v.title} className="bg-white/5 border border-white/10 rounded-xl">
              <CardContent className="p-5 space-y-2">
                <h3 className="text-lg font-semibold text-[var(--shop-text-primary)]">{v.title}</h3>
                <p className="text-sm text-[var(--shop-text-secondary)]">{v.desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">{t('about.timeline')}</h2>
          <div className="space-y-3">
            {milestones.map((m) => (
              <div key={m.year} className="flex items-start gap-3 border border-white/10 bg-white/5 rounded-xl p-4">
                <div className="w-14 h-14 rounded-lg bg-[var(--shop-accent)] flex items-center justify-center text-[var(--shop-text-on-accent)] font-bold">
                  {m.year}
                </div>
                <div className="space-y-1">
<p className="text-sm text-[var(--shop-text-secondary)] uppercase tracking-[0.1em]">{m.label}</p>
                <p className="text-[var(--shop-text-primary)]">{m.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Equipe central</h2>
            <Card className="bg-white/5 border border-white/10 rounded-xl">
              <CardContent className="p-5 space-y-2">
                <p className="text-sm text-[var(--shop-text-secondary)]">Time em Florianópolis, próximo das operações.</p>
              </CardContent>
            </Card>
        </section>
      </Container>
    </div>
  );
}

