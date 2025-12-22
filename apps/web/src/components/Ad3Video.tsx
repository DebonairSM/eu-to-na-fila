import { useEffect, useRef, useState } from 'react';

interface Ad3VideoProps {
  onClose?: () => void;
  showTimer?: boolean;
}

export function Ad3Video({ onClose: _onClose, showTimer: _showTimer = true }: Ad3VideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  // Intersection Observer to detect when component is visible
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Ad3Video.tsx:20',message:'Ad3 IntersectionObserver triggered',data:{isIntersecting:entry.isIntersecting,intersectionRatio:entry.intersectionRatio},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
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
          fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Ad3Video.tsx:38',message:'Ad3 immediate intersection check passed',data:{rectWidth:rect.width,rectHeight:rect.height},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
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

  // Load and play video when visible
  useEffect(() => {
    if (shouldLoad && videoRef.current) {
      const video = videoRef.current;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Ad3Video.tsx:56',message:'Ad3 attempting to load video',data:{src:'/mineiro/gt-ad-001.mp4'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      video.load(); // Load the video source
      video.play().catch((error) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Ad3Video.tsx:59',message:'Ad3 video play failed',data:{error:error.message,errorName:error.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        console.error('Video play failed:', error);
      });
    }
  }, [shouldLoad]);

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Ad3Video.tsx:65',message:'Ad3 video load error',data:{errorCode:video.error?.code,errorMessage:video.error?.message,networkState:video.networkState,readyState:video.readyState,src:video.src},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    console.error('Video load error:', e);
    console.error('Video error details:', {
      error: video.error,
      networkState: video.networkState,
      readyState: video.readyState,
      src: video.src
    });
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center"
    >
      {shouldLoad ? (
        <video
          ref={videoRef}
          src="/mineiro/gt-ad-001.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="none"
          onError={handleVideoError}
          onLoadedData={() => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Ad3Video.tsx:91',message:'Ad3 video loaded successfully',data:{src:'/mineiro/gt-ad-001.mp4'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            // Video loaded successfully
          }}
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="w-full h-full bg-black flex items-center justify-center">
          <div className="text-white/50 text-sm">Carregando...</div>
        </div>
      )}
    </div>
  );
}

