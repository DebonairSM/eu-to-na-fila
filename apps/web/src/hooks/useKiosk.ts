import { useState, useEffect, useCallback, useRef } from 'react';

const QUEUE_VIEW_DURATION = 15000; // 15 seconds per US-013
const AD_VIEW_DURATION = 15000; // 15 seconds per US-013
const IDLE_TIMEOUT = 10000; // 10 seconds per US-014

export type KioskView = 'queue' | 'ad1' | 'ad2' | 'ad3';

export function useKiosk() {
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [currentView, setCurrentView] = useState<KioskView>('queue');
  const [isInRotation, setIsInRotation] = useState(true);
  const [nextAdIndex, setNextAdIndex] = useState(1); // Track which ad to show next
  const rotationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const enterKioskMode = useCallback(() => {
    setIsKioskMode(true);
    setIsInRotation(true);
    setCurrentView('queue');
    setNextAdIndex(1); // Start with ad1
    
    // Request fullscreen
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Ignore fullscreen errors
      });
    }
  }, []);

  const exitKioskMode = useCallback(() => {
    setIsKioskMode(false);
    setIsInRotation(false);
    
    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {
        // Ignore fullscreen errors
      });
    }

    // Clear timers
    if (rotationTimerRef.current) {
      clearTimeout(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const showQueueView = useCallback(() => {
    setCurrentView('queue');
    setIsInRotation(false); // Pause rotation when manually viewing queue
    
    // Clear idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // Start idle timer - return to rotation after timeout
    idleTimerRef.current = setTimeout(() => {
      setIsInRotation(true);
    }, IDLE_TIMEOUT);
  }, []);

  // Handle rotation - optimized to reduce re-renders
  useEffect(() => {
    if (!isKioskMode || !isInRotation) {
      if (rotationTimerRef.current) {
        clearTimeout(rotationTimerRef.current);
        rotationTimerRef.current = null;
      }
      return;
    }

    // Clear any existing timer
    if (rotationTimerRef.current) {
      clearTimeout(rotationTimerRef.current);
    }

    const currentDuration =
      currentView === 'queue' ? QUEUE_VIEW_DURATION : AD_VIEW_DURATION;

    rotationTimerRef.current = setTimeout(() => {
      // Rotate: queue -> ad1 -> queue -> ad2 -> queue -> ad3 -> queue (repeat)
      if (currentView === 'queue') {
        // Show next ad in sequence
        const nextAd = `ad${nextAdIndex}` as KioskView;
        setCurrentView(nextAd);
      } else {
        // After ad, go back to queue and advance to next ad
        setCurrentView('queue');
        setNextAdIndex((prev) => {
          // Cycle: 1 -> 2 -> 3 -> 1
          return prev >= 3 ? 1 : prev + 1;
        });
      }
    }, currentDuration);

    return () => {
      if (rotationTimerRef.current) {
        clearTimeout(rotationTimerRef.current);
        rotationTimerRef.current = null;
      }
    };
  }, [isKioskMode, isInRotation, currentView, nextAdIndex]);

  // Start rotation when entering kiosk mode
  useEffect(() => {
    if (isKioskMode && isInRotation) {
      // Initial rotation will be handled by the effect above
    }
  }, [isKioskMode]);

  // Handle Escape key to exit kiosk
  useEffect(() => {
    if (!isKioskMode) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitKioskMode();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isKioskMode, exitKioskMode]);

  return {
    isKioskMode,
    currentView,
    isInRotation,
    enterKioskMode,
    exitKioskMode,
    showQueueView,
  };
}
