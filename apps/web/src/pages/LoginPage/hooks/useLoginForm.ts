import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { getErrorMessage, hasScheduleEnabled } from '@/lib/utils';

export type LoginMode = 'customer' | 'staff';

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
  const { config: shopConfig } = useShopConfig();
  const { login } = useAuthContext();
  const { t } = useLocale();
  const defaultPostLoginPath = hasScheduleEnabled(shopConfig.settings ?? {}) ? '/checkin/confirm' : '/join';

  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingRef.current || isLoading) return;

    setError(null);
    setIsLoading(true);
    isSubmittingRef.current = true;

    try {
      if (mode === 'staff') {
        if (!username.trim()) {
          setError(t('auth.fillAllFields'));
          setIsLoading(false);
          isSubmittingRef.current = false;
          return;
        }
        const staffResult = await api.authenticateStaff(shopSlug, username.trim(), password);
        if (staffResult.valid && staffResult.token && staffResult.role) {
          const role = staffResult.role;
          if (role === 'barber') {
            login({
              id: staffResult.barberId ?? 0,
              username: username.trim(),
              role: 'barber',
              name: staffResult.barberName ?? username.trim(),
            });
            navigate(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/barber');
          } else if (role === 'owner') {
            login({
              id: 0,
              username: 'owner',
              role: 'owner',
              name: 'owner',
            });
            navigate(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/owner');
          } else if (role === 'kiosk') {
            login({
              id: 0,
              username: 'kiosk',
              role: 'kiosk',
              name: 'kiosk',
            });
            navigate(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/manage?kiosk=true');
          } else {
            // staff
            login({
              id: 0,
              username: 'staff',
              role: 'staff',
              name: 'staff',
            });
            navigate(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/manage');
          }
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
          navigate(redirectTo && redirectTo.startsWith('/') ? redirectTo : defaultPostLoginPath);
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
    const redirectUri = redirectTo && redirectTo.startsWith('/') ? redirectTo : defaultPostLoginPath;
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
