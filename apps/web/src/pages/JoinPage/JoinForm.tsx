import { useJoinForm } from './hooks/useJoinForm';
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
  } = useJoinForm();

  return (
    <Card variant="default" className="shadow-lg">
      <CardContent className="p-6 sm:p-8 lg:p-10">
        <form onSubmit={handleSubmit}>
          <Stack spacing="lg">
            {/* Name Fields */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
              {/* First Name */}
              <div className="flex-1">
                <InputLabel htmlFor="firstName">Nome *</InputLabel>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={handleFirstNameChange}
                  placeholder="Primeiro nome"
                  autoComplete="given-name"
                  required
                  error={!!validationError}
                />
                <InputError message={validationError || ''} />
              </div>

              {/* Last Name */}
              <div className="sm:w-48">
                <InputLabel htmlFor="lastName">Sobrenome</InputLabel>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={handleLastNameChange}
                  placeholder="Opcional"
                  autoComplete="family-name"
                />
              </div>
            </div>

            {/* Name Collision Error */}
            {nameCollisionError && (
              <div className="p-4 rounded-lg bg-[#ef4444]/20 border-2 border-[#ef4444] flex items-start gap-3 animate-in slide-in-from-top-4">
                <span className="material-symbols-outlined text-[#ef4444] text-xl flex-shrink-0 mt-0.5">
                  warning
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#ef4444] mb-1">Nome já está em uso</p>
                  <p className="text-sm text-[#ef4444]/90">{nameCollisionError}</p>
                </div>
              </div>
            )}

            {/* Already in Queue Message */}
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

            {/* Submit Error */}
            {submitError && (
              <div className="p-4 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20">
                <p className="text-sm text-[#ef4444] flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  {submitError}
                </p>
              </div>
            )}

            {/* Submit Button */}
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
