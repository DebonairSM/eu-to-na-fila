import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '@/lib/api';
import { useShopSlug } from '@/contexts/ShopSlugContext';
import { useShopConfig } from '@/contexts/ShopConfigContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useProfanityFilter } from '@/hooks/useProfanityFilter';
import { useQueue } from '@/hooks/useQueue';
import { useBarbers } from '@/hooks/useBarbers';
import { useServices } from '@/hooks/useServices';
import { getErrorMessage, formatName, getOrCreateDeviceId } from '@/lib/utils';
import { logError } from '@/lib/logger';
import { STORAGE_KEYS } from '@/lib/constants';

const STORAGE_KEY = STORAGE_KEYS.ACTIVE_TICKET_ID;
const CUSTOMER_NAME_STORAGE_KEY = 'eutonafila_customer_name';

export function useJoinForm() {
  const [combinedName, setCombinedName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isAlreadyInQueue, setIsAlreadyInQueue] = useState(false);
  const [existingTicketId, setExistingTicketId] = useState<number | null>(null);
  const [nameCollisionError, setNameCollisionError] = useState<string | null>(null);
  const [waitTimes, setWaitTimes] = useState<{
    standardWaitTime: number | null;
    barberWaitTimes: Array<{
      barberId: number;
      barberName: string;
      waitTime: number | null;
      isPresent: boolean;
    }>;
  } | null>(null);
  const [isLoadingWaitTimes, setIsLoadingWaitTimes] = useState(true);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const navigate = useNavigate();
  const shopSlug = useShopSlug();
  const { config: shopConfig } = useShopConfig();
  const { t } = useLocale();
  const settings = shopConfig.settings;
  const { validateName } = useProfanityFilter();
  const { data } = useQueue(30000);
  const { barbers } = useBarbers();
  const { activeServices, isLoading: isLoadingServices } = useServices();

  // Default selected service to first active when list loads or changes; keep selection if still valid
  useEffect(() => {
    if (activeServices.length === 0) {
      setSelectedServiceId(null);
      return;
    }
    const validIds = new Set(activeServices.map((s) => s.id));
    if (selectedServiceId !== null && validIds.has(selectedServiceId)) return;
    setSelectedServiceId(activeServices[0].id);
  }, [activeServices, selectedServiceId]);

  // Fetch wait times on mount and periodically (with Page Visibility API support)
  useEffect(() => {
    let mounted = true;
    let intervalId: number | null = null;

    const fetchWaitTimes = async () => {
      // Skip if page is hidden
      if (document.hidden) {
        return;
      }

      try {
        setIsLoadingWaitTimes(true);
        const times = await api.getWaitTimes(shopSlug);
        if (mounted) {
          setWaitTimes(times);
          setIsLoadingWaitTimes(false);
        }
      } catch (error) {
        if (mounted) {
          logError('Failed to fetch wait times', error);
          setIsLoadingWaitTimes(false);
        }
      }
    };

    // Initial fetch
    fetchWaitTimes();

    // Set up polling
    const startPolling = () => {
      if (intervalId) return; // Already polling
      intervalId = window.setInterval(fetchWaitTimes, 30000); // Refresh every 30 seconds
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    startPolling();

    // Handle Page Visibility API - pause when hidden, resume when visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchWaitTimes(); // Fetch immediately when visible
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [shopSlug]);

  // Load stored customer name on mount
  useEffect(() => {
    try {
      const storedName = localStorage.getItem(CUSTOMER_NAME_STORAGE_KEY);
      if (storedName) {
        const parsed = JSON.parse(storedName);
        if (parsed && typeof parsed.firstName === 'string' && typeof parsed.lastName === 'string') {
          const storedFirstName = parsed.firstName.trim();
          const storedLastName = parsed.lastName.trim();
          
          if (storedFirstName) {
            // Reconstruct combinedName from stored firstName and lastName
            const combined = storedLastName
              ? `${storedFirstName} ${storedLastName}`
              : storedFirstName;
            
            setFirstName(storedFirstName);
            setLastName(storedLastName);
            setCombinedName(combined);
          }
        }
      }
    } catch (error) {
      // Gracefully handle JSON parse errors or invalid data
      // Form will start empty if stored data is invalid
      logError('Failed to load stored customer name', error);
    }
  }, []);

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

  // Combined name handler that handles auto-capitalization and spacebar detection
  const handleCombinedNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Check if there's already a space and last initial
    const spaceIndex = input.indexOf(' ');
    const hasSpace = spaceIndex !== -1;
    
    let processedValue = input;
    
    if (!hasSpace) {
      // No space yet - user is typing first name
      // Auto-capitalize first letter, lowercase the rest
      if (input.length > 0) {
        processedValue = input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
      }
    } else {
      // Space detected - split into first name and potential last initial
      const beforeSpace = input.substring(0, spaceIndex);
      const afterSpace = input.substring(spaceIndex + 1);
      
      // Format first name: capitalize first letter, lowercase rest
      const formattedFirstName = beforeSpace.length > 0
        ? beforeSpace.charAt(0).toUpperCase() + beforeSpace.slice(1).toLowerCase()
        : '';
      
      // Limit to one character after space and capitalize it
      const limitedAfterSpace = afterSpace.slice(0, 1).toUpperCase();
      
      // Always preserve the space, even if no character after it yet
      processedValue = formattedFirstName + ' ' + limitedAfterSpace;
    }
    
    setCombinedName(processedValue);
    
    // Parse to extract firstName and lastName for validation
    const spaceIdx = processedValue.indexOf(' ');
    if (spaceIdx !== -1) {
      setFirstName(processedValue.substring(0, spaceIdx).trim());
      setLastName(processedValue.substring(spaceIdx + 1).trim());
    } else {
      setFirstName(processedValue.trim());
      setLastName('');
    }
  };

  // Legacy handlers kept for backward compatibility (not used but maintained for type safety)
  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatName(e.target.value);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsAlreadyInQueue(false);
    setExistingTicketId(null);
    setNameCollisionError(null);

    const validation = validateName(firstName, lastName);
    if (!validation.isValid) {
      setValidationError(validation.error || t('join.invalidName'));
      return;
    }

    const fullName = lastName.trim()
      ? `${formatName(firstName.trim())} ${formatName(lastName.trim())}`
      : formatName(firstName.trim());

    // Get or create deviceId for this device
    const deviceId = getOrCreateDeviceId();

    // Step 1: Check by deviceId FIRST (server-side check - most reliable)
    // This prevents multiple active tickets from the same device
    try {
      const activeTicketByDevice = await api.getActiveTicketByDevice(shopSlug, deviceId);
      if (activeTicketByDevice && (activeTicketByDevice.status === 'waiting' || activeTicketByDevice.status === 'in_progress')) {
        // Device already has an active ticket - store it and redirect immediately
        console.log('[useJoinForm] Found active ticket by deviceId during form submission, redirecting:', activeTicketByDevice.id);
        localStorage.setItem(STORAGE_KEY, activeTicketByDevice.id.toString());
        navigate(`/status/${activeTicketByDevice.id}`, { replace: true });
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
            // This device has an active ticket - redirect immediately
            console.log('[useJoinForm] Found active ticket in localStorage during form submission, redirecting:', parsed);
            navigate(`/status/${parsed}`, { replace: true });
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
          // This device has an active ticket in queue - redirect to status
          console.log('[useJoinForm] Found active ticket in queue, redirecting:', deviceTicketId);
          navigate(`/status/${deviceTicketId}`, { replace: true });
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

    // Enforce per-shop settings
    if (settings.requirePhone && !customerPhone.trim()) {
      setSubmitError(t('join.phoneRequired'));
      return;
    }
    if (settings.requireBarberChoice && !selectedBarberId) {
      setSubmitError(t('join.chooseBarber'));
      return;
    }

    setIsSubmitting(true);

    // Use selected service; must be in active list
    const validServiceIds = new Set(activeServices.map((s) => s.id));
    const serviceId = selectedServiceId !== null && validServiceIds.has(selectedServiceId)
      ? selectedServiceId
      : null;
    if (serviceId == null) {
      setSubmitError(t('join.selectService'));
      setIsSubmitting(false);
      return;
    }

    try {
      // Create ticket with deviceId included
      // Backend will check if device already has an active ticket and return existing if found
      const ticket = await api.createTicket(shopSlug, {
        customerName: fullName,
        serviceId,
        deviceId, // Include deviceId to prevent multiple active tickets per device
        ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
        ...(selectedBarberId ? { preferredBarberId: selectedBarberId } : {}),
      });

      // Store ticket ID in localStorage for persistence
      localStorage.setItem(STORAGE_KEY, ticket.id.toString());

      // Store customer name in localStorage for future visits
      localStorage.setItem(
        CUSTOMER_NAME_STORAGE_KEY,
        JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        })
      );

      // Navigate to status page
      navigate(`/status/${ticket.id}`);
    } catch (error) {
      // Check if this is a name collision error (409 Conflict)
      if (error instanceof ApiError && error.isConflictError()) {
        const errorMessage = getErrorMessage(error, '');
        // Check if error message indicates name is in use (Portuguese)
        if (errorMessage.includes('nome') && (errorMessage.includes('uso') || errorMessage.includes('já está'))) {
          setNameCollisionError(errorMessage);
        } else {
          setSubmitError(errorMessage || t('join.submitErrorDefault'));
        }
      } else {
        setSubmitError(getErrorMessage(error, t('join.submitErrorDefault')));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    combinedName,
    handleCombinedNameChange,
    firstName,
    lastName,
    handleFirstNameChange,
    handleLastNameChange,
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
    hasServices: activeServices.length > 0,
    isLoadingServices,
    activeServices,
    selectedServiceId,
    setSelectedServiceId,
    settings,
  };
}
