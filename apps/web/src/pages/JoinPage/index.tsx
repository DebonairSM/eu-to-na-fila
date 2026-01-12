import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { JoinForm } from './JoinForm';
import { Container, Heading } from '@/components/design-system';

/**
 * JoinPage component - renders the join form.
 * 
 * Active ticket checking is handled by JoinPageGuard, which wraps this component.
 * This component only handles rendering the form UI.
 */
export function JoinPage() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPage/index.tsx:12',message:'JoinPage RENDERED - This means guard allowed it',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  console.warn('[JoinPage] ⚠️ RENDERED - This should NOT happen if user has active ticket!');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,0.03)_0%,transparent_50%)] animate-spin-slow pointer-events-none" />
      <Navigation />

      <Container className="relative z-10 pt-20 pb-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <Heading level={1} className="mb-8 text-3xl">
              Entrar na Fila
            </Heading>
          </div>

          <JoinForm />

          <p className="text-center text-sm text-[rgba(255,255,255,0.7)]">
            <Link to="/home" className="text-[#D4AF37] hover:underline">
              Ver status
            </Link>
          </p>
        </div>
      </Container>
    </div>
  );
}
