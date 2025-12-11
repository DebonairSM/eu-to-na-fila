import { Navigation } from '@/components/Navigation';
import { LoginForm } from './LoginForm';

export function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,0.03)_0%,transparent_50%)] animate-spin-slow pointer-events-none" />
      <Navigation />
      
      {/* Mobile: Full-page layout */}
      <div className="lg:hidden flex items-center justify-center min-h-screen px-4 sm:px-6 py-20 sm:py-24">
        <div className="w-full max-w-md">
          <div className="bg-[rgba(26,26,26,0.95)] backdrop-blur-sm border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 sm:p-8 shadow-2xl">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* Desktop: Centered card layout with max-width but full-width container */}
      <div className="hidden lg:flex items-center justify-center min-h-screen px-6 xl:px-8 py-12">
        <div className="w-full max-w-md xl:max-w-lg">
          <div className="bg-[rgba(26,26,26,0.95)] backdrop-blur-sm border border-[rgba(255,255,255,0.1)] rounded-3xl p-8 xl:p-10 shadow-2xl">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* Desktop XL: Optional side-by-side layout (branding/visual left, form right) */}
      {/* This can be enabled if desired - currently using centered layout for simplicity */}
    </div>
  );
}
