import { supabase } from '@/lib/supabase';

/**
 * Artisan Service
 * Fetches professional construction services from Supabase profiles
 *
 * IMPORTANT: every read filters on `tier` to scope the result to
 * actual artisans. Without that filter the previous version pulled
 * every profile row in the table — buyers, sellers, admins — and
 * surfaced them in the artisan listing. Profiles with no skills,
 * no category, and a name like "First Last" would show up next to
 * the real electricians and plumbers.
 *
 * Filter is on the query so it works whether RLS is open or not —
 * the RLS policies on profiles might let an authenticated user see
 * a wider set of rows in some other context (e.g. an admin viewing
 * all profiles), and we don't want that wider set leaking into the
 * public-facing artisan directory.
 */

// `tier in ('artisan', 'business')` is intentional: sellers who
// also offer installation services are valid artisans from the
// buyer's perspective, and a seller's profile is the same row as
// their business profile. The migration that defines `tier` (0006)
// allows both values.
const ARTISAN_TIERS = ['artisan', 'business'] as const;

export const getArtisans = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('tier', [...ARTISAN_TIERS]);

  if (error) throw error;

  return (data || []).map(profile => ({
    id: profile.id,
    name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Artisan',
    category: profile.category || 'General',
    skills: profile.skills || [],
    rate: profile.rate || 'Contact for rate',
    image: profile.image || 'https://placehold.co/400x400?text=Artisan',
    location: profile.location || 'Unknown',
    bio: profile.bio || 'Professional artisan providing quality services.',
  }));
};

export const getArtisanById = async (id: string) => {
  // `tier` is in the WHERE so the get-by-id path is also scoped —
  // /artisans/<buyer-id> used to return the buyer's profile rendered
  // as an artisan. We surface a "not found" rather than leaking
  // the row, even though RLS would technically allow the read.
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .in('tier', [...ARTISAN_TIERS])
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Artisan not found");

  return {
    id: data.id,
    name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown Artisan',
    category: data.category || 'General',
    skills: data.skills || [],
    rate: data.rate || 'Contact for rate',
    image: data.image || '/assets/artisan-default.jpg',
    location: data.location || 'Unknown',
    bio: data.bio || 'Professional artisan providing quality services.',
  };
};

export const getArtisansByCategory = async (category: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('tier', [...ARTISAN_TIERS])
    .eq('category', category);

  if (error) throw error;

  return (data || []).map(profile => ({
    id: profile.id,
    name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Artisan',
    category: profile.category || 'General',
    skills: profile.skills || [],
    rate: profile.rate || 'Contact for rate',
    image: profile.image || 'https://placehold.co/400x400?text=Artisan',
    location: profile.location || 'Unknown',
    bio: profile.bio || 'Professional artisan providing quality services.',
  }));
};
