"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSupabase, type QueryResult } from "@/lib/supabase";
import { ProductCard } from "@/components/product/ProductCard";
import { dummyProducts } from "@/lib/dummy-data";
import type { Product } from "@/types";

const PAGE_SIZE = 50;

export default function AllProductsPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [products, setProducts] = useState<Product[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const supabase = useSupabase();

  const loadPage = useCallback(
    (pageOffset: number, append: boolean) => {
      if (!supabase) return;
      const isFirst = pageOffset === 0;
      if (isFirst) setLoading(true);
      else setLoadingMore(true);

      supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .range(pageOffset, pageOffset + PAGE_SIZE - 1)
        .then((res: QueryResult<Product[]>) => {
          const list = res.data || [];
          if (list.length < PAGE_SIZE) setHasMore(false);
          setProducts((prev) => (append ? [...prev, ...list] : list));
        })
        .finally(() => {
          setLoading(false);
          setLoadingMore(false);
        });
    },
    [supabase]
  );

  useEffect(() => {
    if (!supabase) return;
    setLoading(true);
    const term = q.trim();
    let query = supabase.from("products").select("*").order("created_at", { ascending: false }).range(0, PAGE_SIZE - 1);
    if (term) {
      query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`);
    }
    query.then((res: QueryResult<Product[]>) => {
      const list = res.data || [];
      if (list.length > 0) {
        setProducts(list);
        setHasMore(list.length >= PAGE_SIZE);
      } else if (!term) {
        setProducts(dummyProducts.slice(0, PAGE_SIZE));
        setHasMore(dummyProducts.length >= PAGE_SIZE);
      } else {
        setProducts([]);
        setHasMore(false);
      }
    }).finally(() => setLoading(false));
  }, [supabase, q]);

  const handleSeeMore = useCallback(() => {
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    loadPage(nextOffset, true);
  }, [offset, loadPage]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-heading">{q ? `Search: "${q}"` : "All products"}</h1>
          <p className="mt-1 text-slate-600">{q ? "Results for your search." : "Browse all products. Load more to see the next 50."}</p>
        </div>
        <Link href="/collections" className="text-sm font-semibold text-slate-600 hover:text-slate-900 hover:underline">
          Browse by collection →
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {products.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-500">
              No products yet. Add products in Admin or sync from Shopify.
            </p>
          )}
          {hasMore && products.length > 0 && (
            <div className="mt-12 flex justify-center">
              <button
                type="button"
                onClick={handleSeeMore}
                disabled={loadingMore}
                className="btn-primary min-w-[200px] disabled:opacity-70"
              >
                {loadingMore ? "Loading…" : "See more (next 50)"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
