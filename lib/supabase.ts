"use client";

import { useState, useEffect } from "react";

/** Reads Supabase credentials from `.env`, `.env.local`, etc. (Next.js injects NEXT_PUBLIC_* at build time). */
function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

let warnedMissingEnv = false;

function createSupabaseClient() {
  if (typeof window === "undefined") return null;
  const cfg = getSupabaseEnv();
  if (!cfg) {
    if (process.env.NODE_ENV === "development" && !warnedMissingEnv) {
      warnedMissingEnv = true;
      console.warn(
        "[Supabase] Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.example). Using demo data until configured."
      );
    }
    return null;
  }
  try {
    const { createClient } = require("@supabase/supabase-js");
    return createClient(cfg.url, cfg.anonKey);
  } catch {
    return null;
  }
}

export type SupabaseClient = ReturnType<typeof createSupabaseClient>;

/** Use for .then() callbacks to avoid implicit any on destructured { data } */
export type QueryResult<T> = { data: T | null };

export function useSupabase() {
  const [sb, setSb] = useState<SupabaseClient>(null);
  useEffect(() => {
    setSb(createSupabaseClient());
  }, []);
  return sb;
}

/** True when both URL and anon key are set in env (`.env`, `.env.local`, etc.). */
export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}

/**
 * PostgREST `.or()` filter for storefront product lists.
 * Includes `active`, `published`, and rows with no status (NULL) so imports / legacy data still show.
 */
export const STOREFRONT_PRODUCT_STATUS_FILTER =
  "status.eq.active,status.eq.published,status.is.null";

/** Collections on the store: active OR legacy rows with is_active NULL. */
export const STOREFRONT_COLLECTION_ACTIVE_FILTER =
  "is_active.eq.true,is_active.is.null";
