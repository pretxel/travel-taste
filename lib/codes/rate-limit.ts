import { createHash } from 'node:crypto';
import { supabaseServiceRole } from '@/lib/supabase/server';

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Records an attempt and returns whether the caller is within the limit.
 * Counts attempts in the last `windowSec` seconds (sliding window).
 */
export async function checkAndRecord(
  bucket: string,
  ipHash: string,
  count: number,
  windowSec: number
): Promise<RateLimitResult> {
  const sb = supabaseServiceRole();
  const since = new Date(Date.now() - windowSec * 1000).toISOString();

  const { data, error } = await sb
    .from('rate_limit_attempts')
    .select('attempted_at')
    .eq('bucket', bucket)
    .eq('ip_hash', ipHash)
    .gte('attempted_at', since)
    .order('attempted_at', { ascending: false });
  if (error) throw error;

  const used = data?.length ?? 0;
  if (used >= count) {
    const oldest = data && data.length ? new Date(data[data.length - 1].attempted_at) : new Date();
    const retry = Math.max(1, Math.ceil((oldest.getTime() + windowSec * 1000 - Date.now()) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec: retry };
  }

  await sb.from('rate_limit_attempts').insert({ bucket, ip_hash: ipHash });

  return { allowed: true, remaining: count - used - 1, retryAfterSec: 0 };
}
