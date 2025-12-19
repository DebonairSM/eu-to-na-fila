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
    <Card variant="default" className="shadow-lg min-w-[320px]">
      <CardContent className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} autoComplete="off">
          <Stack spacing="lg">
            <div className="flex flex-row gap-4 items-start flex-nowrap">
              <div className="flex-1 min-w-[120px] sm:min-w-[200px]">
                <InputLabel htmlFor="customerName">Nome *</InputLabel>
                <Input
                  id="customerName"
                  type="text"
                  value={firstName}
                  onChange={handleFirstNameChange}
                  placeholder="Primeiro nome"
                  autoComplete="one-time-code"
                  autoCapitalize="words"
                  autoCorrect="off"
                  spellCheck="false"
                  inputMode="text"
                  data-lpignore="true"
                  data-form-type="other"
                  required
                  error={!!validationError}
                  onFocus={(e) => {
                    // Prevent autofill UI by temporarily making readOnly
                    const input = e.target as HTMLInputElement;
                    input.setAttribute('readonly', 'readonly');
                    setTimeout(() => {
                      input.removeAttribute('readonly');
                    }, 100);
                  }}
                />
                <InputError message={validationError || ''} />
              </div>

              <div className="w-14 sm:w-32 flex-shrink-0">
                <InputLabel htmlFor="customerLastName">Inicial</InputLabel>
                <Input
                  id="customerLastName"
                  type="text"
                  value={lastName}
                  onChange={handleLastNameChange}
                  placeholder="Inicial"
                  autoComplete="one-time-code"
                  autoCapitalize="words"
                  autoCorrect="off"
                  spellCheck="false"
                  inputMode="text"
                  maxLength={1}
                  className="w-32"
                  data-lpignore="true"
                  data-form-type="other"
                  onFocus={(e) => {
                    // Prevent autofill UI by temporarily making readOnly
                    const input = e.target as HTMLInputElement;
                    input.setAttribute('readonly', 'readonly');
                    setTimeout(() => {
                      input.removeAttribute('readonly');
                    }, 100);
                  }}
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
