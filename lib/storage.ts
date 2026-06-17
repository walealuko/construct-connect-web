import { supabase } from './supabase';

export type ImageBucket = 'product-images' | 'artisan-portfolio';

export function isAbsoluteUrl(value: string): boolean {
  return /^(https?:)?\/\//i.test(value) || value.startsWith('data:');
}

/**
 * Resolve a stored image reference to a renderable URL.
 *
 * - If `value` is already an absolute URL (http://, https://, //...) or empty,
 *   it is returned unchanged.
 * - Otherwise it is treated as a path inside the given Supabase Storage bucket
 *   and converted to a public URL.
 *
 * Safe for server components — does not require the browser Supabase client.
 */
export function resolveImageUrl(
  value: string | null | undefined,
  bucket: ImageBucket = 'product-images',
): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (isAbsoluteUrl(trimmed)) return trimmed;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  if (!supabaseUrl) return trimmed;
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${trimmed.replace(/^\//, '')}`;
}
