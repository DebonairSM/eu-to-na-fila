import { useEffect, useRef } from 'react';

interface Ad3VideoProps {
  onClose?: () => void;
  showTimer?: boolean;
}

export function Ad3Video({ onClose: _onClose, showTimer: _showTimer = true }: Ad3VideoProps) {
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
    <div className="w-full h-full relative overflow-hidden bg-black">
      <video
        ref={videoRef}
        src="/mineiro/gt-ad-001.mp4"
        autoPlay
        loop
        muted
        playsInline
        onError={handleVideoError}
        onLoadedData={() => console.log('Ad3 Video loaded successfully')}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

