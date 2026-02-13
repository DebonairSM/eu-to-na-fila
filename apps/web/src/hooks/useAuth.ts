import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

const STAFF_AUTH = 'staffAuth';
const STAFF_USER = 'staffUser';
const STAFF_ROLE = 'staffRole';
const TOKEN_KEY = 'eutonafila_auth_token';
const REMEMBER_ME_FLAG = 'eutonafila_remember_me';

function clearAuthFromStorage() {
  sessionStorage.removeItem(STAFF_AUTH);
  sessionStorage.removeItem(STAFF_USER);
  sessionStorage.removeItem(STAFF_ROLE);
  sessionStorage.removeItem(TOKEN_KEY);
  try {
    localStorage.removeItem(STAFF_AUTH);
    localStorage.removeItem(STAFF_USER);
    localStorage.removeItem(STAFF_ROLE);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REMEMBER_ME_FLAG);
  } catch {
    // ignore
  }
}

export type UserRole = 'owner' | 'staff' | 'barber' | 'company_admin' | 'kiosk' | 'customer';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  name?: string;
  companyId?: number;
  clientId?: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginOptions {
  rememberMe?: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Load auth state on mount: prefer remember-me (localStorage), else sessionStorage
  useEffect(() => {
    const useRememberMe = localStorage.getItem(REMEMBER_ME_FLAG) === 'true';
    const storedAuth = useRememberMe
      ? localStorage.getItem(STAFF_AUTH)
      : sessionStorage.getItem(STAFF_AUTH);
    const storedUser = useRememberMe
      ? localStorage.getItem(STAFF_USER)
      : sessionStorage.getItem(STAFF_USER);
    const storedToken = useRememberMe
      ? localStorage.getItem(TOKEN_KEY)
      : sessionStorage.getItem(TOKEN_KEY);

    if (storedAuth === 'true' && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (storedToken) {
          api.setAuthToken(storedToken);
        }
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        clearAuthFromStorage();
        api.clearAuthToken();
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } else {
      api.clearAuthToken();
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  const login = useCallback((user: User, options?: LoginOptions) => {
    const rememberMe = options?.rememberMe === true;
    const token = sessionStorage.getItem(TOKEN_KEY);

    if (rememberMe && token) {
      localStorage.setItem(REMEMBER_ME_FLAG, 'true');
      localStorage.setItem(STAFF_AUTH, 'true');
      localStorage.setItem(STAFF_USER, JSON.stringify(user));
      localStorage.setItem(STAFF_ROLE, user.role);
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      try {
        localStorage.removeItem(REMEMBER_ME_FLAG);
        localStorage.removeItem(STAFF_AUTH);
        localStorage.removeItem(STAFF_USER);
        localStorage.removeItem(STAFF_ROLE);
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        // ignore
      }
    }

    sessionStorage.setItem(STAFF_AUTH, 'true');
    sessionStorage.setItem(STAFF_USER, JSON.stringify(user));
    sessionStorage.setItem(STAFF_ROLE, user.role);
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
    setAuthState({
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(() => {
    clearAuthFromStorage();
    api.clearAuthToken();
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const isOwner = authState.user?.role === 'owner';
  const isBarber = authState.user?.role === 'barber';
  const isCompanyAdmin = authState.user?.role === 'company_admin';
  const isKioskOnly = authState.user?.role === 'kiosk';
  const isCustomer = authState.user?.role === 'customer';

  return {
    ...authState,
    login,
    logout,
    isOwner,
    isBarber,
    isCompanyAdmin,
    isKioskOnly,
    isCustomer,
  };
}
