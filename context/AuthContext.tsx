"use client";

import React, { createContext, useContext, useEffect, useMemo, useCallback, useState } from "react";
import { useSupabase } from "@/lib/supabase";

type AuthContextType = {
  user: { id: string; email?: string } | null;
  role: "admin" | "customer" | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [role, setRole] = useState<"admin" | "customer" | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(
    async (uid: string) => {
      if (!supabase) return;
      const { data } = await supabase.from("profiles").select("role").eq("id", uid).single();
      setRole((data?.role as "admin" | "customer") || "customer");
    },
    [supabase]
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then((res: { data: { session: { user: { id: string; email?: string | null } } | null } }) => {
      const session = res.data.session;
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? undefined });
        fetchProfile(session.user.id);
      } else setUser(null), setRole(null);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e: string, session: { user: { id: string; email?: string | null } } | null) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? undefined });
        fetchProfile(session.user.id);
      } else setUser(null), setRole(null);
    });
    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return { error: "Supabase not loaded" };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message };
    },
    [supabase]
  );

  const signUp = useCallback(
    async (email: string, password: string, name?: string) => {
      if (!supabase) return { error: "Supabase not loaded" };
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      if (error) return { error: error.message };
      if (data?.user) {
        await supabase.from("profiles").upsert({ id: data.user.id, role: "customer", name: name ?? null }, { onConflict: "id" });
        // If profiles table doesn't exist (404), signup still succeeds; create table via supabase-profiles-table.sql
      }
      return {};
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  }, [supabase]);

  const value = useMemo(
    () => ({ user, role, loading, signIn, signUp, signOut }),
    [user, role, loading, signIn, signUp, signOut]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
