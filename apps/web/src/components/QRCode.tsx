import { cn } from '@/lib/utils';

export interface QRCodeProps {
  url: string;
  size?: number;
  className?: string;
}

export function QRCode({ url, size = 100, className }: QRCodeProps) {
  // Using QR Server API (same as HTML mockups)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;

  return (
    <div className={cn('inline-block', className)}>
      <img
        src={qrUrl}
        alt="QR Code"
        className="w-full h-full"
        loading="lazy"
      />
    </div>
  );
}
