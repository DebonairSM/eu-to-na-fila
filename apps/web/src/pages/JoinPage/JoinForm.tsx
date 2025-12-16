import { useJoinForm } from './hooks/useJoinForm';
import { BarberSelection } from './BarberSelection';
import { Card, CardContent, Input, InputLabel, InputError, Button, Stack } from '@/components/design-system';

export function JoinForm() {
  const {
    firstName,
    lastName,
    handleFirstNameChange,
    handleLastNameChange,
    validationError,
    isSubmitting,
    submitError,
    isAlreadyInQueue,
    existingTicketId,
    nameCollisionError,
    handleSubmit,
    navigate,
    selectedBarberId,
    setSelectedBarberId,
    waitTimes,
    isLoadingWaitTimes,
    barbers,
  } = useJoinForm();

  return (
    <Card variant="default" className="shadow-lg">
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} autoComplete="off">
          <Stack spacing="lg">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <InputLabel htmlFor="customerName">Nome *</InputLabel>
                <Input
                  id="customerName"
                  type="text"
                  value={firstName}
                  onChange={handleFirstNameChange}
                  placeholder="Primeiro nome"
                  autoComplete="new-password"
                  autoCapitalize="words"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                  error={!!validationError}
                />
                <InputError message={validationError || ''} />
              </div>

              <div className="sm:w-48">
                <InputLabel htmlFor="customerLastName">Sobrenome</InputLabel>
                <Input
                  id="customerLastName"
                  type="text"
                  value={lastName}
                  onChange={handleLastNameChange}
                  placeholder="Opcional"
                  autoComplete="new-password"
                  autoCapitalize="words"
                  autoCorrect="off"
                  spellCheck="false"
                />
              </div>
            </div>

            {nameCollisionError && (
              <div className="p-4 rounded-lg bg-[#ef4444]/20 border-2 border-[#ef4444] flex items-start gap-3">
                <span className="material-symbols-outlined text-[#ef4444] text-xl flex-shrink-0 mt-0.5">
                  warning
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#ef4444] mb-1">Nome já está em uso</p>
                  <p className="text-sm text-[#ef4444]/90">{nameCollisionError}</p>
                </div>
              </div>
            )}

            {isAlreadyInQueue && existingTicketId && (
              <div className="p-5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#D4AF37] text-2xl">info</span>
                  <div className="flex-1 space-y-3">
                    <p className="text-sm font-semibold text-[#D4AF37]">Ticket ativo encontrado</p>
                    <Button
                      type="button"
                      onClick={() => navigate(`/status/${existingTicketId}`)}
                      fullWidth
                    >
                      Ver status
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {submitError && (
              <div className="p-4 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20">
                <p className="text-sm text-[#ef4444] flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  {submitError}
                </p>
              </div>
            )}

            <BarberSelection
              barbers={barbers}
              waitTimes={waitTimes}
              selectedBarberId={selectedBarberId}
              onSelect={setSelectedBarberId}
              isLoading={isLoadingWaitTimes}
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              disabled={isSubmitting || !!validationError || isAlreadyInQueue || !!nameCollisionError}
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-xl">hourglass_top</span>
                  Entrando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">check</span>
                  Confirmar entrada
                </>
              )}
            </Button>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
