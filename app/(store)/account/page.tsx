"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useSupabase, type QueryResult } from "@/lib/supabase";
import type { Order } from "@/types";

export default function AccountPage() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const supabase = useSupabase();

  useEffect(() => {
    if (!user || !supabase) return;
    supabase
      .from("order")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then((res: QueryResult<Order[]>) => setOrders(res.data || []));
  }, [user, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const fn = mode === "login" ? signIn : signUp;
    const res = await fn(email, password, name);
    if (res.error) setError(res.error);
  };

  if (loading)
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">Loading...</div>
    );

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-2xl font-semibold">
          {mode === "login" ? "Login" : "Register"}
        </h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 py-2 text-white"
          >
            Submit
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="mt-4 text-sm text-sky-600"
        >
          {mode === "login" ? "Create account" : "Back to login"}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Account</h1>
      <p className="text-slate-600">{user.email}</p>
      <button
        type="button"
        onClick={() => signOut()}
        className="mt-4 rounded border px-4 py-2 text-sm"
      >
        Sign out
      </button>
      <h2 className="mt-8 text-lg font-medium">Orders</h2>
      <ul className="mt-4 space-y-2">
        {orders.map((o) => (
          <li key={o.id} className="flex justify-between rounded border p-3">
            <Link href={`/order/${o.id}`} className="text-sky-600">
              #{o.id.slice(0, 8)}
            </Link>
            <span>
              ${Number(o.total).toFixed(2)} — {o.status}
            </span>
          </li>
        ))}
      </ul>
      {orders.length === 0 && <p className="text-slate-500">No orders yet.</p>}
    </div>
  );
}
