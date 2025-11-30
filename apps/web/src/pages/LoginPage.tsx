import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuthContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // For demo: support username/password OR PIN
      // In production, this would use proper auth endpoint
      // For now, map demo credentials to PINs
      let pin = password;
      
      // Demo credentials mapping
      if (username === 'admin' && password === 'admin123') {
        pin = '1234'; // Owner PIN
      } else if (username === 'barber' && password === 'barber123') {
        pin = '0000'; // Staff PIN
      }

      const result = await api.authenticate(config.slug, pin);

      if (result.valid && result.role) {
        // Login successful
        login({
          id: 1,
          username: username || 'user',
          role: result.role === 'owner' ? 'owner' : 'barber',
          name: username,
        });

        // Role-based redirect
        if (result.role === 'owner') {
          navigate('/owner');
        } else {
          navigate('/manage');
        }
      } else {
        setError('Credenciais inválidas. Tente novamente.');
      }
    } catch (err: any) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (err?.error) {
        setError(err.error);
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-md">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-4xl text-primary-foreground">
                lock
              </span>
            </div>
            <h1 className="text-3xl font-bold">Entrar</h1>
            <p className="text-muted-foreground">Acesso para funcionários</p>
          </div>

          {/* Form */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username/Email */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium mb-2"
                >
                  Usuário / Email
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário ou email"
                  autoComplete="username"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-muted/50 border border-border transition-colors
                    focus:outline-none focus:ring-2 focus:ring-ring
                  "
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-2"
                >
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    required
                    className="w-full px-4 py-3 pr-12 rounded-lg bg-muted/50 border border-border transition-colors
                      focus:outline-none focus:ring-2 focus:ring-ring
                    "
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">hourglass_top</span>
                    Entrando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">login</span>
                    Entrar
                  </>
                )}
              </Button>
            </form>

            {/* Forgot Password Link */}
            <div className="mt-4 text-center">
              <a href="#" className="text-sm text-primary hover:underline">
                Esqueceu a senha?
              </a>
            </div>
          </div>

          {/* Demo Credentials */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground text-center mb-2">
              Credenciais de demonstração:
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Owner: admin / admin123</p>
              <p>Barber: barber / barber123</p>
            </div>
          </div>

          {/* Back Link */}
          <div className="text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
