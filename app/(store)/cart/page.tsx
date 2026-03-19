"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useSupabase } from "@/lib/supabase";
import { slugify, getProductImageUrl } from "@/lib/utils";
import type { Discount } from "@/types";

export default function CartPage() {
  const { items, updateQty, remove, total } = useCart();
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [applied, setApplied] = useState(false);
  const router = useRouter();
  const supabase = useSupabase();

  const applyDiscount = useCallback(async () => {
    if (!discountCode.trim() || !supabase) return;
    const { data } = await supabase
      .from("discounts")
      .select("*")
      .eq("code", discountCode.trim().toUpperCase())
      .eq("active", true)
      .single();
    setDiscount(data as Discount);
    setApplied(true);
  }, [discountCode, supabase]);

  const discountAmount = useMemo(() => {
    if (!discount) return 0;
    if (discount.type === "percent") return (total * discount.value) / 100;
    return Math.min(discount.value, total);
  }, [discount, total]);

  const finalTotal = Math.max(0, total - discountAmount);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
          <h1 className="section-heading text-xl">Your cart is empty</h1>
          <p className="mt-2 text-slate-600">Add items from the shop to get started.</p>
          <Link href="/collections" className="btn-primary mt-6 inline-flex">
            Shop collections
          </Link>
          <Link href="/" className="btn-secondary mt-3 ml-3 inline-flex">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="section-heading mb-8">Cart</h1>
      <div className="space-y-4">
        {items.map((item) => {
          const p = item.product;
          const name = p?.name || "Product";
          const slug = p?.slug || (p?.name ? slugify(p.name) : "#");
          const lineKey = `${item.product_id}-${item.variant_id ?? "base"}`;
          return (
            <div
              key={lineKey}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-nowrap"
            >
              <Link href={`/product/${slug}`} className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {p && getProductImageUrl(p) ? (
                  <img src={getProductImageUrl(p)!} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl">📦</div>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/product/${slug}`} className="font-semibold text-slate-900 hover:underline">
                  {name}
                  {item.variant_title ? ` — ${item.variant_title}` : ""}
                </Link>
                <p className="text-sm text-slate-600">
                  ${item.price_snapshot.toFixed(2)} × {item.qty}
                </p>
              </div>
              <input
                type="number"
                min={1}
                value={item.qty}
                onChange={(e) => updateQty(item.product_id, Number(e.target.value) || 1, item.variant_id)}
                className="input-field w-20 text-center"
              />
              <button
                type="button"
                onClick={() => remove(item.product_id, item.variant_id)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Discount code"
          value={discountCode}
          onChange={(e) => setDiscountCode(e.target.value)}
          className="input-field max-w-[200px]"
        />
        <button type="button" onClick={applyDiscount} className="btn-secondary py-3">
          Apply
        </button>
        {applied &&
          (discount ? (
            <span className="text-sm font-medium text-green-600">Code applied</span>
          ) : (
            <span className="text-sm text-slate-500">Invalid code</span>
          ))}
      </div>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Subtotal: ${total.toFixed(2)}</p>
        {discountAmount > 0 && <p className="text-green-600">Discount: -${discountAmount.toFixed(2)}</p>}
        <p className="mt-2 text-xl font-bold">Total: ${finalTotal.toFixed(2)}</p>
        <button
          type="button"
          onClick={() => router.push("/checkout")}
          className="btn-primary mt-6 w-full sm:w-auto"
        >
          Proceed to checkout
        </button>
        <Link href="/collections" className="btn-secondary mt-3 inline-flex sm:ml-3">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
