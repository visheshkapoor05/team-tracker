import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role client that bypasses RLS entirely. Only ever import this from
 * server-side code (API route handlers) — never from a Client Component, and
 * never send SUPABASE_SERVICE_ROLE_KEY to the browser.
 *
 * Used specifically for the handful of writes that are legitimately
 * cross-user (e.g. Emma's comment creating a notification addressed to
 * Maya) and therefore can't be expressed as "the acting user's own row"
 * under RLS. Every other read/write should go through
 * src/lib/supabase/server.ts instead, so RLS still applies.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
