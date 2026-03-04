import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthContext } from '@/contexts/AuthContext';
import { hasScheduleEnabled } from '@/lib/utils';

/**
 * Handles redirect from backend after Google OAuth or other shop auth.
 * Expects query params: token, shop (and optionally redirect).
 * Persists token, logs in as customer, then redirects.
 * When redirect is not provided: goes to /checkin/confirm only if scheduling is enabled, otherwise /join.
 */
export function ShopCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuthContext();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const shop = searchParams.get('shop');
    const clientIdParam = searchParams.get('client_id');
    const nameParam = searchParams.get('name');
    const redirect = searchParams.get('redirect');

    if (!token || !shop) {
      setError('Missing token or shop');
      return;
    }

    api.setAuthToken(token);
    const clientId = clientIdParam ? parseInt(clientIdParam, 10) : 0;
    login({
      id: Number.isNaN(clientId) ? 0 : clientId,
      username: '',
      role: 'customer',
      name: (nameParam && nameParam.trim()) || 'Customer',
      clientId: Number.isNaN(clientId) ? undefined : clientId,
    });

    const go = (target: string) => navigate(target, { replace: true });
    if (redirect && redirect.startsWith('/')) {
      go(redirect);
      return;
    }
    api.getShopConfig(shop).then((config) => {
      const target = hasScheduleEnabled(config.settings ?? {}) ? '/checkin/confirm' : '/join';
      go(target);
    }).catch(() => {
      go('/join');
    });
  }, [searchParams, navigate, login]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--shop-background)] text-[var(--shop-text-primary)]">
        <p className="text-sm">{error}. <a href="/shop/login" className="text-[var(--shop-accent)] underline">Back to login</a></p>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--shop-background)] text-[var(--shop-text-secondary)]">
      <p className="text-sm">Redirecting...</p>
    </div>
  );
}
