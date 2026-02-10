import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import { STORAGE_KEYS, SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/lib/constants';
import ptBR from '@/locales/pt-BR.json';
import en from '@/locales/en.json';

const translations: Record<string, Record<string, unknown>> = {
  'pt-BR': ptBR as Record<string, unknown>,
  en: en as Record<string, unknown>,
};

function getInitialLocale(): string {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const params = new URLSearchParams(window.location.search);
  const lang = params.get('lang');
  if (lang && (SUPPORTED_LOCALES as readonly string[]).includes(lang)) {
    return lang;
  }
  const stored = localStorage.getItem(STORAGE_KEYS.LOCALE);
  if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
    return stored;
  }
  return DEFAULT_LOCALE;
}

function getNested(obj: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

interface LocaleContextValue {
  locale: string;
  setLocale: (next: string) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(getInitialLocale);

  const setLocale = useCallback((next: string) => {
    if (!(SUPPORTED_LOCALES as readonly string[]).includes(next)) return;
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEYS.LOCALE, next);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (next === DEFAULT_LOCALE) {
        url.searchParams.delete('lang');
      } else {
        url.searchParams.set('lang', next);
      }
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, []);

  const messages = translations[locale] ?? translations[DEFAULT_LOCALE];
  const fallbackMessages = translations[DEFAULT_LOCALE];

  const t = useCallback(
    (key: string): string => {
      const value = getNested(messages as Record<string, unknown>, key);
      if (value != null) return value;
      const fallback = getNested(fallbackMessages as Record<string, unknown>, key);
      if (fallback != null) return fallback;
      return key;
    },
    [messages, fallbackMessages]
  );

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.LOCALE);
    if (stored && stored !== locale && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
      setLocaleState(stored);
    }
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
