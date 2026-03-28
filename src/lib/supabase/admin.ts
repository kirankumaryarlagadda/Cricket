import { createClient } from '@supabase/supabase-js';

/**
 * Admin Supabase client that bypasses Row Level Security.
 * Only use on the server side (API routes, scripts, server actions).
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
