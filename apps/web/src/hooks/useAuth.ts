import { useState, useEffect, useCallback } from 'react';

export type UserRole = 'owner' | 'barber';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  name?: string;
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
    
    if (storedAuth === 'true' && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } else {
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
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const isOwner = authState.user?.role === 'owner';
  const isBarber = authState.user?.role === 'barber';

  return {
    ...authState,
    login,
    logout,
    isOwner,
    isBarber,
  };
}
