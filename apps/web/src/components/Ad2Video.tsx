import { useEffect, useRef, useState } from 'react';

interface Ad2VideoProps {
  onClose?: () => void;
  showTimer?: boolean;
}

export function Ad2Video({ onClose: _onClose, showTimer: _showTimer = true }: Ad2VideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
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

    return () => {
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
            src="/mineiro/gt-ad2.png"
            alt="Grande Tech"
            onLoad={() => {
              setImageLoaded(true);
              setImageError(false);
            }}
            onError={(e) => {
              console.error('Image load error:', e);
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

