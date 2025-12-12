import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useTicketStatus } from '@/hooks/useTicketStatus';
import { useQueue } from '@/hooks/useQueue';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Navigation } from '@/components/Navigation';
import { cn, getErrorMessage } from '@/lib/utils';
import type { Barber } from '@eutonafila/shared';
import { config } from '@/lib/config';

export function StatusPage() {
  const { id } = useParams<{ id: string }>();
  const ticketIdFromParams = id ? parseInt(id, 10) : null;
  const navigate = useNavigate();
  const { ticket, isLoading, error } = useTicketStatus(ticketIdFromParams);
  const { data: queueData } = useQueue(3000); // Poll every 3s
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [barber, setBarber] = useState<Barber | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const hasStoredTicketRef = useRef(false);

  // Fetch barber information when ticket has barberId
  useEffect(() => {
    const fetchBarber = async () => {
      if (!ticket?.barberId) {
        setBarber(null);
        return;
      }

      try {
        const barbers = await api.getBarbers(config.slug);
        const assignedBarber = barbers.find(b => b.id === ticket.barberId);
        setBarber(assignedBarber || null);
      } catch (error) {
        console.error('Failed to fetch barber:', error);
        setBarber(null);
      }
    };

    fetchBarber();
  }, [ticket?.barberId]);

  // Extract stable values for dependencies (must be before conditional returns)
  const ticketId = ticket?.id ?? null;
  const ticketStatus = ticket?.status ?? null;

  // Handle localStorage updates based on ticket status (MUST be before conditional returns)
  useEffect(() => {
    if (!ticketStatus || ticketId === null) return;
    
    const prevStatus = prevStatusRef.current;
    
    // Only update if status actually changed
    if (prevStatus === ticketStatus) {
      return;
    }
    
    // Update ref immediately to prevent re-running
    prevStatusRef.current = ticketStatus;
    
    // Handle localStorage based on status
    if (ticketStatus === 'completed' || ticketStatus === 'cancelled') {
      // Clear if it was stored
      const storedTicketId = localStorage.getItem('eutonafila_active_ticket_id');
      if (storedTicketId === ticketId.toString()) {
        localStorage.removeItem('eutonafila_active_ticket_id');
        hasStoredTicketRef.current = false;
      }
    } else if ((ticketStatus === 'waiting' || ticketStatus === 'in_progress') && !hasStoredTicketRef.current) {
      // Store only if we haven't stored it yet
      localStorage.setItem('eutonafila_active_ticket_id', ticketId.toString());
      hasStoredTicketRef.current = true;
    }
  }, [ticketStatus, ticketId]);

  // Use API-provided estimatedWaitTime only
  const waitTime = ticket?.estimatedWaitTime ?? null;

  const handleLeaveQueue = async () => {
    if (!ticketIdFromParams) return;

    setIsLeaving(true);
    try {
      await api.cancelTicket(ticketIdFromParams);
      // Clear stored ticket ID when leaving queue
      localStorage.removeItem('eutonafila_active_ticket_id');
      navigate('/mineiro/home');
    } catch (error) {
      // Show error to user - could be enhanced with toast notification
      const errorMsg = getErrorMessage(error, 'Erro ao sair da fila. Tente novamente.');
      // For now, we'll just log it since StatusPage doesn't have error state management
      console.error('Error leaving queue:', errorMsg);
    } finally {
      setIsLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative">
        <Navigation />
        <div className="container relative z-10 mx-auto px-4 sm:px-5 pt-20 sm:pt-[100px] pb-12 max-w-[480px]">
          <div className="text-center space-y-4">
            <p className="text-[rgba(255,255,255,0.7)]">Nenhum ticket ID fornecido</p>
            <Link to="/mineiro/home">
              <button className="px-4 py-2 bg-transparent text-[rgba(255,255,255,0.7)] border-2 border-[rgba(255,255,255,0.3)] rounded-lg hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all">
                Voltar ao Início
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative">
        <Navigation />
        <div className="container relative z-10 mx-auto px-4 sm:px-5 pt-20 sm:pt-[100px] pb-12 max-w-[480px]">
          <LoadingSpinner size="lg" text="Carregando status do ticket..." />
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative">
        <Navigation />
        <div className="container relative z-10 mx-auto px-4 sm:px-5 pt-20 sm:pt-[100px] pb-12 max-w-[480px]">
          <ErrorDisplay
            error={error || new Error('Ticket não encontrado')}
            onRetry={() => window.location.reload()}
          />
          <div className="mt-4">
            <Link to="/mineiro/home">
              <button className="w-full px-4 py-2 bg-transparent text-[rgba(255,255,255,0.7)] border-2 border-[rgba(255,255,255,0.3)] rounded-lg hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all">
                Voltar ao Início
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isWaiting = ticket.status === 'waiting';
  const isInProgress = ticket.status === 'in_progress';
  const isCompleted = ticket.status === 'completed';

  // Calculate position info
  const positionInfo = (() => {
    if (!isWaiting || !queueData) return null;
    const waitingTickets = queueData.tickets.filter((t) => t.status === 'waiting');
    const aheadCount = waitingTickets.filter((t) => t.position < ticket.position).length;
    return {
      position: ticket.position,
      ahead: aheadCount,
      total: waitingTickets.length,
    };
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,0.03)_0%,transparent_50%)] animate-spin-slow pointer-events-none" />
      <Navigation />
      <div className="container relative z-10 mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-16 max-w-2xl">
        <div className="space-y-8 sm:space-y-12">
          {/* Hero Section - Customer Name */}
          <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="font-['Playfair_Display',serif] text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
              {ticket.customerName}
            </h1>
            
            {/* Status Badge */}
            <div
              className={cn(
                'inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold uppercase tracking-wider transition-all duration-300 shadow-lg',
                {
                  'bg-[rgba(212,175,55,0.15)] border border-[#D4AF37]/50 text-[#D4AF37] backdrop-blur-sm animate-pulse': isWaiting,
                  'bg-[rgba(34,197,94,0.15)] border border-[#22c55e]/50 text-[#22c55e] backdrop-blur-sm': isInProgress,
                  'bg-[rgba(34,197,94,0.2)] border border-[#22c55e]/60 text-[#22c55e] backdrop-blur-sm': isCompleted,
                }
              )}
            >
              <span className="material-symbols-outlined text-lg">
                {isWaiting
                  ? 'schedule'
                  : isInProgress
                  ? 'content_cut'
                  : 'check_circle'}
              </span>
              <span>
                {isWaiting
                  ? 'Aguardando'
                  : isInProgress
                  ? 'Em Atendimento'
                  : 'Concluído'}
              </span>
            </div>
          </div>
          {/* Waiting State */}
          {isWaiting && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
              {/* Time Display Card */}
              <div className="bg-gradient-to-br from-[rgba(212,175,55,0.12)] to-[rgba(212,175,55,0.04)] backdrop-blur-sm border border-[rgba(212,175,55,0.25)] rounded-2xl p-8 sm:p-12 text-center shadow-2xl shadow-[rgba(212,175,55,0.1)] hover:shadow-[rgba(212,175,55,0.2)] transition-all duration-300">
                <div className="flex items-center justify-center gap-2 mb-6 text-[rgba(255,255,255,0.6)] text-xs uppercase tracking-[0.15em] font-medium">
                  <span className="material-symbols-outlined text-base text-[#D4AF37]">schedule</span>
                  <span>Tempo estimado</span>
                </div>
                
                <div className="relative">
                  <div className="font-['Playfair_Display',serif] text-7xl sm:text-8xl md:text-9xl font-bold text-white mb-2 leading-none drop-shadow-[0_8px_32px_rgba(212,175,55,0.4)] animate-pulse">
                    {waitTime !== null ? waitTime : '--'}
                  </div>
                  <div className="text-lg sm:text-xl text-[rgba(255,255,255,0.7)] font-light tracking-wide">
                    {waitTime !== null ? (waitTime === 1 ? 'minuto' : 'minutos') : ''}
                  </div>
                </div>
              </div>

              {/* Queue Position Card */}
              {positionInfo && (
                <div className="bg-[rgba(255,255,255,0.03)] backdrop-blur-sm border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 sm:p-8 shadow-lg hover:border-[rgba(212,175,55,0.3)] transition-all duration-300">
                  <div className="text-center space-y-3">
                    <p className="text-sm text-[rgba(255,255,255,0.6)] uppercase tracking-wider font-medium">
                      Posição na fila
                    </p>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="font-['Playfair_Display',serif] text-4xl sm:text-5xl font-bold text-[#D4AF37]">
                        {positionInfo.position}
                      </span>
                      <span className="text-xl text-[rgba(255,255,255,0.5)]">/</span>
                      <span className="text-2xl text-[rgba(255,255,255,0.7)] font-semibold">
                        {positionInfo.total}
                      </span>
                    </div>
                    {positionInfo.ahead > 0 && (
                      <p className="text-sm text-[rgba(255,255,255,0.5)] pt-2">
                        {positionInfo.ahead} {positionInfo.ahead === 1 ? 'pessoa à frente' : 'pessoas à frente'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* In Progress State */}
          {isInProgress && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="bg-gradient-to-br from-[rgba(34,197,94,0.15)] to-[rgba(34,197,94,0.05)] backdrop-blur-sm border border-[rgba(34,197,94,0.3)] rounded-2xl p-10 sm:p-14 text-center shadow-2xl shadow-[rgba(34,197,94,0.15)]">
                <div className="relative inline-block mb-6">
                  <span className="material-symbols-outlined text-6xl sm:text-7xl text-[#22c55e] block animate-pulse">
                    content_cut
                  </span>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-[#22c55e]/30 rounded-full animate-ping"></div>
                  </div>
                </div>
                
                <h2 className="font-['Playfair_Display',serif] text-2xl sm:text-3xl font-bold text-white mb-8">
                  Em Atendimento
                </h2>

                {barber && (
                  <div className="mt-8 pt-8 border-t border-[rgba(34,197,94,0.2)]">
                    <p className="text-sm text-[rgba(255,255,255,0.6)] uppercase tracking-wider font-medium mb-3">
                      Seu Barbeiro
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[rgba(34,197,94,0.2)] border-2 border-[#22c55e]/50 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl sm:text-3xl text-[#22c55e]">
                          person
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-[#22c55e]">
                        {barber.name}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Completed State */}
          {isCompleted && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="bg-gradient-to-br from-[#22c55e] to-[#16a34a] rounded-2xl p-10 sm:p-14 text-center shadow-2xl shadow-[rgba(34,197,94,0.3)] relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]"></div>
                <div className="relative z-10">
                  <div className="relative inline-block mb-6">
                    <span className="material-symbols-outlined text-7xl sm:text-8xl text-white block">
                      check_circle
                    </span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 border-2 border-white/30 rounded-full animate-ping"></div>
                    </div>
                  </div>
                  
                  <h2 className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-bold text-white mb-8">
                    Concluído
                  </h2>

                  {barber && (
                    <div className="mt-8 pt-8 border-t border-white/20">
                      <p className="text-sm text-white/90 uppercase tracking-wider font-medium mb-4">
                        Atendido por
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-2xl sm:text-3xl text-white">
                            person
                          </span>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-white">
                          {barber.name}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            {isWaiting && (
              <button
                className="w-full px-6 py-4 bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-white font-semibold rounded-xl flex items-center justify-center gap-3 hover:from-[#dc2626] hover:to-[#b91c1c] hover:shadow-lg hover:shadow-red-500/20 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 min-h-[52px] text-base shadow-lg shadow-red-500/10"
                onClick={() => setShowLeaveConfirm(true)}
                disabled={isLeaving}
              >
                {isLeaving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-xl">hourglass_top</span>
                    <span>Saindo...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">exit_to_app</span>
                    <span>Sair da Fila</span>
                  </>
                )}
              </button>
            )}

            {isCompleted && (
              <Link to="/mineiro/home" className="block">
                <button className="w-full px-6 py-4 bg-gradient-to-r from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-bold rounded-xl flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-[#D4AF37]/30 hover:-translate-y-0.5 transition-all duration-300 min-h-[52px] text-base shadow-lg shadow-[#D4AF37]/20">
                  <span className="material-symbols-outlined text-xl">home</span>
                  <span>Voltar ao Início</span>
                </button>
              </Link>
            )}

            <Link to="/mineiro/home" className="block">
              <button className="w-full px-6 py-3.5 bg-[rgba(255,255,255,0.05)] backdrop-blur-sm text-[rgba(255,255,255,0.9)] border border-[rgba(255,255,255,0.15)] rounded-xl flex items-center justify-center gap-2.5 hover:bg-[rgba(255,255,255,0.1)] hover:border-[#D4AF37]/50 hover:text-[#D4AF37] transition-all duration-300 min-h-[48px] text-sm font-medium">
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                <span>Voltar</span>
              </button>
            </Link>
          </div>

        </div>
      </div>

      {/* Leave Queue Confirmation */}
      <ConfirmationDialog
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeaveQueue}
        title="Sair da Fila?"
        message={`Tem certeza que deseja sair da fila? Você perderá sua posição.`}
        confirmText="Sair"
        cancelText="Cancelar"
        variant="destructive"
        icon="exit_to_app"
      />
    </div>
  );
}
