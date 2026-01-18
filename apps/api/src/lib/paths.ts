import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

/**
 * Get the public directory path.
 * This ensures consistent path resolution across the application,
 * regardless of where the file is located (src/ vs src/routes/, etc.)
 * 
 * In development: resolves to apps/api/public
 * In production (compiled): resolves to apps/api/public (from dist/)
 * 
 * @returns Absolute path to the public directory
 */
export function getPublicPath(): string {
  // Get the path to this file (lib/paths.ts or lib/paths.js in production)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  
  // From lib/paths.ts: go up to src/ (or dist/ in production), then up to api/, then into public/
  // lib/paths.ts is at: .../api/src/lib/paths.ts (dev) or .../api/dist/lib/paths.js (prod)
  // We want: .../api/public
  const publicPath = join(__dirname, '..', '..', 'public');
  
  // Log path resolution for debugging (only in development or if path doesn't exist)
  if (process.env.NODE_ENV === 'development' || !existsSync(publicPath)) {
    console.log(`[paths] Resolved publicPath: ${publicPath} (from ${__dirname})`);
  }
  
  return publicPath;
}
