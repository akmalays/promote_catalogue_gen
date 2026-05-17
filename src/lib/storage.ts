import { supabase } from './supabase';

const BUCKET = 'store-assets';

/**
 * Upload an image file to Supabase Storage.
 * Files are organized by company: {companyId}/{folder}/{filename}
 * 
 * @param file - File object or base64 data URL string
 * @param companyId - Company UUID for folder isolation
 * @param folder - Subfolder (e.g. 'products', 'catalogues', 'invoices')
 * @returns Public URL of the uploaded file, or null on failure
 */
export async function uploadImage(
  file: File | string,
  companyId: string,
  folder: 'products' | 'catalogues' | 'invoices' | 'misc' = 'misc'
): Promise<string | null> {
  try {
    let fileToUpload: File;
    
    if (typeof file === 'string') {
      // Convert base64 data URL to File
      if (!file.startsWith('data:')) return file; // Already a URL, return as-is
      const res = await fetch(file);
      const blob = await res.blob();
      const ext = blob.type.split('/')[1] || 'png';
      fileToUpload = new File([blob], `${Date.now()}.${ext}`, { type: blob.type });
    } else {
      fileToUpload = file;
    }

    const ext = fileToUpload.name.split('.').pop() || 'png';
    const fileName = `${companyId}/${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (err) {
    console.error('Upload failed:', err);
    return null;
  }
}

/**
 * Delete an image from Supabase Storage by its public URL.
 */
export async function deleteImage(publicUrl: string): Promise<boolean> {
  try {
    // Extract path from public URL
    const url = new URL(publicUrl);
    const pathParts = url.pathname.split(`/storage/v1/object/public/${BUCKET}/`);
    if (pathParts.length < 2) return false;
    
    const filePath = pathParts[1];
    const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
    
    if (error) {
      console.error('Delete error:', error);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a string is a base64 data URL (not yet uploaded to storage).
 */
export function isBase64(str: string): boolean {
  return str?.startsWith('data:image/') || false;
}
