import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { getErrorMessage, hasScheduleEnabled } from '@/lib/utils';

export function useSignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const shopSlug = useShopSlug();
  const { config: shopConfig } = useShopConfig();
  const { login } = useAuthContext();
  const { t } = useLocale();
  const isSubmittingRef = useRef(false);
  const defaultPostSignupPath = hasScheduleEnabled(shopConfig.settings ?? {}) ? '/checkin/confirm' : '/join';

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

    let resolvedDateOfBirth: string | undefined;
    if (dateOfBirth.trim()) {
      resolvedDateOfBirth = dateOfBirth.trim();
    } else if (age.trim()) {
      const ageNum = parseInt(age.trim(), 10);
      if (!Number.isNaN(ageNum) && ageNum >= 1 && ageNum <= 120) {
        const y = new Date().getFullYear() - ageNum;
        resolvedDateOfBirth = `${y}-01-01`;
      }
    }

    setIsLoading(true);
    isSubmittingRef.current = true;
    try {
      const result = await api.registerCustomer(shopSlug, {
        email: email.trim(),
        password,
        name: name.trim() || undefined,
        ...(resolvedDateOfBirth && { dateOfBirth: resolvedDateOfBirth }),
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
        navigate(defaultPostSignupPath);
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
    const url = api.getCustomerGoogleAuthUrl(shopSlug, defaultPostSignupPath);
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
    age,
    setAge,
    dateOfBirth,
    setDateOfBirth,
    showPassword,
    setShowPassword,
    isLoading,
    error,
    handleSubmit,
    goToGoogleAuth,
  };
}
