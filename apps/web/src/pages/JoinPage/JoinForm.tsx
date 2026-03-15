import { useEffect, useId, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useJoinForm } from './hooks/useJoinForm';
import { ActiveBarbersInfo } from './ActiveBarbersInfo';
import { Card, CardContent, InputError, Button } from '@/components/design-system';
import { Modal } from '@/components/Modal';
import { api } from '@/lib/api';
import { useAuthContext } from '@/contexts/AuthContext';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useLocale } from '@/contexts/LocaleContext';
import { formatCurrency } from '@/lib/format';
import { formatDurationMinutes } from '@/lib/formatDuration';
import {
  formatNameWithConnectors,
  formatPhoneByCountry,
  getCountryOptions,
  getErrorMessage,
  hasScheduleEnabled,
} from '@/lib/utils';
import type { Service } from '@eutonafila/shared';

function serviceSubtotal(services: Service[]): number {
  return services.reduce((sum, s) => sum + ((s.price != null && s.price > 0 ? s.price : 0)), 0);
}

function ServiceChip({
  selected,
  onToggle,
  label,
}: {
  selected: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        w-full min-w-max text-left rounded-xl border-2 px-4 py-3 transition-all
        flex items-center justify-between gap-2
        ${selected
          ? 'border-[var(--shop-accent)] bg-[color-mix(in_srgb,var(--shop-accent)_12%,transparent)]'
          : 'border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.25)]'
        }
      `}
    >
      <span className="text-sm font-medium text-[var(--shop-text-primary)] min-w-0">{label}</span>
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
    customerEmail,
    setCustomerEmail,
    customerCountry,
    setCustomerCountry,
    selectedBarberId,
    setSelectedBarberId,
    validationError,
    isSubmitting,
    submitError,
    closedReason,
    isAlreadyInQueue,
    existingTicketId,
    nameCollisionError,
    submitJoin,
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
  const shopSlug = useShopSlug();
  const { login } = useAuthContext();
  const nameErrorId = useId();
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSignupExpanded, setIsSignupExpanded] = useState(false);
  const [authShift, setAuthShift] = useState(false);
  const [authIdentifier, setAuthIdentifier] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupBirthday, setSignupBirthday] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  const selectedServicesForSubtotal: Service[] = activeServices.filter((s) => selectedServiceIds.includes(s.id));
  const subtotal = serviceSubtotal(selectedServicesForSubtotal);
  const showSubtotal = subtotal > 0;

  const totalServiceDurationMinutes = selectedServicesForSubtotal.reduce(
    (sum, s) => sum + (s.duration ?? 0),
    0
  );
  const estimatedWaitMinutes: number | null =
    settings.allowBarberPreference && selectedBarberId != null && waitTimes?.barberWaitTimes?.length
      ? waitTimes.barberWaitTimes.find((b) => b.barberId === selectedBarberId)?.waitTime ?? waitTimes.standardWaitTime ?? null
      : waitTimes?.standardWaitTime ?? null;
  const totalCompletionMinutes =
    totalServiceDurationMinutes +
    (estimatedWaitMinutes != null && estimatedWaitMinutes > 0 ? estimatedWaitMinutes : 0);
  const showEstimatedTime = selectedServiceIds.length > 0 && totalServiceDurationMinutes > 0;
  const countryOptions = useMemo(() => getCountryOptions(locale), [locale]);
  const canStartCheckIn =
    combinedName.trim().length > 0 &&
    !validationError &&
    (!settings.requirePhone || customerPhone.trim().length > 0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAuthShift((prev) => !prev);
    }, 3500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isAuthModalOpen) return;
    if (!authIdentifier && customerEmail.trim()) {
      setAuthIdentifier(customerEmail.trim());
    }
    if (!signupEmail && customerEmail.trim()) {
      setSignupEmail(customerEmail.trim());
    }
  }, [isAuthModalOpen, authIdentifier, customerEmail, signupEmail]);

  const applyFormattedName = () => {
    const formatted = formatNameWithConnectors(combinedName);
    handleCombinedNameChange({
      target: { value: formatted },
    } as ChangeEvent<HTMLInputElement>);
  };

  const openServiceModal = () => {
    if (!canStartCheckIn) return;
    setIsServiceModalOpen(true);
  };

  const handleMainSubmit = (e: FormEvent) => {
    e.preventDefault();
    openServiceModal();
  };

  const handleCountryChange = (value: string) => {
    setCustomerCountry(value as typeof customerCountry);
    if (!customerPhone.trim()) return;
    setCustomerPhone(formatPhoneByCountry(customerPhone, value as typeof customerCountry));
  };

  const handlePhoneChange = (value: string) => {
    setCustomerPhone(formatPhoneByCountry(value, customerCountry));
  };

  const goToGoogleAuth = () => {
    const redirectUri = hasScheduleEnabled(settings) ? '/checkin/confirm' : '/join';
    window.location.href = api.getCustomerGoogleAuthUrl(shopSlug, redirectUri);
  };

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isAuthSubmitting) return;
    setAuthError(null);
    setIsAuthSubmitting(true);

    try {
      if (isSignupExpanded) {
        if (!signupEmail.trim()) {
          setAuthError(t('auth.fillAllFields'));
          return;
        }
        if (authPassword.length < 6) {
          setAuthError(t('auth.passwordMinLength'));
          return;
        }
        if (authPassword !== signupConfirmPassword) {
          setAuthError(t('auth.passwordMismatch'));
          return;
        }

        const result = await api.registerCustomer(shopSlug, {
          email: signupEmail.trim(),
          password: authPassword,
          name: signupName.trim() || undefined,
          dateOfBirth: signupBirthday.trim() || undefined,
        });
        if (result.valid && result.token && result.role === 'customer') {
          login({
            id: result.clientId,
            username: signupEmail.trim(),
            role: 'customer',
            name: signupName.trim() || signupEmail.trim(),
            clientId: result.clientId,
          });
          setIsAuthModalOpen(false);
          return;
        }
        setAuthError(t('auth.signupError'));
        return;
      }

      if (!authIdentifier.trim() || !authPassword.trim()) {
        setAuthError(t('auth.fillAllFields'));
        return;
      }

      const result = await api.login(shopSlug, {
        identifier: authIdentifier.trim(),
        password: authPassword,
        remember_me: rememberMe,
      });
      if (!result.valid || !result.token || !result.role) {
        setAuthError(t('auth.invalidCredentials'));
        return;
      }

      if (result.role === 'customer') {
        login(
          {
            id: result.clientId ?? 0,
            username: authIdentifier.trim(),
            role: 'customer',
            name: result.name?.trim() || authIdentifier.trim(),
            clientId: result.clientId,
          },
          { rememberMe }
        );
        setIsAuthModalOpen(false);
        return;
      }
      if (result.role === 'barber') {
        login({
          id: result.barberId ?? 0,
          username: authIdentifier.trim(),
          role: 'barber',
          name: result.barberName ?? authIdentifier.trim(),
        });
        navigate('/barber');
        return;
      }
      if (result.role === 'owner') {
        login({ id: 0, username: 'owner', role: 'owner', name: 'owner' });
        navigate('/owner');
        return;
      }
      if (result.role === 'kiosk') {
        login({ id: 0, username: 'kiosk', role: 'kiosk', name: 'kiosk' });
        navigate('/manage?kiosk=true');
        return;
      }
      login({ id: 0, username: 'staff', role: 'staff', name: 'staff' });
      navigate('/manage');
    } catch (error) {
      setAuthError(getErrorMessage(error, t('auth.loginError')));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  return (
    <Card variant="default" className="join-form-card shadow-lg min-w-[320px]">
      <CardContent className="p-6 sm:p-8">
        <form onSubmit={handleMainSubmit} autoComplete="off" className="space-y-7">
          <button
            type="submit"
            disabled={!canStartCheckIn}
            className={`
              w-full text-center text-3xl sm:text-4xl tracking-tight transition-colors
              ${canStartCheckIn
                ? 'text-[var(--shop-accent)] cursor-pointer hover:text-[var(--shop-accent-hover)]'
                : 'text-[var(--shop-text-primary)] cursor-default'
              }
            `}
          >
            {t('join.joinTitle')}
          </button>

          <div className="space-y-5">
            <div className="min-w-0">
              <label htmlFor="customerName" className="block text-xs uppercase tracking-wide text-[var(--shop-text-secondary)] mb-2">
                {needsProfileCompletion ? t('join.completeProfile') : t('join.nameLabel')}
              </label>
              <input
                id="customerName"
                type="text"
                value={combinedName}
                onChange={handleCombinedNameChange}
                onBlur={applyFormattedName}
                placeholder={t('join.namePlaceholder')}
                autoComplete="off"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                required
                aria-describedby={validationError ? nameErrorId : undefined}
                className="w-full bg-transparent border-0 border-b-2 border-[rgba(255,255,255,0.22)] focus:border-[var(--shop-accent)] text-[var(--shop-text-primary)] text-xl px-0 py-3 outline-none placeholder:text-[var(--shop-text-secondary)]"
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
                  {t('join.quickAuthHint')}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label htmlFor="customerEmail" className="block text-xs uppercase tracking-wide text-[var(--shop-text-secondary)] mb-2">
                  {t('join.emailLabel')}
                </label>
                <input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder={t('join.emailPlaceholder')}
                  className="w-full bg-transparent border-0 border-b-2 border-[rgba(255,255,255,0.18)] focus:border-[var(--shop-accent)] text-[var(--shop-text-primary)] px-0 py-3 outline-none placeholder:text-[var(--shop-text-secondary)]"
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="customerPhone" className="block text-xs uppercase tracking-wide text-[var(--shop-text-secondary)] mb-2">
                  {settings.requirePhone ? t('join.phoneLabel') : t('join.phoneLabelOptional')}
                </label>
                <div className="flex items-end gap-2">
                  <select
                    id="customerCountry"
                    value={customerCountry}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="h-[46px] bg-transparent border-0 border-b-2 border-[rgba(255,255,255,0.18)] text-[var(--shop-text-primary)] min-w-[112px] outline-none"
                    aria-label={t('join.countryLabel')}
                  >
                    {countryOptions.map((country) => (
                      <option key={country.code} value={country.code} className="text-black">
                        {country.code} {country.dialCode}
                      </option>
                    ))}
                  </select>
                  <input
                    id="customerPhone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder={t('join.phonePlaceholder')}
                    required={settings.requirePhone}
                    className="w-full bg-transparent border-0 border-b-2 border-[rgba(255,255,255,0.18)] focus:border-[var(--shop-accent)] text-[var(--shop-text-primary)] px-0 py-3 outline-none placeholder:text-[var(--shop-text-secondary)]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsAuthModalOpen(true);
                  setIsSignupExpanded(false);
                  setAuthError(null);
                }}
                className={`
                  flex-1 min-h-[46px] rounded-xl font-semibold transition-all duration-[3200ms]
                  text-[var(--shop-text-on-accent)]
                `}
                style={{
                  backgroundColor: authShift ? 'var(--shop-accent-hover)' : 'var(--shop-accent)',
                }}
              >
                {t('auth.login')}
              </button>
              <button
                type="button"
                onClick={goToGoogleAuth}
                className="min-h-[46px] px-4 rounded-xl border border-[var(--shop-border-color)] text-[var(--shop-text-primary)] flex items-center gap-2"
                aria-label={t('auth.signInOrCreateWithGoogle')}
              >
                <span className="font-bold text-lg">
                  <span className="text-[#4285F4]">G</span>
                </span>
                <span className="text-sm">{t('join.googleQuick')}</span>
              </button>
            </div>

            {settings.allowBarberPreference && (barbers.length > 0 || settings.requireBarberChoice) && (
              <div className="min-w-0">
                <label htmlFor="preferredBarber" className="block text-xs uppercase tracking-wide text-[var(--shop-text-secondary)] mb-2">
                  {settings.requireBarberChoice ? t('join.barberLabel') : t('join.barberLabelOptional')}
                </label>
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
                  {barbers.filter(b => b.isActive).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {settings.requireBarberChoice && barbers.filter(b => b.isActive).length === 0 && (
                  <p className="text-sm text-[#ef4444] mt-1">{t('join.noBarberActive')}</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
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
          </div>
        </form>
      </CardContent>

      <Modal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        title={t('join.selectServicesModalTitle')}
        showCloseButton
      >
        <div className="space-y-4">
          {hasServices ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeServices.map((s) => {
                const label = `${s.name}${s.duration ? ` (${formatDurationMinutes(s.duration)})` : ''}`;
                const selected = selectedServiceIds.includes(s.id);
                return (
                  <ServiceChip
                    key={s.id}
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
          ) : (
            <p className="text-sm text-[var(--shop-text-secondary)]">{t('join.noServicesAvailable')}</p>
          )}

          {(showSubtotal || showEstimatedTime) && (
            <div className="pt-2 mt-2 border-t border-[rgba(255,255,255,0.1)] space-y-1">
              {showSubtotal && (
                <p className="text-sm text-[var(--shop-text-secondary)] flex justify-end gap-2">
                  <span>{t('join.subtotal')}</span>
                  <span className="font-medium text-[var(--shop-text-primary)]">
                    {formatCurrency(subtotal, locale)}
                  </span>
                </p>
              )}
              {showEstimatedTime && (
                <>
                  <p className="text-sm text-[var(--shop-text-secondary)] flex justify-end gap-2">
                    <span className="font-medium text-[var(--shop-text-primary)]">
                      {t('join.estimatedTotalTime', {
                        duration: formatDurationMinutes(totalCompletionMinutes),
                      })}
                    </span>
                  </p>
                  {estimatedWaitMinutes != null && estimatedWaitMinutes > 0 && (
                    <p className="text-xs text-[var(--shop-text-secondary)] flex justify-end">
                      {t('join.estimatedTotalBreakdown', {
                        wait: formatDurationMinutes(estimatedWaitMinutes),
                        service: formatDurationMinutes(totalServiceDurationMinutes),
                      })}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <Button
            type="button"
            fullWidth
            size="lg"
            onClick={() => {
              void submitJoin();
            }}
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
      </Modal>

      <Modal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title={isSignupExpanded ? t('auth.createAccount') : t('auth.login')}
        showCloseButton
      >
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {isSignupExpanded ? (
            <>
              <input
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder={t('auth.email')}
                required
                className="w-full px-4 py-3 rounded-lg border border-[var(--shop-border-color)] bg-[rgba(255,255,255,0.05)] text-[var(--shop-text-primary)]"
              />
              <input
                type="text"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                placeholder={t('auth.nameOptional')}
                className="w-full px-4 py-3 rounded-lg border border-[var(--shop-border-color)] bg-[rgba(255,255,255,0.05)] text-[var(--shop-text-primary)]"
              />
            </>
          ) : (
            <input
              type="text"
              value={authIdentifier}
              onChange={(e) => setAuthIdentifier(e.target.value)}
              placeholder={t('auth.emailOrUsername')}
              required
              className="w-full px-4 py-3 rounded-lg border border-[var(--shop-border-color)] bg-[rgba(255,255,255,0.05)] text-[var(--shop-text-primary)]"
            />
          )}

          <input
            type="password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            placeholder={t('auth.password')}
            required
            className="w-full px-4 py-3 rounded-lg border border-[var(--shop-border-color)] bg-[rgba(255,255,255,0.05)] text-[var(--shop-text-primary)]"
          />

          {isSignupExpanded && (
            <>
              <input
                type="password"
                value={signupConfirmPassword}
                onChange={(e) => setSignupConfirmPassword(e.target.value)}
                placeholder={t('auth.confirmPassword')}
                required
                className="w-full px-4 py-3 rounded-lg border border-[var(--shop-border-color)] bg-[rgba(255,255,255,0.05)] text-[var(--shop-text-primary)]"
              />
              <div>
                <label className="block text-xs uppercase tracking-wide text-[var(--shop-text-secondary)] mb-2">
                  {t('auth.birthdayOptional')}
                </label>
                <input
                  type="date"
                  value={signupBirthday}
                  onChange={(e) => setSignupBirthday(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--shop-border-color)] bg-[rgba(255,255,255,0.05)] text-[var(--shop-text-primary)]"
                />
              </div>
            </>
          )}

          {!isSignupExpanded && (
            <label className="flex items-center gap-2 text-sm text-[var(--shop-text-secondary)]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              {t('auth.rememberMe')}
            </label>
          )}

          {authError && (
            <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] text-sm text-[#ef4444]">
              {authError}
            </div>
          )}

          <Button type="submit" fullWidth disabled={isAuthSubmitting}>
            {isAuthSubmitting
              ? (isSignupExpanded ? t('auth.creatingAccount') : t('auth.entering'))
              : (isSignupExpanded ? t('auth.createAccount') : t('auth.loginButton'))}
          </Button>

          {!isSignupExpanded && (
            <button
              type="button"
              onClick={() => {
                setIsSignupExpanded(true);
                setAuthError(null);
              }}
              className="w-full text-sm text-[var(--shop-accent)] hover:underline"
            >
              {t('auth.createAccount')}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsSignupExpanded(false);
              setAuthError(null);
            }}
            className="w-full flex items-center justify-center text-[var(--shop-text-secondary)] hover:text-[var(--shop-text-primary)]"
            aria-label={t('join.collapseSignup')}
          >
            <span className="material-symbols-outlined">keyboard_arrow_up</span>
          </button>
        </form>
      </Modal>
    </Card>
  );
}
