import { Navigation } from '@/components/Navigation';
import { RootSiteNav } from '@/components/RootSiteNav';
import { CompanyLoginForm } from './CompanyLoginForm';
import { isRootBuild } from '@/lib/build';
import { Container } from '@/components/design-system/Spacing/Container';

export function CompanyLoginPage() {
  const useRootTheme = isRootBuild();

  if (useRootTheme) {
    return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <RootSiteNav />
      <main className="py-20">
        <Container size="2xl">
          <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
            <div className="w-full max-w-md">
              <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
                <CompanyLoginForm />
              </div>
            </div>
          </div>
          </Container>
        </main>
      </div>
    );
  }

  // Mineiro build - keep existing styling
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

