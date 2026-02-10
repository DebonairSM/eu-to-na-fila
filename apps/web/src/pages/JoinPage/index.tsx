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
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />

      <Container className="pt-20 md:pt-28 lg:pt-32 pb-10 join-page-content">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <Heading level={1} className="section-title section-title--layout mb-8 text-3xl">
              Entrar na Fila
            </Heading>
          </div>

          <JoinForm />

          <p className="text-center text-sm text-[rgba(255,255,255,0.7)]">
            <Link to="/home" className="text-[var(--shop-accent)] hover:underline hover:text-[var(--shop-accent-hover)]">
              Ver status
            </Link>
          </p>
        </div>
      </Container>
    </div>
  );
}
