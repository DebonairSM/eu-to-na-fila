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

      <Container className="pt-20 pb-10">
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
