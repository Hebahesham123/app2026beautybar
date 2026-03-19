"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabase, type QueryResult } from "@/lib/supabase";
import { dummyPages } from "@/lib/dummy-data";
import type { Page } from "@/types";

export default function PolicyPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const [page, setPage] = useState<Page | null>(null);
  const supabase = useSupabase();

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("pages")
      .select("*")
      .eq("slug", slug)
      .single()
      .then((res: QueryResult<Page>) => {
        const p = res.data as Page | null;
        setPage(p ?? dummyPages.find((x) => x.slug === slug) ?? null);
      });
  }, [supabase, slug]);

  if (!page)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-slate-600">Loading…</p>
        <Link href="/policies" className="link-underline mt-4 inline-block">
          Back to policies
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/policies" className="link-underline mb-6 inline-block text-sm font-medium">
        ← Back to policies
      </Link>
      <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="section-heading mb-6">{page.title}</h1>
        <div
          className="prose prose-slate prose-p:leading-relaxed max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content || "" }}
        />
      </article>
    </div>
  );
}
