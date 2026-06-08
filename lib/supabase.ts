import { createClient } from '@supabase/supabase-js';

console.log('🚀 [BUILD_SIGNATURE]: Using Supabase Client Version 2.0  Placeholder Mode Enabled - supabase.ts:3');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key-12345';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('⚠️  Missing Supabase Environment Variables. The app will build but data will not load. - supabase.ts:9');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
