import { Card, CardContent, Heading, Text, StatusTransition } from '@/components/design-system';

interface InProgressCardProps {
  barberName?: string;
}

export function InProgressCard({ barberName }: InProgressCardProps) {
  return (
    <StatusTransition status="in-progress">
      <Card
        variant="outlined"
        className="bg-gradient-to-br from-[rgba(255,255,255,0.2)] to-[rgba(255,255,255,0.05)] border-2 border-[rgba(255,255,255,0.3)] text-center"
      >
        <CardContent className="p-8 sm:p-10 lg:p-12">
          <span className="material-symbols-outlined text-5xl sm:text-6xl lg:text-7xl text-white mb-4 sm:mb-6 block">
            content_cut
          </span>
          <Heading level={2} className="mb-4 sm:mb-6 text-xl sm:text-2xl lg:text-3xl">
            Em atendimento
          </Heading>
          {barberName && (
            <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-[rgba(255,255,255,0.2)]">
              <Text size="sm" variant="secondary" className="mb-3 sm:mb-4 text-sm sm:text-base">
                Seu barbeiro
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
