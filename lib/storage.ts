export type ImageBucket = 'product-images' | 'artisan-portfolio';

export function isAbsoluteUrl(value: string): boolean {
  return /^(https?:)?\/\//i.test(value) || value.startsWith('data:');
}

/**
 * If `value` is a Supabase Storage URL missing the `/public/` or `/sign/`
 * access segment, rewrite it to insert `/public/`. Returns null if the URL
 * is not a Supabase Storage URL or already correct.
 *
 * Example: `…/storage/v1/object/product-images/foo.webp`
 *       → `…/storage/v1/object/public/product-images/foo.webp`
 */
function fixSupabaseStorageUrl(value: string): string | null {
  // Match any Supabase host
  const re = /^(https?:\/\/[^/]+\.supabase\.co)\/storage\/v1\/object\/(?!public\/|sign\/)([^?#]+)/;
  const match = re.exec(value);
  if (!match) return null;
  return `${match[1]}/storage/v1/object/public/${match[2]}${value.slice(match[0].length)}`;
}

/**
 * Resolve a stored image reference to a renderable URL.
 *
 * - Empty / null → empty string.
 * - Supabase Storage URL missing `/public/` → rewrite to insert `/public/`.
 * - Any other absolute URL (Unsplash, etc.) → returned unchanged.
 * - Otherwise (bare file path) → converted to a public URL for `bucket`.
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

  // 1) Fix legacy Supabase URLs that were stored without /public/.
  const fixed = fixSupabaseStorageUrl(trimmed);
  if (fixed) return fixed;

  // 2) Any other absolute URL passes through.
  if (isAbsoluteUrl(trimmed)) return trimmed;

  // 3) Bare file path → build the public URL.
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  if (!supabaseUrl) return trimmed;
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${trimmed.replace(/^\//, '')}`;
}
