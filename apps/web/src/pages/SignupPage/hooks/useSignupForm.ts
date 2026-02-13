import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { getErrorMessage } from '@/lib/utils';

export function useSignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const shopSlug = useShopSlug();
  const { login } = useAuthContext();
  const { t } = useLocale();
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isLoading) return;

    setError(null);
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.passwordMinLength'));
      return;
    }

    setIsLoading(true);
    isSubmittingRef.current = true;
    try {
      const result = await api.registerCustomer(shopSlug, {
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      });
      if (result.valid && result.token && result.role === 'customer') {
        const res = result as { name?: string };
        login({
          id: result.clientId,
          username: email.trim(),
          role: 'customer',
          name: res.name?.trim() || name.trim() || email.trim(),
          clientId: result.clientId,
        });
        navigate('/checkin/confirm');
        return;
      }
      setError(t('auth.signupError'));
    } catch (err) {
      setError(getErrorMessage(err, t('auth.signupError')));
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const goToGoogleAuth = () => {
    const url = api.getCustomerGoogleAuthUrl(shopSlug, '/checkin/confirm');
    window.location.href = url;
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    name,
    setName,
    showPassword,
    setShowPassword,
    isLoading,
    error,
    handleSubmit,
    goToGoogleAuth,
  };
}
