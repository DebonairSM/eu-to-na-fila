import { Navigation } from '@/components/Navigation';
import { CompanyLoginForm } from './CompanyLoginForm';

export function CompanyLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 via-transparent to-transparent pointer-events-none" />
      <Navigation />
      
      <div className="lg:hidden flex items-center justify-center min-h-screen px-4 sm:px-6 pt-24 pb-20 sm:pt-28 sm:pb-24">
        <div className="w-full max-w-md min-w-[320px]">
          <div className="bg-[rgba(26,26,26,0.95)] backdrop-blur-sm border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 sm:p-8 shadow-2xl">
            <CompanyLoginForm />
          </div>
        </div>
      </div>

      <div className="hidden lg:flex items-center justify-center min-h-screen px-6 xl:px-8 pt-20 pb-12">
        <div className="w-full max-w-md xl:max-w-lg min-w-[320px]">
          <div className="bg-[rgba(26,26,26,0.95)] backdrop-blur-sm border border-[rgba(255,255,255,0.1)] rounded-3xl p-8 xl:p-10 shadow-2xl">
            <CompanyLoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompanyLoginPage;

