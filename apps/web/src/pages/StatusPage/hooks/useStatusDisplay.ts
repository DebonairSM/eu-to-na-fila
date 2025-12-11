import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { getErrorMessage } from '@/lib/utils';
import type { Ticket, Barber } from '@eutonafila/shared';

const STORAGE_KEY = 'eutonafila_active_ticket_id';

export function useStatusDisplay(ticket: Ticket | null) {
  const [barber, setBarber] = useState<Barber | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const prevStatusRef = useRef<string | null>(null);
  const hasStoredTicketRef = useRef(false);
  const navigate = useNavigate();

  // Fetch barber information when ticket has barberId
  useEffect(() => {
    const fetchBarber = async () => {
      if (!ticket?.barberId) {
        setBarber(null);
        return;
      }

      try {
        const barbers = await api.getBarbers(config.slug);
        const assignedBarber = barbers.find(b => b.id === ticket.barberId);
        setBarber(assignedBarber || null);
      } catch (error) {
        console.error('Failed to fetch barber:', error);
        setBarber(null);
      }
    };

    fetchBarber();
  }, [ticket?.barberId]);

  // Handle localStorage updates based on ticket status
  useEffect(() => {
    if (!ticket) return;
    
    const ticketStatus = ticket.status;
    const ticketId = ticket.id;
    const prevStatus = prevStatusRef.current;
    
    // Only update if status actually changed
    if (prevStatus === ticketStatus) {
      return;
    }
    
    // Update ref immediately to prevent re-running
    prevStatusRef.current = ticketStatus;
    
    // Handle localStorage based on status
    if (ticketStatus === 'completed' || ticketStatus === 'cancelled') {
      const storedTicketId = localStorage.getItem(STORAGE_KEY);
      if (storedTicketId === ticketId.toString()) {
        localStorage.removeItem(STORAGE_KEY);
        hasStoredTicketRef.current = false;
      }
    } else if ((ticketStatus === 'waiting' || ticketStatus === 'in_progress') && !hasStoredTicketRef.current) {
      localStorage.setItem(STORAGE_KEY, ticketId.toString());
      hasStoredTicketRef.current = true;
    }
  }, [ticket]);

  const handleLeaveQueue = async (ticketId: number) => {
    setIsLeaving(true);
    try {
      await api.cancelTicket(ticketId);
      localStorage.removeItem(STORAGE_KEY);
      navigate('/mineiro/home');
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'Erro ao sair da fila. Tente novamente.');
      console.error('Error leaving queue:', errorMsg);
      throw error;
    } finally {
      setIsLeaving(false);
    }
  };

  const handleShareTicket = async (ticketId: number) => {
    const url = `${window.location.origin}/status/${ticketId}`;
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (error) {
      console.error('Failed to copy link:', error);
      return false;
    }
  };

  return {
    barber,
    isLeaving,
    handleLeaveQueue,
    handleShareTicket,
  };
}
