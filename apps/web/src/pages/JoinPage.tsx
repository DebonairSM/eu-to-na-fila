import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { useQueue } from '@/hooks/useQueue';
import { useProfanityFilter } from '@/hooks/useProfanityFilter';
import { Button } from '@/components/ui/button';
import { WaitTimeDisplay } from '@/components/WaitTimeDisplay';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Navigation } from '@/components/Navigation';

const AVG_SERVICE_TIME = 20; // minutes

export function JoinPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { validateName } = useProfanityFilter();
  const { data, isLoading: queueLoading, error: queueError } = useQueue(30000); // Poll every 30s

  // Calculate wait time
  const waitTime = (() => {
    if (!data) return null;
    const waitingCount = data.tickets.filter((t) => t.status === 'waiting').length;
    const presentBarbers = data.tickets
      .filter((t) => t.status === 'in_progress')
      .map((t) => t.barberId)
      .filter((id): id is number => id !== null);
    const activeBarbers = new Set(presentBarbers).size || 1;

    if (waitingCount === 0) return 0;
    const estimated = Math.ceil((waitingCount / activeBarbers) * AVG_SERVICE_TIME);
    return Math.max(5, Math.round(estimated / 5) * 5); // Round to nearest 5
  })();

  // Real-time validation
  useEffect(() => {
    if (firstName.trim().length === 0) {
      setValidationError(null);
      return;
    }

    const validation = validateName(firstName, lastName);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Nome inválido');
    } else {
      setValidationError(null);
    }
  }, [firstName, lastName, validateName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validation = validateName(firstName, lastName);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Nome inválido');
      return;
    }

    const fullName = lastName.trim()
      ? `${firstName.trim()} ${lastName.trim()}`
      : firstName.trim();

    setIsSubmitting(true);

    try {
      const ticket = await api.createTicket(config.slug, {
        customerName: fullName,
        serviceId: 1, // Default service
      });

      navigate(`/status/${ticket.id}`);
    } catch (error: any) {
      if (error instanceof Error) {
        setSubmitError(error.message);
      } else if (error?.error) {
        setSubmitError(error.error);
      } else {
        setSubmitError('Erro ao entrar na fila. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-md">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-4xl text-primary-foreground">
                person_add
              </span>
            </div>
            <h1 className="text-3xl font-bold">Entrar na Fila</h1>
            <p className="text-muted-foreground">Adicione seu nome e aguarde ser chamado</p>
          </div>

          {/* Wait Time Display */}
          {queueLoading ? (
            <div className="py-8">
              <LoadingSpinner text="Calculando tempo de espera..." />
            </div>
          ) : queueError ? (
            <div className="py-4">
              <p className="text-sm text-muted-foreground text-center">
                Não foi possível calcular o tempo de espera
              </p>
            </div>
          ) : (
            <WaitTimeDisplay minutes={waitTime} />
          )}

          {/* Form */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* First Name */}
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2"
                >
                  Nome *
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Seu primeiro nome"
                  autoComplete="off"
                  required
                  className={`w-full px-4 py-3 rounded-lg bg-muted/50 border transition-colors
                    focus:outline-none focus:ring-2 focus:ring-ring
                    ${validationError ? 'border-destructive' : 'border-border'}
                  `}
                />
                {validationError && (
                  <p className="mt-2 text-sm text-destructive">{validationError}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2"
                >
                  Sobrenome (opcional)
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Seu sobrenome"
                  autoComplete="off"
                  className="w-full px-4 py-3 rounded-lg bg-muted/50 border border-border transition-colors
                    focus:outline-none focus:ring-2 focus:ring-ring
                  "
                />
              </div>

              {/* Submit Error */}
              {submitError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{submitError}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting || !!validationError}
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">hourglass_top</span>
                    Entrando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">check</span>
                    Entrar na Fila
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Info Text */}
          <p className="text-center text-sm text-muted-foreground">
            Já está na fila?{' '}
            <Link to="/" className="text-primary hover:underline">
              Verificar status
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
