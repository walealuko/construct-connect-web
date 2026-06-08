import { supabase } from '@/lib/supabase';

/**
 * Artisan Service
 * Fetches professional construction services from Supabase profiles
 */

export const getArtisans = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*');

  if (error) throw error;

  return (data || []).map(profile => ({
    id: profile.id,
    name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Artisan',
    category: profile.category || 'General',
    skills: profile.skills || [],
    rate: profile.rate || 'Contact for rate',
    image: profile.image || '/assets/artisan-default.jpg',
    location: profile.location || 'Unknown',
    bio: profile.bio || 'Professional artisan providing quality services.',
  }));
};

export const getArtisanById = async (id: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) throw new Error("Artisan not found");

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
    .eq('category', category);

  if (error) throw error;

  return (data || []).map(profile => ({
    id: profile.id,
    name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Artisan',
    category: profile.category || 'General',
    skills: profile.skills || [],
    rate: profile.rate || 'Contact for rate',
    image: profile.image || '/assets/artisan-default.jpg',
    location: profile.location || 'Unknown',
    bio: profile.bio || 'Professional artisan providing quality services.',
  }));
};
