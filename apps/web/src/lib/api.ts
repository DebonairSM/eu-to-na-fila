/**
 * Re-export from the modular API client.
 * All existing imports like `import { api } from '@/lib/api'` keep working.
 */
export { api, createApiClient, ApiError } from './api/index';
export type { ShopTheme, HomeContent } from '@eutonafila/shared';
