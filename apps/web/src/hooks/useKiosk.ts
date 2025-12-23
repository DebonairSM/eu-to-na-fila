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
  const [adAvailability, setAdAvailability] = useState<Record<1 | 2 | 3, boolean>>({
    1: true,
    2: true,
    3: true,
  });
  const rotationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const checkAssetExists = useCallback(async (url: string): Promise<boolean> => {
    try {
      // Prefer HEAD but fall back to GET if not supported.
      const headRes = await fetch(url, { method: 'HEAD', cache: 'no-store' }).catch(() => null);
      if (headRes) return headRes.ok;
      const getRes = await fetch(url, { method: 'GET', cache: 'no-store' });
      return getRes.ok;
    } catch {
      return false;
    }
  }, []);

  const enterKioskMode = useCallback(() => {
    setIsKioskMode(true);
    setIsInRotation(true);
    setCurrentView('queue');
    setNextAdIndex(1); // Start with ad1
    
    // Note: Fullscreen must be requested on user gesture, not automatically
    // We'll request it on first user interaction instead
  }, []);

  // Detect which ad assets are actually available so we can skip missing ones.
  useEffect(() => {
    if (!isKioskMode) return;
    let cancelled = false;

    (async () => {
      const [ad1, ad2, ad3] = await Promise.all([
        checkAssetExists('/mineiro/gt-ad.png'),
        checkAssetExists('/mineiro/gt-ad2.png'),
        checkAssetExists('/mineiro/gt-ad-001.mp4'),
      ]);
      if (cancelled) return;
      setAdAvailability({ 1: ad1, 2: ad2, 3: ad3 });
    })();

    return () => {
      cancelled = true;
    };
  }, [isKioskMode, checkAssetExists]);

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
        // Show next available ad in sequence (skip missing assets)
        const preferred = nextAdIndex as 1 | 2 | 3;
        const candidates: Array<1 | 2 | 3> = [
          preferred,
          preferred >= 3 ? 1 : ((preferred + 1) as 1 | 2 | 3),
          preferred <= 1 ? 3 : ((preferred - 1) as 1 | 2 | 3),
        ];
        const chosenIndex = candidates.find((i) => adAvailability[i]) ?? null;
        if (!chosenIndex) {
          // No ads available; stay on queue.
          setCurrentView('queue');
          return;
        }

        const nextAd = `ad${chosenIndex}` as KioskView;
        setCurrentView(nextAd);
      } else {
        // After ad, go back to queue and advance to next ad
        setCurrentView('queue');
        setNextAdIndex((prev) => {
          const newIndex = prev >= 3 ? 1 : prev + 1;
          // Cycle: 1 -> 2 -> 3 -> 1
          return newIndex;
        });
      }
    }, currentDuration);

    return () => {
      if (rotationTimerRef.current) {
        clearTimeout(rotationTimerRef.current);
        rotationTimerRef.current = null;
      }
    };
  }, [isKioskMode, isInRotation, currentView, nextAdIndex, adAvailability]);

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
