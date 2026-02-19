import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { getErrorMessage } from '@/lib/utils';

export type LoginMode = 'customer' | 'barber' | 'staff';

export function useLoginForm() {
  const [mode, setMode] = useState<LoginMode>('customer');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
      } else if (mode === 'staff') {
        if (!username.trim()) {
          setError(t('auth.fillAllFields'));
          setIsLoading(false);
          isSubmittingRef.current = false;
          return;
        }
        const authResult = await api.authenticate(shopSlug, username.trim(), password);
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
      } else {
        if (!email.trim()) {
          setError(t('auth.fillAllFields'));
          setIsLoading(false);
          isSubmittingRef.current = false;
          return;
        }
        const customerResult = await api.loginCustomer(shopSlug, {
          email: email.trim(),
          password,
          remember_me: rememberMe,
        });
        if (customerResult.valid && customerResult.token && customerResult.role === 'customer') {
          api.setAuthToken(customerResult.token);
          login(
            {
              id: customerResult.clientId ?? 0,
              username: email.trim(),
              role: 'customer',
              name: customerResult.name?.trim() || email.trim(),
              clientId: customerResult.clientId,
            },
            { rememberMe }
          );
          navigate(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/checkin/confirm');
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

  const goToGoogleAuth = () => {
    const redirectUri = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/checkin/confirm';
    const url = api.getCustomerGoogleAuthUrl(shopSlug, redirectUri);
    window.location.href = url;
  };

  return {
    mode,
    setMode,
    email,
    setEmail,
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    isLoading,
    error,
    handleSubmit,
    goToGoogleAuth,
  };
}
