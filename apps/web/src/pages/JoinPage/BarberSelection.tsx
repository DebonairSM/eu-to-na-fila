import { useMemo } from 'react';
import { Card, CardContent, Text, Stack } from '@/components/design-system';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { cn } from '@/lib/utils';
import type { Barber } from '@eutonafila/shared';

interface BarberWaitTime {
  barberId: number;
  barberName: string;
  waitTime: number | null;
  isPresent: boolean;
}

interface BarberSelectionProps {
  barbers: Barber[];
  waitTimes: {
    standardWaitTime: number | null;
    barberWaitTimes: BarberWaitTime[];
  } | null;
  selectedBarberId: number | null;
  onSelect: (barberId: number | null) => void;
  isLoading?: boolean;
}

export function BarberSelection({
  barbers,
  waitTimes,
  selectedBarberId,
  onSelect,
  isLoading = false,
}: BarberSelectionProps) {
  // Find the fastest option (lowest wait time)
  const fastestOption = useMemo(() => {
    if (!waitTimes) return null;

    const options: Array<{ id: number | null; name: string; waitTime: number | null }> = [
      { id: null, name: 'Fila Padrão', waitTime: waitTimes.standardWaitTime },
      ...waitTimes.barberWaitTimes
        .filter((bt) => bt.isPresent)
        .map((bt) => ({ id: bt.barberId, name: bt.barberName, waitTime: bt.waitTime })),
    ];

    const validOptions = options.filter((opt) => opt.waitTime !== null);
    if (validOptions.length === 0) return null;

    return validOptions.reduce((fastest, current) => {
      if (!fastest || !current.waitTime) return current;
      if (!fastest.waitTime) return current;
      return current.waitTime < fastest.waitTime ? current : fastest;
    }, validOptions[0] as typeof validOptions[0] | null);
  }, [waitTimes]);

  const formatWaitTime = (waitTime: number | null): string => {
    if (waitTime === null) return '--';
    if (waitTime === 0) return 'Agora';
    return `${waitTime} ${waitTime === 1 ? 'minuto' : 'minutos'}`;
  };

  if (isLoading) {
    return (
      <Card variant="default">
        <CardContent className="p-6">
          <LoadingSpinner text="Carregando tempos de espera..." size="sm" />
        </CardContent>
      </Card>
    );
  }

  if (!waitTimes) {
    return null;
  }

  return (
    <Card variant="default" className="shadow-lg">
      <CardContent className="p-6 sm:p-8">
        <Stack spacing="md">
          <div>
            <Text size="lg" className="font-semibold text-white mb-1">
              Escolha um Barbeiro (Opcional)
            </Text>
            <Text size="sm" variant="secondary">
              Selecione um barbeiro específico ou use a fila padrão
            </Text>
          </div>

          <div className="space-y-3">
            {/* Standard Queue Option */}
            <button
              type="button"
              onClick={() => onSelect(null)}
              className={cn(
                'w-full text-left p-4 rounded-lg border-2 transition-all',
                'focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]',
                selectedBarberId === null
                  ? 'bg-[rgba(212,175,55,0.15)] border-[#D4AF37] shadow-lg shadow-[rgba(212,175,55,0.2)]'
                  : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.2)] hover:border-[rgba(212,175,55,0.4)] hover:bg-[rgba(212,175,55,0.05)]',
                fastestOption?.id === null && selectedBarberId !== null && 'ring-2 ring-[#22c55e]/50'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                      selectedBarberId === null
                        ? 'border-[#D4AF37] bg-[#D4AF37]'
                        : 'border-[rgba(255,255,255,0.3)] bg-transparent'
                    )}
                  >
                    {selectedBarberId === null && (
                      <span className="w-2 h-2 rounded-full bg-[#0a0a0a]" />
                    )}
                  </div>
                  <div>
                    <Text size="base" className="font-semibold text-white">
                      Fila Padrão
                    </Text>
                    <Text size="sm" variant="secondary">
                      Qualquer barbeiro disponível
                    </Text>
                  </div>
                </div>
                <div className="text-right">
                  <Text size="lg" className="font-bold text-[#D4AF37]">
                    {formatWaitTime(waitTimes.standardWaitTime)}
                  </Text>
                  {fastestOption?.id === null && selectedBarberId !== null && (
                    <Text size="xs" className="text-[#22c55e] mt-1">
                      Mais rápido
                    </Text>
                  )}
                </div>
              </div>
            </button>

            {/* Barber Options */}
            {waitTimes.barberWaitTimes
              .filter((bt) => bt.isPresent)
              .map((barberWaitTime) => {
                const barber = barbers.find((b) => b.id === barberWaitTime.barberId);
                if (!barber) return null;

                const isSelected = selectedBarberId === barberWaitTime.barberId;
                const isFastest = fastestOption?.id === barberWaitTime.barberId && !isSelected;

                return (
                  <button
                    key={barberWaitTime.barberId}
                    type="button"
                    onClick={() => onSelect(barberWaitTime.barberId)}
                    className={cn(
                      'w-full text-left p-4 rounded-lg border-2 transition-all',
                      'focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]',
                      isSelected
                        ? 'bg-[rgba(212,175,55,0.15)] border-[#D4AF37] shadow-lg shadow-[rgba(212,175,55,0.2)]'
                        : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.2)] hover:border-[rgba(212,175,55,0.4)] hover:bg-[rgba(212,175,55,0.05)]',
                      isFastest && 'ring-2 ring-[#22c55e]/50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                            isSelected
                              ? 'border-[#D4AF37] bg-[#D4AF37]'
                              : 'border-[rgba(255,255,255,0.3)] bg-transparent'
                          )}
                        >
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-[#0a0a0a]" />
                          )}
                        </div>
                        <div>
                          <Text size="base" className="font-semibold text-white">
                            {barberWaitTime.barberName}
                          </Text>
                          <Text size="sm" variant="secondary">
                            Barbeiro específico
                          </Text>
                        </div>
                      </div>
                      <div className="text-right">
                        <Text size="lg" className="font-bold text-[#D4AF37]">
                          {formatWaitTime(barberWaitTime.waitTime)}
                        </Text>
                        {isFastest && (
                          <Text size="xs" className="text-[#22c55e] mt-1">
                            Mais rápido
                          </Text>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>

          {waitTimes.barberWaitTimes.filter((bt) => !bt.isPresent).length > 0 && (
            <div className="pt-4 border-t border-[rgba(255,255,255,0.1)]">
              <Text size="sm" variant="secondary" className="mb-2">
                Barbeiros indisponíveis:
              </Text>
              <div className="flex flex-wrap gap-2">
                {waitTimes.barberWaitTimes
                  .filter((bt) => !bt.isPresent)
                  .map((bt) => (
                    <span
                      key={bt.barberId}
                      className="px-3 py-1 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-sm text-[rgba(255,255,255,0.5)]"
                    >
                      {bt.barberName}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

