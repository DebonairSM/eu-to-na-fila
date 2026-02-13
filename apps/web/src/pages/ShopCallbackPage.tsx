import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Handles redirect from backend after Google OAuth or other shop auth.
 * Expects query params: token, shop (and optionally redirect).
 * Persists token, logs in as customer, then redirects.
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
    const target = redirect && redirect.startsWith('/') ? redirect : '/checkin/confirm';
    navigate(target, { replace: true });
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
