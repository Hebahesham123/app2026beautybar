"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabase, type QueryResult } from "@/lib/supabase";
import { dummyPages } from "@/lib/dummy-data";
import type { Page } from "@/types";

export default function PoliciesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const supabase = useSupabase();

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("pages")
      .select("*")
      .eq("type", "policy")
      .then((res: QueryResult<Page[]>) => {
        setPages(res.data?.length ? res.data : dummyPages);
      });
  }, [supabase]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="section-heading mb-2">Policies</h1>
      <p className="mb-10 text-slate-600">Shipping, returns, privacy, and terms. Click any link to read.</p>
      <ul className="space-y-3">
        {pages.map((p) => (
          <li key={p.id}>
            <Link
              href={`/policy/${p.slug}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 font-medium text-slate-900 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              {p.title}
              <span className="text-slate-400">→</span>
            </Link>
          </li>
        ))}
      </ul>
      {pages.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-500">
          No policy pages yet.
        </p>
      )}
    </div>
  );
}
