import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';

export function OwnerDashboard() {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Welcome */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Bem-vindo, {user?.name || user?.username || 'Proprietário'}
            </p>
          </div>

          {/* Main Action Card */}
          <Card className="hover:border-primary transition-colors">
            <CardContent className="p-8">
              <Link to="/manage" className="block">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-3xl text-primary">
                      manage_accounts
                    </span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold mb-2">Gerenciar Fila</h2>
                    <p className="text-muted-foreground">
                      Visualize e gerencie a fila de clientes, atribua barbeiros e monitore o atendimento.
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-muted-foreground">
                    arrow_forward
                  </span>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Logout */}
          <div className="text-center">
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
