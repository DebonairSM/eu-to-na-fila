import { Card, CardContent, Heading, Text, StatusTransition } from '@/components/design-system';

interface WaitingCardProps {
  waitTime: number | null;
  position?: number;
  total?: number;
  ahead?: number;
}

export function WaitingCard({ waitTime, position, total, ahead }: WaitingCardProps) {
  return (
    <StatusTransition status="waiting">
      <Card
        variant="outlined"
        className="bg-gradient-to-br from-[rgba(212,175,55,0.15)] to-[rgba(212,175,55,0.05)] border-2 border-[rgba(212,175,55,0.3)] text-center"
      >
        <CardContent className="p-6 sm:p-8 lg:p-10">
          <div className="flex items-center justify-center gap-3 mb-4 sm:mb-6 text-[rgba(255,255,255,0.7)] text-xs sm:text-sm uppercase tracking-wider">
            <span className="material-symbols-outlined text-xl sm:text-2xl text-[#D4AF37]">
              schedule
            </span>
            Tempo estimado
          </div>
          <Heading
            level={1}
            className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white mb-2 sm:mb-3 drop-shadow-[0_4px_20px_rgba(212,175,55,0.3)] leading-tight"
          >
            {waitTime !== null ? waitTime : '--'}
          </Heading>
          <Text size="lg" variant="secondary" className="mb-6 text-base sm:text-lg lg:text-xl">
            minutos
          </Text>

          {position !== undefined && total !== undefined && (
            <div className="mt-6 pt-6 border-t border-[rgba(212,175,55,0.2)]">
              <Text size="sm" variant="secondary" className="mb-2 text-sm sm:text-base">
                Posição na fila
              </Text>
              <Text size="xl" className="text-[#D4AF37] font-semibold text-2xl sm:text-3xl lg:text-4xl">
                {position} de {total}
              </Text>
              {ahead !== undefined && ahead > 0 && (
                <Text size="xs" variant="tertiary" className="mt-2 text-xs sm:text-sm">
                  {ahead} {ahead === 1 ? 'pessoa à frente' : 'pessoas à frente'}
                </Text>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </StatusTransition>
  );
}
