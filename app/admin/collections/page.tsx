"use client";

import { useEffect, useState, useMemo } from "react";
import { useSupabase } from "@/lib/supabase";
import SearchInput from "@/components/admin/SearchInput";
import DataTable from "@/components/admin/DataTable";
import Modal from "@/components/admin/Modal";
import Pagination from "@/components/admin/Pagination";
import { normalizeCollectionProductIds } from "@/lib/utils";
import type { Collection } from "@/types";

const ITEMS_PER_PAGE = 50;

export default function AdminCollectionsPage() {
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const supabase = useSupabase();

  const loadCollections = () => {
    if (!supabase) return;
    setLoading(true);
    setFetchError(null);
    const finish = (
      data: Collection[] | null,
      err?: { message: string } | null,
      productRows?: { id: string; collection_id?: string | null }[] | null,
      productsErr?: { message: string } | null
    ) => {
      if (err) {
        console.error("[Admin collections]", err);
        setFetchError(err.message);
        setAllCollections([]);
        setLoading(false);
        return;
      }
      if (productsErr) {
        console.warn("[Admin collections] products (for collection_id merge):", productsErr.message);
      }
      const byCollectionId = new Map<string, string[]>();
      if (!productsErr && productRows?.length) {
        for (const p of productRows) {
          const cid = p.collection_id != null && p.collection_id !== "" ? String(p.collection_id) : "";
          if (!cid) continue;
          const list = byCollectionId.get(cid) ?? [];
          list.push(String(p.id));
          byCollectionId.set(cid, list);
        }
      }
      const rows = (data || []).map((row) => {
        const rec = row as Record<string, unknown>;
        const id = String((row as Collection).id);
        const fromArray = normalizeCollectionProductIds(rec.product_ids, rec);
        const fromFk = byCollectionId.get(id) ?? [];
        const merged = [...new Set([...fromArray, ...fromFk])];
        return {
          ...row,
          id,
          title: (row as Collection).title ?? "",
          slug: (row as Collection).slug ?? "",
          is_active: (row as Collection).is_active !== false,
          product_ids: merged,
        } as Collection;
      });
      setAllCollections(rows);
      setCurrentPage(1);
      setLoading(false);
    };
    Promise.all([
      supabase.from("collections").select("*").limit(500),
      supabase.from("products").select("id, collection_id").limit(8000),
    ])
      .then(([colRes, prodRes]) => {
        finish(
          colRes.data as Collection[] | null,
          colRes.error,
          (prodRes.data as { id: string; collection_id?: string | null }[] | null) ?? null,
          prodRes.error
        );
      })
      .catch((e: unknown) => {
        finish(null, { message: e instanceof Error ? e.message : String(e) });
      });
  };

  // Filter and search collections
  const filteredCollections = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return allCollections.filter((collection) => {
      return (
        (collection.title ?? "").toLowerCase().includes(q) ||
        (collection.slug ?? "").toLowerCase().includes(q)
      );
    });
  }, [allCollections, searchTerm]);

  // Paginate filtered collections
  const paginatedCollections = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredCollections.slice(startIndex, endIndex);
  }, [filteredCollections, currentPage]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setFetchError(
        "Supabase client not ready. Put NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (project root), then restart npm run dev."
      );
      return;
    }
    setFetchError(null);
    loadCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const saveCollection = async (collection: Partial<Collection>) => {
    if (!supabase || !collection.title || !collection.slug) return;

    try {
      const productIds = normalizeCollectionProductIds(collection.product_ids);
      const baseUpdate = {
        title: collection.title,
        slug: collection.slug,
        description: collection.description,
        banner_image: collection.banner_image,
        is_active: collection.is_active,
        updated_at: new Date().toISOString(),
      };
      const baseInsert = {
        title: collection.title,
        slug: collection.slug,
        description: collection.description || "",
        banner_image: collection.banner_image || null,
        is_active: collection.is_active ?? true,
      };

      if (editing?.id) {
        let { error } = await supabase
          .from("collections")
          .update(
            productIds.length > 0 ? { ...baseUpdate, product_ids: productIds } : { ...baseUpdate, product_ids: [] }
          )
          .eq("id", editing.id);
        if (
          error &&
          (/product_ids|schema cache|column/i.test(error.message) || error.code === "PGRST204")
        ) {
          ({ error } = await supabase.from("collections").update(baseUpdate).eq("id", editing.id));
        }
        if (error) throw error;
      } else {
        let { error } = await supabase
          .from("collections")
          .insert(productIds.length > 0 ? { ...baseInsert, product_ids: productIds } : baseInsert);
        if (
          error &&
          (/product_ids|schema cache|column/i.test(error.message) || error.code === "PGRST204")
        ) {
          ({ error } = await supabase.from("collections").insert(baseInsert));
        }
        if (error) throw error;
      }

      setEditing(null);
      loadCollections();
    } catch (error) {
      console.error("Error saving collection:", error);
      alert(error instanceof Error ? error.message : "Save failed — check table collections and RLS in Supabase.");
    }
  };

  const deleteCollection = async (id: string) => {
    if (!supabase || !confirm("Are you sure you want to delete this collection?")) return;

    try {
      await supabase.from("collections").delete().eq("id", id);
      loadCollections();
    } catch (error) {
      console.error("Error deleting collection:", error);
    }
  };

  const tableColumns = [
    {
      key: "title" as const,
      label: "Collection Name",
      width: "250px",
    },
    {
      key: "slug" as const,
      label: "URL Path",
      render: (value: string) => `/collection/${value}`,
    },
    {
      key: "is_active" as const,
      label: "Status",
      render: (value: boolean) => (
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
            value ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-800"
          }`}
        >
          {value ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Collections</h1>
          <p className="mt-2 text-slate-600">
            Organize products into collections ({filteredCollections.length} collections)
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditing({
              id: "",
              title: "",
              slug: "",
              description: null,
              banner_image: null,
              is_active: true,
              product_ids: [],
            } as Collection)
          }
          className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700"
        >
          + Add Collection
        </button>
      </div>

      {fetchError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Could not load collections.</strong> {fetchError}
          <p className="mt-2 text-amber-800">
            In Supabase: allow <code className="rounded bg-amber-100 px-1">SELECT</code> on{" "}
            <code className="rounded bg-amber-100 px-1">collections</code> for <code className="rounded bg-amber-100 px-1">anon</code>. If saves fail, add column{" "}
            <code className="rounded bg-amber-100 px-1">product_ids</code> as <code className="rounded bg-amber-100 px-1">uuid[]</code> or{" "}
            <code className="rounded bg-amber-100 px-1">jsonb</code> (array of UUID strings).
          </p>
        </div>
      )}

      {!loading && !fetchError && allCollections.length === 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
          <strong>Connected — 0 collections in the database.</strong> Either add rows here with{" "}
          <strong>+ Add Collection</strong>, or open Supabase → <strong>Table Editor</strong> → table{" "}
          <code className="rounded bg-blue-100 px-1">collections</code>. If the table is missing, create it (see README)
          or run SQL to create <code className="rounded bg-blue-100 px-1">collections</code> with columns{" "}
          <code className="rounded bg-blue-100 px-1">title</code>, <code className="rounded bg-blue-100 px-1">slug</code>,{" "}
          <code className="rounded bg-blue-100 px-1">is_active</code>.
        </div>
      )}

      {/* Search */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Search Collections
        </label>
        <SearchInput
          placeholder="Search by title or slug..."
          onSearch={setSearchTerm}
        />
      </div>

      {/* Collections Table */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <DataTable
          columns={tableColumns as any[]}
          data={paginatedCollections}
          loading={loading}
          actions={(collection) => (
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(collection)}
                className="text-blue-600 font-medium hover:text-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => deleteCollection(collection.id)}
                className="text-red-600 font-medium hover:text-red-700"
              >
                Delete
              </button>
            </div>
          )}
        />
        <Pagination
          currentPage={currentPage}
          totalItems={filteredCollections.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editing}
        title={editing?.id ? "Edit Collection" : "Add New Collection"}
        onClose={() => setEditing(null)}
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (!editing) return;
                saveCollection(editing);
              }}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700"
            >
              Save Collection
            </button>
            <button
              onClick={() => setEditing(null)}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        }
      >
        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveCollection(editing);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Collection Name *
              </label>
              <input
                required
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter collection name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Slug (URL) *
              </label>
              <input
                required
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm"
                placeholder="summer-collection"
              />
              <p className="mt-1 text-xs text-slate-500">
                URL will be: /collection/{editing.slug}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={editing.description || ""}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter collection description"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Banner Image URL
              </label>
              <input
                value={editing.banner_image || ""}
                onChange={(e) =>
                  setEditing({ ...editing, banner_image: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={editing.is_active ?? true}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                className="rounded border-slate-300"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                Active
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Product IDs (optional)
              </label>
              <textarea
                value={normalizeCollectionProductIds(editing.product_ids).join("\n")}
                onChange={(e) => {
                  const ids = e.target.value
                    .split(/[\s,]+/)
                    .map((s) => s.trim())
                    .filter(Boolean);
                  setEditing({ ...editing, product_ids: ids.length ? ids : [] });
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="One product UUID per line (Supabase → Table Editor → products → id)"
                rows={4}
              />
              <p className="mt-1 text-xs text-slate-500">
                Powers which products show on <code className="rounded bg-slate-100 px-1">/collection/your-slug</code>.
              </p>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
