import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Provide your Supabase project URL and anon key via environment variables.
// In Expo you can use app.config.js or a .env solution. For now set them in your environment.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://exfuhexaeskkijqzkchz.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4ZnVoZXhhZXNra2lqcXprY2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMDE2NzIsImV4cCI6MjA3OTc3NzY3Mn0.uD2bNS0y_5NgtAmgxfoUEEKEElJAn6f4PFpemJYpr4E';

if (SUPABASE_URL.includes('<YOUR') || SUPABASE_ANON_KEY.includes('<YOUR')) {
  console.warn('Supabase URL or anon key not set. Set SUPABASE_URL and SUPABASE_ANON_KEY in environment.');
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, detectSessionInUrl: false },
});

export default supabase;
