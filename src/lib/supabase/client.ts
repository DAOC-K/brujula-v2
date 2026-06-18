"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL en .env.local");
  }

  if (!supabaseAnonKey) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
