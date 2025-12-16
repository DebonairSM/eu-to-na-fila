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
    <div className="w-full h-full flex flex-col bg-black relative overflow-hidden">
      {/* Top Half - Text Content */}
      <div className="h-1/2 w-full flex items-center justify-center bg-gradient-to-b from-black via-black to-black/95 px-4 sm:px-8 relative z-10">
        <div className="text-center space-y-6 max-w-4xl w-full">
          {/* Background panel for text readability */}
          <div className="bg-black/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 md:p-10 border border-[#D4AF37]/30 shadow-2xl">
            <div className="text-5xl sm:text-6xl md:text-7xl font-bold text-white leading-tight">
              GRANDE TECH
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#D4AF37] mt-3">
              SISTEMAS DE IA
            </div>
            <div className="pt-4">
              <div className="inline-block bg-[#D4AF37] text-black font-bold py-3 px-6 rounded-xl text-base sm:text-lg">
                VISITE GRANDETECH.COM.BR
              </div>
            </div>
            {showTimer && (
              <div className="pt-4 text-white/90 text-sm">
                Fechando em {timeRemaining}s
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Half - Video */}
      <div className="h-1/2 w-full relative overflow-hidden flex items-center justify-center bg-black p-4 sm:p-6 md:p-8">
        <div className="relative w-full max-w-7xl aspect-video scale-110">
          <video
            ref={videoRef}
            src="/mineiro/gt-ad-001.mp4"
            autoPlay
            loop
            muted
            playsInline
            onError={handleVideoError}
            onLoadedData={() => console.log('Video loaded successfully')}
            className="w-full h-full object-contain rounded-lg"
          />
          {/* Overlay with gradient - Style 1: Golden accent */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 rounded-lg pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#D4AF37]/5 via-transparent to-transparent rounded-lg pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
