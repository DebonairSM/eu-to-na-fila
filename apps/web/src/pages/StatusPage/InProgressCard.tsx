interface InProgressCardProps {
  barberName?: string;
}

export function InProgressCard({ barberName }: InProgressCardProps) {
  return (
    <div className="progress-card bg-gradient-to-br from-[rgba(34,197,94,0.2)] to-[rgba(34,197,94,0.05)] border-2 border-[rgba(34,197,94,0.3)] rounded-2xl lg:rounded-3xl p-8 sm:p-10 lg:p-12 text-center">
      <span className="material-symbols-outlined text-5xl sm:text-6xl lg:text-7xl text-[#22c55e] mb-4 sm:mb-6 block">content_cut</span>
      <div className="progress-title font-['Playfair_Display',serif] text-xl sm:text-2xl lg:text-3xl text-white mb-4 sm:mb-6">
        Em atendimento
      </div>
      {barberName && (
        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-[rgba(34,197,94,0.2)]">
          <p className="text-sm sm:text-base text-[rgba(255,255,255,0.7)] mb-3 sm:mb-4">
            Seu barbeiro
          </p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-semibold text-[#22c55e] flex items-center justify-center gap-2 sm:gap-3">
            <span className="material-symbols-outlined text-xl sm:text-2xl lg:text-3xl">content_cut</span>
            {barberName}
          </p>
        </div>
      )}
    </div>
  );
}
