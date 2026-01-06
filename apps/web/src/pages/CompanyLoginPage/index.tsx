import { CompanyNav } from '@/components/CompanyNav';
import { CompanyLoginForm } from './CompanyLoginForm';

export function CompanyLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071124] via-[#0b1a33] to-[#0e1f3d] text-white relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 via-transparent to-transparent pointer-events-none" />
      <CompanyNav />
      
      <div className="lg:hidden flex items-center justify-center min-h-screen px-4 sm:px-6 py-20 sm:py-24">
        <div className="w-full max-w-md min-w-[320px]">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <CompanyLoginForm />
          </div>
        </div>
      </div>

      <div className="hidden lg:flex items-center justify-center min-h-screen px-6 xl:px-8 py-12">
        <div className="w-full max-w-md xl:max-w-lg min-w-[320px]">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 xl:p-10 shadow-2xl">
            <CompanyLoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompanyLoginPage;

