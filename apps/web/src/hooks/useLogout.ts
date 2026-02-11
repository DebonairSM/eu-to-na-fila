import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

/** Post-logout route for staff/barber/owner (public home). */
export const LOGOUT_HOME_PATH = '/home';

/**
 * Centralized logout: clears auth and navigates to public home with replace.
 * Navigation is deferred (setTimeout 0) so it runs after the current React commit,
 * reducing risk of state updates during transition (e.g. black screen on logout).
 */
export function useLogout() {
  const { logout } = useAuthContext();
  const navigate = useNavigate();

  const logoutAndGoHome = useCallback(() => {
    logout();
    setTimeout(() => {
      navigate(LOGOUT_HOME_PATH, { replace: true });
    }, 0);
  }, [logout, navigate]);

  return { logoutAndGoHome };
}
