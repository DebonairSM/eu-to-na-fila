import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Navigation } from '@/components/Navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Container } from '@/components/design-system';
import { STORAGE_KEYS } from '@/lib/constants';
import { getOrCreateDeviceId } from '@/lib/utils';
import { config } from '@/lib/config';
import { JoinPage } from './index';

const STORAGE_KEY = STORAGE_KEYS.ACTIVE_TICKET_ID;

/**
 * Route guard for JoinPage that blocks rendering until active ticket check completes.
 * 
 * This component ensures users with active tickets are immediately redirected to their
 * status page before any form UI can render. It performs device-based checks first
 * (most reliable), then falls back to localStorage checks.
 */
export function JoinPageGuard() {
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRenderJoinPage, setShouldRenderJoinPage] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPageGuard.tsx:26',message:'Guard mounted, check starting',data:{isChecking,shouldRenderJoinPage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.log('[JoinPageGuard] Mounted, starting check');
    const checkActiveTicket = async () => {
      // Step 1: Check by deviceId FIRST (most reliable server-side check)
      // This is the primary method and should always be tried first
      try {
        const deviceId = getOrCreateDeviceId();
        console.log('[JoinPageGuard] Checking by deviceId:', deviceId, 'shop:', config.slug);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPageGuard.tsx:32',message:'DeviceId check starting',data:{deviceId,shopSlug:config.slug},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        const startTime = Date.now();
        const activeTicket = await api.getActiveTicketByDevice(config.slug, deviceId);
        const elapsed = Date.now() - startTime;
        console.log('[JoinPageGuard] DeviceId check completed in', elapsed, 'ms. Result:', activeTicket ? {id: activeTicket.id, status: activeTicket.status} : 'null');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPageGuard.tsx:34',message:'DeviceId check result',data:{activeTicket:activeTicket?{id:activeTicket.id,status:activeTicket.status}:null,elapsed},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        if (activeTicket && (activeTicket.status === 'waiting' || activeTicket.status === 'in_progress')) {
          // Device has an active ticket - store it and redirect immediately
          console.log('[JoinPageGuard] ✓ Found active ticket by deviceId, redirecting to status:', activeTicket.id);
          localStorage.setItem(STORAGE_KEY, activeTicket.id.toString());
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPageGuard.tsx:38',message:'Calling navigate for deviceId ticket',data:{ticketId:activeTicket.id,path:`/status/${activeTicket.id}`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          navigate(`/status/${activeTicket.id}`, { replace: true });
          console.log('[JoinPageGuard] Navigate called, returning early');
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPageGuard.tsx:40',message:'Returning early after deviceId navigate',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          // Don't update state - let navigation handle it
          return;
        } else {
          console.log('[JoinPageGuard] ✗ No active ticket found by deviceId. activeTicket:', activeTicket);
        }
      } catch (error) {
        // Network error - retry once before falling back
        console.warn('[JoinPageGuard] ✗ Error checking by deviceId:', error);
        if (error instanceof Error) {
          console.warn('[JoinPageGuard] Error details:', error.message, error.stack);
        }
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPageGuard.tsx:44',message:'DeviceId check error, retrying',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        try {
          // Retry the deviceId check once
          const deviceId = getOrCreateDeviceId();
          const activeTicket = await api.getActiveTicketByDevice(config.slug, deviceId);
          
          if (activeTicket && (activeTicket.status === 'waiting' || activeTicket.status === 'in_progress')) {
            console.log('[JoinPageGuard] Found active ticket by deviceId on retry, redirecting:', activeTicket.id);
            localStorage.setItem(STORAGE_KEY, activeTicket.id.toString());
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPageGuard.tsx:54',message:'Calling navigate on retry',data:{ticketId:activeTicket.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            navigate(`/status/${activeTicket.id}`, { replace: true });
            return;
          }
        } catch (retryError) {
          // Retry also failed - fall through to localStorage check
          console.warn('[JoinPageGuard] Retry also failed, falling back to localStorage check:', retryError);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPageGuard.tsx:59',message:'Retry failed, falling back',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
        }
      }

      // Step 2: Fallback to localStorage check (if deviceId check didn't find anything)
      const storedTicketId = localStorage.getItem(STORAGE_KEY);
      console.log('[JoinPageGuard] Checking localStorage for ticketId:', storedTicketId);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPageGuard.tsx:65',message:'Checking localStorage',data:{storedTicketId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      if (storedTicketId) {
        const ticketId = parseInt(storedTicketId, 10);
        if (!isNaN(ticketId)) {
          try {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPageGuard.tsx:69',message:'Verifying stored ticket via API',data:{ticketId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            const ticket = await api.getTicket(ticketId);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPageGuard.tsx:70',message:'Stored ticket verification result',data:{ticket:ticket?{id:ticket.id,status:ticket.status}:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            if (ticket && (ticket.status === 'waiting' || ticket.status === 'in_progress')) {
              // Found active ticket in localStorage - redirect immediately
              console.log('[JoinPageGuard] Found active ticket in localStorage, redirecting to status:', ticketId);
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPageGuard.tsx:73',message:'Calling navigate for localStorage ticket',data:{ticketId,path:`/status/${ticketId}`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
              navigate(`/status/${ticketId}`, { replace: true });
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPageGuard.tsx:75',message:'Returning early after localStorage navigate',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
              // Don't update state - let navigation handle it
              return;
            } else {
              // Ticket exists but is not active - clear it
              console.log('[JoinPageGuard] Stored ticket is no longer active, clearing:', ticketId);
              localStorage.removeItem(STORAGE_KEY);
            }
          } catch (error) {
            // Error verifying ticket - clear invalid storage
            console.warn('[JoinPageGuard] Error verifying stored ticket, clearing:', error);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPageGuard.tsx:84',message:'Error verifying stored ticket',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            localStorage.removeItem(STORAGE_KEY);
          }
        } else {
          // Invalid ticketId in storage - clear it
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      // No active ticket found - safe to render JoinPage
      console.log('[JoinPageGuard] ✗ No active ticket found anywhere. Allowing JoinPage to render.');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPageGuard.tsx:93',message:'No active ticket found, setting state to render JoinPage',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      setShouldRenderJoinPage(true);
      setIsChecking(false);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPageGuard.tsx:95',message:'State updated, check complete',data:{isChecking:false,shouldRenderJoinPage:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
    };

    checkActiveTicket();
  }, [navigate]);

  // Block rendering until check completes
  if (isChecking) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPageGuard.tsx:101',message:'Rendering loading spinner',data:{isChecking,shouldRenderJoinPage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2d2416] relative">
        <Navigation />
        <Container className="relative z-10 pt-20 sm:pt-[100px] pb-12">
          <LoadingSpinner text="Verificando seu status..." />
        </Container>
      </div>
    );
  }

  // Only render JoinPage if no active ticket was found
  if (shouldRenderJoinPage) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPageGuard.tsx:113',message:'RENDERING JOINPAGE - This should not happen if active ticket exists',data:{isChecking,shouldRenderJoinPage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return <JoinPage />;
  }

  // This shouldn't be reached, but return null as fallback
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JoinPageGuard.tsx:118',message:'Returning null fallback',data:{isChecking,shouldRenderJoinPage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  return null;
}
