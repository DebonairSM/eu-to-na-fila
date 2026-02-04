import { Card, CardContent, Heading, Text, StatusTransition } from '@/components/design-system';

interface CompletedCardProps {
  barberName?: string;
}

export function CompletedCard({ barberName }: CompletedCardProps) {
  return (
    <StatusTransition status="completed">
      <Card
        variant="outlined"
        className="border-[#D4AF37]/40 bg-[rgba(255,255,255,0.03)] text-center overflow-visible"
      >
        <CardContent className="p-8 sm:p-10 lg:p-12">
          <div className="inline-flex items-center justify-center mb-4 sm:mb-6 animate-checkmark-glow">
            <svg
              viewBox="0 0 64 64"
              className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-[#D4AF37]"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle
                cx="32"
                cy="32"
                r="28"
                className="text-[#D4AF37]/30 stroke-[#D4AF37] animate-checkmark-circle-draw"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                style={{ strokeDasharray: 176 }}
              />
              <path
                d="M18 32l8 8 20-24"
                style={{ strokeDasharray: 100 }}
                className="animate-checkmark-draw"
              />
            </svg>
          </div>
          <Heading level={2} className="mb-4 sm:mb-6 text-white text-xl sm:text-2xl lg:text-3xl">
            Concluído
          </Heading>
          {barberName && (
            <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/20">
              <Text size="sm" variant="secondary" className="mb-3 sm:mb-4 text-white/80 text-sm sm:text-base">
                Atendido por
              </Text>
              <Text
                size="xl"
                className="text-white font-semibold text-xl sm:text-2xl lg:text-3xl flex items-center justify-center gap-2 sm:gap-3"
              >
                <span className="material-symbols-outlined text-xl sm:text-2xl lg:text-3xl">
                  content_cut
                </span>
                {barberName}
              </Text>
            </div>
          )}
        </CardContent>
      </Card>
    </StatusTransition>
  );
}
