import { Card, CardContent, Heading, Text, StatusTransition } from '@/components/design-system';

interface CompletedCardProps {
  barberName?: string;
}

export function CompletedCard({ barberName }: CompletedCardProps) {
  return (
    <StatusTransition status="completed">
      <Card
        variant="outlined"
        className="bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-center"
      >
        <CardContent className="p-8 sm:p-10 lg:p-12">
          <span className="material-symbols-outlined text-5xl sm:text-6xl lg:text-7xl text-white mb-4 sm:mb-6 block">
            check_circle
          </span>
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
