import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Container, Heading, Text, Button, Input, InputLabel } from '@/components/design-system';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useBarbers } from '@/hooks/useBarbers';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { formatInClientTimezone } from '@/lib/timezones';

interface TicketWithDetails {
  id: number;
  customerName: string;
  serviceId: number;
  service?: { id: number; name: string };
  scheduledTime?: string | null;
  preferredBarberId?: number | null;
  barberId?: number | null;
}

function formatGoogleCalendarUrl(
  title: string,
  start: Date,
  end: Date,
  location: string,
  description: string
): string {
  const format = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${format(start)}/${format(end)}`,
    location,
    details: description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildIcsBlob(
  title: string,
  start: Date,
  end: Date,
  location: string,
  description: string
): Blob {
  const format = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EuToNaFila//Appointment//PT',
    'BEGIN:VEVENT',
    `DTSTART:${format(start)}Z`,
    `DTEND:${format(end)}Z`,
    `SUMMARY:${title.replace(/\n/g, '\\n')}`,
    `LOCATION:${location.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return new Blob([ics], { type: 'text/calendar;charset=utf-8' });
}

export function AppointmentConfirmPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const shopSlugFromQuery = searchParams.get('shop');
  const shopSlug = useShopSlug();
  const effectiveSlug = shopSlugFromQuery || shopSlug;
  const { config } = useShopConfig();
  const { t, locale } = useLocale();
  const { barbers } = useBarbers();

  const [ticket, setTicket] = useState<TicketWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);

  const ticketId = id ? parseInt(id, 10) : null;

  useEffect(() => {
    if (!ticketId) {
      setLoading(false);
      setError('Invalid ticket');
      return;
    }
    api
      .getTicket(ticketId)
      .then((data) => setTicket(data as TicketWithDetails))
      .catch(() => setError('Ticket not found'))
      .finally(() => setLoading(false));
  }, [ticketId]);

  const homeContent = config?.homeContent;
  const location = homeContent?.location;
  const address = location?.address ?? '';
  const shopName = config?.name ?? '';

  const scheduledTime = ticket?.scheduledTime ? new Date(ticket.scheduledTime) : null;
  const serviceName = ticket?.service?.name ?? '';
  const barberId = ticket?.preferredBarberId ?? ticket?.barberId;
  const barber = barberId ? barbers.find((b) => b.id === barberId) : null;
  const barberName = barber?.name ?? '';

  const endTime = scheduledTime ? new Date(scheduledTime.getTime() + 30 * 60 * 1000) : null;
  const title = `${shopName}${serviceName ? ' – ' + serviceName : ''}`;
  const description = [serviceName && `Serviço: ${serviceName}`, barberName && `Barbeiro: ${barberName}`, address].filter(Boolean).join('\n');

  const handleSendReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !ticketId || !effectiveSlug) return;
    setReminderError(null);
    setReminderSending(true);
    try {
      await api.sendAppointmentReminder(effectiveSlug, ticketId, email.trim());
      setReminderSent(true);
    } catch (err) {
      setReminderError(getErrorMessage(err, 'Failed to send reminder'));
    } finally {
      setReminderSending(false);
    }
  };

  const handleGoogleCalendar = () => {
    if (!scheduledTime || !endTime) return;
    const url = formatGoogleCalendarUrl(title, scheduledTime, endTime, address, description);
    window.open(url, '_blank');
  };

  const handleAppleCalendar = () => {
    if (!scheduledTime || !endTime) return;
    const blob = buildIcsBlob(title, scheduledTime, endTime, address, description);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `agendamento-${ticketId}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navigation />
        <Container className="pt-20 pb-10 flex items-center justify-center min-h-[50vh]">
          <Text variant="secondary">{t('common.loading')}</Text>
        </Container>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navigation />
        <Container className="pt-20 pb-10">
          <Heading level={1} className="mb-4">{t('status.ticketNotFound')}</Heading>
          <Link to="/home" className="text-[var(--shop-accent)] hover:underline">
            {t('status.backHome')}
          </Link>
        </Container>
      </div>
    );
  }

  const scheduledStr = scheduledTime
    ? formatInClientTimezone(scheduledTime, locale)
    : '';

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />
      <Container className="pt-20 md:pt-28 lg:pt-32 pb-10">
        <div className="max-w-2xl mx-auto">
          <Heading level={1} className="text-center mb-2">
            {t('appointment.confirmTitle')}
          </Heading>
          <Text size="lg" variant="secondary" className="text-center block mb-8">
            {scheduledStr} · {serviceName}
            {barberName ? ` · ${barberName}` : ''}
          </Text>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="p-6 rounded-xl bg-white/5 border border-white/10">
              <Heading level={2} className="text-lg mb-3">
                {t('appointment.emailReminder')}
              </Heading>
              {reminderSent ? (
                <Text variant="secondary">{t('appointment.reminderSent')}</Text>
              ) : (
                <form onSubmit={handleSendReminder} className="space-y-3">
                  <InputLabel htmlFor="confirm-email">E-mail</InputLabel>
                  <Input
                    id="confirm-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('appointment.emailPlaceholder')}
                    className="w-full"
                  />
                  {reminderError && (
                    <p className="text-sm text-[#ef4444]">{reminderError}</p>
                  )}
                  <Button type="submit" disabled={reminderSending || !email.trim()}>
                    {reminderSending ? t('common.loading') : t('appointment.sendReminder')}
                  </Button>
                </form>
              )}
            </section>

            <section className="p-6 rounded-xl bg-white/5 border border-white/10">
              <Heading level={2} className="text-lg mb-3">
                {t('appointment.addToCalendar')}
              </Heading>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleCalendar}
                  disabled={!scheduledTime}
                  className="justify-center"
                >
                  {t('appointment.googleCalendar')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAppleCalendar}
                  disabled={!scheduledTime}
                  className="justify-center"
                >
                  {t('appointment.appleCalendar')}
                </Button>
              </div>
            </section>
          </div>

          <p className="text-center mt-8">
            <Link to={`/status/${ticket.id}`} className="text-[var(--shop-accent)] hover:underline">
              {t('join.viewStatus')}
            </Link>
          </p>
        </div>
      </Container>
    </div>
  );
}
