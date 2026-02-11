import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { fromZonedTime } from 'date-fns-tz';
import { api } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useQueue } from '@/hooks/useQueue';
import { useBarbers } from '@/hooks/useBarbers';
import { useServices } from '@/hooks/useServices';
import { useKiosk } from '@/hooks/useKiosk';
import { useModal } from '@/hooks/useModal';
import { Navigation } from '@/components/Navigation';
import { Modal } from '@/components/Modal';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { BarberSelector } from '@/components/BarberSelector';
import { BarberCard } from '@/components/BarberCard';
import { QueueCard } from '@/components/QueueCard';
import { QRCode } from '@/components/QRCode';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Button } from '@/components/ui/button';
import { KioskAdsPlayer } from '@/components/KioskAdsPlayer';
import { useProfanityFilter } from '@/hooks/useProfanityFilter';
import { useErrorTimeout } from '@/hooks/useErrorTimeout';
import { useLocale } from '@/contexts/LocaleContext';
import { cn, getErrorMessage, formatName, formatNameForDisplay } from '@/lib/utils';
import { hasHoursForDay, hasAnyOperatingHours } from '@/lib/operatingHours';

const AD_VIEW_DURATION = 15000; // 15 seconds

export function BarberQueueManager() {
  const shopSlug = useShopSlug();
  const { config: shopConfig } = useShopConfig();
  const [searchParams] = useSearchParams();
  const {
    isKioskMode,
    currentView,
    isInRotation,
    isFullscreen,
    ads,
    currentAdIndex,
    enterKioskMode,
    showQueueView,
    toggleFullscreen,
  } = useKiosk();

  // Use longer polling interval in kiosk mode to improve performance
  const pollInterval = 2000; // 2s polling for queue updates
  const barberPollInterval = isKioskMode ? 2000 : 0; // Poll barbers in kiosk mode so presence updates without refresh
  const { data: queueData, isLoading: queueLoading, error: queueError, refetch: refetchQueue } = useQueue(pollInterval);
  const { barbers, togglePresence } = useBarbers(barberPollInterval);
  const { activeServices } = useServices();
  const { isBarber, user } = useAuthContext();
  const { t } = useLocale();
  const displayBarbers = isBarber && user ? barbers.filter((b) => b.id === user.id) : barbers;
  const singleBarberId = displayBarbers.length === 1 ? displayBarbers[0].id : null;

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerToRemove, setCustomerToRemove] = useState<number | null>(null);
  const [customerToComplete, setCustomerToComplete] = useState<number | null>(null);
  const [checkInName, setCheckInName] = useState({ first: '', last: '' });
  const [combinedCheckInName, setCombinedCheckInName] = useState('');
  const [checkInServiceId, setCheckInServiceId] = useState<number | null>(null);
  const [checkInBarberId, setCheckInBarberId] = useState<number | null>(null);
  const [checkInProgressTicketId, setCheckInProgressTicketId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deadZoneWarning, setDeadZoneWarning] = useState<string | null>(null);
  const [nextTicketLoading, setNextTicketLoading] = useState(false);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({ customerName: '', serviceId: 0, scheduledTime: '', preferredBarberId: null as number | null });
  const [appointmentSubmitting, setAppointmentSubmitting] = useState(false);
  const [scheduledSectionOpen, setScheduledSectionOpen] = useState(false);
  const [editAppointmentTicketId, setEditAppointmentTicketId] = useState<number | null>(null);
  const [editAppointmentTime, setEditAppointmentTime] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(undefined);
  const [appointmentSlotTime, setAppointmentSlotTime] = useState<string | null>(null);
  const [appointmentSlots, setAppointmentSlots] = useState<Array<{ time: string; available: boolean }>>([]);
  const [appointmentSlotsLoading, setAppointmentSlotsLoading] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleSlotTime, setRescheduleSlotTime] = useState<string | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<Array<{ time: string; available: boolean }>>([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const firstNameInputRef = useRef<HTMLInputElement>(null);

  const settings = shopConfig.settings;
  const operatingHours = settings?.operatingHours as Record<string, { open?: string; close?: string } | null> | undefined;
  const timezone = settings?.timezone ?? 'America/Sao_Paulo';
  const useSlotsForAppointment = hasAnyOperatingHours(operatingHours);

  const checkInModal = useModal(false);
  const barberSelectorModal = useModal(false);
  const removeConfirmModal = useModal(false);
  const completeConfirmModal = useModal(false);
  const { validateName } = useProfanityFilter();

  const isAppointmentSelectable = useCallback((ticket: { type?: string; scheduledTime?: string | Date | null }) => {
    if ((ticket.type ?? 'walkin') !== 'appointment') return true;
    const scheduled = ticket.scheduledTime ? new Date(ticket.scheduledTime).getTime() : 0;
    if (scheduled === 0) return true;
    const oneHourMs = 60 * 60 * 1000;
    return Date.now() >= scheduled - oneHourMs;
  }, []);

  // Enter kiosk mode if ?kiosk=true in URL
  useEffect(() => {
    if (searchParams.get('kiosk') === 'true' && !isKioskMode) {
      enterKioskMode();
    }
  }, [searchParams, isKioskMode, enterKioskMode]);

  // Sync checkInServiceId to first active service when activeServices loads (like JoinForm). Use primitives to avoid loop.
  const firstActiveServiceId = activeServices[0]?.id ?? null;
  const activeServiceIdsStr = activeServices.map((s) => s.id).join(',');
  useEffect(() => {
    if (activeServices.length === 0) {
      setCheckInServiceId(null);
      return;
    }
    const validIds = new Set(activeServices.map((s) => s.id));
    if (checkInServiceId !== null && validIds.has(checkInServiceId)) return;
    setCheckInServiceId(firstActiveServiceId);
  }, [activeServices.length, firstActiveServiceId, activeServiceIdsStr, checkInServiceId]);

  // Auto-set checkInBarberId when single barber (convenience default). Use primitive deps to avoid loop.
  useEffect(() => {
    if (singleBarberId !== null && checkInModal.isOpen) {
      setCheckInBarberId(singleBarberId);
    }
  }, [singleBarberId, checkInModal.isOpen]);

  // Auto-set preferredBarberId in appointment form when single barber and modal opens
  useEffect(() => {
    if (singleBarberId !== null && appointmentModalOpen) {
      setAppointmentForm((f) => ({ ...f, preferredBarberId: singleBarberId }));
    }
  }, [singleBarberId, appointmentModalOpen]);

  const appointmentDateStr = appointmentDate
    ? `${appointmentDate.getFullYear()}-${String(appointmentDate.getMonth() + 1).padStart(2, '0')}-${String(appointmentDate.getDate()).padStart(2, '0')}`
    : '';
  useEffect(() => {
    if (!appointmentModalOpen || !appointmentDateStr || !appointmentForm.serviceId || !useSlotsForAppointment) {
      setAppointmentSlots([]);
      return;
    }
    setAppointmentSlotsLoading(true);
    api
      .getAppointmentSlots(shopSlug, appointmentDateStr, appointmentForm.serviceId, appointmentForm.preferredBarberId ?? undefined)
      .then((res) => setAppointmentSlots(res.slots))
      .catch(() => setAppointmentSlots([]))
      .finally(() => setAppointmentSlotsLoading(false));
  }, [appointmentModalOpen, appointmentDateStr, appointmentForm.serviceId, appointmentForm.preferredBarberId, shopSlug, useSlotsForAppointment]);

  useEffect(() => {
    if (!appointmentModalOpen) {
      setAppointmentDate(undefined);
      setAppointmentSlotTime(null);
      setAppointmentSlots([]);
    }
  }, [appointmentModalOpen]);

  const rescheduleDateStr = rescheduleDate
    ? `${rescheduleDate.getFullYear()}-${String(rescheduleDate.getMonth() + 1).padStart(2, '0')}-${String(rescheduleDate.getDate()).padStart(2, '0')}`
    : '';

  const disabledDaysForCalendar = useCallback((date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    return !hasHoursForDay(operatingHours, date);
  }, [operatingHours]);

  // Auto-focus first name input when check-in modal opens; reset form only when modal closes (transition)
  const checkInModalWasOpenRef = useRef(false);
  useEffect(() => {
    if (checkInModal.isOpen) {
      checkInModalWasOpenRef.current = true;
      if (firstNameInputRef.current) {
        const t = setTimeout(() => firstNameInputRef.current?.focus(), 100);
        return () => clearTimeout(t);
      }
    } else {
      if (checkInModalWasOpenRef.current) {
        checkInModalWasOpenRef.current = false;
        setCheckInName({ first: '', last: '' });
        setCombinedCheckInName('');
        setCheckInBarberId(null);
        setCheckInServiceId(firstActiveServiceId);
      }
    }
  }, [checkInModal.isOpen, firstActiveServiceId]);

  // Preload barber avatar images when barbers data is available
  useEffect(() => {
    if (barbers.length === 0) return;

    barbers.forEach((barber) => {
      // Preload custom avatar URL if available
      if (barber.avatarUrl) {
        const img = new Image();
        img.src = barber.avatarUrl;
        // Handle errors silently - component will handle fallback
        img.onerror = () => {};
      }

      // Preload fallback avatar URL (ui-avatars.com) if available
      // Note: This may fail due to CSP or rate limits, which is fine - component will show initials
      if (!barber.avatarUrl) {
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(barber.name)}&background=D4AF37&color=000&size=128`;
        const fallbackImg = new Image();
        fallbackImg.src = fallbackUrl;
        // Handle errors silently - component will show initials as fallback
        fallbackImg.onerror = () => {};
        // Set timeout to avoid hanging on rate-limited requests
        setTimeout(() => {
          fallbackImg.onerror = null;
          fallbackImg.onload = null;
        }, 5000);
      }
    });
  }, [barbers]);

  const tickets = queueData?.tickets || [];
  const allowAppointments = shopConfig.settings?.allowAppointments ?? false;

  // Memoize sorted tickets and counts (API returns weighted order when allowAppointments)
  const { sortedTickets, waitingCount, servingCount, pendingTickets } = useMemo(() => {
    const waitingTickets = tickets.filter((t) => t.status === 'waiting');
    const inProgressTickets = tickets.filter((t) => t.status === 'in_progress');
    const pending = tickets.filter((t) => t.status === 'pending');
    const sortedWaitingTickets = [...waitingTickets].sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    return {
      sortedTickets: [...sortedWaitingTickets, ...inProgressTickets],
      waitingCount: waitingTickets.length,
      servingCount: inProgressTickets.length,
      pendingTickets: pending,
    };
  }, [tickets]);

  // Get the ticket being edited for rescheduling
  const editTicket = editAppointmentTicketId != null ? pendingTickets.find((t) => t.id === editAppointmentTicketId) : undefined;

  // Memoize sorted barbers by ID (barber role sees only themselves)
  const sortedBarbers = useMemo(() => {
    return [...displayBarbers].sort((a, b) => a.id - b.id);
  }, [displayBarbers]);

  // Load reschedule slots when editing appointment
  const editTicketServiceId = editTicket?.serviceId;
  const editTicketBarberId = editTicket ? (editTicket as { preferredBarberId?: number }).preferredBarberId : undefined;
  useEffect(() => {
    if (!editAppointmentTicketId || !rescheduleDateStr || !useSlotsForAppointment || !editTicketServiceId) {
      setRescheduleSlots([]);
      return;
    }
    setRescheduleSlotsLoading(true);
    api
      .getAppointmentSlots(shopSlug, rescheduleDateStr, editTicketServiceId, editTicketBarberId)
      .then((res) => setRescheduleSlots(res.slots))
      .catch(() => setRescheduleSlots([]))
      .finally(() => setRescheduleSlotsLoading(false));
  }, [editAppointmentTicketId, rescheduleDateStr, editTicketServiceId, editTicketBarberId, shopSlug, useSlotsForAppointment]);

  // Parse reschedule date/time from editAppointmentTime
  useEffect(() => {
    if (editAppointmentTicketId != null && editAppointmentTime.trim()) {
      const d = new Date(editAppointmentTime);
      if (!isNaN(d.getTime())) {
        setRescheduleDate(d);
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        setRescheduleSlotTime(`${h}:${min}`);
      }
    } else if (editAppointmentTicketId == null) {
      setRescheduleDate(undefined);
      setRescheduleSlotTime(null);
      setRescheduleSlots([]);
    }
  }, [editAppointmentTicketId, editAppointmentTime]);

  // Combined name handler for check-in forms
  const handleCombinedCheckInNameChange = useCallback((value: string) => {
    // Check if there's already a space and last initial
    const spaceIndex = value.indexOf(' ');
    const hasSpace = spaceIndex !== -1;
    
    let processedValue = value;
    
    if (!hasSpace) {
      // No space yet - user is typing first name
      // Auto-capitalize first letter, lowercase the rest
      if (value.length > 0) {
        processedValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      }
    } else {
      // Space detected - split into first name and potential last initial
      const beforeSpace = value.substring(0, spaceIndex);
      const afterSpace = value.substring(spaceIndex + 1);
      
      // Format first name: capitalize first letter, lowercase rest
      const formattedFirstName = beforeSpace.length > 0
        ? beforeSpace.charAt(0).toUpperCase() + beforeSpace.slice(1).toLowerCase()
        : '';
      
      // Limit to one character after space and capitalize it
      const limitedAfterSpace = afterSpace.slice(0, 1).toUpperCase();
      
      // Always preserve the space, even if no character after it yet
      processedValue = formattedFirstName + ' ' + limitedAfterSpace;
    }
    
    setCombinedCheckInName(processedValue);
    
    // Parse to extract firstName and lastName for validation
    const spaceIdx = processedValue.indexOf(' ');
    if (spaceIdx !== -1) {
      setCheckInName({
        first: processedValue.substring(0, spaceIdx).trim(),
        last: processedValue.substring(spaceIdx + 1).trim(),
      });
    } else {
      setCheckInName({
        first: processedValue.trim(),
        last: '',
      });
    }
  }, []);

  const handleAddCustomer = useCallback(async () => {
    const validation = validateName(checkInName.first, checkInName.last);
    if (!validation.isValid) {
      setErrorMessage(validation.error || t('barber.invalidName'));
      return;
    }

    const fullName = checkInName.last.trim()
      ? `${formatName(checkInName.first.trim())} ${formatName(checkInName.last.trim())}`
      : formatName(checkInName.first.trim());

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const serviceId = checkInServiceId ?? activeServices[0]?.id ?? 1;
      await api.createTicket(shopSlug, {
        customerName: fullName,
        serviceId,
        preferredBarberId: checkInBarberId ?? undefined,
      });
      setCheckInName({ first: '', last: '' });
      setCombinedCheckInName('');
      setCheckInBarberId(null);
      setCheckInServiceId(activeServices[0]?.id ?? null);
      checkInModal.close();
      await refetchQueue();
    } catch (error) {
      const errorMsg = getErrorMessage(error, t('barber.addCustomerError'));
      setErrorMessage(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }, [checkInName, validateName, refetchQueue, checkInModal, shopSlug, t, checkInServiceId, checkInBarberId, activeServices]);

  const handleSelectBarber = useCallback(async (barberId: number | null) => {
    if (!selectedCustomerId) return;
    if (isBarber && barberId !== null && user && barberId !== user.id) return;

    try {
      if (barberId === null) {
        await api.updateTicket(selectedCustomerId, {
          barberId: null,
          status: 'waiting',
        });
      } else {
        await api.updateTicket(selectedCustomerId, {
          barberId,
          status: 'in_progress',
        });
      }
      await refetchQueue();
      barberSelectorModal.close();
      setSelectedCustomerId(null);
      setDeadZoneWarning(null);
    } catch (error) {
      const errorMsg = getErrorMessage(error, t('barber.assignBarberError'));
      setErrorMessage(errorMsg);
    }
  }, [selectedCustomerId, refetchQueue, barberSelectorModal, isBarber, user, t]);

  const handleCallNext = useCallback(async () => {
    setNextTicketLoading(true);
    setErrorMessage(null);
    setDeadZoneWarning(null);
    try {
      const { next, deadZoneWarning: dw } = await api.getQueueNext(shopSlug);
      if (dw?.message) setDeadZoneWarning(dw.message);
      if (next?.id) {
        setSelectedCustomerId(next.id);
        barberSelectorModal.open();
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('barber.nextError')));
    } finally {
      setNextTicketLoading(false);
    }
  }, [shopSlug, barberSelectorModal, t]);

  const handleCheckInAppointment = useCallback(async (ticketId: number) => {
    setCheckInProgressTicketId(ticketId);
    try {
      await api.checkInAppointment(shopSlug, ticketId);
      await refetchQueue();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('barber.checkInError')));
    } finally {
      setCheckInProgressTicketId(null);
    }
  }, [shopSlug, refetchQueue, t]);

  const handleCreateAppointment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    let scheduledTimeIso: string;
    if (useSlotsForAppointment) {
      if (!appointmentForm.serviceId || !appointmentForm.customerName.trim() || !appointmentDate || !appointmentSlotTime) {
        setErrorMessage(t('barber.fillNameServiceDateTime'));
        return;
      }
      const dateStr = `${appointmentDate.getFullYear()}-${String(appointmentDate.getMonth() + 1).padStart(2, '0')}-${String(appointmentDate.getDate()).padStart(2, '0')}`;
      const localDateTime = `${dateStr}T${appointmentSlotTime}:00`;
      scheduledTimeIso = fromZonedTime(localDateTime, timezone).toISOString();
    } else {
      if (!appointmentForm.serviceId || !appointmentForm.customerName.trim() || !appointmentForm.scheduledTime) {
        setErrorMessage(t('barber.fillNameServiceDateTime'));
        return;
      }
      scheduledTimeIso = new Date(appointmentForm.scheduledTime).toISOString();
    }
    setAppointmentSubmitting(true);
    setErrorMessage(null);
    try {
      await api.createAppointment(shopSlug, {
        customerName: appointmentForm.customerName.trim(),
        serviceId: appointmentForm.serviceId,
        scheduledTime: scheduledTimeIso,
        preferredBarberId: appointmentForm.preferredBarberId ?? undefined,
      });
      setAppointmentForm({ customerName: '', serviceId: 0, scheduledTime: '', preferredBarberId: null });
      setAppointmentModalOpen(false);
      setAppointmentDate(undefined);
      setAppointmentSlotTime(null);
      await refetchQueue();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('barber.appointmentError')));
    } finally {
      setAppointmentSubmitting(false);
    }
  }, [shopSlug, appointmentForm, appointmentDate, appointmentSlotTime, useSlotsForAppointment, timezone, refetchQueue, t]);

  const handleRescheduleAppointment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    let scheduledTimeIso: string;
    if (useSlotsForAppointment && rescheduleDate && rescheduleSlotTime) {
      const dateStr = `${rescheduleDate.getFullYear()}-${String(rescheduleDate.getMonth() + 1).padStart(2, '0')}-${String(rescheduleDate.getDate()).padStart(2, '0')}`;
      const localDateTime = `${dateStr}T${rescheduleSlotTime}:00`;
      scheduledTimeIso = fromZonedTime(localDateTime, timezone).toISOString();
    } else if (!useSlotsForAppointment && editAppointmentTime.trim()) {
      scheduledTimeIso = new Date(editAppointmentTime).toISOString();
    } else {
      return;
    }
    if (!editAppointmentTicketId) return;
    setRescheduleSubmitting(true);
    setErrorMessage(null);
    try {
      await api.updateTicket(editAppointmentTicketId, {
        scheduledTime: scheduledTimeIso,
      });
      setEditAppointmentTicketId(null);
      setEditAppointmentTime('');
      setRescheduleDate(undefined);
      setRescheduleSlotTime(null);
      await refetchQueue();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('barber.appointmentRescheduleError')));
    } finally {
      setRescheduleSubmitting(false);
    }
  }, [editAppointmentTicketId, editAppointmentTime, rescheduleDate, rescheduleSlotTime, useSlotsForAppointment, timezone, refetchQueue, t]);

  const handleRemoveCustomer = useCallback(async () => {
    if (!customerToRemove) return;

    try {
      await api.cancelTicketAsStaff(customerToRemove);
      await refetchQueue();
      removeConfirmModal.close();
      setCustomerToRemove(null);
    } catch (error) {
      const errorMsg = getErrorMessage(error, t('barber.removeCustomerError'));
      setErrorMessage(errorMsg);
      removeConfirmModal.close();
    }
  }, [customerToRemove, refetchQueue, removeConfirmModal, t]);

  const handleCompleteService = useCallback(async () => {
    if (!customerToComplete) return;

    try {
      await api.updateTicket(customerToComplete, {
        status: 'completed',
      });
      await refetchQueue();
      completeConfirmModal.close();
      setCustomerToComplete(null);
    } catch (error) {
      const errorMsg = getErrorMessage(error, t('barber.completeError'));
      setErrorMessage(errorMsg);
      completeConfirmModal.close();
    }
  }, [customerToComplete, refetchQueue, completeConfirmModal, t]);

  const getAssignedBarber = useCallback((ticket: { barberId?: number | null }) => {
    if (!ticket.barberId) return null;
    return barbers.find((b) => b.id === ticket.barberId) || null;
  }, [barbers]);

  // Auto-clear error messages after timeout
  useErrorTimeout(errorMessage, () => setErrorMessage(null));

  // Kiosk Mode View
  if (isKioskMode) {
    const joinUrl = `${window.location.origin}${import.meta.env.BASE_URL}join`;

    return (
      <div className="fixed inset-0 bg-black text-white z-50 overflow-hidden flex flex-col">
        {/* Error Message Toast */}
        {errorMessage && (
          <div 
            className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] bg-[#ef4444] text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 max-w-[calc(100%-2rem)] sm:max-w-md"
            role="alert"
            aria-live="assertive"
          >
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            <p className="flex-1 text-sm sm:text-base">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-white/80 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={t('barber.closeError')}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        {/* Fullscreen Toggle Button */}
        <button
          onClick={() => void toggleFullscreen()}
          className="absolute top-6 left-6 z-50 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
          aria-label={isFullscreen ? t('barber.exitFullscreen') : t('barber.enterFullscreen')}
        >
          <span className="material-symbols-outlined text-white/50 text-base">
            {isFullscreen ? 'close_fullscreen' : 'open_in_full'}
          </span>
        </button>

        {/* QR Code - Top right */}
        <div className="absolute top-6 right-6 z-50 bg-white p-0.5 shadow-2xl border-2 border-[var(--shop-accent)] flex items-center justify-center">
          <QRCode url={joinUrl} size={60} />
        </div>

        {/* Main Content */}
        {currentView === 'queue' && (
          <div className="flex-1 flex flex-col h-full">
            {/* Header with Shop Name / Check-in Button */}
            <header className="flex-shrink-0 pt-8 pb-6 text-center border-b border-[color-mix(in_srgb,var(--shop-accent)_15%,transparent)]">
              <button
                onClick={() => {
                  checkInModal.open();
                  showQueueView();
                }}
                className="inline-flex items-center gap-4 px-10 py-4 bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] rounded-2xl font-semibold text-xl hover:opacity-90 hover:-translate-y-1 hover:shadow-[0_8px_32px_color-mix(in_srgb,var(--shop-accent)_50%,transparent)] transition-all"
                aria-label={t('barber.addClientAria')}
              >
                <span className="material-symbols-outlined text-2xl">person_add</span>
                <span className="font-['Playfair_Display',serif] text-2xl tracking-wide uppercase">{queueData?.shop?.name ?? shopConfig.name}</span>
              </button>
            </header>

            {/* Queue List - Centered with proper spacing */}
            <div className="flex-1 overflow-y-auto py-8 px-6">
              <div className="max-w-4xl mx-auto space-y-4">
                {sortedTickets.length === 0 ? (
                  <div className="text-center py-20">
                    <span className="material-symbols-outlined text-7xl text-white/20 mb-6 block">groups</span>
                    <p className="text-2xl text-white/40 font-light">{t('barber.noClientInQueue')}</p>
                    <p className="text-lg text-white/30 mt-2">{t('barber.tapToAdd')}</p>
                  </div>
                ) : (
                  sortedTickets.map((ticket, index) => {
                    const assignedBarber = getAssignedBarber(ticket);
                    const isServing = ticket.status === 'in_progress';
                    // Calculate display position based on index in sorted waiting tickets
                    const displayPosition = isServing ? null : index + 1;

                    return (
                      <div
                        key={ticket.id}
                        className={cn(
                          'w-full px-8 py-6 rounded-2xl border transition-all',
                          {
                            'bg-[var(--shop-background)] border-[color-mix(in_srgb,var(--shop-accent)_40%,transparent)]': isServing,
                            'bg-[color-mix(in_srgb,var(--shop-surface-secondary)_80%,transparent)] border-[color-mix(in_srgb,var(--shop-accent)_20%,transparent)]': !isServing,
                          }
                        )}
                      >
                        <div className="flex items-center gap-6">
                          {/* Position badge (read-only in kiosk; no assign/finish actions) */}
                          {isServing ? (
                            <div
                              className={cn(
                                'w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl flex-shrink-0',
                                'bg-[var(--shop-background)] text-[var(--shop-accent)] border-2 border-[var(--shop-accent)]'
                              )}
                              aria-hidden="true"
                            >
                              <span className="material-symbols-outlined text-3xl">check</span>
                            </div>
                          ) : (
                            <div
                              className={cn(
                                'w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl flex-shrink-0',
                                'bg-[var(--shop-background)] text-[var(--shop-accent)] border-2 border-[var(--shop-accent)]'
                              )}
                              aria-hidden="true"
                            >
                              {displayPosition}
                            </div>
                          )}
                          {/* Customer info (read-only in kiosk) */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-2xl text-white truncate">{formatNameForDisplay(ticket.customerName)}</p>
                              {(ticket as { ticketNumber?: string | null }).ticketNumber && (
                                <span className="text-lg font-mono px-2 py-0.5 rounded bg-white/10 text-[var(--shop-accent)]">
                                  {(ticket as { ticketNumber?: string | null }).ticketNumber}
                                </span>
                              )}
                              {(ticket as { type?: string }).type === 'appointment' && (
                                <span className="text-sm px-2 py-0.5 rounded bg-[var(--shop-accent)]/20 text-[var(--shop-accent)] flex items-center gap-1">
                                  <span className="material-symbols-outlined text-base">event</span>
                                  Agendado
                                </span>
                              )}
                            </div>
                            {assignedBarber && (
                              <p className="text-lg text-white/60 mt-1 truncate flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">content_cut</span>
                                {assignedBarber.name}
                              </p>
                            )}
                          </div>
                          {/* Status indicator */}
                          {isServing && (
                            <div className="flex-shrink-0 px-4 py-2 bg-[color-mix(in_srgb,var(--shop-accent)_20%,transparent)] border border-[color-mix(in_srgb,var(--shop-accent)_40%,transparent)] rounded-xl">
                              <span className="text-[var(--shop-accent)] text-sm font-medium uppercase tracking-wider">{t('barber.serving')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Bar - Barber presence (read-only in kiosk) */}
            <footer className="flex-shrink-0 py-6 px-8 border-t border-[color-mix(in_srgb,var(--shop-accent)_15%,transparent)] bg-[color-mix(in_srgb,var(--shop-background)_95%,transparent)]">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  {sortedBarbers.map((barber) => (
                    <div
                      key={barber.id}
                      className={cn(
                        'px-6 py-3 rounded-xl border-2 font-medium text-lg',
                        barber.isPresent
                          ? 'bg-[color-mix(in_srgb,var(--shop-accent)_20%,transparent)] border-[color-mix(in_srgb,var(--shop-accent)_50%,transparent)] text-[var(--shop-accent)]'
                          : 'bg-black/50 border-[color-mix(in_srgb,var(--shop-accent)_20%,transparent)] text-[var(--shop-text-secondary)]'
                      )}
                      aria-hidden="true"
                    >
                      {barber.name}
                    </div>
                  ))}
                </div>
              </div>
            </footer>
          </div>
        )}

        {/* Ad View */}
        {currentView === 'ad' && (
          <div 
            className="flex-1 flex items-center justify-center relative cursor-pointer min-h-0 max-h-screen overflow-hidden"
            onClick={showQueueView}
          >
            <KioskAdsPlayer ads={ads} currentAdIndex={currentAdIndex} />
          </div>
        )}

        {/* Progress Bar - Only show during ad views, not queue */}
        {isKioskMode && isInRotation && currentView !== 'queue' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-50">
            <div
              key={`progress-${currentView}`}
              className="h-full bg-[var(--shop-accent)]"
              style={{
                width: '0%',
                animation: `progress ${AD_VIEW_DURATION}ms linear forwards`,
              }}
            />
          </div>
        )}

        {/* Kiosk Modals - Styled for fullscreen display */}
        {/* Check-in Modal */}
        {checkInModal.isOpen && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-8">
            <div className="bg-[var(--shop-surface-secondary)] border-2 border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] rounded-3xl p-6 sm:p-8 lg:p-10 max-w-2xl w-full min-w-[320px]">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-['Playfair_Display',serif] text-[var(--shop-accent)] mb-6 sm:mb-8 text-center">
                {t('barber.joinQueue')}
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddCustomer();
                }}
                className="space-y-4 sm:space-y-6"
              >
                <div>
                  <label htmlFor="kioskGuestName" className="block text-lg sm:text-xl font-medium mb-2 sm:mb-3 text-white">
                    {t('barber.nameLabel')}
                  </label>
                  <input
                    ref={firstNameInputRef}
                    id="kioskGuestName"
                    type="text"
                    value={combinedCheckInName}
                    onChange={(e) => handleCombinedCheckInNameChange(e.target.value)}
                    placeholder={t('barber.namePlaceholder')}
                    autoCapitalize="words"
                    autoCorrect="off"
                    spellCheck="false"
                    inputMode="text"
                    required
                    className="w-full min-w-[200px] sm:min-w-[250px] max-w-[300px] px-4 sm:px-6 py-3 sm:py-4 lg:py-5 text-lg sm:text-xl lg:text-2xl rounded-2xl bg-white/10 border-2 border-[var(--shop-border-color)] text-[var(--shop-text-primary)] min-h-[44px] placeholder:text-[var(--shop-text-secondary)] focus:outline-none focus:border-[var(--shop-accent)]"
                  />
                </div>
                <div className="flex gap-3 sm:gap-4 mt-6 sm:mt-8">
                  <button
                    type="button"
                    onClick={checkInModal.close}
                    className="flex-1 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-base sm:text-lg lg:text-xl rounded-2xl bg-white/10 border-2 border-white/20 text-white hover:bg-white/20 transition-all min-h-[44px]"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-base sm:text-lg lg:text-xl rounded-2xl bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] font-semibold hover:bg-[var(--shop-accent-hover)] transition-all disabled:opacity-50 min-h-[44px]"
                  >
                    {isSubmitting ? t('barber.adding') : t('barber.add')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Kiosk: no barber selector, complete, or remove modals - only add client and view line/ads */}
      </div>
    );
  }

  // Management Mode View
  return (
    <div className="min-h-screen bg-black p-3 sm:p-4 pb-20 overflow-x-hidden max-w-full">
      <Navigation />
      {/* Error Message Toast */}
      {errorMessage && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#ef4444] text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 max-w-[calc(100%-2rem)] sm:max-w-md"
          role="alert"
          aria-live="assertive"
        >
          <span className="material-symbols-outlined" aria-hidden="true">error</span>
          <p className="flex-1 text-sm sm:text-base">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-white/80 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={t('barber.closeError')}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      <div className="container max-w-[600px] mx-auto pt-20 sm:pt-24">
        {/* Stats Header */}
        <div className="header bg-[color-mix(in_srgb,var(--shop-surface-secondary)_90%,transparent)] border-[3px] border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] rounded-xl p-4 sm:p-6 mb-4 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          <div className="stats flex gap-4 sm:gap-6">
            <div className="stat-item flex-1 text-center">
              <div className="stat-value text-2xl sm:text-3xl font-semibold text-[var(--shop-accent)]">{waitingCount}</div>
              <div className="stat-label text-xs text-[rgba(255,255,255,0.7)] mt-1">{t('barber.waiting')}</div>
            </div>
            <div className="stat-item flex-1 text-center">
              <div className="stat-value text-2xl sm:text-3xl font-semibold text-white">{servingCount}</div>
              <div className="stat-label text-xs text-[rgba(255,255,255,0.7)] mt-1">{t('barber.serving')}</div>
            </div>
          </div>
        </div>

        {/* Queue Section */}
        <div className="queue-section bg-[color-mix(in_srgb,var(--shop-surface-secondary)_90%,transparent)] border-[3px] border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] rounded-xl p-4 sm:p-6 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          {/* Add Customer / Call Next / Add Appointment */}
          <div className="queue-header mb-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={checkInModal.open}
              className="checkin-btn flex items-center justify-center gap-3 px-8 py-4 bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] border-2 border-[var(--shop-accent)] rounded-lg font-semibold flex-1 transition-all hover:-translate-y-0.5 hover:bg-[var(--shop-accent-hover)]"
            >
              <span className="material-symbols-outlined text-xl">person_add</span>
              {t('barber.addClient')}
            </button>
            {allowAppointments && (
              <>
                <button
                  type="button"
                  onClick={handleCallNext}
                  disabled={nextTicketLoading || sortedTickets.length === 0}
                  aria-label={t('barber.callNext')}
                  title={t('barber.callNext')}
                  className="flex items-center justify-center gap-2 px-4 py-4 min-w-[44px] bg-[color-mix(in_srgb,var(--shop-accent)_80%,transparent)] text-[var(--shop-text-on-accent)] border-2 border-[var(--shop-accent)] rounded-lg font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {nextTicketLoading ? (
                    <span className="material-symbols-outlined animate-spin">hourglass_empty</span>
                  ) : (
                    <span className="material-symbols-outlined">next_plan</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setAppointmentModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-white/10 border-2 border-white/20 rounded-lg font-semibold text-white hover:bg-white/15 transition-all"
                >
                  <span className="material-symbols-outlined">event</span>
                  {t('barber.appointment')}
                </button>
              </>
            )}
          </div>
          {allowAppointments && deadZoneWarning && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-200 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">schedule</span>
              {deadZoneWarning}
            </div>
          )}

          {/* Future appointments (compact detail, collapsed by default) */}
          {allowAppointments && pendingTickets.length > 0 && (
            <div className="mb-2 mt-1">
              <button
                type="button"
                onClick={() => setScheduledSectionOpen((open) => !open)}
                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-left text-white/50 hover:text-white/70 hover:bg-white/5 transition-colors"
                aria-expanded={scheduledSectionOpen}
              >
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="material-symbols-outlined text-sm">event</span>
                  {t('barber.scheduledAwaitingCheckIn')}
                  <span className="text-white/40">({pendingTickets.length})</span>
                </span>
                <span className="material-symbols-outlined text-sm">
                  {scheduledSectionOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {scheduledSectionOpen && (
                <ul className="mt-1 space-y-1">
                  {pendingTickets.map((ticket) => {
                    const scheduledTime = (ticket as any).scheduledTime;
                    const scheduledStr = scheduledTime
                      ? (() => {
                          const d = new Date(scheduledTime);
                          const y = d.getFullYear();
                          const m = String(d.getMonth() + 1).padStart(2, '0');
                          const day = String(d.getDate()).padStart(2, '0');
                          const h = String(d.getHours()).padStart(2, '0');
                          const min = String(d.getMinutes()).padStart(2, '0');
                          return `${y}-${m}-${day}T${h}:${min}`;
                        })()
                      : '';
                    return (
                      <li
                        key={ticket.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-2 py-2 rounded bg-white/5 border border-white/10"
                      >
                        <div className="min-w-0 text-xs">
                          <span className="text-white/70">{(ticket as any).ticketNumber ?? `A-${ticket.id}`}</span>
                          <span className="text-white/60 ml-1.5">{formatNameForDisplay(ticket.customerName)}</span>
                          {scheduledTime && (
                            <span className="text-white/45 ml-1.5">
                              {new Date(scheduledTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCheckInAppointment(ticket.id)}
                            disabled={checkInProgressTicketId === ticket.id}
                            className="px-2 py-1 rounded text-xs bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)] font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {checkInProgressTicketId === ticket.id ? (
                              <>
                                <span className="material-symbols-outlined animate-spin text-sm align-middle mr-0.5">hourglass_empty</span>
                                {t('barber.checkingIn')}
                              </>
                            ) : (
                              t('barber.checkIn')
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditAppointmentTicketId(ticket.id);
                              setEditAppointmentTime(scheduledStr);
                            }}
                            className="p-1.5 rounded bg-white/10 text-white/60 hover:text-white/80"
                            title={t('barber.rescheduleAppointment')}
                            aria-label={t('barber.rescheduleAppointment')}
                          >
                            <span className="material-symbols-outlined text-sm">edit_calendar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomerToRemove(ticket.id);
                              removeConfirmModal.open();
                            }}
                            className="p-1.5 rounded bg-white/10 text-white/60 hover:text-red-300"
                            title={t('barber.cancelAppointment')}
                            aria-label={t('barber.cancelAppointmentAria').replace('{name}', ticket.customerName)}
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Queue List */}
          {queueLoading ? (
            <div className="space-y-3" aria-busy="true" aria-live="polite">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-md border border-white/8 bg-white/5 animate-pulse"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : queueError ? (
            <ErrorDisplay error={queueError} onRetry={refetchQueue} />
          ) : (
            <div className="space-y-3" aria-live="polite">
              {sortedTickets.length === 0 ? (
                <div className="text-center py-12 text-[rgba(255,255,255,0.7)]">
                  {t('barber.noClientInQueue')}
                </div>
              ) : (
                sortedTickets.map((ticket, index) => {
                  const assignedBarber = getAssignedBarber(ticket);
                  const isServing = ticket.status === 'in_progress';
                  // Calculate display position based on index in sorted waiting tickets
                  const displayPosition = isServing ? null : index + 1;
                  return (
                    <QueueCard
                      key={ticket.id}
                      ticket={ticket}
                      assignedBarber={assignedBarber}
                      barbers={displayBarbers}
                      displayPosition={displayPosition}
                      disabled={ticket.status === 'waiting' && !isAppointmentSelectable(ticket)}
                      disabledReason={ticket.status === 'waiting' && !isAppointmentSelectable(ticket) ? t('barber.appointmentTooEarly') : undefined}
                      onClick={() => {
                        if (!isAppointmentSelectable(ticket)) {
                          setErrorMessage(t('barber.appointmentTooEarly'));
                          return;
                        }
                        setSelectedCustomerId(ticket.id);
                        barberSelectorModal.open();
                      }}
                      onRemove={() => {
                        setCustomerToRemove(ticket.id);
                        removeConfirmModal.open();
                      }}
                      onComplete={() => {
                        setCustomerToComplete(ticket.id);
                        completeConfirmModal.open();
                      }}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Barber Presence Section */}
        <div className="mt-4 sm:mt-6 bg-[color-mix(in_srgb,var(--shop-surface-secondary)_90%,transparent)] border-[3px] border-[color-mix(in_srgb,var(--shop-accent)_30%,transparent)] rounded-xl p-4 sm:p-6 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          <h2 className="section-header text-xl sm:text-2xl font-semibold text-white mb-4">{t('barber.barbersPresent')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {displayBarbers.map((barber) => (
              <BarberCard
                key={barber.id}
                barber={barber}
                showPresence
                onClick={async () => {
                  try {
                    await togglePresence(barber.id, !barber.isPresent);
                    await refetchQueue();
                      } catch (error) {
                        let errorMsg = t('barber.togglePresenceError');
                        if (error instanceof Error) {
                          errorMsg = error.message;
                        } else if (error && typeof error === 'object' && 'error' in error) {
                          errorMsg = (error as { error: string }).error;
                        }
                        setErrorMessage(errorMsg);
                      }
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Check-in Modal */}
      <Modal
        isOpen={checkInModal.isOpen}
        onClose={checkInModal.close}
        title={t('barber.joinQueue')}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddCustomer();
          }}
          className="space-y-4"
          autoComplete="off"
        >
          <div>
            <label htmlFor="guestName" className="block text-sm font-medium mb-2">
              {t('barber.nameLabel')}
            </label>
            <input
              id="guestName"
              type="text"
              value={combinedCheckInName}
              onChange={(e) => handleCombinedCheckInNameChange(e.target.value)}
              placeholder={t('barber.namePlaceholder')}
              autoComplete="one-time-code"
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck="false"
              inputMode="text"
              data-lpignore="true"
              data-form-type="other"
              required
              className="w-full min-w-[200px] sm:min-w-[250px] max-w-[300px] px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-muted/50 border border-border text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-ring"
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
          {activeServices.length >= 2 && (
            <div>
              <label htmlFor="checkInService" className="block text-sm font-medium mb-2">{t('join.serviceLabel')}</label>
              <select
                id="checkInService"
                value={checkInServiceId ?? ''}
                onChange={(e) => setCheckInServiceId(e.target.value ? parseInt(e.target.value, 10) : null)}
                required
                className="w-full min-w-[200px] sm:min-w-[250px] max-w-[300px] px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-muted/50 border border-border text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t('join.selectOption')}</option>
                {activeServices.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          {barbers.length > 0 && (
            <div>
              <label htmlFor="checkInBarber" className="block text-sm font-medium mb-2">{t('join.barberLabelOptional')}</label>
              <select
                id="checkInBarber"
                value={checkInBarberId ?? ''}
                onChange={(e) => setCheckInBarberId(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="w-full min-w-[200px] sm:min-w-[250px] max-w-[300px] px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-muted/50 border border-border text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t('join.selectOption')}</option>
                {barbers.filter((b) => b.isActive).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={checkInModal.close} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                (activeServices.length >= 2 && !checkInServiceId)
              }
              className="flex-1"
            >
              {isSubmitting ? t('barber.adding') : t('barber.add')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Appointment Modal (when allowAppointments) */}
      {allowAppointments && (
        <Modal
          isOpen={appointmentModalOpen}
          onClose={() => {
            setAppointmentModalOpen(false);
            setErrorMessage(null);
            setAppointmentForm((f) => ({ ...f, scheduledTime: '', preferredBarberId: null }));
          }}
          title={t('barber.addAppointmentTitle')}
        >
          <form onSubmit={handleCreateAppointment} className="space-y-4">
            <div>
              <label htmlFor="appointmentName" className="block text-sm font-medium mb-1">{t('barber.nameLabel')}</label>
              <input
                id="appointmentName"
                type="text"
                value={appointmentForm.customerName}
                onChange={(e) => setAppointmentForm((f) => ({ ...f, customerName: e.target.value }))}
                placeholder={t('barber.customerNamePlaceholder')}
                required
                className="w-full px-3 py-2.5 rounded-lg bg-muted/50 border border-border min-h-[44px]"
              />
            </div>
            <div>
              <label htmlFor="appointmentService" className="block text-sm font-medium mb-1">{t('join.serviceLabel')}</label>
              <select
                id="appointmentService"
                value={appointmentForm.serviceId || ''}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setAppointmentForm((f) => ({ ...f, serviceId: v }));
                  setAppointmentDate(undefined);
                  setAppointmentSlotTime(null);
                }}
                required
                className="w-full px-3 py-2.5 rounded-lg bg-muted/50 border border-border min-h-[44px]"
              >
                <option value="">Selecione</option>
                {activeServices.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            {useSlotsForAppointment ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Data *</label>
                  <div className="schedule-calendar-wrap w-full overflow-x-auto">
                    <DayPicker
                      mode="single"
                      selected={appointmentDate}
                      onSelect={(d) => {
                        setAppointmentDate(d);
                        setAppointmentSlotTime(null);
                      }}
                      disabled={disabledDaysForCalendar}
                      className="rdp-default w-full bg-muted/30 rounded-lg p-2 [--rdp-accent-color:var(--shop-accent)]"
                    />
                  </div>
                </div>
                {appointmentDateStr && appointmentForm.serviceId && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Horário *</label>
                    {appointmentSlotsLoading ? (
                      <p className="text-sm text-muted-foreground">Carregando horários...</p>
                    ) : appointmentSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum horário disponível neste dia.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {appointmentSlots.map((slot) => (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => setAppointmentSlotTime(slot.time)}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                              appointmentSlotTime === slot.time
                                ? 'bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)]'
                                : slot.available
                                  ? 'bg-muted/50 hover:bg-muted text-foreground'
                                  : 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                            )}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div>
                <label htmlFor="appointmentTime" className="block text-sm font-medium mb-1">Data e hora *</label>
                <input
                  id="appointmentTime"
                  type="datetime-local"
                  value={appointmentForm.scheduledTime}
                  onChange={(e) => setAppointmentForm((f) => ({ ...f, scheduledTime: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 rounded-lg bg-muted/50 border border-border min-h-[44px]"
                />
              </div>
            )}
            {barbers.length > 0 && (
              <div>
                <label htmlFor="appointmentBarber" className="block text-sm font-medium mb-1">{t('join.barberLabelOptional')}</label>
                <select
                  id="appointmentBarber"
                  value={appointmentForm.preferredBarberId ?? ''}
                  onChange={(e) => setAppointmentForm((f) => ({ ...f, preferredBarberId: e.target.value ? parseInt(e.target.value, 10) : null }))}
                  className="w-full px-3 py-2.5 rounded-lg bg-muted/50 border border-border min-h-[44px]"
                >
                  <option value="">{t('join.selectOption')}</option>
                  {barbers.filter((b) => b.isActive).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setAppointmentModalOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  appointmentSubmitting ||
                  !appointmentForm.customerName.trim() ||
                  !appointmentForm.serviceId ||
                  (useSlotsForAppointment ? !appointmentDate || !appointmentSlotTime : !appointmentForm.scheduledTime)
                }
                className="flex-1"
              >
                {appointmentSubmitting ? t('barber.creating') : t('barber.createAppointment')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reschedule appointment modal */}
      {allowAppointments && editAppointmentTicketId !== null && (
        <Modal
          isOpen={true}
          onClose={() => {
            setEditAppointmentTicketId(null);
            setEditAppointmentTime('');
            setRescheduleDate(undefined);
            setRescheduleSlotTime(null);
            setErrorMessage(null);
          }}
          title={t('barber.rescheduleAppointment')}
        >
          <form onSubmit={handleRescheduleAppointment} className="space-y-4">
            {useSlotsForAppointment ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Data</label>
                  <div className="schedule-calendar-wrap w-full overflow-x-auto">
                    <DayPicker
                      mode="single"
                      selected={rescheduleDate}
                      onSelect={(d) => {
                        setRescheduleDate(d);
                        setRescheduleSlotTime(null);
                      }}
                      disabled={disabledDaysForCalendar}
                      className="rdp-default w-full bg-muted/30 rounded-lg p-2 [--rdp-accent-color:var(--shop-accent)]"
                    />
                  </div>
                </div>
                {rescheduleDateStr && editTicket?.serviceId && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Horário</label>
                    {rescheduleSlotsLoading ? (
                      <p className="text-sm text-muted-foreground">Carregando horários...</p>
                    ) : rescheduleSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum horário disponível neste dia.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {rescheduleSlots.map((slot) => (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => setRescheduleSlotTime(slot.time)}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                              rescheduleSlotTime === slot.time
                                ? 'bg-[var(--shop-accent)] text-[var(--shop-text-on-accent)]'
                                : slot.available
                                  ? 'bg-muted/50 hover:bg-muted text-foreground'
                                  : 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                            )}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div>
                <label htmlFor="editAppointmentTime" className="block text-sm font-medium mb-1">Data e hora</label>
                <input
                  id="editAppointmentTime"
                  type="datetime-local"
                  value={editAppointmentTime}
                  onChange={(e) => setEditAppointmentTime(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg bg-muted/50 border border-border min-h-[44px]"
                />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditAppointmentTicketId(null);
                  setEditAppointmentTime('');
                  setRescheduleDate(undefined);
                  setRescheduleSlotTime(null);
                }}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={
                  rescheduleSubmitting ||
                  (useSlotsForAppointment ? !rescheduleDate || !rescheduleSlotTime : !editAppointmentTime.trim())
                }
                className="flex-1"
              >
                {rescheduleSubmitting ? t('barber.rescheduling') : t('barber.reschedule')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Barber Selector Modal */}
      {barberSelectorModal.isOpen && selectedCustomerId && (() => {
        const selectedTicket = tickets.find((t) => t.id === selectedCustomerId);
        return (
          <BarberSelector
            isOpen={barberSelectorModal.isOpen}
            onClose={() => { barberSelectorModal.close(); setSelectedCustomerId(null); setDeadZoneWarning(null); }}
            barbers={displayBarbers}
            selectedBarberId={selectedTicket?.barberId || null}
            onSelect={handleSelectBarber}
            customerName={selectedTicket?.customerName}
            tickets={tickets}
            currentTicketId={selectedCustomerId}
          />
        );
      })()}

      {/* Remove / Cancel appointment Confirmation */}
      {(() => {
        const ticketToRemove = customerToRemove ? tickets.find((tkt) => tkt.id === customerToRemove) : null;
        const isPendingAppointment = ticketToRemove?.status === 'pending';
        const displayName = ticketToRemove?.customerName ?? t('barber.thisClient');
        return (
          <ConfirmationDialog
            isOpen={removeConfirmModal.isOpen}
            onClose={removeConfirmModal.close}
            onConfirm={handleRemoveCustomer}
            title={isPendingAppointment ? t('barber.cancelAppointmentTitle') : t('barber.removeFromQueueTitle')}
            message={
              isPendingAppointment
                ? t('barber.cancelAppointmentMessage').replace('{name}', displayName)
                : t('barber.removeFromQueueMessage').replace('{name}', displayName)
            }
            confirmText={isPendingAppointment ? t('barber.cancelAppointmentConfirm') : t('barber.removeButton')}
            cancelText={t('common.cancel')}
            variant="destructive"
            icon="delete"
          />
        );
      })()}

      {/* Complete Confirmation */}
      <ConfirmationDialog
        isOpen={completeConfirmModal.isOpen}
        onClose={completeConfirmModal.close}
        onConfirm={handleCompleteService}
        title={t('barber.completeTitle')}
        message={t('barber.completeMessage').replace(
          '{name}',
          customerToComplete
            ? tickets.find((tkt) => tkt.id === customerToComplete)?.customerName ?? t('barber.thisClient')
            : t('barber.thisClient')
        )}
        confirmText={t('barber.completeButton')}
        cancelText={t('common.cancel')}
        icon="check_circle"
      />
    </div>
  );
}
