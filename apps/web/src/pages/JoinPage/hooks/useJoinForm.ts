import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { useProfanityFilter } from '@/hooks/useProfanityFilter';
import { useQueue } from '@/hooks/useQueue';
import { useBarbers } from '@/hooks/useBarbers';
import { getErrorMessage, formatName } from '@/lib/utils';

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

  // Fetch wait times on mount and periodically
  useEffect(() => {
    let mounted = true;

    const fetchWaitTimes = async () => {
      try {
        setIsLoadingWaitTimes(true);
        const times = await api.getWaitTimes(config.slug);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useJoinForm.ts:44',message:'getWaitTimes response received',data:{standardWaitTime:times.standardWaitTime,barberWaitTimes:times.barberWaitTimes},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        if (mounted) {
          setWaitTimes(times);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useJoinForm.ts:47',message:'setWaitTimes called',data:{standardWaitTime:times.standardWaitTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          setIsLoadingWaitTimes(false);
        }
      } catch (error) {
        if (mounted) {
          console.error('Failed to fetch wait times:', error);
          setIsLoadingWaitTimes(false);
        }
      }
    };

    fetchWaitTimes();
    const interval = setInterval(fetchWaitTimes, 30000); // Refresh every 30 seconds

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Real-time validation
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useJoinForm.ts:67',message:'useEffect state check',data:{firstName:firstName,lastName:lastName,firstNameLength:firstName.length,lastNameLength:lastName.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useJoinForm.ts:87',message:'handleFirstNameChange entry',data:{rawValue:e.target.value,currentState:firstName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const formatted = formatName(e.target.value);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useJoinForm.ts:89',message:'formatName result',data:{rawValue:e.target.value,formattedValue:formatted,isDifferent:formatted!==e.target.value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    setFirstName(formatted);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useJoinForm.ts:91',message:'setFirstName called',data:{formattedValue:formatted},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useJoinForm.ts:95',message:'handleLastNameChange entry',data:{rawValue:e.target.value,currentState:lastName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const formatted = formatName(e.target.value);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useJoinForm.ts:97',message:'formatName result',data:{rawValue:e.target.value,formattedValue:formatted,isDifferent:formatted!==e.target.value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    setLastName(formatted);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useJoinForm.ts:99',message:'setLastName called',data:{formattedValue:formatted},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
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
