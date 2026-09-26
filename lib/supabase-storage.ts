import { createClient } from "@supabase/supabase-js";

export function getSupabaseStorageClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  try {
    return createClient(url, key);
  } catch (err) {
    console.error("Failed to create Supabase storage client:", err);
    return null;
  }
}

export const supabaseStorage = new Proxy({} as any, {
  get(_, prop) {
    const client = getSupabaseStorageClient();
    if (!client) {
      throw new Error("Supabase URL and Key must be provided in environment variables.");
    }
    return (client as any)[prop];
  },
});