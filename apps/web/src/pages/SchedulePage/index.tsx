import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Link } from 'react-router-dom';
import { fromZonedTime } from 'date-fns-tz';
import { Navigation } from '@/components/Navigation';
import { Container, Heading, Card, CardContent, Input, InputLabel, InputError, Button, Text } from '@/components/design-system';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useServices } from '@/hooks/useServices';
import { useBarbers } from '@/hooks/useBarbers';
import { useActiveTicket } from '@/hooks/useActiveTicket';
import { useProfanityFilter } from '@/hooks/useProfanityFilter';
import { api } from '@/lib/api';
import { getErrorMessage, formatName, getOrCreateDeviceId } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { formatDurationMinutes } from '@/lib/formatDuration';
import { hasHoursForDay } from '@/lib/operatingHours';

function isSufficientName(name: string | undefined): boolean {
  if (!name || !name.trim()) return false;
  const n = name.trim();
  if (n === 'Customer') return false;
  if (n.includes('@')) return false;
  return true;
}

export function SchedulePage() {
  const navigate = useNavigate();
  const shopSlug = useShopSlug();
  const { config } = useShopConfig();
  const { user, isCustomer, logout } = useAuthContext();
  const { t, locale } = useLocale();

  const needsProfileCompletion = isCustomer && user?.name && !isSufficientName(user.name);
  const { activeServices, isLoading: isLoadingServices } = useServices();
  const { barbers } = useBarbers();
  const { activeTicket } = useActiveTicket();
  const { validateName } = useProfanityFilter();

  const settings = config.settings;
  const operatingHours = settings?.operatingHours as Record<string, { open?: string; close?: string } | null> | undefined;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [combinedName, setCombinedName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slots, setSlots] = useState<Array<{ time: string; available: boolean }>>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const dateStr = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : '';

  const fetchSlots = useCallback(() => {
    if (!dateStr || !selectedServiceId) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    api
      .getAppointmentSlots(shopSlug, dateStr, selectedServiceId, selectedBarberId ?? undefined)
      .then((res) => {
        setSlots(res.slots);
        setSlotsLoading(false);
      })
      .catch(() => {
        setSlots([]);
        setSlotsLoading(false);
      });
  }, [shopSlug, dateStr, selectedServiceId, selectedBarberId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useEffect(() => {
    setSelectedTime(null);
  }, [selectedDate, selectedServiceId, selectedBarberId]);

  useEffect(() => {
    if (activeServices.length > 0 && selectedServiceId === null) {
      setSelectedServiceId(activeServices[0].id);
    }
  }, [activeServices, selectedServiceId]);

  useEffect(() => {
    if (isCustomer && user?.name) {
      setCombinedName(formatName(user.name.trim()));
    }
  }, [isCustomer, user?.name]);

  useEffect(() => {
    if (!isCustomer || !shopSlug) return;
    let mounted = true;
    api
      .getCustomerProfile(shopSlug)
      .then((profile) => {
        if (mounted && profile.phone) {
          setCustomerPhone(profile.phone.trim());
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [isCustomer, shopSlug]);

  const handleCombinedNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatName(raw);
    setCombinedName(formatted);
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const fullName = combinedName.trim();
    if (!fullName) {
      setValidationError(t('join.nameLabel'));
      return;
    }
    const validation = validateName(fullName);
    if (!validation.isValid) {
      setValidationError(validation.error || t('join.invalidName'));
      return;
    }
    if (!selectedDate || !selectedServiceId || !selectedTime) {
      setSubmitError(t('schedule.slotNoLongerAvailable'));
      return;
    }
    if (settings?.requirePhone && !customerPhone.trim()) {
      setSubmitError(t('join.phoneRequired'));
      return;
    }
    if (settings?.requireBarberChoice && !selectedBarberId) {
      setSubmitError(t('join.chooseBarber'));
      return;
    }

    setIsSubmitting(true);
    try {
      const tz = settings?.timezone ?? 'America/Sao_Paulo';
      const localDateTime = `${dateStr}T${selectedTime}:00`;
      const utcDate = fromZonedTime(localDateTime, tz);

      const ticket = await api.bookAppointment(shopSlug, {
        serviceId: selectedServiceId,
        customerName: fullName,
        customerPhone: customerPhone.trim() || undefined,
        preferredBarberId: selectedBarberId ?? undefined,
        scheduledTime: utcDate.toISOString(),
        deviceId: getOrCreateDeviceId(),
      });
      navigate(`/appointment/${ticket.id}/confirm?shop=${encodeURIComponent(shopSlug)}`);
    } catch (error) {
      setSubmitError(getErrorMessage(error, t('schedule.slotNoLongerAvailable')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabledDays = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    return !hasHoursForDay(operatingHours, date);
  };

  const availableSlots = slots.filter((s) => s.available);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />
      <Container className="pt-20 md:pt-28 lg:pt-32 pb-10">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <Heading level={1} className="section-title section-title--layout mb-2 text-3xl">
              {t('schedule.title')}
            </Heading>
            {activeTicket && (
              <Link to={`/status/${activeTicket.id}`} className="text-sm text-[var(--shop-accent)] hover:underline">
                {t('join.viewStatus')}
              </Link>
            )}
          </div>

          <Card variant="default" className="shadow-lg">
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
                <div className="w-full">
                  <InputLabel className="mb-2 block">{t('schedule.selectDate')}</InputLabel>
                  <div className="schedule-calendar-wrap w-full">
                    <DayPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={disabledDays}
                      className="rdp-default w-full bg-white/5 rounded-lg p-4 [--rdp-accent-color:var(--shop-accent)]"
                    />
                  </div>
                </div>

                <div>
                  <InputLabel htmlFor="schedule-service">{t('schedule.selectService')}</InputLabel>
                  <select
                    id="schedule-service"
                    value={selectedServiceId ?? ''}
                    onChange={(e) => setSelectedServiceId(e.target.value ? parseInt(e.target.value, 10) : null)}
                    required
                    className="form-control-select w-full mt-1"
                  >
                    <option value="">{t('join.selectOption')}</option>
                    {activeServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.duration ? ` (${formatDurationMinutes(s.duration)})` : ''}
                        {s.price != null && s.price > 0 ? ` – ${formatCurrency(s.price, locale)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {settings?.allowBarberPreference && (barbers.length > 0 || settings?.requireBarberChoice) && (
                  <div>
                    <InputLabel htmlFor="schedule-barber">
                      {settings?.requireBarberChoice ? t('join.barberLabel') : t('join.barberLabelOptional')}
                    </InputLabel>
                    <select
                      id="schedule-barber"
                      value={selectedBarberId ?? ''}
                      onChange={(e) => setSelectedBarberId(e.target.value ? parseInt(e.target.value, 10) : null)}
                      required={settings?.requireBarberChoice}
                      className="form-control-select w-full mt-1"
                    >
                      <option value="">{t('join.selectOption')}</option>
                      {barbers.filter((b) => b.isActive).map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    {settings?.requireBarberChoice && barbers.filter((b) => b.isActive).length === 0 && (
                      <p className="text-sm text-[#ef4444] mt-1">{t('join.noBarberActive')}</p>
                    )}
                  </div>
                )}

                {dateStr && selectedServiceId && (
                  <div>
                    <InputLabel className="mb-2 block">{t('schedule.selectTime')}</InputLabel>
                    {slotsLoading ? (
                      <Text size="sm" variant="secondary">{t('schedule.loadingSlots')}</Text>
                    ) : availableSlots.length === 0 ? (
                      <Text size="sm" variant="secondary">{t('schedule.noSlots')}</Text>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {slots.map((slot) => (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => setSelectedTime(slot.time)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              selectedTime === slot.time
                                ? 'bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)]'
                                : slot.available
                                  ? 'bg-white/10 hover:bg-white/20 text-white'
                                  : 'bg-white/5 text-white/40 cursor-not-allowed'
                            }`}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <InputLabel htmlFor="schedule-name">
                    {needsProfileCompletion ? t('join.completeProfile') : t('schedule.yourName')}
                  </InputLabel>
                  <Input
                    id="schedule-name"
                    type="text"
                    value={combinedName}
                    onChange={handleCombinedNameChange}
                    placeholder={t('join.namePlaceholder')}
                    required
                    error={!!validationError}
                    className="w-full mt-1"
                  />
                  <InputError message={validationError || ''} />
                  {isCustomer ? (
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
                      <Link to={`/shop/login?redirect=${encodeURIComponent('/checkin/confirm')}`} className="text-[var(--shop-accent)] hover:underline">
                        {t('schedule.checkInWithLogin')}
                      </Link>
                    </p>
                  )}
                </div>

                {settings?.requirePhone && (
                  <div>
                    <InputLabel htmlFor="schedule-phone">{t('join.phoneLabel')}</InputLabel>
                    <Input
                      id="schedule-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder={t('join.phonePlaceholder')}
                      required
                      className="w-full mt-1"
                    />
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

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={
                    isSubmitting ||
                    isLoadingServices ||
                    !selectedDate ||
                    !selectedServiceId ||
                    !selectedTime ||
                    !combinedName.trim() ||
                    (settings?.requirePhone && !customerPhone.trim())
                  }
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-xl">hourglass_top</span>
                      {t('schedule.booking')}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-xl">check</span>
                      {t('schedule.confirmBooking')}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  );
}
