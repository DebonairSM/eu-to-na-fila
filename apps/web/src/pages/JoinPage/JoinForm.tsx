import { useJoinForm } from './hooks/useJoinForm';
import { ActiveBarbersInfo } from './ActiveBarbersInfo';
import { Card, CardContent, Input, InputLabel, InputError, Button, Stack } from '@/components/design-system';

export function JoinForm() {
  const {
    combinedName,
    handleCombinedNameChange,
    customerPhone,
    setCustomerPhone,
    selectedBarberId,
    setSelectedBarberId,
    validationError,
    isSubmitting,
    submitError,
    isAlreadyInQueue,
    existingTicketId,
    nameCollisionError,
    handleSubmit,
    navigate,
    waitTimes,
    isLoadingWaitTimes,
    barbers,
    hasServices,
    isLoadingServices,
    activeServices,
    selectedServiceId,
    setSelectedServiceId,
    settings,
  } = useJoinForm();

  const formatPrice = (cents: number | undefined): string => {
    if (cents == null) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  return (
    <Card variant="default" className="join-form-card shadow-lg min-w-[320px]">
      <CardContent className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} autoComplete="off">
          <Stack spacing="lg">
            {hasServices && activeServices.length >= 2 && (
              <div>
                <InputLabel htmlFor="service">Serviço *</InputLabel>
                <select
                  id="service"
                  value={selectedServiceId ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedServiceId(v ? parseInt(v, 10) : null);
                  }}
                  required
                  className="form-control-select min-w-[200px] sm:min-w-[250px] max-w-[300px]"
                >
                  <option value="">Selecione...</option>
                  {activeServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.duration ? ` (${s.duration} min)` : ''}
                      {s.price != null && s.price > 0 ? ` – ${formatPrice(s.price)}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <InputLabel htmlFor="customerName">Nome *</InputLabel>
              <Input
                id="customerName"
                type="text"
                value={combinedName}
                onChange={handleCombinedNameChange}
                placeholder="Nome e inicial"
                autoComplete="one-time-code"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck="false"
                inputMode="text"
                data-lpignore="true"
                data-form-type="other"
                required
                error={!!validationError}
                className="min-w-[200px] sm:min-w-[250px] max-w-[300px]"
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

            {settings.requirePhone && (
              <div>
                <InputLabel htmlFor="customerPhone">Telefone *</InputLabel>
                <Input
                  id="customerPhone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  required
                  className="min-w-[200px] sm:min-w-[250px] max-w-[300px]"
                />
              </div>
            )}

            {settings.requireBarberChoice && barbers.length > 0 && (
              <div>
                <InputLabel htmlFor="preferredBarber">Barbeiro *</InputLabel>
                <select
                  id="preferredBarber"
                  value={selectedBarberId ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedBarberId(v ? parseInt(v, 10) : null);
                  }}
                  required
                  className="form-control-select min-w-[200px] sm:min-w-[250px] max-w-[300px]"
                >
                  <option value="">Selecione...</option>
                  {barbers.filter(b => b.isActive).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

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
              <div className="p-5 rounded-lg bg-[color-mix(in_srgb,var(--shop-accent)_10%,transparent)] border border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)]">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[var(--shop-accent)] text-2xl">info</span>
                  <div className="flex-1 space-y-3">
                    <p className="text-sm font-semibold text-[var(--shop-accent)]">Ticket ativo encontrado</p>
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

            <ActiveBarbersInfo
              barbers={barbers}
              waitTimes={waitTimes}
              isLoading={isLoadingWaitTimes}
            />

            {!isLoadingServices && !hasServices && (
              <p className="text-sm text-[var(--shop-text-secondary)]">
                Nenhum serviço disponível no momento.
              </p>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              disabled={
                isSubmitting ||
                !!validationError ||
                isAlreadyInQueue ||
                !!nameCollisionError ||
                isLoadingServices ||
                !hasServices ||
                (hasServices && selectedServiceId == null) ||
                (settings.requirePhone && !customerPhone.trim()) ||
                (settings.requireBarberChoice && !selectedBarberId)
              }
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
