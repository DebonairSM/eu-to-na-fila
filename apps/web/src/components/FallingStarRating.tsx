import { useEffect, useState, useRef, useCallback } from 'react';

const FALL_DURATION_MS = 480;
const DELAY_BETWEEN_STARS_MS = 520;

function playStarSound(): void {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(0, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.02);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.14);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // ignore if AudioContext not allowed
  }
}

interface FallingStarRatingProps {
  /** When true, runs the falling-star sequence once then calls onComplete. */
  run: boolean;
  /** Number of stars to animate (1–5). Uses current average rating so e.g. 4.2 → 4 stars, 4.5 → 5. */
  starCount: number;
  onComplete?: () => void;
  className?: string;
}

export function FallingStarRating({ run, starCount, onComplete, className = '' }: FallingStarRatingProps) {
  const targetStars = Math.min(5, Math.max(1, Math.round(starCount)));
  const [landedCount, setLandedCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const hasRunRef = useRef(false);

  const tick = useCallback(() => {
    if (landedCount < targetStars) {
      playStarSound();
      setLandedCount((c) => c + 1);
    } else {
      setIsComplete(true);
      onComplete?.();
    }
  }, [landedCount, targetStars, onComplete]);

  useEffect(() => {
    if (!run || hasRunRef.current) return;
    hasRunRef.current = true;
    setLandedCount(0);
    setIsComplete(false);
  }, [run]);

  useEffect(() => {
    if (!run || landedCount >= targetStars) return;
    const delayMs = landedCount === 0 ? 200 + FALL_DURATION_MS : DELAY_BETWEEN_STARS_MS;
    const id = setTimeout(tick, delayMs);
    return () => clearTimeout(id);
  }, [run, landedCount, targetStars, tick]);

  return (
    <div className={`flex justify-center gap-1 sm:gap-2 ${className}`} role="img" aria-label="Rating stars">
      {[0, 1, 2, 3, 4].map((index) => (
        <div
          key={index}
          className="relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center"
        >
          <span
            className="material-symbols-outlined text-3xl sm:text-4xl text-[var(--shop-text-secondary)] absolute inset-0 flex items-center justify-center"
            style={{ opacity: 0.4 }}
            aria-hidden
          >
            star
          </span>
          {landedCount > index && index < targetStars && (
            <span
              className="material-symbols-outlined text-3xl sm:text-4xl text-[var(--shop-accent)] flex items-center justify-center"
              style={{
                animation: index === landedCount - 1 && !isComplete ? 'fallingStarLand 0.48s ease-out forwards' : 'none',
                transformOrigin: 'center top',
              }}
              aria-hidden
            >
              star
            </span>
          )}
          {run && landedCount === index && index < targetStars && !isComplete && (
            <span
              className="material-symbols-outlined text-3xl sm:text-4xl text-[var(--shop-accent)] absolute flex items-center justify-center falling-star-drop"
              style={{
                top: 0,
                left: '50%',
                marginLeft: '-1rem',
                animation: `fallingStarDrop ${FALL_DURATION_MS}ms ease-out forwards`,
              }}
              aria-hidden
            >
              star
            </span>
          )}
        </div>
      ))}
      <style>{`
        @keyframes fallingStarDrop {
          from {
            transform: translate(-50%, -120%);
            opacity: 1;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        @keyframes fallingStarLand {
          from {
            transform: scale(1.15);
            opacity: 0.9;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
