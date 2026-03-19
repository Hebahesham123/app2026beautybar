"use client";

import { useEffect, useState, useMemo } from "react";
import { useSupabase } from "@/lib/supabase";
import SearchInput from "@/components/admin/SearchInput";
import FilterSelect from "@/components/admin/FilterSelect";
import DataTable from "@/components/admin/DataTable";
import Modal from "@/components/admin/Modal";
import Pagination from "@/components/admin/Pagination";
import type { Product } from "@/types";

const ITEMS_PER_PAGE = 50;

export default function AdminProductsPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [editing, setEditing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const supabase = useSupabase();

  /** Load products: try order by created_at; on error (e.g. missing column), plain select. */
  const loadProducts = () => {
    if (!supabase) return;
    setLoading(true);
    setFetchError(null);
    const finish = (data: Product[] | null, err?: { message: string } | null) => {
      if (err) {
        console.error("[Admin products]", err);
        setFetchError(err.message);
        setAllProducts([]);
        setLoading(false);
        return;
      }
      setAllProducts(data || []);
      setCurrentPage(1);
      setLoading(false);
    };
    supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .then((res: { data: Product[] | null; error: { message: string } | null }) => {
        if (res.error) {
          supabase
            .from("products")
            .select("*")
            .limit(500)
            .then((r2: { data: Product[] | null; error: { message: string } | null }) => {
              finish(r2.data, r2.error);
            });
          return;
        }
        finish(res.data, null);
      });
  };

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(allProducts.map((p) => p.category).filter(Boolean));
    return ["all", ...Array.from(cats)];
  }, [allProducts]);

  // Filter and search products
  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return allProducts.filter((p) => {
      const matchesSearch =
        (p.name ?? "").toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q);

      const matchesCategory =
        categoryFilter === "all" || p.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [allProducts, searchTerm, categoryFilter]);

  // Paginate filtered products
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setFetchError(
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart npm run dev."
      );
      return;
    }
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter]);

  const save = async (p: Partial<Product>) => {
    if (!supabase || !p.name) return;

    try {
      if (editing?.id) {
        await supabase
          .from("products")
          .update({
            name: p.name,
            description: p.description,
            price: p.price,
            category: p.category,
            sku: p.sku,
            status: p.status || "draft",
            updated_at: new Date().toISOString(),
          })
          .eq("id", editing.id);
      } else {
        await supabase.from("products").insert({
          name: p.name,
          description: p.description,
          price: p.price ?? 0,
          category: p.category,
          sku: p.sku,
          status: "active",
        });
      }

      setEditing(null);
      loadProducts();
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!supabase || !confirm("Are you sure you want to delete this product?")) return;

    try {
      await supabase.from("products").delete().eq("id", id);
      loadProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const tableColumns = [
    {
      key: "name" as const,
      label: "Product Name",
      width: "300px",
    },
    {
      key: "sku" as const,
      label: "SKU",
      render: (value: string | null) => value || "—",
    },
    {
      key: "category" as const,
      label: "Category",
      render: (value: string | null) => value || "—",
    },
    {
      key: "price" as const,
      label: "Price",
      render: (value: number) => `$${Number(value).toFixed(2)}`,
    },
    {
      key: "status" as const,
      label: "Status",
      render: (value: string | null) => {
        const statusColor = {
          active: "bg-green-100 text-green-800",
          draft: "bg-yellow-100 text-yellow-800",
          archived: "bg-red-100 text-red-800",
        }[value as string] || "bg-gray-100 text-gray-800";
        return (
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>
            {value ? value.charAt(0).toUpperCase() + value.slice(1) : "Unknown"}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Products</h1>
          <p className="mt-2 text-slate-600">
            Manage your product catalog ({filteredProducts.length} products)
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditing({
              id: "",
              name: "",
              description: "",
              sku: "",
              price: 0,
              category: "",
            } as Product)
          }
          className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700"
        >
          + Add Product
        </button>
      </div>

      {fetchError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Could not load products.</strong> {fetchError}
          <p className="mt-2 text-amber-800">
            In Supabase: <strong>Authentication → Policies</strong> — allow <code className="rounded bg-amber-100 px-1">SELECT</code> on{" "}
            <code className="rounded bg-amber-100 px-1">products</code> for role <code className="rounded bg-amber-100 px-1">anon</code> (and{" "}
            <code className="rounded bg-amber-100 px-1">authenticated</code> if you use login). Or confirm the table name is exactly{" "}
            <code className="rounded bg-amber-100 px-1">products</code>.
          </p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Search Products
            </label>
            <SearchInput
              placeholder="Search by name, SKU or category..."
              onSearch={setSearchTerm}
            />
          </div>
          <FilterSelect
            label="Filter by Category"
            options={categories.map((cat) => ({
              value: cat,
              label: cat === "all" ? "All Categories" : cat,
            }))}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <DataTable
          columns={tableColumns}
          data={paginatedProducts}
          loading={loading}
          actions={(product) => (
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(product)}
                className="text-blue-600 font-medium hover:text-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => deleteProduct(product.id)}
                className="text-red-600 font-medium hover:text-red-700"
              >
                Delete
              </button>
            </div>
          )}
        />
        <Pagination
          currentPage={currentPage}
          totalItems={filteredProducts.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editing}
        title={editing?.id ? "Edit Product" : "Add New Product"}
        onClose={() => setEditing(null)}
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (!editing) return;
                save(editing);
              }}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700"
            >
              Save Product
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
              save(editing);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Product Name *
              </label>
              <input
                required
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter product name"
              />
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
                placeholder="Enter product description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editing.price}
                  onChange={(e) =>
                    setEditing({ ...editing, price: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  SKU
                </label>
                <input
                  value={editing.sku || ""}
                  onChange={(e) => setEditing({ ...editing, sku: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="SKU123"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Category
              </label>
              <input
                value={editing.category || ""}
                onChange={(e) =>
                  setEditing({ ...editing, category: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g., Electronics, Clothing, etc."
              />
            </div>

            <div className="border-t border-slate-200 pt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Product Status
              </label>
              <select
                value={editing.status || "draft"}
                onChange={(e) =>
                  setEditing({ ...editing, status: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="active">Active (Visible in Store)</option>
                <option value="draft">Draft (Hidden)</option>
                <option value="archived">Archived (Inactive)</option>
              </select>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
