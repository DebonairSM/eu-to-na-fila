import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { useProfanityFilter } from '@/hooks/useProfanityFilter';
import { useQueue } from '@/hooks/useQueue';
import { useBarbers } from '@/hooks/useBarbers';
import { getErrorMessage, formatName } from '@/lib/utils';
import { logError } from '@/lib/logger';

const STORAGE_KEY = 'eutonafila_active_ticket_id';
const CUSTOMER_NAME_STORAGE_KEY = 'eutonafila_customer_name';

export function useJoinForm() {
  const [combinedName, setCombinedName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isAlreadyInQueue, setIsAlreadyInQueue] = useState(false);
  const [existingTicketId, setExistingTicketId] = useState<number | null>(null);
  const [nameCollisionError, setNameCollisionError] = useState<string | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<number | null>(null);
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
  const navigate = useNavigate();
  const { validateName } = useProfanityFilter();
  const { data } = useQueue(30000);
  const { barbers } = useBarbers();

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
        const times = await api.getWaitTimes(config.slug);
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
  }, []);

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
      setValidationError(validation.error || 'Nome inválido');
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
      setValidationError(validation.error || 'Nome inválido');
      return;
    }

    const fullName = lastName.trim()
      ? `${formatName(firstName.trim())} ${formatName(lastName.trim())}`
      : formatName(firstName.trim());

    // Check if there's a stored ticket on this device
    const storedTicketId = localStorage.getItem(STORAGE_KEY);
    let deviceTicketId: number | null = null;
    if (storedTicketId) {
      const parsed = parseInt(storedTicketId, 10);
      if (!isNaN(parsed)) {
        deviceTicketId = parsed;
      }
    }

    // Only treat as same person if there's a stored ticket on this device
    if (deviceTicketId && data) {
      const deviceTicket = data.tickets.find(
        (t) => t.id === deviceTicketId && (t.status === 'waiting' || t.status === 'in_progress')
      );
      if (deviceTicket) {
        // This device has an active ticket - redirect to status
        setIsAlreadyInQueue(true);
        setExistingTicketId(deviceTicketId);
        return;
      } else {
        // Stored ticket is no longer active, clear it
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Check if name matches an existing ticket in queue
    if (data) {
      const nameMatchTicket = data.tickets.find(
        (t) =>
          t.customerName === fullName &&
          (t.status === 'waiting' || t.status === 'in_progress')
      );
      if (nameMatchTicket && nameMatchTicket.id !== deviceTicketId) {
        // Name matches but it's not this device's ticket - ask for different name
        setNameCollisionError('Este nome já está na fila. Por favor, use um nome diferente.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const ticket = await api.createTicket(config.slug, {
        customerName: fullName,
        serviceId: 1, // Default service
        ...(selectedBarberId && { preferredBarberId: selectedBarberId }),
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
      setSubmitError(getErrorMessage(error, 'Erro ao entrar na fila. Tente novamente.'));
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
    validationError,
    isSubmitting,
    submitError,
    isAlreadyInQueue,
    existingTicketId,
    nameCollisionError,
    handleSubmit,
    navigate,
    selectedBarberId,
    setSelectedBarberId,
    waitTimes,
    isLoadingWaitTimes,
    barbers,
  };
}
