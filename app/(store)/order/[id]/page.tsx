"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabase, type QueryResult } from "@/lib/supabase";
import type { Order } from "@/types";

export default function OrderConfirmationPage({ params }: { params: { id: string } }) {
  const orderId = params.id;
  const [order, setOrder] = useState<Order | null>(null);
  const supabase = useSupabase();

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("order")
      .select("*")
      .eq("id", orderId)
      .single()
      .then((res: QueryResult<Order>) => setOrder(res.data as Order));
  }, [supabase, orderId]);

  if (!order)
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-slate-600">Loading order…</p>
        <Link href="/" className="link-underline mt-4 inline-block">Home</Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="section-heading text-green-700">Order confirmed</h1>
        <p className="mt-2 text-slate-600">Thank you for your purchase.</p>
        <p className="mt-4 font-mono text-sm text-slate-500">Order #{order.id.slice(0, 8)}</p>
        <p className="mt-2 text-xl font-bold">Total: ${Number(order.total).toFixed(2)}</p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/" className="btn-primary">
            Continue shopping
          </Link>
          <Link href="/account" className="btn-secondary">
            View orders
          </Link>
        </div>
      </div>
    </div>
  );
}
