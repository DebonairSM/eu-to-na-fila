interface CompletedCardProps {
  barberName?: string;
}

export function CompletedCard({ barberName }: CompletedCardProps) {
  return (
    <div className="completed-card bg-gradient-to-br from-[#22c55e] to-[#16a34a] rounded-2xl lg:rounded-3xl p-8 sm:p-10 lg:p-12 text-center">
      <span className="material-symbols-outlined text-5xl sm:text-6xl lg:text-7xl text-white mb-4 sm:mb-6 block">check_circle</span>
      <div className="progress-title font-['Playfair_Display',serif] text-xl sm:text-2xl lg:text-3xl text-white mb-4 sm:mb-6">
        Concluído
      </div>
      {barberName && (
        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/20">
          <p className="text-sm sm:text-base text-white/80 mb-3 sm:mb-4">
            Atendido por
          </p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white flex items-center justify-center gap-2 sm:gap-3">
            <span className="material-symbols-outlined text-xl sm:text-2xl lg:text-3xl">content_cut</span>
            {barberName}
          </p>
        </div>
      )}
    </div>
  );
}
