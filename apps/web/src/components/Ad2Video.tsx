import { useEffect, useRef, useState } from 'react';

interface Ad2VideoProps {
  onClose?: () => void;
  showTimer?: boolean;
  companyId?: number | null;
}

export function Ad2Video({ onClose: _onClose, showTimer: _showTimer = true, companyId }: Ad2VideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [imageError, setImageError] = useState(false);

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
            src={companyId ? `/api/ads/${companyId}/gt-ad2.png` : '/mineiro/gt-ad2.png'}
            alt="Grande Tech"
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
    </div>
  );
}

