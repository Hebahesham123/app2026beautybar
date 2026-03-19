"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/supabase";
import { useTheme } from "@/context/ThemeContext";
import { isProductVisibleInStore, normalizeCollectionProductIds } from "@/lib/utils";
import type { Product, Collection } from "@/types";

export function orderProductsByIds<T extends { id: string }>(rows: T[], ids: string[]): T[] {
  const map = new Map(rows.map((r) => [String(r.id), r]));
  return ids.map((id) => map.get(String(id))).filter((x): x is T => x != null);
}

/** Product shelf from home `products`, optionally narrowed by `view_all` → `/collection/slug` + Supabase fetch. */
export function useHomeShelfFromViewAll({
  products,
  collections,
  config,
  builtinsKey,
  defaultProductCount,
  defaultViewAll,
}: {
  products: Product[];
  collections: Collection[];
  config?: Record<string, unknown>;
  builtinsKey: string;
  defaultProductCount: number;
  defaultViewAll: string;
}) {
  const { theme } = useTheme();
  const supabase = useSupabase();
  const [collectionProductsFromDb, setCollectionProductsFromDb] = useState<Product[] | null>(null);

  let sectionConfig: Record<string, unknown> = config || {};
  try {
    if (theme?.home_blocks_json) {
      const blocks = JSON.parse(theme.home_blocks_json);
      sectionConfig = blocks.builtin_sections?.[builtinsKey] || config || {};
    }
  } catch {
    sectionConfig = config || {};
  }

  const count = Math.max(1, Math.min(24, Number(sectionConfig.product_count) || defaultProductCount));
  const viewAllHref = (sectionConfig.view_all as string) || defaultViewAll;

  const selectedCollectionSlug = (() => {
    const m = viewAllHref.trim().match(/^\/collection\/([^?#]+)/i);
    if (!m?.[1]) return "";
    return m[1].trim().replace(/[\s{[<(].*$/, "").replace(/-+$/, "");
  })();

  const selectedCollection = selectedCollectionSlug
    ? collections.find((c) => (c.slug || "").toLowerCase() === selectedCollectionSlug.toLowerCase()) ||
      collections.find(
        (c) =>
          (((c as unknown as Record<string, unknown>).handle as string) || "").toLowerCase() ===
          selectedCollectionSlug.toLowerCase()
      ) ||
      collections.find(
        (c) =>
          c.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ===
          selectedCollectionSlug.toLowerCase()
      ) ||
      null
    : null;

  const productsInSelectedCollection = (() => {
    if (!selectedCollection) return products;
    const raw = selectedCollection as unknown as Record<string, unknown>;
    const ids = normalizeCollectionProductIds(raw.product_ids, raw);
    if (ids.length > 0) {
      const idSet = new Set(ids.map((id) => String(id)));
      const byIds = products.filter((p) => idSet.has(String(p.id)));
      if (byIds.length > 0) return orderProductsByIds(byIds, ids.map(String));
      return [];
    }
    const colId = String(selectedCollection.id);
    return products.filter((p) => p.collection_id != null && String(p.collection_id) === colId);
  })();

  const useCollectionFromViewAll = Boolean(
    /^\/collection\//i.test(viewAllHref.trim()) && selectedCollection
  );

  useEffect(() => {
    if (!supabase || !useCollectionFromViewAll || !selectedCollection) {
      setCollectionProductsFromDb(null);
      return;
    }
    let cancelled = false;
    const col = selectedCollection;
    const raw = col as unknown as Record<string, unknown>;
    const ids = normalizeCollectionProductIds(raw.product_ids, raw);

    const applyRows = (rows: Product[]) => {
      if (cancelled) return;
      let list = rows.filter(isProductVisibleInStore);
      if (ids.length > 0 && list.length > 0) {
        list = orderProductsByIds(list, ids.map(String));
      }
      setCollectionProductsFromDb(list);
    };

    (async () => {
      if (ids.length > 0) {
        const res = await supabase
          .from("products")
          .select("*")
          .in("id", ids)
          .order("created_at", { ascending: false });
        if (cancelled) return;
        if (res.error) {
          setCollectionProductsFromDb([]);
          return;
        }
        let rows = (res.data || []) as Product[];
        if (rows.length === 0) {
          const r2 = await supabase
            .from("products")
            .select("*")
            .eq("collection_id", col.id)
            .order("created_at", { ascending: false });
          if (!cancelled && !r2.error) rows = (r2.data || []) as Product[];
        }
        applyRows(rows);
        return;
      }

      const res = await supabase
        .from("products")
        .select("*")
        .eq("collection_id", col.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (res.error) {
        setCollectionProductsFromDb([]);
        return;
      }
      let rows = (res.data || []) as Product[];
      if (rows.length === 0) {
        const r2 = await supabase
          .from("products")
          .select("*")
          .eq("collection_id", String(col.id))
          .order("created_at", { ascending: false });
        if (!cancelled && !r2.error) rows = (r2.data || []) as Product[];
      }
      applyRows(rows);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, useCollectionFromViewAll, selectedCollection?.id, viewAllHref]);

  const unknownCollectionSlug =
    Boolean(/^\/collection\//i.test(viewAllHref.trim()) && selectedCollectionSlug) &&
    collections.length > 0 &&
    !selectedCollection;

  const pool = unknownCollectionSlug
    ? []
    : useCollectionFromViewAll && collectionProductsFromDb !== null
      ? collectionProductsFromDb
      : useCollectionFromViewAll
        ? productsInSelectedCollection
        : products;

  const items = pool.slice(0, count);

  return { sectionConfig, viewAllHref, items };
}
