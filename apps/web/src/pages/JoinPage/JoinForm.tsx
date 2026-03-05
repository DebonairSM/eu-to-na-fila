import { useId } from 'react';
import { useJoinForm } from './hooks/useJoinForm';
import { ActiveBarbersInfo } from './ActiveBarbersInfo';
import { Card, CardContent, Input, InputLabel, InputError, Button } from '@/components/design-system';
import { hasScheduleEnabled } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { formatCurrency } from '@/lib/format';
import { formatDurationMinutes } from '@/lib/formatDuration';
import type { Service } from '@eutonafila/shared';

function serviceSubtotal(services: Service[]): number {
  return services.reduce((sum, s) => sum + ((s.price != null && s.price > 0 ? s.price : 0)), 0);
}

function ServiceChip({
  selected,
  onToggle,
  label,
}: {
  service: Service;
  selected: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        w-full text-left rounded-xl border-2 px-4 py-3 transition-all
        flex items-center justify-between gap-2
        ${selected
          ? 'border-[var(--shop-accent)] bg-[color-mix(in_srgb,var(--shop-accent)_12%,transparent)]'
          : 'border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.25)]'
        }
      `}
    >
      <span className="text-sm font-medium text-[var(--shop-text-primary)] truncate">{label}</span>
      {selected && (
        <span className="material-symbols-outlined text-[var(--shop-accent)] text-lg flex-shrink-0" aria-hidden>
          check_circle
        </span>
      )}
    </button>
  );
}

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
    closedReason,
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
    selectedServiceIds,
    setSelectedServiceIds,
    hasServiceSelection,
    settings,
    needsProfileCompletion,
    isLoggedInAsCustomer,
    logout,
    isRefreshingJoinData,
    refreshJoinData,
  } = useJoinForm();
  const { locale, t } = useLocale();
  const nameErrorId = useId();

  const selectedServicesForSubtotal: Service[] = activeServices.filter((s) => selectedServiceIds.includes(s.id));
  const subtotal = serviceSubtotal(selectedServicesForSubtotal);
  const showSubtotal = subtotal > 0;

  return (
    <Card variant="default" className="join-form-card shadow-lg min-w-[320px]">
      <CardContent className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
            {hasServices && (
              <div className="min-w-0 sm:col-span-2">
                <InputLabel className="mb-2 block">{t('join.serviceLabel')}</InputLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeServices.map((s) => {
                    const label = `${s.name}${s.duration ? ` (${formatDurationMinutes(s.duration)})` : ''}`;
                    const selected = selectedServiceIds.includes(s.id);
                    return (
                      <ServiceChip
                        key={s.id}
                        service={s}
                        selected={selected}
                        onToggle={() =>
                          setSelectedServiceIds((prev) =>
                            prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                          )
                        }
                        label={label}
                      />
                    );
                  })}
                </div>
                {showSubtotal && (
                  <div className="pt-2 mt-2 border-t border-[rgba(255,255,255,0.1)]">
                    <p className="text-sm text-[var(--shop-text-secondary)] flex justify-end gap-2">
                      <span>{t('join.subtotal')}</span>
                      <span className="font-medium text-[var(--shop-text-primary)]">
                        {formatCurrency(subtotal, locale)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="min-w-0">
              <InputLabel htmlFor="customerName">
                {needsProfileCompletion ? t('join.completeProfile') : t('join.nameLabel')}
              </InputLabel>
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
                aria-describedby={validationError ? nameErrorId : undefined}
                className="w-full max-w-full"
                onFocus={(e) => {
                  const input = e.target as HTMLInputElement;
                  input.setAttribute('readonly', 'readonly');
                  setTimeout(() => input.removeAttribute('readonly'), 100);
                }}
              />
              <InputError id={nameErrorId} message={validationError || ''} />
              {isLoggedInAsCustomer ? (
                <p className="text-sm text-[var(--shop-text-secondary)] mt-1">
                  {t('join.nameChangeHint')}
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="text-[var(--shop-accent)] hover:underline ml-1"
                  >
                    {t('join.notYouLogout')}
                  </button>
                </p>
              ) : (
                <p className="text-sm text-[var(--shop-text-secondary)] mt-1">
                  <button
                    type="button"
                    onClick={() => navigate(`/shop/login?redirect=${encodeURIComponent(hasScheduleEnabled(settings) ? '/checkin/confirm' : '/join')}`)}
                    className="text-[var(--shop-accent)] hover:underline bg-transparent border-0 p-0 cursor-pointer font-inherit"
                  >
                    {t('schedule.checkInWithLogin')}
                  </button>
                </p>
              )}
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

            {settings.allowBarberPreference && (barbers.length > 0 || settings.requireBarberChoice) && (
              <div className="min-w-0">
                <InputLabel htmlFor="preferredBarber">
                  {settings.requireBarberChoice ? t('join.barberLabel') : t('join.barberLabelOptional')}
                </InputLabel>
                <select
                  id="preferredBarber"
                  value={selectedBarberId ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedBarberId(v ? parseInt(v, 10) : null);
                  }}
                  required={settings.requireBarberChoice}
                  className="form-control-select select-readable w-full max-w-full"
                >
                  <option value="">{t('join.selectOption')}</option>
                  {(Array.isArray(barbers) ? barbers : []).filter(b => b.isActive).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {settings.requireBarberChoice && (Array.isArray(barbers) ? barbers : []).filter(b => b.isActive).length === 0 && (
                  <p className="text-sm text-[#ef4444] mt-1">{t('join.noBarberActive')}</p>
                )}
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

            {closedReason && (
              <div className="p-5 rounded-xl bg-[color-mix(in_srgb,var(--shop-accent)_8%,transparent)] border border-[color-mix(in_srgb,var(--shop-accent)_25%,transparent)] text-center">
                <span className="material-symbols-outlined text-3xl text-[var(--shop-accent)] block mb-2" aria-hidden="true">schedule</span>
                <p className="text-[var(--shop-text-primary)] font-medium">
                  {closedReason === 'lunch' ? 'Fechado para almoço.' : 'Fechado no momento.'}
                </p>
              </div>
            )}

            {submitError && !closedReason && (
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
              selectedBarberId={selectedBarberId}
              isLoading={isLoadingWaitTimes}
              onRefresh={refreshJoinData}
              isRefreshing={isRefreshingJoinData}
              refreshAriaLabel={t('status.refresh')}
              refreshLabel={t('status.refresh')}
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
                (hasServices && !hasServiceSelection) ||
                (settings.requirePhone && !customerPhone.trim())
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
