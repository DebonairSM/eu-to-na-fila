/**
 * Utility functions for handling avatar URLs with fallback support
 * Handles CSP violations, rate limits, and other failures gracefully
 */

/**
 * Generates a fallback avatar URL using ui-avatars.com
 * This may fail due to CSP violations or rate limits, so always have a fallback
 */
export function generateAvatarUrl(name: string, size: number = 128): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=D4AF37&color=000&size=${size}`;
}

/**
 * Gets the avatar URL for a barber, with fallback handling
 * Returns null if no avatar should be shown (will fall back to initials)
 */
export function getBarberAvatarUrl(
  barber: { avatarUrl?: string | null; name: string },
  size: number = 128
): string | null {
  // If barber has a custom avatar URL, use it
  if (barber.avatarUrl) {
    return barber.avatarUrl;
  }
  
  // Otherwise, generate fallback URL (may fail due to CSP/rate limits)
  return generateAvatarUrl(barber.name, size);
}

/**
 * Creates an avatar image loader that handles errors gracefully
 * Returns a Promise that resolves to true if loaded, false if failed
 */
export function loadAvatarImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    
    // Set a timeout to avoid hanging on rate-limited requests
    const timeout = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve(false);
    }, 5000); // 5 second timeout
    
    img.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };
    
    img.src = url;
  });
}
