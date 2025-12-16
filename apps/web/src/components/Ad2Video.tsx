import { useEffect, useRef } from 'react';

interface Ad2VideoProps {
  onClose?: () => void;
  showTimer?: boolean;
}

export function Ad2Video({ onClose: _onClose, showTimer = true }: Ad2VideoProps) {
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
          <div className="bg-black/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 md:p-10 border-2 border-[#0f3d2e]/50 shadow-2xl">
            <div className="space-y-3">
              <div className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-wide">
                INOVAÇÃO
              </div>
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#8ad6b0]">
                TECNOLOGIA DE PONTA
              </div>
            </div>
            <div className="pt-4">
              <div className="inline-block bg-[#0f3d2e] border-2 border-[#8ad6b0] text-white font-bold py-3 px-8 rounded-xl text-base sm:text-lg">
                CONHEÇA NOSSAS SOLUÇÕES
              </div>
            </div>
            {showTimer && (
              <div className="pt-4 text-[#8ad6b0] text-sm font-medium">
                Transformando ideias em realidade
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
            onLoadedData={() => console.log('Ad2 Video loaded successfully')}
            className="w-full h-full object-contain rounded-lg"
          />
          {/* Overlay with gradient - Style 2: Green accent */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 rounded-lg pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f3d2e]/10 via-transparent to-transparent rounded-lg pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

