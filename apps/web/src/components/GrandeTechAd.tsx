import { useState, useEffect, useRef } from 'react';
import { wsClient } from '@/lib/ws';

interface GrandeTechAdProps {
  onClose?: () => void;
  showTimer?: boolean;
  companyId?: number | null;
}

export function GrandeTechAd({ onClose, showTimer = true, companyId }: GrandeTechAdProps) {
  const [timeRemaining, setTimeRemaining] = useState(15);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [adVersion, setAdVersion] = useState<number>(0);

  // Intersection Observer to detect when component is visible
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' } // Start loading 50px before component is visible
    );

    observer.observe(containerRef.current);

    // Check if element is already visible (IntersectionObserver may not fire immediately)
    const checkImmediateIntersection = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 && 
          rect.top < window.innerHeight + 50 && 
          rect.bottom > -50;
        if (isVisible) {
          setShouldLoad(true);
          observer.disconnect();
        }
      }
    };
    
    // Check after a brief delay to ensure layout is complete
    const timeoutId = setTimeout(checkImmediateIntersection, 100);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!showTimer) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (onClose) onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showTimer, onClose]);

  // Subscribe to ad updates via WebSocket
  useEffect(() => {
    if (!companyId) return;

    const unsubscribe = wsClient.subscribe(companyId, (adType, version) => {
      // Only update if this is ad1 (gt-ad.png)
      if (adType === 'ad1') {
        setAdVersion(version);
        setImageError(false); // Reset error state on update
      }
    });

    return unsubscribe;
  }, [companyId]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center"
    >
      {shouldLoad ? (
        imageError ? (
          <div className="w-full h-full bg-black flex items-center justify-center">
            <div className="text-white/50 text-sm">Erro ao carregar imagem</div>
          </div>
        ) : (
          <img
            src={
              companyId
                ? `/api/ads/${companyId}/gt-ad.png${adVersion > 0 ? `?v=${adVersion}` : ''}`
                : '/mineiro/gt-ad.png'
            }
            alt="Grande Tech"
            key={adVersion} // Force re-render on version change
            onLoad={() => {
              setImageError(false);
            }}
            onError={() => {
              // Image failed to load - error state is handled by component state
              // Suppress console error to reduce noise for missing ad images
              setImageError(true);
            }}
            className="w-full h-full object-contain"
          />
        )
      ) : (
        <div className="w-full h-full bg-black flex items-center justify-center">
          <div className="text-white/50 text-sm">Carregando...</div>
        </div>
      )}
      {showTimer && timeRemaining > 0 && (
        <div className="absolute top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg text-lg font-semibold">
          {timeRemaining}s
        </div>
      )}
    </div>
  );
}
