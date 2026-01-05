import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthContext } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/utils';

export function CompanyLoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuthContext();
  
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmittingRef.current || isLoading) {
      return;
    }
    
    setError(null);
    setIsLoading(true);
    isSubmittingRef.current = true;

    try {
      const result = await api.companyAuthenticate(username, password);

      if (result.valid && result.token && result.companyId) {
        login({
          id: result.userId || 1,
          username: username,
          role: 'company_admin',
          name: username,
          companyId: result.companyId,
        });

        navigate('/company/dashboard');
      } else {
        setError('Credenciais inválidas. Verifique usuário e senha.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao fazer login. Tente novamente.'));
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E8C547] flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-4xl text-[#0a0a0a]">
            business
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-white">Acesso Empresarial</h1>
        <p className="text-sm text-[rgba(255,255,255,0.7)]">
          Login para administradores da empresa
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder=" "
            autoComplete="username"
            required
            className="w-full px-4 py-4 pt-6 rounded-lg border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.05)] text-white text-base placeholder:text-[rgba(255,255,255,0.5)] transition-all min-h-[52px] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
          />
          <label
            htmlFor="username"
            className={`absolute left-4 text-sm text-[rgba(255,255,255,0.7)] pointer-events-none transition-all ${
              username ? 'top-2 text-xs text-[#D4AF37]' : 'top-4'
            }`}
          >
            Usuário
          </label>
        </div>

        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder=" "
            autoComplete="current-password"
            required
            className="w-full px-4 py-4 pt-6 pr-12 rounded-lg border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.05)] text-white text-base placeholder:text-[rgba(255,255,255,0.5)] transition-all min-h-[52px] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
          />
          <label
            htmlFor="password"
            className={`absolute left-4 text-sm text-[rgba(255,255,255,0.7)] pointer-events-none transition-all ${
              password ? 'top-2 text-xs text-[#D4AF37]' : 'top-4'
            }`}
          >
            Senha
          </label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.7)] hover:text-white p-2 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <span className="material-symbols-outlined text-xl">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)]">
            <p className="text-sm text-[#ef4444] flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </p>
          </div>
        )}

        <button
          type="submit"
          className="w-full px-6 py-4 min-h-[52px] bg-[#D4AF37] text-[#0a0a0a] font-semibold rounded-lg flex items-center justify-center gap-3 hover:bg-[#E8C547] hover:shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-xl">hourglass_top</span>
              Entrando...
            </>
          ) : (
            <span className="material-symbols-outlined text-xl">login</span>
          )}
        </button>
      </form>

      <div className="border-t border-[rgba(255,255,255,0.1)] pt-4">
        <Link
          to="/shop/login"
          className="w-full px-4 py-3 min-h-[48px] bg-transparent border-2 border-[rgba(212,175,55,0.3)] text-[#D4AF37] font-medium rounded-lg flex items-center justify-center gap-2 hover:border-[#D4AF37] hover:bg-[rgba(212,175,55,0.1)] transition-all"
        >
          <span className="material-symbols-outlined text-lg">content_cut</span>
          Login Barbeiros
        </Link>
      </div>

      <div className="text-center pt-2">
        <Link 
          to="/home" 
          className="text-sm text-[rgba(255,255,255,0.7)] hover:text-[#D4AF37] inline-flex items-center justify-center gap-2 min-h-[44px] transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Voltar
        </Link>
      </div>
    </div>
  );
}

