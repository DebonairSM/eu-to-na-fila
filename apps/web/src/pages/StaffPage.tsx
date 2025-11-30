import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';

export function StaffPage() {
  const { user, logout, isOwner } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">Painel do Funcionário</h1>
            <p className="text-muted-foreground">
              Bem-vindo, {user?.name || user?.username || 'Funcionário'}
            </p>
          </div>

          {/* Dashboard Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Queue Management */}
            <Card className="hover:border-primary transition-colors">
              <CardContent className="p-6">
                <Link to="/manage" className="block">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl text-primary">
                        manage_accounts
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold">Gerenciar Fila</h3>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Visualize e gerencie a fila de clientes
                  </p>
                </Link>
              </CardContent>
            </Card>

            {/* Analytics (Owner only) */}
            {isOwner && (
              <Card className="hover:border-primary transition-colors">
                <CardContent className="p-6">
                  <Link to="/analytics" className="block">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl text-primary">
                          analytics
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold">Analytics</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Visualize estatísticas e métricas
                    </p>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Barber Management (Owner only) */}
            {isOwner && (
              <Card className="hover:border-primary transition-colors">
                <CardContent className="p-6">
                  <Link to="/barbers" className="block">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl text-primary">
                          content_cut
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold">Gerenciar Barbeiros</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Adicione, edite ou remova barbeiros
                    </p>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Kiosk Mode */}
            <Card className="hover:border-primary transition-colors">
              <CardContent className="p-6">
                <Link to="/manage?kiosk=true" className="block">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl text-primary">
                        tv
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold">Modo Kiosk</h3>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Exibição em tela cheia para TV/tablet
                  </p>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Logout */}
          <div className="text-center pt-8">
            <Button variant="outline" onClick={handleLogout}>
              <span className="material-symbols-outlined">logout</span>
              Sair
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
