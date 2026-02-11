import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Container, Heading, Card, CardContent, Input, InputLabel, InputError, Button, Text } from '@/components/design-system';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useServices } from '@/hooks/useServices';
import { useBarbers } from '@/hooks/useBarbers';
import { useProfanityFilter } from '@/hooks/useProfanityFilter';
import { api } from '@/lib/api';
import { getErrorMessage, formatName, getOrCreateDeviceId } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function hasHoursForDay(operatingHours: Record<string, { open?: string; close?: string } | null | undefined> | undefined, date: Date): boolean {
  if (!operatingHours) return false;
  const dayKey = DAY_KEYS[date.getDay()];
  const hours = operatingHours[dayKey];
  return hours != null && typeof hours === 'object' && hours.open != null && hours.close != null;
}

export function SchedulePage() {
  const navigate = useNavigate();
  const shopSlug = useShopSlug();
  const { config } = useShopConfig();
  const { t, locale } = useLocale();
  const { activeServices, isLoading: isLoadingServices } = useServices();
  const { barbers } = useBarbers();
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

    const scheduledTime = new Date(selectedDate);
    const [h, m] = selectedTime.split(':').map(Number);
    scheduledTime.setHours(h, m, 0, 0);

    setIsSubmitting(true);
    try {
      const ticket = await api.bookAppointment(shopSlug, {
        serviceId: selectedServiceId,
        customerName: fullName,
        customerPhone: customerPhone.trim() || undefined,
        preferredBarberId: selectedBarberId ?? undefined,
        scheduledTime: scheduledTime.toISOString(),
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
            <Link to="/join" className="text-sm text-[var(--shop-accent)] hover:underline">
              {t('join.viewStatus')}
            </Link>
          </div>

          <Card variant="default" className="shadow-lg">
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
                <div>
                  <InputLabel className="mb-2 block">{t('schedule.selectDate')}</InputLabel>
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={disabledDays}
                    className="rdp-default mx-auto bg-white/5 rounded-lg p-4 [--rdp-accent-color:var(--shop-accent)]"
                  />
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
                        {s.duration ? ` (${s.duration} ${t('common.minutes')})` : ''}
                        {s.price != null && s.price > 0 ? ` – ${formatCurrency(s.price, locale)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {settings?.requireBarberChoice && barbers.length > 0 && (
                  <div>
                    <InputLabel htmlFor="schedule-barber">{t('schedule.selectBarber')}</InputLabel>
                    <select
                      id="schedule-barber"
                      value={selectedBarberId ?? ''}
                      onChange={(e) => setSelectedBarberId(e.target.value ? parseInt(e.target.value, 10) : null)}
                      required
                      className="form-control-select w-full mt-1"
                    >
                      <option value="">{t('join.selectOption')}</option>
                      {barbers.filter((b) => b.isActive).map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
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
                  <InputLabel htmlFor="schedule-name">{t('schedule.yourName')}</InputLabel>
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
                    (settings?.requirePhone && !customerPhone.trim()) ||
                    (settings?.requireBarberChoice && !selectedBarberId)
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
