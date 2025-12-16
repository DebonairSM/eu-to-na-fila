import { useEffect, useRef, useCallback } from 'react';

interface Ad2VideoProps {
  onClose?: () => void;
  showTimer?: boolean;
}

export function Ad2Video({ onClose: _onClose, showTimer: _showTimer = true }: Ad2VideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.error('Video play failed:', error);
      });
    }
  }, []);

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Video load error:', e);
    const video = e.currentTarget;
    console.error('Video error details:', {
      error: video.error,
      networkState: video.networkState,
      readyState: video.readyState,
      src: video.src
    });
  };

  const logDimensions = useCallback(() => {
    if (containerRef.current && videoRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const videoRect = videoRef.current.getBoundingClientRect();
      const video = videoRef.current;
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Ad2Video.tsx:33',message:'Ad2 dimensions check',data:{containerWidth:containerRect.width,containerHeight:containerRect.height,containerScrollWidth:containerRef.current.scrollWidth,containerScrollHeight:containerRef.current.scrollHeight,videoWidth:video.videoWidth,videoHeight:video.videoHeight,videoDisplayWidth:videoRect.width,videoDisplayHeight:videoRect.height,videoClientWidth:video.clientWidth,videoClientHeight:video.clientHeight,viewportWidth:window.innerWidth,viewportHeight:window.innerHeight,hasOverflow:containerRef.current.scrollWidth>containerRect.width||containerRef.current.scrollHeight>containerRect.height},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    }
  }, []);

  useEffect(() => {
    logDimensions();
    const timeout = setTimeout(logDimensions, 100);
    const resizeObserver = new ResizeObserver(logDimensions);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    if (videoRef.current) resizeObserver.observe(videoRef.current);
    return () => {
      clearTimeout(timeout);
      resizeObserver.disconnect();
    };
  }, [logDimensions]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center"
    >
      {/* #region agent log */}
      {(() => { fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Ad2Video.tsx:50',message:'Ad2 component rendering',data:{containerClass:'w-full h-full'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{}); return null; })()}
      {/* #endregion */}
      <video
        ref={videoRef}
        src="/mineiro/gt-ad-001.mp4"
        autoPlay
        loop
        muted
        playsInline
        onError={handleVideoError}
        onLoadedData={() => {
          console.log('Ad2 Video loaded successfully');
          // #region agent log
          logDimensions();
          // #endregion
        }}
        onResize={() => {
          // #region agent log
          logDimensions();
          // #endregion
        }}
        className="w-full h-full object-contain"
      />
    </div>
  );
}

