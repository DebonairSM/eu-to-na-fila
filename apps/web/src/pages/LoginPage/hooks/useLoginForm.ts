import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { getErrorMessage, hasScheduleEnabled } from '@/lib/utils';

export function useLoginForm() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const shopSlug = useShopSlug();
  const { config: shopConfig } = useShopConfig();
  const { login } = useAuthContext();
  const { t } = useLocale();
  const defaultPostLoginPath = hasScheduleEnabled(shopConfig.settings ?? {}) ? '/checkin/confirm' : '/join';

  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingRef.current || isLoading) return;

    if (!identifier.trim()) {
      setError(t('auth.fillAllFields'));
      return;
    }

    setError(null);
    setIsLoading(true);
    isSubmittingRef.current = true;

    try {
      const result = await api.login(shopSlug, {
        identifier: identifier.trim(),
        password,
        remember_me: rememberMe,
      });

      if (result.valid && result.token && result.role) {
        const role = result.role;
        const targetPath = redirectTo && redirectTo.startsWith('/') ? redirectTo : undefined;

        if (role === 'customer') {
          login(
            {
              id: result.clientId ?? 0,
              username: identifier.trim(),
              role: 'customer',
              name: result.name?.trim() || identifier.trim(),
              clientId: result.clientId,
            },
            { rememberMe }
          );
          navigate(targetPath ?? defaultPostLoginPath);
          return;
        }

        if (role === 'barber') {
          login({
            id: result.barberId ?? 0,
            username: identifier.trim(),
            role: 'barber',
            name: result.barberName ?? identifier.trim(),
          });
          navigate(targetPath ?? '/barber');
          return;
        }

        if (role === 'owner') {
          login({
            id: 0,
            username: 'owner',
            role: 'owner',
            name: 'owner',
          });
          navigate(targetPath ?? '/owner');
          return;
        }

        if (role === 'kiosk') {
          login({
            id: 0,
            username: 'kiosk',
            role: 'kiosk',
            name: 'kiosk',
          });
          navigate(targetPath ?? '/manage?kiosk=true');
          return;
        }

        // staff
        login({
          id: 0,
          username: 'staff',
          role: 'staff',
          name: 'staff',
        });
        navigate(targetPath ?? '/manage');
        return;
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
    const redirectUri = redirectTo && redirectTo.startsWith('/') ? redirectTo : defaultPostLoginPath;
    const url = api.getCustomerGoogleAuthUrl(shopSlug, redirectUri);
    window.location.href = url;
  };

  return {
    identifier,
    setIdentifier,
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
