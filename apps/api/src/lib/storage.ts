import { createClient } from '@supabase/supabase-js';
import { env } from '../env.js';

/**
 * Supabase Storage client for ad files.
 * Uses service role key for server-side operations.
 */
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseClient;
}

const BUCKET_NAME = 'company-ads';

/**
 * Upload an ad file to Supabase Storage.
 * 
 * @param companyId - Company ID
 * @param adId - Ad ID
 * @param fileBuffer - File buffer
 * @param mimeType - MIME type (e.g., 'image/png', 'video/mp4')
 * @returns Public URL to the uploaded file
 */
export async function uploadAdFile(
  companyId: number,
  adId: number,
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const supabase = getSupabaseClient();
  
  // Determine file extension from MIME type
  const mimeToExt: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
  };
  const extension = mimeToExt[mimeType] || '.bin';
  
  // Storage path: companies/{companyId}/ads/{adId}{extension}
  const storagePath = `companies/${companyId}/ads/${adId}${extension}`;
  
  // Upload file to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: true, // Replace if exists
    });
  
  if (error) {
    throw new Error(`Failed to upload ad file to Supabase Storage: ${error.message}`);
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);
  
  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL for uploaded ad file');
  }
  
  return urlData.publicUrl;
}

/**
 * Get public URL for an ad file from Supabase Storage.
 * 
 * @param companyId - Company ID
 * @param adId - Ad ID
 * @param mimeType - MIME type (to determine extension)
 * @returns Public URL to the file
 */
export function getAdFileUrl(companyId: number, adId: number, mimeType: string): string {
  const supabase = getSupabaseClient();
  
  // Determine file extension from MIME type
  const mimeToExt: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
  };
  const extension = mimeToExt[mimeType] || '.bin';
  
  // Storage path: companies/{companyId}/ads/{adId}{extension}
  const storagePath = `companies/${companyId}/ads/${adId}${extension}`;
  
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);
  
  return data.publicUrl;
}

/**
 * Delete an ad file from Supabase Storage.
 * 
 * @param companyId - Company ID
 * @param adId - Ad ID
 * @param mimeType - MIME type (to determine extension)
 */
export async function deleteAdFile(
  companyId: number,
  adId: number,
  mimeType: string
): Promise<void> {
  const supabase = getSupabaseClient();
  
  // Determine file extension from MIME type
  const mimeToExt: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
  };
  const extension = mimeToExt[mimeType] || '.bin';
  
  // Storage path: companies/{companyId}/ads/{adId}{extension}
  const storagePath = `companies/${companyId}/ads/${adId}${extension}`;
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);
  
  if (error) {
    // Log but don't throw - file might not exist
    console.warn(`Failed to delete ad file from Supabase Storage: ${error.message}`);
  }
}

const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
};

/**
 * Upload shop home about image (for edit flow). Path: companies/{companyId}/shops/{shopId}/home-about.{ext}
 */
export async function uploadShopHomeImage(
  companyId: number,
  shopId: number,
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const supabase = getSupabaseClient();
  const extension = MIME_TO_EXT[mimeType] || '.jpg';
  const storagePath = `companies/${companyId}/shops/${shopId}/home-about${extension}`;
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: true });
  if (error) throw new Error(`Failed to upload home image: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
  if (!data?.publicUrl) throw new Error('Failed to get public URL for home image');
  return data.publicUrl;
}

/**
 * Upload client reference image (note/image for next service). Path: companies/{companyId}/shops/{shopId}/clients/{clientId}/reference.{ext}
 */
export async function uploadClientReferenceImage(
  companyId: number,
  shopId: number,
  clientId: number,
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const supabase = getSupabaseClient();
  const extension = MIME_TO_EXT[mimeType] || '.jpg';
  const storagePath = `companies/${companyId}/shops/${shopId}/clients/${clientId}/reference${extension}`;
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: true });
  if (error) throw new Error(`Failed to upload client reference image: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
  if (!data?.publicUrl) throw new Error('Failed to get public URL for client reference image');
  return data.publicUrl;
}

/**
 * Upload draft home about image (for create flow, no shop yet). Path: companies/{companyId}/drafts/home-about-{uuid}.{ext}
 */
export async function uploadDraftHomeImage(
  companyId: number,
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const supabase = getSupabaseClient();
  const extension = MIME_TO_EXT[mimeType] || '.jpg';
  const uuid = crypto.randomUUID();
  const storagePath = `companies/${companyId}/drafts/home-about-${uuid}${extension}`;
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: true });
  if (error) throw new Error(`Failed to upload draft home image: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
  if (!data?.publicUrl) throw new Error('Failed to get public URL for draft home image');
  return data.publicUrl;
}
