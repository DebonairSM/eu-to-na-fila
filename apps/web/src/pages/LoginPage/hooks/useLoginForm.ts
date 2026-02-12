import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { getErrorMessage } from '@/lib/utils';

export type LoginMode = 'client' | 'barber';

export function useLoginForm() {
  const [mode, setMode] = useState<LoginMode>('client');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const shopSlug = useShopSlug();
  const { login } = useAuthContext();
  const { t } = useLocale();

  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingRef.current || isLoading) return;

    setError(null);
    setIsLoading(true);
    isSubmittingRef.current = true;

    try {
      if (mode === 'barber') {
        if (!username.trim()) {
          setError(t('auth.fillAllFields'));
          setIsLoading(false);
          isSubmittingRef.current = false;
          return;
        }
        const barberResult = await api.authenticateBarber(shopSlug, username.trim(), password);
        if (barberResult.valid && barberResult.token) {
          login({
            id: barberResult.barberId ?? 0,
            username: username.trim(),
            role: 'barber',
            name: barberResult.barberName ?? username.trim(),
          });
          navigate(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/barber');
          return;
        }
      } else {
        const authResult = await api.authenticate(shopSlug, password);
        if (authResult.valid && authResult.token) {
          login({
            id: 0,
            username: authResult.role ?? 'staff',
            role: authResult.role === 'owner' ? 'owner' : 'staff',
            name: authResult.role === 'owner' ? 'owner' : 'staff',
          });
          const defaultPath = authResult.role === 'owner' ? '/owner' : '/manage';
          navigate(redirectTo && redirectTo.startsWith('/') ? redirectTo : defaultPath);
          return;
        }
      }

      setError(t('auth.invalidCredentials'));
    } catch (err) {
      setError(getErrorMessage(err, t('auth.loginError')));
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return {
    mode,
    setMode,
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
