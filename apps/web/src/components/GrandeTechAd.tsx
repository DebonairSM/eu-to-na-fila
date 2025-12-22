import { useState, useEffect, useRef } from 'react';

interface GrandeTechAdProps {
  onClose?: () => void;
  showTimer?: boolean;
}

export function GrandeTechAd({ onClose, showTimer = true }: GrandeTechAdProps) {
  const [timeRemaining, setTimeRemaining] = useState(15);
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
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GrandeTechAd.tsx:21',message:'Ad1 IntersectionObserver triggered',data:{isIntersecting:entry.isIntersecting,intersectionRatio:entry.intersectionRatio},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GrandeTechAd.tsx:39',message:'Ad1 immediate intersection check passed',data:{rectWidth:rect.width,rectHeight:rect.height},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
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
            src="/mineiro/gt-ad.png"
            alt="Grande Tech"
            onLoad={() => {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GrandeTechAd.tsx:85',message:'Ad1 image loaded successfully',data:{src:'/mineiro/gt-ad.png'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
              setImageError(false);
            }}
            onError={() => {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GrandeTechAd.tsx:88',message:'Ad1 image failed to load',data:{src:'/mineiro/gt-ad.png'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
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
