import { useState, useEffect, useRef } from 'react';
import { useLocale } from '@/contexts/LocaleContext';

export interface KioskAd {
  id: number;
  position: number;
  mediaType: string;
  url: string;
  version: number;
}

interface KioskAdsPlayerProps {
  ads: KioskAd[];
  currentAdIndex: number;
}

export function KioskAdsPlayer({ ads, currentAdIndex }: KioskAdsPlayerProps) {
  const { t } = useLocale();
  const [mediaRetry, setMediaRetry] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentAd =
    ads.length > 0 && currentAdIndex >= 0 && currentAdIndex < ads.length
      ? ads[currentAdIndex]
      : null;

  useEffect(() => {
    setMediaRetry(0);
    setMediaError(false);
  }, [currentAdIndex, currentAd?.id]);

  const mediaKey = currentAd
    ? `ad-${currentAd.id}-v${currentAd.version}-${mediaRetry}`
    : '';

  if (!currentAd) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center" data-testid="kiosk-ads-player">
        <div className="text-white/50 text-sm" data-testid="kiosk-no-ads">{t('ads.noAdsAvailable')}</div>
      </div>
    );
  }

  const handleMediaError = () => {
    if (mediaRetry < 1) {
      setMediaRetry((r) => r + 1);
      return;
    }
    setMediaError(true);
  };

  if (mediaError) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center" data-testid="kiosk-ads-player">
        <div className="text-white/50 text-sm" data-testid="kiosk-ad-error">Erro ao carregar anúncio</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center"
      data-testid="kiosk-ads-player"
    >
      {currentAd.mediaType === 'image' ? (
        <img
          src={currentAd.url}
          alt={`Anúncio ${currentAd.position}`}
          key={mediaKey}
          className="w-full h-full object-contain"
          onError={handleMediaError}
        />
      ) : (
        <video
          src={currentAd.url}
          key={mediaKey}
          className="w-full h-full object-contain bg-black"
          style={{ backgroundColor: '#000' }}
          poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect fill='%23000' width='1' height='1'/%3E%3C/svg%3E"
          autoPlay
          loop
          muted
          playsInline
          onError={handleMediaError}
        />
      )}
    </div>
  );
}
