import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthContext } from '@/contexts/AuthContext';
import { getShopBasePath } from '@/lib/config';

/**
 * Handles redirect from backend after Google OAuth or other shop auth.
 * Expects query params: token, shop (and optionally redirect).
 * Persists token, logs in as customer, then redirects.
 * When redirect is not provided: goes to /checkin/confirm only if scheduling is enabled, otherwise /join.
 */
export function ShopCallbackPage() {
  const [searchParams] = useSearchParams();
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

    // Persist token so API client and useAuth both see it (same key).
    api.setAuthToken(token);
    const clientId = clientIdParam ? parseInt(clientIdParam, 10) : 0;
    const user = {
      id: Number.isNaN(clientId) ? 0 : clientId,
      username: '',
      role: 'customer' as const,
      name: (nameParam && nameParam.trim()) || 'Customer',
      clientId: Number.isNaN(clientId) ? undefined : clientId,
    };
    login(user);

    const target = redirect && redirect.startsWith('/') ? redirect : '/join';
    const basePath = getShopBasePath();
    const fullPath = basePath === '/' ? target : `${basePath.replace(/\/$/, '')}${target.startsWith('/') ? target : `/${target}`}`;
    // Full page navigation so the next load reads persisted auth and shows logged-in state.
    window.location.replace(fullPath);
  }, [searchParams, login]);

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
