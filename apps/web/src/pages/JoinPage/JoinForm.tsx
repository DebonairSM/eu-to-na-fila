import { useJoinForm } from './hooks/useJoinForm';
import { ActiveBarbersInfo } from './ActiveBarbersInfo';
import { Card, CardContent, Input, InputLabel, InputError, Button } from '@/components/design-system';
import { useLocale } from '@/contexts/LocaleContext';
import { formatCurrency } from '@/lib/format';

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
  const { locale, t } = useLocale();

  return (
    <Card variant="default" className="join-form-card shadow-lg min-w-[320px]">
      <CardContent className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
            {hasServices && activeServices.length >= 2 && (
              <div className="min-w-0">
                <InputLabel htmlFor="service">{t('join.serviceLabel')}</InputLabel>
                <select
                  id="service"
                  value={selectedServiceId ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedServiceId(v ? parseInt(v, 10) : null);
                  }}
                  required
                  className="form-control-select w-full max-w-full"
                >
                  <option value="">{t('join.selectOption')}</option>
                  {activeServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.duration ? ` (${s.duration} ${t('common.minutes')})` : ''}
                      {s.price != null && s.price > 0 ? ` – ${formatCurrency(s.price, locale)}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="min-w-0">
              <InputLabel htmlFor="customerName">{t('join.nameLabel')}</InputLabel>
              <Input
                id="customerName"
                type="text"
                value={combinedName}
                onChange={handleCombinedNameChange}
                placeholder={t('join.namePlaceholder')}
                autoComplete="one-time-code"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck="false"
                inputMode="text"
                data-lpignore="true"
                data-form-type="other"
                required
                error={!!validationError}
                className="w-full max-w-full"
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
              <div className="min-w-0">
                <InputLabel htmlFor="customerPhone">{t('join.phoneLabel')}</InputLabel>
                <Input
                  id="customerPhone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerPhone(e.target.value)}
                  placeholder={t('join.phonePlaceholder')}
                  required
                  className="w-full max-w-full"
                />
              </div>
            )}

            {settings.requireBarberChoice && barbers.length > 0 && (
              <div className="min-w-0">
                <InputLabel htmlFor="preferredBarber">{t('join.barberLabel')}</InputLabel>
                <select
                  id="preferredBarber"
                  value={selectedBarberId ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedBarberId(v ? parseInt(v, 10) : null);
                  }}
                  required
                  className="form-control-select w-full max-w-full"
                >
                  <option value="">{t('join.selectOption')}</option>
                  {barbers.filter(b => b.isActive).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-6">

            {nameCollisionError && (
              <div className="p-4 rounded-lg bg-[#ef4444]/20 border-2 border-[#ef4444] flex items-start gap-3">
                <span className="material-symbols-outlined text-[#ef4444] text-xl flex-shrink-0 mt-0.5">
                  warning
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#ef4444] mb-1">{t('join.nameInUse')}</p>
                  <p className="text-sm text-[#ef4444]/90">{nameCollisionError}</p>
                </div>
              </div>
            )}

            {isAlreadyInQueue && existingTicketId && (
              <div className="p-5 rounded-lg bg-[color-mix(in_srgb,var(--shop-accent)_10%,transparent)] border border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)]">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[var(--shop-accent)] text-2xl">info</span>
                  <div className="flex-1 space-y-3">
                    <p className="text-sm font-semibold text-[var(--shop-accent)]">{t('join.activeTicketFound')}</p>
                    <Button
                      type="button"
                      onClick={() => navigate(`/status/${existingTicketId}`)}
                      fullWidth
                    >
                      {t('join.viewStatus')}
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
                {t('join.noServicesAvailable')}
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
                  {t('join.entering')}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">check</span>
                  {t('join.confirmEntry')}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
