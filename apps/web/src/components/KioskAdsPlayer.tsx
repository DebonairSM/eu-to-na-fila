import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

interface Ad {
  id: number;
  position: number;
  mediaType: string;
  url: string;
  version: number;
}

interface KioskAdsPlayerProps {
  shopSlug: string;
  currentAdIndex: number; // Index in the ads array to display
  onError?: () => void;
}

export function KioskAdsPlayer({ shopSlug, currentAdIndex, onError }: KioskAdsPlayerProps) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preloadRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);

  // Fetch manifest
  const fetchManifest = async () => {
    try {
      setLoading(true);
      setError(false);
      const manifest = await api.getAdsManifest(shopSlug);
      setAds(manifest.ads);
    } catch (err) {
      console.error('[KioskAdsPlayer] Failed to fetch manifest:', err);
      setError(true);
      if (onError) onError();
    } finally {
      setLoading(false);
    }
  };

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    if (!shopSlug) return;

    const wsUrl = api.getWebSocketUrl();
    if (!wsUrl) return;

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[KioskAdsPlayer] WebSocket connected');
          // Subscribe to ads updates (we'll need companyId, but for now just connect)
          // The backend will need to know which company to subscribe to
          // For now, we'll just listen for any ads.updated messages
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'ads.updated') {
              console.log('[KioskAdsPlayer] Received ads.updated, refetching manifest');
              // Refetch manifest when ads are updated
              void fetchManifest();
            }
          } catch (err) {
            console.error('[KioskAdsPlayer] Failed to parse WebSocket message:', err);
          }
        };

        ws.onerror = (err) => {
          console.error('[KioskAdsPlayer] WebSocket error:', err);
        };

        ws.onclose = (_event) => {
          console.log('[KioskAdsPlayer] WebSocket closed, reconnecting...');
          wsRef.current = null;
          // Reconnect after a delay
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };
      } catch (err) {
        console.error('[KioskAdsPlayer] Failed to connect WebSocket:', err);
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
  }, [shopSlug]);

  // Fetch manifest on mount and when shopSlug changes
  useEffect(() => {
    void fetchManifest();
  }, [shopSlug]);

  // Get current ad to display
  const currentAd = ads.length > 0 && currentAdIndex >= 0 && currentAdIndex < ads.length
    ? ads[currentAdIndex]
    : null;

  // Calculate next ad index for preloading
  const nextAdIndex = ads.length > 0 ? (currentAdIndex + 1) % ads.length : 0;
  const nextAd = ads.length > 0 && nextAdIndex >= 0 && nextAdIndex < ads.length
    ? ads[nextAdIndex]
    : null;

  // Preload next ad in the background
  useEffect(() => {
    if (!nextAd || !currentAd) return;

    // Clean up previous preload element
    if (preloadRef.current) {
      if (preloadRef.current.parentNode) {
        preloadRef.current.parentNode.removeChild(preloadRef.current);
      }
      preloadRef.current = null;
    }

    // Create hidden preload element
    if (nextAd.mediaType === 'image') {
      const img = document.createElement('img');
      img.src = nextAd.url;
      img.style.display = 'none';
      img.style.position = 'absolute';
      img.style.visibility = 'hidden';
      img.style.width = '1px';
      img.style.height = '1px';
      document.body.appendChild(img);
      preloadRef.current = img;
    } else {
      const video = document.createElement('video');
      video.src = nextAd.url;
      video.preload = 'auto';
      video.muted = true;
      video.style.display = 'none';
      video.style.position = 'absolute';
      video.style.visibility = 'hidden';
      video.style.width = '1px';
      video.style.height = '1px';
      document.body.appendChild(video);
      preloadRef.current = video;
    }

    // Cleanup on unmount or when next ad changes
    return () => {
      if (preloadRef.current && preloadRef.current.parentNode) {
        preloadRef.current.parentNode.removeChild(preloadRef.current);
        preloadRef.current = null;
      }
    };
  }, [nextAd, currentAd]);

  if (loading) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="text-white/50 text-sm">Carregando anúncios...</div>
      </div>
    );
  }

  if (error || !currentAd) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="text-white/50 text-sm">
          {error ? 'Erro ao carregar anúncios' : 'Nenhum anúncio disponível'}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center"
    >
      {currentAd.mediaType === 'image' ? (
        <img
          src={currentAd.url}
          alt={`Anúncio ${currentAd.position}`}
          key={`ad-${currentAd.id}-v${currentAd.version}`}
          className="w-full h-full object-contain"
          onError={() => {
            setError(true);
            if (onError) onError();
          }}
        />
      ) : (
        <video
          src={currentAd.url}
          key={`ad-${currentAd.id}-v${currentAd.version}`}
          className="w-full h-full object-contain"
          autoPlay
          loop
          muted
          playsInline
          onError={() => {
            setError(true);
            if (onError) onError();
          }}
        />
      )}
    </div>
  );
}
