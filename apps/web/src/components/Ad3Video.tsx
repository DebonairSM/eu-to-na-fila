import { useEffect, useRef } from 'react';

interface Ad3VideoProps {
  onClose?: () => void;
  showTimer?: boolean;
}

export function Ad3Video({ onClose: _onClose, showTimer = true }: Ad3VideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

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
        <div className="text-center space-y-6 max-w-5xl w-full">
          {/* Background panel for text readability */}
          <div className="bg-black/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 md:p-10 border-2 border-purple-500/40 shadow-2xl">
            <div className="space-y-4">
              <div className="text-5xl sm:text-6xl md:text-7xl font-black text-white leading-tight tracking-tight">
                FUTURO
              </div>
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                NA SUA EMPRESA AGORA
              </div>
            </div>
            <div className="pt-6">
              <a
                href="https://grandetech.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-extrabold py-4 px-10 rounded-2xl text-lg sm:text-xl transition-all hover:scale-110 hover:shadow-[0_12px_32px_rgba(168,85,247,0.7)] border-2 border-white/20"
              >
                ACESSE GRANDETECH.COM.BR
              </a>
            </div>
            {showTimer && (
              <div className="pt-6 text-white text-base font-semibold">
                Soluções inteligentes para seu negócio
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Half - Video */}
      <div className="h-1/2 w-full relative overflow-hidden flex items-center justify-center bg-black p-4 sm:p-6 md:p-8">
        <div className="relative w-full max-w-5xl aspect-video">
          <video
            ref={videoRef}
            src="/mineiro/gt-ad-001.mp4"
            autoPlay
            loop
            muted
            playsInline
            onError={handleVideoError}
            onLoadedData={() => console.log('Ad3 Video loaded successfully')}
            className="w-full h-full object-contain rounded-lg brightness-110 contrast-125"
          />
          {/* Overlay with gradient - Style 3: Purple/blue accent */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 rounded-lg pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/15 via-transparent to-blue-900/15 rounded-lg pointer-events-none" />
          
          {/* Animated glow effect at top edge */}
          <div className="absolute top-0 left-0 right-0 h-1/3 bg-[radial-gradient(circle,rgba(168,85,247,0.1)_0%,transparent_70%)] animate-pulse rounded-t-lg pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

