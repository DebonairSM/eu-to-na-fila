import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CountryCode } from 'libphonenumber-js';
import { api, ApiError } from '@/lib/api';
import { invalidateQueueHttpCache } from '@/lib/api/queue';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useProfanityFilter } from '@/hooks/useProfanityFilter';
import { useQueue } from '@/hooks/useQueue';
import { useBarbers } from '@/hooks/useBarbers';
import { useServices } from '@/hooks/useServices';
import { getShopStatus } from '@eutonafila/shared';
import { getErrorMessage, formatNameWithConnectors, getOrCreateDeviceId, redirectToStatusPage } from '@/lib/utils';
import { applyTrackingConsent, clearTrackingCookie } from '@/lib/trackingCookie';
import { logError } from '@/lib/logger';
import { STORAGE_KEYS, POLL_INTERVALS } from '@/lib/constants';
import { useWaitTimes } from '@/contexts/WaitTimesContext';

const STORAGE_KEY = STORAGE_KEYS.ACTIVE_TICKET_ID;
const CUSTOMER_NAME_STORAGE_KEY = STORAGE_KEYS.CUSTOMER_NAME;
const CUSTOMER_PHONE_STORAGE_KEY = STORAGE_KEYS.CUSTOMER_PHONE;
const CUSTOMER_EMAIL_STORAGE_KEY = 'eutonafila_customer_email';
const CUSTOMER_COUNTRY_STORAGE_KEY = 'eutonafila_customer_country';
const TRACKING_CONSENT_STORAGE_KEY = STORAGE_KEYS.TRACKING_CONSENT;
const REMEMBER_PHONE_DEBOUNCE_MS = 400;

function isSufficientName(name: string | undefined): boolean {
  if (!name || !name.trim()) return false;
  const n = name.trim();
  if (n === 'Customer') return false;
  if (n.includes('@')) return false; // email used as placeholder
  return true;
}

export function useJoinForm() {
  const [combinedName, setCombinedName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCountry, setCustomerCountry] = useState<CountryCode>('BR');
  const [selectedBarberId, setSelectedBarberId] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [closedReason, setClosedReason] = useState<'lunch' | 'closed' | null>(null);
  const [isAlreadyInQueue, setIsAlreadyInQueue] = useState(false);
  const [existingTicketId, setExistingTicketId] = useState<number | null>(null);
  const [nameCollisionError, setNameCollisionError] = useState<string | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [trackingConsent, setTrackingConsent] = useState<boolean | null>(null);
  const [referralSource, setReferralSource] = useState<string>('');
  /** Prevents overlapping submitJoin runs (double tap / slow network before isSubmitting flips). */
  const joinSubmitLockRef = useRef(false);
  const { waitTimes, isLoading: isLoadingWaitTimes, refetch: refetchWaitTimes } = useWaitTimes();
  const combinedNameRef = useRef(combinedName);
  combinedNameRef.current = combinedName;
  const nameCursorRestoreRef = useRef<{ input: HTMLInputElement; cursor: number } | null>(null);
  const navigate = useNavigate();
  const shopSlug = useShopSlug();
  const { config: shopConfig } = useShopConfig();
  const { user, isCustomer, logout } = useAuthContext();
  const { t } = useLocale();

  const needsProfileCompletion = isCustomer && user?.name && !isSufficientName(user.name);
  const settings = shopConfig.settings;
  const { validateName } = useProfanityFilter();
  const { data, refetch: refetchQueue } = useQueue(POLL_INTERVALS.JOIN_PUBLIC_QUEUE, { scope: 'public' });
  const { barbers, refetch: refetchBarbers } = useBarbers();
  const { services: servicesList, activeServices, isLoading: isLoadingServices, refetch: refetchServices } = useServices();
  const [isRefreshingJoinData, setIsRefreshingJoinData] = useState(false);

  const validServiceIds = new Set(activeServices.map((s) => s.id));

  // Keep only valid selected ids when service list changes (depend on servicesList, not activeServices, to avoid infinite loop: activeServices is a new array every render)
  useEffect(() => {
    const active = (Array.isArray(servicesList) ? servicesList : []).filter((s) => s.isActive);
    if (active.length === 0) {
      setSelectedServiceIds([]);
      return;
    }
    const validIds = new Set(active.map((s) => s.id));
    setSelectedServiceIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [servicesList]);

  // Clear preferred barber when shop no longer allows it so UI updates immediately
  useEffect(() => {
    if (!settings.allowBarberPreference) setSelectedBarberId(null);
  }, [settings.allowBarberPreference]);

  // Load last tracking consent choice from localStorage for pre-fill; clear tracking cookie if user previously denied
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TRACKING_CONSENT_STORAGE_KEY);
      if (stored === 'true') setTrackingConsent(true);
      else if (stored === 'false') {
        setTrackingConsent(false);
        clearTrackingCookie();
      }
    } catch {
      // ignore
    }
  }, []);

  // Load stored customer name and phone on mount; when logged in, use profile
  useEffect(() => {
    if (isCustomer && user?.name) {
      const formatted = formatNameWithConnectors(user.name.trim());
      const words = formatted.trim().split(/\s+/).filter(Boolean);
      setFirstName(words[0] ?? '');
      setLastName(words.length > 1 ? words.slice(1).join(' ') : '');
      setCombinedName(formatted);
      return;
    }
    try {
      const storedName = localStorage.getItem(CUSTOMER_NAME_STORAGE_KEY);
      if (storedName) {
        const parsed = JSON.parse(storedName);
        if (parsed && typeof parsed.firstName === 'string' && typeof parsed.lastName === 'string') {
          const storedFirstName = parsed.firstName.trim();
          const storedLastName = parsed.lastName.trim();
          if (storedFirstName) {
            const combined = storedLastName
              ? `${storedFirstName} ${storedLastName}`
              : storedFirstName;
            setFirstName(storedFirstName);
            setLastName(storedLastName);
            setCombinedName(combined);
          }
        }
      }
      const storedPhone = localStorage.getItem(CUSTOMER_PHONE_STORAGE_KEY);
      if (storedPhone && typeof storedPhone === 'string') {
        setCustomerPhone(storedPhone.trim());
      }
      const storedEmail = localStorage.getItem(CUSTOMER_EMAIL_STORAGE_KEY);
      if (storedEmail && typeof storedEmail === 'string') {
        setCustomerEmail(storedEmail.trim());
      }
      const storedCountry = localStorage.getItem(CUSTOMER_COUNTRY_STORAGE_KEY);
      if (storedCountry && typeof storedCountry === 'string' && storedCountry.length === 2) {
        setCustomerCountry(storedCountry.toUpperCase() as CountryCode);
      }
    } catch (error) {
      logError('Failed to load stored customer name', error);
    }
  }, [isCustomer, user?.name]);

  // When logged in as customer, fetch profile to prefill phone
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

  // Remember my info: when phone changes, debounced lookup to prefill name.
  // When logged in as customer, do not prefill name from phone: the name must come from the
  // account only, not from a coincidental match (another person with the same name).
  useEffect(() => {
    if (isCustomer) return;
    const digits = customerPhone.replace(/\D/g, '');
    if (digits.length < 8) return;

    const t = setTimeout(async () => {
      try {
        const res = await api.getClientRemember(shopSlug, customerPhone);
        if (res.hasClient && res.name && res.name.trim()) {
          if (combinedNameRef.current.trim()) return;
          const formatted = formatNameWithConnectors(res.name.trim());
          const words = formatted.trim().split(/\s+/).filter(Boolean);
          setFirstName(words[0] ?? '');
          setLastName(words.length > 1 ? words.slice(1).join(' ') : '');
          setCombinedName(formatted);
        }
      } catch (err) {
        logError('Failed to fetch client remember', err);
      }
    }, REMEMBER_PHONE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [isCustomer, customerPhone, shopSlug]);

  // Persist lightweight join contact state to improve return visits.
  useEffect(() => {
    try {
      localStorage.setItem(CUSTOMER_COUNTRY_STORAGE_KEY, customerCountry);
      if (customerEmail.trim()) {
        localStorage.setItem(CUSTOMER_EMAIL_STORAGE_KEY, customerEmail.trim());
      }
      if (customerPhone.trim()) {
        localStorage.setItem(CUSTOMER_PHONE_STORAGE_KEY, customerPhone.trim());
      }
    } catch {
      // ignore storage failures
    }
  }, [customerCountry, customerEmail, customerPhone]);

  // Real-time validation
  useEffect(() => {
    if (firstName.trim().length === 0) {
      setValidationError(null);
      return;
    }

    const validation = validateName(firstName, lastName);
    if (!validation.isValid) {
      setValidationError(validation.error || t('join.invalidName'));
    } else {
      setValidationError(null);
    }
    
    // Clear name collision error when user changes their name
    if (nameCollisionError) {
      setNameCollisionError(null);
    }
  }, [firstName, lastName, validateName, nameCollisionError]);

  // Combined name handler: collapse multiple spaces and auto-capitalize first/last word as you type
  const handleCombinedNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const withSingleSpaces = raw.replace(/\s+/g, ' ');
    const formatted = formatNameWithConnectors(withSingleSpaces);
    const cursor = e.target.selectionStart ?? 0;
    setCombinedName(formatted);
    nameCursorRestoreRef.current = { input: e.target, cursor };

    const words = formatted.trim().split(/\s+/).filter(Boolean);
    setFirstName(words[0] ?? '');
    setLastName(words.length > 1 ? words.slice(1).join(' ') : '');
  };

  // Restore cursor after React updates the input value (formatting only changes case, so length is unchanged)
  useEffect(() => {
    const pending = nameCursorRestoreRef.current;
    if (!pending) return;
    nameCursorRestoreRef.current = null;
    const { input, cursor } = pending;
    const run = () => {
      if (document.activeElement !== input) return;
      const pos = Math.min(cursor, input.value.length);
      input.setSelectionRange(pos, pos);
    };
    requestAnimationFrame(run);
  }, [combinedName]);

  // Legacy handlers kept for backward compatibility (not used but maintained for type safety)
  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNameWithConnectors(e.target.value);
    setFirstName(formatted);
    // Update combinedName to reflect change
    setCombinedName(formatted + (lastName ? ' ' + lastName : ''));
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const firstChar = e.target.value.slice(0, 1).toUpperCase();
    setLastName(firstChar);
    // Update combinedName to reflect change
    setCombinedName(firstName + (firstChar ? ' ' + firstChar : ''));
  };

  const submitJoin = async () => {
    if (joinSubmitLockRef.current) return;
    joinSubmitLockRef.current = true;
    try {
    setSubmitError(null);
    setClosedReason(null);
    setIsAlreadyInQueue(false);
    setExistingTicketId(null);
    setNameCollisionError(null);

    const validation = validateName(firstName, lastName);
    if (!validation.isValid) {
      setValidationError(validation.error || t('join.invalidName'));
      return;
    }

    const fullName = formatNameWithConnectors(
      [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
    );

    // Get or create deviceId for this device
    const deviceId = getOrCreateDeviceId();

    // Step 1: Check by deviceId FIRST (server-side check - most reliable)
    // This prevents multiple active tickets from the same device
    try {
      const activeTicketByDevice = await api.getActiveTicketByDevice(shopSlug, deviceId);
      if (activeTicketByDevice && (activeTicketByDevice.status === 'waiting' || activeTicketByDevice.status === 'in_progress')) {
        // Device already has an active ticket - store it and redirect to that ticket's shop status
        console.log('[useJoinForm] Found active ticket by deviceId during form submission, redirecting:', activeTicketByDevice.id);
        localStorage.setItem(STORAGE_KEY, activeTicketByDevice.id.toString());
        redirectToStatusPage(activeTicketByDevice.id, activeTicketByDevice.shopSlug, navigate, shopSlug);
        return; // Exit early, don't submit form
      }
    } catch (error) {
      // Error checking by deviceId - continue (might be 404 which is fine)
      console.warn('[useJoinForm] Error checking active ticket by deviceId:', error);
    }

    // Step 2: Check localStorage as secondary check
    const storedTicketId = localStorage.getItem(STORAGE_KEY);
    let deviceTicketId: number | null = null;
    if (storedTicketId) {
      const parsed = parseInt(storedTicketId, 10);
      if (!isNaN(parsed)) {
        deviceTicketId = parsed;
        
        // Verify the stored ticket is still active via API (don't wait for queue data)
        try {
          const ticket = await api.getTicket(parsed);
          if (ticket && (ticket.status === 'waiting' || ticket.status === 'in_progress')) {
            // This device has an active ticket - redirect to that ticket's shop status
            console.log('[useJoinForm] Found active ticket in localStorage during form submission, redirecting:', parsed);
            redirectToStatusPage(parsed, ticket.shopSlug, navigate, shopSlug);
            return; // Exit early, don't submit form
          } else {
            // Stored ticket is no longer active, clear it
            console.log('[useJoinForm] Stored ticket is no longer active, clearing:', parsed);
            localStorage.removeItem(STORAGE_KEY);
            deviceTicketId = null;
          }
        } catch (error) {
          // Error verifying ticket - clear invalid storage and continue
          console.warn('[useJoinForm] Error verifying stored ticket, clearing:', error);
          localStorage.removeItem(STORAGE_KEY);
          deviceTicketId = null;
        }
      }
    }

    // Check if name matches an existing ticket in queue (only if queue data is loaded)
    if (data) {
      // First check: if we have a device ticket that's still in queue, redirect
      if (deviceTicketId) {
        const deviceTicket = data.tickets.find(
          (t) => t.id === deviceTicketId && (t.status === 'waiting' || t.status === 'in_progress')
        );
        if (deviceTicket) {
          // This device has an active ticket in queue - redirect to status (current shop)
          console.log('[useJoinForm] Found active ticket in queue, redirecting:', deviceTicketId);
          redirectToStatusPage(deviceTicketId, shopSlug, navigate, shopSlug);
          return; // Exit early
        }
      }
      
      // Second check: if name matches another ticket (not this device's ticket)
      const nameMatchTicket = data.tickets.find(
        (t) =>
          t.customerName === fullName &&
          (t.status === 'waiting' || t.status === 'in_progress')
      );
      if (nameMatchTicket && nameMatchTicket.id !== deviceTicketId) {
        // Name matches but it's not this device's ticket - ask for different name
        setNameCollisionError(t('join.nameAlreadyInQueue'));
        return;
      }
    }

    const status = getShopStatus(
      settings.operatingHours,
      settings.timezone ?? 'America/Sao_Paulo',
      settings.temporaryStatusOverride,
      settings.allowQueueBeforeOpen,
      settings.checkInHoursBeforeOpen ?? 1
    );

    if (!status.isOpen) {
      setClosedReason(status.isInLunch ? 'lunch' : 'closed');
      setSubmitError(null);
      return;
    }

    if (settings.requirePhone && !customerPhone.trim()) {
      setClosedReason(null);
      setSubmitError(t('join.phoneRequired'));
      return;
    }
    if (settings.requireBarberChoice && !selectedBarberId) {
      setClosedReason(null);
      setSubmitError(t('join.chooseBarber'));
      return;
    }

    setIsSubmitting(true);

    const validServiceIds = new Set(activeServices.map((s) => s.id));
    const consentToSend = trackingConsent === true || trackingConsent === false ? trackingConsent : false;
    const validReferralSources = ['qr', 'friend', 'instagram', 'walk_by', 'other'] as const;
    let payload: {
      customerName: string;
      serviceId?: number;
      complementaryServiceIds?: number[];
      customerPhone?: string;
      preferredBarberId?: number;
      deviceId?: string;
      trackingConsent?: boolean;
      referralSource?: typeof validReferralSources[number];
    } = {
      customerName: fullName,
      deviceId,
      trackingConsent: consentToSend,
      ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
      ...(selectedBarberId ? { preferredBarberId: selectedBarberId } : {}),
      ...(settings.showReferralSource && referralSource && validReferralSources.includes(referralSource as any) ? { referralSource: referralSource as typeof validReferralSources[number] } : {}),
    };

    const validSelected = selectedServiceIds.filter((id) => validServiceIds.has(id));
    if (validSelected.length === 0) {
      setClosedReason(null);
      setSubmitError(t('join.selectService'));
      setIsSubmitting(false);
      return;
    }
    payload.complementaryServiceIds = validSelected;

    try {
      const ticket = await api.createTicket(shopSlug, payload);
      invalidateQueueHttpCache(shopSlug);

      // Store ticket ID in localStorage for persistence
      localStorage.setItem(STORAGE_KEY, ticket.id.toString());

      localStorage.setItem(
        CUSTOMER_NAME_STORAGE_KEY,
        JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        })
      );
      if (customerPhone.trim()) {
        localStorage.setItem(CUSTOMER_PHONE_STORAGE_KEY, customerPhone.trim());
      }
      if (customerEmail.trim()) {
        localStorage.setItem(CUSTOMER_EMAIL_STORAGE_KEY, customerEmail.trim());
      }
      localStorage.setItem(CUSTOMER_COUNTRY_STORAGE_KEY, customerCountry);
      localStorage.setItem(TRACKING_CONSENT_STORAGE_KEY, String(consentToSend));
      applyTrackingConsent(consentToSend, deviceId);

      // Navigate to status page (use ticket's shop when present for correct barbershop context)
      redirectToStatusPage(ticket.id, ticket.shopSlug, navigate, shopSlug);
    } catch (error) {
      // Check if this is a name collision error (409 Conflict)
      if (error instanceof ApiError && error.isConflictError()) {
        const errorMessage = getErrorMessage(error, '');
        // Check if error message indicates name is in use (Portuguese)
        if (errorMessage.includes('nome') && (errorMessage.includes('uso') || errorMessage.includes('já está'))) {
          setNameCollisionError(errorMessage);
        } else {
          setClosedReason(null);
          setSubmitError(errorMessage || t('join.submitErrorDefault'));
        }
      } else {
        setClosedReason(null);
        setSubmitError(getErrorMessage(error, t('join.submitErrorDefault')));
      }
    } finally {
      setIsSubmitting(false);
    }
  } finally {
    joinSubmitLockRef.current = false;
  }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitJoin();
  };

  const refreshJoinData = useCallback(async () => {
    if (isRefreshingJoinData) return;
    setIsRefreshingJoinData(true);
    try {
      await Promise.all([refetchBarbers(), refetchServices(), refetchQueue(), refetchWaitTimes()]);
    } finally {
      setIsRefreshingJoinData(false);
    }
  }, [refetchBarbers, refetchServices, refetchQueue, refetchWaitTimes, isRefreshingJoinData]);

  const applyTrackingConsentChoice = useCallback((value: boolean) => {
    setTrackingConsent(value);
    try {
      localStorage.setItem(TRACKING_CONSENT_STORAGE_KEY, String(value));
    } catch {
      // ignore
    }
    if (!value) {
      clearTrackingCookie();
    }
  }, []);

  return {
    combinedName,
    handleCombinedNameChange,
    firstName,
    lastName,
    handleFirstNameChange,
    handleLastNameChange,
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
    handleSubmit,
    submitJoin,
    navigate,
    waitTimes,
    isLoadingWaitTimes,
    barbers,
    hasServices: activeServices.length > 0,
    isLoadingServices,
    activeServices,
    selectedServiceIds,
    setSelectedServiceIds,
    hasServiceSelection: selectedServiceIds.some((id) => validServiceIds.has(id)),
    settings,
    needsProfileCompletion,
    isLoggedInAsCustomer: isCustomer,
    customerName: user?.name,
    logout,
    isRefreshingJoinData,
    refreshJoinData,
    trackingConsent,
    setTrackingConsent,
    applyTrackingConsentChoice,
    referralSource,
    setReferralSource,
  };
}
