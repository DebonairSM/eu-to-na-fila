import { useEffect, useRef, useState } from 'react';

interface Ad2VideoProps {
  onClose?: () => void;
  showTimer?: boolean;
}

export function Ad2Video({ onClose: _onClose, showTimer: _showTimer = true }: Ad2VideoProps) {
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
            fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Ad2Video.tsx:20',message:'Ad2 IntersectionObserver triggered',data:{isIntersecting:entry.isIntersecting,intersectionRatio:entry.intersectionRatio},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
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
          fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Ad2Video.tsx:38',message:'Ad2 immediate intersection check passed',data:{rectWidth:rect.width,rectHeight:rect.height},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
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
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Ad2Video.tsx:68',message:'Ad2 image loaded successfully',data:{src:'/mineiro/gt-ad2.png'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
              setImageError(false);
            }}
            onError={() => {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Ad2Video.tsx:71',message:'Ad2 image failed to load',data:{src:'/mineiro/gt-ad2.png'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
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
    </div>
  );
}

