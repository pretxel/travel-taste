import { createClient } from '@supabase/supabase-js';

/**
 * Anon client whose every request carries the viewer JWT.
 * Lets RLS see `viewer_code_id` in the JWT claims.
 */
export function supabaseViewerClient(viewerJwt: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('SUPABASE env not set');
  return createClient(url, anon, {
    auth: { persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${viewerJwt}` },
    },
  });
}
