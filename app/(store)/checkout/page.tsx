"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useSupabase } from "@/lib/supabase";
import { CART_KEY } from "@/context/CartContext";

export default function CheckoutPage() {
  const { items, total } = useCart();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "paid">("cod");
  const [placing, setPlacing] = useState(false);
  const router = useRouter();
  const supabase = useSupabase();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  const placeOrder = async () => {
    if (!supabase || items.length === 0) return;
    setPlacing(true);
    const address_json = { address, city };
    const subtotal = total;
    const shipping_fee = 0;
    const discount_amount = 0;
    const orderTotal = subtotal + shipping_fee - discount_amount;
    const notes = JSON.stringify({
      customer_name: name,
      phone,
      email,
      address_json,
      payment_method: paymentMethod,
    });

    let oid: string | null = null;
    const { data: orderData, error: orderError } = await supabase
      .from("order")
      .insert({
        customer_id: null,
        user_id: user?.id || null,
        customer_name: name,
        phone,
        email,
        address_json,
        subtotal,
        discount_code: null,
        discount_amount,
        shipping_fee,
        total: orderTotal,
        payment_method: paymentMethod,
        status: "pending",
        notes,
      })
      .select("id")
      .single();

    if (!orderError && orderData?.id) oid = orderData.id;
    else {
      const { data: alt, error: altErr } = await supabase
        .from("order")
        .insert({ customer_id: null, status: "pending", total: orderTotal, notes })
        .select("id")
        .single();
      if (!altErr && alt?.id) oid = alt.id;
    }

    if (oid) {
      try {
        for (const item of items) {
          const title = item.product?.name || "Product";
          const titleWithVariant = item.variant_title ? `${title} — ${item.variant_title}` : title;
          await supabase.from("order_items").insert({
            order_id: oid,
            product_id: item.product_id,
            title_snapshot: titleWithVariant,
            qty: item.qty,
            price_snapshot: item.price_snapshot,
          });
        }
      } catch {}
      if (typeof window !== "undefined") window.localStorage.removeItem(CART_KEY);
      router.push(`/order/${oid}`);
    }
    setPlacing(false);
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <Link href="/cart" className="mt-4 inline-block text-sky-600">
          Back to cart
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <form
        className="mt-6 grid gap-6 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          placeOrder();
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
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
            <label className="block text-sm font-medium">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Payment</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as "cod" | "paid")}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              <option value="cod">Cash on delivery</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
        <div>
          <div className="rounded-lg border p-4">
            <p className="font-medium">Order summary</p>
            <p className="mt-2 text-slate-600">
              {items.length} items — ${total.toFixed(2)}
            </p>
          </div>
          <button
            type="submit"
            disabled={placing}
            className="mt-6 w-full rounded-lg bg-slate-900 py-3 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {placing ? "Placing order..." : "Place order"}
          </button>
        </div>
      </form>
    </div>
  );
}
