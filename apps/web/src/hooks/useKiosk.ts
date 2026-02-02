import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { config } from '@/lib/config';

const QUEUE_VIEW_DURATION = 15000; // 15 seconds per US-013
const AD_VIEW_DURATION = 15000; // 15 seconds per US-013
const IDLE_TIMEOUT = 10000; // 10 seconds per US-014

export type KioskView = 'queue' | 'ad';

interface Ad {
  id: number;
  position: number;
  mediaType: string;
  url: string;
  version: number;
}

export function useKiosk() {
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [currentView, setCurrentView] = useState<KioskView>('queue');
  const [isInRotation, setIsInRotation] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [lastAdsUpdate, setLastAdsUpdate] = useState<number | null>(null);
  const rotationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fullscreenRequestInFlightRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getFullscreenElement = useCallback((): Element | null => {
    const docAny = document as unknown as {
      fullscreenElement?: Element | null;
      webkitFullscreenElement?: Element | null;
      mozFullScreenElement?: Element | null;
      msFullscreenElement?: Element | null;
    };
    return (
      docAny.fullscreenElement ??
      docAny.webkitFullscreenElement ??
      docAny.mozFullScreenElement ??
      docAny.msFullscreenElement ??
      null
    );
  }, []);

  const requestFullscreen = useCallback(async () => {
    if (fullscreenRequestInFlightRef.current) return;
    if (getFullscreenElement()) return;

    const elAny = document.documentElement as unknown as {
      requestFullscreen?: () => Promise<void>;
      webkitRequestFullscreen?: () => Promise<void>;
      mozRequestFullScreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };

    const request =
      elAny.requestFullscreen ??
      elAny.webkitRequestFullscreen ??
      elAny.mozRequestFullScreen ??
      elAny.msRequestFullscreen;

    if (!request) return;

    fullscreenRequestInFlightRef.current = true;
    try {
      await request.call(document.documentElement);
    } catch {
      // Browser may block fullscreen (NotAllowedError) or device may not support it.
    } finally {
      fullscreenRequestInFlightRef.current = false;
    }
  }, [getFullscreenElement]);

  const exitFullscreen = useCallback(async () => {
    if (!getFullscreenElement()) return;

    const docAny = document as unknown as {
      exitFullscreen?: () => Promise<void>;
      webkitExitFullscreen?: () => Promise<void>;
      mozCancelFullScreen?: () => Promise<void>;
      msExitFullscreen?: () => Promise<void>;
    };

    const exit =
      docAny.exitFullscreen ??
      docAny.webkitExitFullscreen ??
      docAny.mozCancelFullScreen ??
      docAny.msExitFullscreen;

    if (!exit) return;

    try {
      await exit.call(document);
    } catch {
      // Ignore fullscreen errors
    }
  }, [getFullscreenElement]);

  const toggleFullscreen = useCallback(async () => {
    if (getFullscreenElement()) {
      await exitFullscreen();
    } else {
      await requestFullscreen();
    }
  }, [exitFullscreen, getFullscreenElement, requestFullscreen]);

  const MAX_MANIFEST_RETRIES = 3;
  const RETRY_DELAYS_MS = [0, 400, 1200];

  // Fetch ads manifest (with retries for cold/no-cache loads, e.g. guest profile)
  const fetchManifest = useCallback(async () => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_MANIFEST_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
      try {
        const manifest = await api.getAdsManifest(config.slug, { timeout: 8000 });
        setAds(manifest.ads);
        setCurrentAdIndex((prev) =>
          prev >= manifest.ads.length ? 0 : prev
        );
        return;
      } catch (err) {
        lastErr = err;
        console.warn(`[useKiosk] Manifest fetch attempt ${attempt + 1}/${MAX_MANIFEST_RETRIES} failed:`, err);
      }
    }
    console.error('[useKiosk] Failed to fetch manifest after retries:', lastErr);
    setAds([]);
  }, []);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    if (!isKioskMode) return;

    const wsUrl = api.getWebSocketUrl();
    if (!wsUrl) return;

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[useKiosk] WebSocket connected');
          // Note: Backend subscription requires companyId, which we don't have here
          // For now, we'll just listen for any ads.updated messages
          // In a full implementation, we'd need to get companyId from shop data
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'ads.updated') {
              console.log('[useKiosk] Received ads.updated, refetching manifest');
              void fetchManifest();
              setLastAdsUpdate(Date.now());
            }
          } catch (err) {
            console.error('[useKiosk] Failed to parse WebSocket message:', err);
          }
        };

        ws.onerror = (err) => {
          console.error('[useKiosk] WebSocket error:', err);
        };

        ws.onclose = (_event) => {
          console.log('[useKiosk] WebSocket closed, reconnecting...');
          wsRef.current = null;
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };
      } catch (err) {
        console.error('[useKiosk] Failed to connect WebSocket:', err);
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [isKioskMode, fetchManifest]);

  // Fetch manifest when entering kiosk mode
  useEffect(() => {
    if (isKioskMode) {
      void fetchManifest();
    }
  }, [isKioskMode, fetchManifest]);

  const enterKioskMode = useCallback(() => {
    setIsKioskMode(true);
    setIsInRotation(true);
    setCurrentView('queue');
    setCurrentAdIndex(0);
  }, []);

  // Track fullscreen state (standard + webkit events)
  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(getFullscreenElement()));
    sync();

    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync as EventListener);

    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync as EventListener);
    };
  }, [getFullscreenElement]);

  // Request fullscreen on first user interaction in kiosk mode.
  useEffect(() => {
    if (!isKioskMode || isFullscreen) return;

    const onFirstInteraction = () => {
      void requestFullscreen();
    };

    document.addEventListener('pointerdown', onFirstInteraction, { capture: true, passive: true });
    document.addEventListener('click', onFirstInteraction, { capture: true, passive: true });

    return () => {
      document.removeEventListener('pointerdown', onFirstInteraction, { capture: true } as AddEventListenerOptions);
      document.removeEventListener('click', onFirstInteraction, { capture: true } as AddEventListenerOptions);
    };
  }, [isKioskMode, isFullscreen, requestFullscreen]);

  const exitKioskMode = useCallback(() => {
    setIsKioskMode(false);
    setIsInRotation(false);
    
    void exitFullscreen();

    if (rotationTimerRef.current) {
      clearTimeout(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, [exitFullscreen]);

  const showQueueView = useCallback(() => {
    setCurrentView('queue');
    setIsInRotation(false);
    
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      setIsInRotation(true);
    }, IDLE_TIMEOUT);
  }, []);

  // Handle rotation
  useEffect(() => {
    if (!isKioskMode || !isInRotation) {
      if (rotationTimerRef.current) {
        clearTimeout(rotationTimerRef.current);
        rotationTimerRef.current = null;
      }
      return;
    }

    if (rotationTimerRef.current) {
      clearTimeout(rotationTimerRef.current);
    }

    const currentDuration =
      currentView === 'queue' ? QUEUE_VIEW_DURATION : AD_VIEW_DURATION;

    rotationTimerRef.current = setTimeout(() => {
      if (currentView === 'queue') {
        // Show next ad if available
        if (ads.length > 0) {
          setCurrentView('ad');
          setCurrentAdIndex((prev) => (prev + 1) % ads.length);
        } else {
          // No ads available, stay on queue
          setCurrentView('queue');
        }
      } else {
        // After ad, go back to queue
        setCurrentView('queue');
      }
    }, currentDuration);

    return () => {
      if (rotationTimerRef.current) {
        clearTimeout(rotationTimerRef.current);
        rotationTimerRef.current = null;
      }
    };
  }, [isKioskMode, isInRotation, currentView, ads.length]);

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
    isFullscreen,
    ads,
    currentAdIndex,
    lastAdsUpdate,
    enterKioskMode,
    exitKioskMode,
    showQueueView,
    requestFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}
