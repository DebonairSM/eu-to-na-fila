import { useEffect, useRef, useState } from 'react';

interface Ad3VideoProps {
  onClose?: () => void;
  showTimer?: boolean;
}

export function Ad3Video({ onClose: _onClose, showTimer: _showTimer = true }: Ad3VideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  // Intersection Observer to detect when component is visible
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
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

  // Load and play video when visible
  useEffect(() => {
    if (shouldLoad && videoRef.current) {
      const video = videoRef.current;
      video.load(); // Load the video source
      video.play().catch((error) => {
        console.error('Video play failed:', error);
      });
    }
  }, [shouldLoad]);

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

