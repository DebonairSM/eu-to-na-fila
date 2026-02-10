import { Navigation } from '@/components/Navigation';
import { LoginForm } from './LoginForm';

export function LoginPage() {
  return (
    <div className="min-h-screen bg-[var(--shop-background)]">
      <Navigation />
      
      <div className="lg:hidden flex items-center justify-center min-h-screen px-4 sm:px-6 py-20 sm:py-24">
        <div className="w-full max-w-md min-w-[320px]">
          <div className="bg-[color-mix(in_srgb,var(--shop-surface-secondary)_95%,transparent)] backdrop-blur-sm border border-[var(--shop-border-color)] rounded-2xl p-6 sm:p-8 shadow-2xl">
            <LoginForm />
          </div>
        </div>
      </div>

      <div className="hidden lg:flex items-center justify-center min-h-screen px-6 xl:px-8 py-12">
        <div className="w-full max-w-md xl:max-w-lg min-w-[320px]">
          <div className="bg-[color-mix(in_srgb,var(--shop-surface-secondary)_95%,transparent)] backdrop-blur-sm border border-[var(--shop-border-color)] rounded-3xl p-8 xl:p-10 shadow-2xl">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
