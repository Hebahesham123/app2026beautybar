"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabase } from "@/lib/supabase";
import { dummyCollections } from "@/lib/dummy-data";
import { isCollectionVisibleInStore } from "@/lib/utils";
import type { Collection } from "@/types";

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>(dummyCollections);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("collections")
      .select("*")
      .limit(100)
      .then((res: { data: Collection[] | null; error: { message: string } | null }) => {
        if (res.error) {
          console.warn("[Collections page]", res.error.message);
          setCollections(dummyCollections);
          setLoading(false);
          return;
        }
        const rows = (res.data || []).filter(isCollectionVisibleInStore);
        setCollections(rows.length ? rows : dummyCollections);
        setLoading(false);
      });
  }, [supabase]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-heading mb-2">Collections</h1>
          <p className="text-slate-600">Browse by category. Each card links to that collection.</p>
        </div>
        <Link href="/products" className="text-sm font-semibold text-slate-600 hover:text-slate-900 hover:underline">
          View all products →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        {loading && (
          <p className="col-span-full py-8 text-center text-slate-500">Loading collections…</p>
        )}
        {!loading &&
          collections.map((c) => (
          <Link
            key={c.id}
            href={`/collection/${c.slug}`}
            className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
          >
            {c.banner_image && (
              <img
                src={c.banner_image}
                alt=""
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h2 className="font-semibold text-white drop-shadow">{c.title}</h2>
              {c.description && (
                <p className="mt-1 line-clamp-2 text-sm text-slate-200">{c.description}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
      {!loading && collections.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-500">
          No collections. Create them in Admin.
        </p>
      )}
    </div>
  );
}
