import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export type UserRole = 'owner' | 'barber' | 'company_admin';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  name?: string;
  companyId?: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Load auth state from sessionStorage on mount
  useEffect(() => {
    const storedAuth = sessionStorage.getItem('staffAuth');
    const storedUser = sessionStorage.getItem('staffUser');
    const storedToken = sessionStorage.getItem('eutonafila_auth_token');
    
    if (storedAuth === 'true' && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        
        // Ensure API client has the token
        if (storedToken) {
          api.setAuthToken(storedToken);
        }
        
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        // Clear all auth data on error
        api.clearAuthToken();
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } else {
      // Clear token if not authenticated
      api.clearAuthToken();
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  const login = useCallback((user: User) => {
    sessionStorage.setItem('staffAuth', 'true');
    sessionStorage.setItem('staffUser', JSON.stringify(user));
    sessionStorage.setItem('staffRole', user.role);
    setAuthState({
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('staffAuth');
    sessionStorage.removeItem('staffUser');
    sessionStorage.removeItem('staffRole');
    api.clearAuthToken(); // Clear JWT token from API client
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const isOwner = authState.user?.role === 'owner';
  const isBarber = authState.user?.role === 'barber';
  const isCompanyAdmin = authState.user?.role === 'company_admin';

  return {
    ...authState,
    login,
    logout,
    isOwner,
    isBarber,
    isCompanyAdmin,
  };
}
