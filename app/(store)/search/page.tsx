"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Search</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) router.push(`/products?q=${encodeURIComponent(q.trim())}`);
        }}
        className="flex gap-2"
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="input-field flex-1"
          autoFocus
        />
        <button type="submit" className="btn-primary shrink-0">
          Search
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-500">
        <Link href="/products" className="text-slate-700 underline hover:text-slate-900">
          Browse all products
        </Link>
      </p>
    </div>
  );
}
