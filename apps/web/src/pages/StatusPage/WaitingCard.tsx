interface WaitingCardProps {
  waitTime: number | null;
  position?: number;
  total?: number;
  ahead?: number;
}

export function WaitingCard({ waitTime, position, total, ahead }: WaitingCardProps) {
  return (
    <div className="main-card bg-gradient-to-br from-[rgba(212,175,55,0.15)] to-[rgba(212,175,55,0.05)] border-2 border-[rgba(212,175,55,0.3)] rounded-2xl lg:rounded-3xl p-6 sm:p-8 lg:p-10 text-center">
      <div className="wait-label flex items-center justify-center gap-3 mb-4 sm:mb-6 text-[rgba(255,255,255,0.7)] text-xs sm:text-sm uppercase tracking-wider">
        <span className="material-symbols-outlined text-xl sm:text-2xl text-[#D4AF37]">schedule</span>
        Tempo estimado
      </div>
      <div className="wait-value font-['Playfair_Display',serif] text-4xl sm:text-5xl lg:text-6xl font-semibold text-white mb-2 sm:mb-3 drop-shadow-[0_4px_20px_rgba(212,175,55,0.3)] leading-tight">
        {waitTime !== null ? waitTime : '--'}
      </div>
      <div className="wait-unit text-base sm:text-lg lg:text-xl text-[rgba(255,255,255,0.7)] mb-6">minutos</div>
      
      {position !== undefined && total !== undefined && (
        <div className="mt-6 pt-6 border-t border-[rgba(212,175,55,0.2)]">
          <p className="text-sm sm:text-base text-[rgba(255,255,255,0.7)] mb-2">
            Posição na fila
          </p>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#D4AF37]">
            {position} de {total}
          </p>
          {ahead !== undefined && ahead > 0 && (
            <p className="text-xs sm:text-sm text-[rgba(255,255,255,0.5)] mt-2">
              {ahead} {ahead === 1 ? 'pessoa à frente' : 'pessoas à frente'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
