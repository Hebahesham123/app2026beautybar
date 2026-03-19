"use client";

import Link from "next/link";

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-center">
      <span className="text-5xl text-slate-300">♡</span>
      <h1 className="mt-4 text-xl font-semibold text-slate-900">Wishlist</h1>
      <p className="mt-2 text-sm text-slate-600">
        Save items you love here. Coming soon.
      </p>
      <Link href="/products" className="btn-primary mt-6 inline-block">
        Shop products
      </Link>
    </div>
  );
}
