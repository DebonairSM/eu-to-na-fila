import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { api } from '@/lib/api';

interface NetworkStatusContextValue {
  isOffline: boolean;
  apiUnavailable: boolean;
  reportApiFailure: () => void;
  reportApiSuccess: () => void;
  dismissApiUnavailable: () => void;
}

const NetworkStatusContext = createContext<NetworkStatusContextValue | undefined>(undefined);

const CONSECUTIVE_FAILURES_THRESHOLD = 2;
const SUCCESS_RESET_THRESHOLD = 1;

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const consecutiveFailuresRef = useRef(0);
  const successCountRef = useRef(0);

  const reportApiFailure = useCallback(() => {
    consecutiveFailuresRef.current += 1;
    successCountRef.current = 0;
    if (consecutiveFailuresRef.current >= CONSECUTIVE_FAILURES_THRESHOLD) {
      setApiUnavailable(true);
    }
  }, []);

  const reportApiSuccess = useCallback(() => {
    consecutiveFailuresRef.current = 0;
    successCountRef.current += 1;
    if (successCountRef.current >= SUCCESS_RESET_THRESHOLD) {
      setApiUnavailable(false);
    }
  }, []);

  useEffect(() => {
    api.setOnNetworkStatus({
      onFailure: reportApiFailure,
      onSuccess: reportApiSuccess,
    });
    return () => api.setOnNetworkStatus({});
  }, [reportApiFailure, reportApiSuccess]);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const handleOnline = () => {
      setIsOffline(false);
      successCountRef.current = SUCCESS_RESET_THRESHOLD;
      setApiUnavailable(false);
      consecutiveFailuresRef.current = 0;
    };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const dismissApiUnavailable = useCallback(() => {
    setApiUnavailable(false);
    consecutiveFailuresRef.current = 0;
  }, []);

  const value: NetworkStatusContextValue = {
    isOffline,
    apiUnavailable,
    reportApiFailure,
    reportApiSuccess,
    dismissApiUnavailable,
  };

  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus() {
  const context = useContext(NetworkStatusContext);
  if (context === undefined) {
    throw new Error('useNetworkStatus must be used within a NetworkStatusProvider');
  }
  return context;
}
