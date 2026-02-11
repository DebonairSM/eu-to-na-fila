import { Component, type ReactNode } from 'react';
import { ErrorDisplay } from './ErrorDisplay';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Message used when rendering the default error state (passed from parent with t('errors.generic')). */
  fallbackErrorMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch React errors in the component tree.
 * Displays a user-friendly error message instead of crashing the entire app.
 * 
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    // Log error to error tracking service in production
    if (import.meta.env.PROD) {
      // Could send to Sentry, LogRocket, etc.
      console.error('Error caught by boundary:', error, errorInfo);
    }
    // Show index.html recovery UI when chunk/load fails so user can reload
    const msg = error?.message ?? '';
    const isChunkError =
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('ChunkLoadError') ||
      msg.includes('Erro de conexão ao carregar a página') ||
      msg.includes('Erro ao carregar a página');
    if (isChunkError && typeof window !== 'undefined' && window.__showRecoveryUI) {
      window.__showRecoveryUI();
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
          <ErrorDisplay
            error={this.state.error || new Error(this.props.fallbackErrorMessage ?? 'Error')}
            onRetry={this.handleReset}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

