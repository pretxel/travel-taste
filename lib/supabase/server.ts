import { createClient } from '@supabase/supabase-js';

function envOrThrow(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is not set`);
  return v;
}

/** Service role client. NEVER ship to the browser. */
export function supabaseServiceRole() {
  return createClient(
    envOrThrow('NEXT_PUBLIC_SUPABASE_URL'),
    envOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );
}
