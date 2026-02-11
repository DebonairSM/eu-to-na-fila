import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CompanyNav } from '@/components/CompanyNav';
import { Container } from '@/components/design-system/Spacing/Container';
import { useLocale } from '@/contexts/LocaleContext';
import { api } from '@/lib/api';
import type { ShopListItem } from '@eutonafila/shared';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorDisplay } from '@/components/ErrorDisplay';

export function NetworkPage() {
  const { t } = useLocale();
  const [shops, setShops] = useState<ShopListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchShops = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.getAllShops();
        setShops(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(t('network.loadError')));
      } finally {
        setIsLoading(false);
      }
    };
    fetchShops();
  }, [t]);

  return (
    <div className="min-h-screen bg-[var(--shop-background)] text-[var(--shop-text-primary)]">
      <CompanyNav />
      <Container size="2xl" className="py-12 sm:py-16 lg:py-20 space-y-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.25em] text-[var(--shop-accent)]">{t('network.networkTitle')}</p>
          <h1 className="text-3xl sm:text-4xl font-semibold">{t('network.shopsTitle')}</h1>
        </header>

        {isLoading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" text={t('network.loadingShops')} />
          </div>
        )}

        {error && (
          <ErrorDisplay
            error={error}
            onRetry={() => window.location.reload()}
          />
        )}

        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shops.length === 0 ? (
              <Card className="bg-white/5 border border-white/10 rounded-xl">
                <CardContent className="p-6 text-center">
                  <p className="text-[var(--shop-text-secondary)]">{t('network.noShops')}</p>
                </CardContent>
              </Card>
            ) : (
              shops.map((shop) => (
                <Card key={shop.id} className="bg-white/5 border border-white/10 rounded-xl">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-[var(--shop-text-primary)]">{shop.name}</h3>
                        {shop.domain && (
                          <p className="text-sm text-[var(--shop-text-secondary)]">{shop.domain}</p>
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-[var(--shop-accent)] flex items-center justify-center text-[var(--shop-text-on-accent)] font-bold">
                        {shop.name.charAt(0)}
                      </div>
                    </div>
                    <p className="text-sm text-[var(--shop-text-secondary)]">
                      {t('network.tagline')}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <Link to={`/join?shop=${encodeURIComponent(shop.slug)}`}>
                        <Button className="bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] hover:bg-[var(--shop-accent-hover)]">
                          Cliente
                        </Button>
                      </Link>
                      <Link to={`/shop/login?shop=${encodeURIComponent(shop.slug)}`}>
                        <Button
                          variant="outline"
                          className="border-white/20 text-white hover:border-[#0f3d2e] hover:text-[#0f3d2e]"
                        >
                          Equipe
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        <Card className="bg-white/5 border border-white/10 rounded-xl">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#8ad6b0]">Expansão</p>
              <h3 className="text-xl font-semibold text-white">Quer trazer sua rede?</h3>
            </div>
            <Link to="/contact">
              <Button className="bg-[#0f3d2e] text-white hover:bg-[#15503c]">Contato</Button>
            </Link>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
