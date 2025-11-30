import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Navigation } from '@/components/Navigation';

export function AnalyticsPage() {
  const { isOwner } = useAuthContext();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [isLoading] = useState(false);
  const [error] = useState<Error | null>(null);

  // Redirect if not owner
  if (!isOwner) {
    navigate('/staff');
    return null;
  }

  // TODO: Implement analytics fetching
  // useEffect(() => {
  //   const fetchAnalytics = async () => {
  //     setIsLoading(true);
  //     try {
  //       const data = await api.getAnalytics(config.slug, days);
  //       setAnalytics(data);
  //     } catch (err) {
  //       setError(err instanceof Error ? err : new Error('Failed to fetch analytics'));
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };
  //   fetchAnalytics();
  // }, [days]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-6xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Analytics</h1>
              <p className="text-muted-foreground mt-2">
                Estatísticas e métricas de desempenho
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="px-4 py-2 rounded-lg border border-border bg-background"
              >
                <option value={7}>Últimos 7 dias</option>
                <option value={30}>Últimos 30 dias</option>
                <option value={90}>Últimos 90 dias</option>
              </select>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <LoadingSpinner size="lg" text="Carregando analytics..." />
          ) : error ? (
            <ErrorDisplay error={error} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total de Atendimentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">--</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Taxa de Conclusão
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">--</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tempo Médio de Espera
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">--</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Produtividade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">--</p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="mt-8 p-6 rounded-lg bg-muted/50 border border-border text-center">
            <p className="text-muted-foreground">
              Analytics em desenvolvimento. Esta página será implementada em breve.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
