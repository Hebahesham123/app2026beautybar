"use client";

import { useEffect, useState, useMemo } from "react";
import { useSupabase, type QueryResult } from "@/lib/supabase";
import { ProductCard } from "@/components/product/ProductCard";
import { dummyProducts, dummyCollections } from "@/lib/dummy-data";
import { normalizeCollectionProductIds } from "@/lib/utils";
import type { Product, Collection } from "@/types";

export default function CollectionPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const [collection, setCollection] = useState<Collection | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const supabase = useSupabase();

  // Step 1: Find the collection by slug, handle, or title
  useEffect(() => {
    if (!supabase) return;
    const titleFromSlug = slug.replace(/-/g, " ");

    supabase.from("collections").select("*").then((res: QueryResult<Collection[]>) => {
      const all = (res.data as Collection[] | null) || [];
      const found =
        all.find((c) => c.slug === slug) ||
        all.find((c) => (c as unknown as Record<string, string>).handle === slug) ||
        all.find((c) => c.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-") === slug) ||
        all.find((c) => c.title?.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === titleFromSlug.toLowerCase());
      setCollection(found ?? dummyCollections.find((x) => x.slug === slug) ?? null);
    });
  }, [supabase, slug]);

  // Step 2: Fetch products using collection.product_ids array
  useEffect(() => {
    if (!supabase || !collection) return;

    if (collection.id.startsWith("col-")) {
      setProducts(dummyProducts);
      return;
    }

    const colRaw = collection as unknown as Record<string, unknown>;
    const productIds = normalizeCollectionProductIds(colRaw.product_ids, colRaw);

    if (productIds.length > 0) {
      supabase
        .from("products")
        .select("*")
        .in("id", productIds)
        .order("created_at", { ascending: false })
        .then((res: QueryResult<Product[]>) => {
          setProducts(res.data || []);
        });
      return;
    }

    supabase
      .from("products")
      .select("*")
      .eq("collection_id", collection.id)
      .order("created_at", { ascending: false })
      .then((res: QueryResult<Product[]> & { error?: unknown }) => {
        setProducts(res.error ? [] : res.data || []);
      });
  }, [supabase, collection]);

  const filtered = useMemo(() => {
    let list = products;
    if (search) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (sort === "price_asc") list = [...list].sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "price_desc") list = [...list].sort((a, b) => Number(b.price) - Number(a.price));
    return list;
  }, [products, search, sort]);

  const c = collection;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {c?.banner_image && (
        <img src={c.banner_image} alt="" className="mb-6 h-40 w-full rounded-lg object-cover" />
      )}
      <h1 className="text-2xl font-semibold">{c?.title ?? slug.replace(/-/g, " ")}</h1>
      {c?.description && (
        c.description.includes("<")
          ? <div className="mt-2 text-slate-600 prose max-w-none" dangerouslySetInnerHTML={{ __html: c.description }} />
          : <p className="mt-2 text-slate-600">{c.description}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-4">
        <input
          type="search"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded border px-3 py-2"
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded border px-3 py-2">
          <option value="newest">Newest</option>
          <option value="price_asc">Price low to high</option>
          <option value="price_desc">Price high to low</option>
        </select>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {filtered.length === 0 && collection && (
        <p className="mt-8 text-center text-slate-400">No products found for this collection.</p>
      )}
    </div>
  );
}
