import { useState, useEffect, useRef } from 'react';

interface GrandeTechAdProps {
  onClose?: () => void;
  showTimer?: boolean;
}

export function GrandeTechAd({ onClose, showTimer = true }: GrandeTechAdProps) {
  const [timeRemaining, setTimeRemaining] = useState(15);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  return (
    <div className="w-full h-full relative overflow-hidden bg-black">
      <video
        ref={videoRef}
        src="/mineiro/gt-ad-001.mp4"
        autoPlay
        loop
        muted
        playsInline
        onError={handleVideoError}
        onLoadedData={() => console.log('Video loaded successfully')}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
