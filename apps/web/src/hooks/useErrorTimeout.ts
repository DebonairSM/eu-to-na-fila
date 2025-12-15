import { useEffect, useRef } from 'react';
import { TIMEOUTS } from '@/lib/constants';

/**
 * Hook to automatically clear an error message after a timeout.
 * 
 * @param errorMessage - The error message to clear
 * @param onClear - Callback to clear the error message
 * @param timeout - Timeout duration in milliseconds (default: ERROR_MESSAGE timeout)
 * 
 * @example
 * ```tsx
 * const [error, setError] = useState<string | null>(null);
 * useErrorTimeout(error, () => setError(null));
 * ```
 */
export function useErrorTimeout(
  errorMessage: string | null,
  onClear: () => void,
  timeout: number = TIMEOUTS.ERROR_MESSAGE
): void {
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (errorMessage) {
      // Clear any existing timeout
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = window.setTimeout(() => {
        onClear();
        timeoutRef.current = null;
      }, timeout);
    }

    // Cleanup on unmount or when errorMessage changes
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [errorMessage, onClear, timeout]);
}

