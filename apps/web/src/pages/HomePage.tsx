import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { ShopListItem } from '@eutonafila/shared';
import { Navigation } from '@/components/Navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Card, CardContent } from '@/components/ui/card';

export function HomePage() {
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
        setError(err instanceof Error ? err : new Error('Failed to load shops'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchShops();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <header className="space-y-3 mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold">Shops</h1>
          <p className="text-sm text-white/70">All shops in the system</p>
        </header>

        {isLoading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" text="Loading shops..." />
          </div>
        )}

        {error && (
          <ErrorDisplay
            error={error}
            onRetry={() => {
              window.location.reload();
            }}
          />
        )}

        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shops.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                  <p className="text-white/70">No shops found</p>
                </CardContent>
              </Card>
            ) : (
              shops.map((shop) => (
                <Card key={shop.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-white">{shop.name}</h3>
                        <p className="text-sm text-white/70">Slug: {shop.slug}</p>
                        {shop.domain && (
                          <p className="text-sm text-white/70">Domain: {shop.domain}</p>
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#0f3d2e] flex items-center justify-center text-[#0a0a0a] font-bold">
                        {shop.name.charAt(0)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

