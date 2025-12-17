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

export function useJoinForm() {
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

  // Formatted change handlers that apply name formatting in real-time
  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatName(e.target.value);
    setFirstName(formatted);
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatName(e.target.value);
    setLastName(formatted);
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
      ? `${firstName.trim()} ${lastName.trim()}`
      : firstName.trim();

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

      // Navigate to status page
      navigate(`/status/${ticket.id}`);
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Erro ao entrar na fila. Tente novamente.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
