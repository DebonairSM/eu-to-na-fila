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
        className="bg-gradient-to-br from-[color-mix(in_srgb,var(--shop-accent)_15%,transparent)] to-[color-mix(in_srgb,var(--shop-accent)_5%,transparent)] border-2 border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] text-center"
      >
        <CardContent className="p-10">
          <div className="flex items-center justify-center gap-3 mb-6 text-[var(--shop-text-secondary)] text-sm uppercase tracking-wider">
            <span className="material-symbols-outlined text-2xl text-[var(--shop-accent)]">
              schedule
            </span>
          </div>
          <Heading
            level={1}
            className="text-6xl font-semibold text-[var(--shop-text-primary)] mb-3 drop-shadow-[0_4px_20px_color-mix(in_srgb,var(--shop-accent)_30%,transparent)] leading-tight"
          >
            {waitTime === null ? '--' : waitTime <= 0 ? 'Agora' : waitTime}
          </Heading>
          <Text size="lg" variant="secondary" className="mb-6 text-xl">
            {waitTime !== null && waitTime <= 0 ? 'sua vez chegou' : 'minutos'}
          </Text>

          {position !== undefined && total !== undefined && (
            <div className="mt-6 pt-6 border-t border-[color-mix(in_srgb,var(--shop-accent)_20%,transparent)]">
              <Text size="sm" variant="secondary" className="mb-2">
                Posição na fila
              </Text>
              <Text size="xl" className="text-[var(--shop-accent)] font-semibold text-4xl">
                {position} de {total}
              </Text>
              {ahead !== undefined && ahead > 0 && (
                <Text size="xs" variant="tertiary" className="mt-2">
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
