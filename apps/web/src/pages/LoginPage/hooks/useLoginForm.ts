import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/utils';

export function useLoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const shopSlug = useShopSlug();
  const { login } = useAuthContext();

  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingRef.current || isLoading) return;

    setError(null);
    setIsLoading(true);
    isSubmittingRef.current = true;

    try {
      // 1) Try owner/staff PIN (password field as PIN)
      const pinResult = await api.authenticate(shopSlug, password);
      if (pinResult.valid && pinResult.token) {
        login({
          id: 0,
          username: pinResult.role ?? 'staff',
          role: pinResult.role === 'owner' ? 'owner' : 'staff',
          name: pinResult.role === 'owner' ? 'owner' : 'staff',
        });
        navigate(pinResult.role === 'owner' ? '/owner' : '/manage');
        return;
      }

      // 2) Try barber username + password
      const barberResult = await api.authenticateBarber(shopSlug, username.trim(), password);
      if (barberResult.valid && barberResult.token) {
        login({
          id: barberResult.barberId ?? 0,
          username: username.trim(),
          role: 'barber',
          name: barberResult.barberName ?? username.trim(),
        });
        navigate('/my-stats');
        return;
      }

      setError('Credenciais inválidas. Verifique usuário e senha ou PIN.');
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao fazer login. Tente novamente.'));
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return {
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    isLoading,
    error,
    handleSubmit,
  };
}
