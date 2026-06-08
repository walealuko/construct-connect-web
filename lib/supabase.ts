import { createClient } from '@supabase/supabase-js';

console.log('SUPABASE BUILD DEBUG - supabase.ts:3');
console.log('NEXT_PUBLIC_SUPABASE_URL: - supabase.ts:4', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY: - supabase.ts:5', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'DEFINED' : 'UNDEFINED');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key-12345';

console.log('Final URL passed to createClient: - supabase.ts:10', supabaseUrl);
console.log('Final Key passed to createClient: - supabase.ts:11', supabaseAnonKey);
console.log('');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('⚠️  Missing Supabase Environment Variables. The app will build but data will not load. - supabase.ts:15');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
