"use client";

import { useEffect, useState, useMemo } from "react";
import { useSupabase, type QueryResult } from "@/lib/supabase";
import SearchInput from "@/components/admin/SearchInput";
import FilterSelect from "@/components/admin/FilterSelect";
import DataTable from "@/components/admin/DataTable";
import Modal from "@/components/admin/Modal";
import type { Discount } from "@/types";

export default function AdminDiscountsPage() {
  const [allDiscounts, setAllDiscounts] = useState<Discount[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editing, setEditing] = useState<Discount | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();

  // Filter and search discounts
  const filteredDiscounts = useMemo(() => {
    return allDiscounts.filter((discount) => {
      const matchesSearch = (discount.code || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || discount.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [allDiscounts, searchTerm, typeFilter]);

  useEffect(() => {
    if (!supabase) return;
    loadDiscounts();
  }, [supabase]);

  const loadDiscounts = () => {
    if (!supabase) return;
    setLoading(true);
    try {
      supabase
        .from("discounts")
        .select("*")
        .order("created_at", { ascending: false })
        .then((res: QueryResult<Discount[]>) => {
          // DB stores the code in "title" column (Shopify sync)
          const mapped = (res.data || []).map((d: Discount & { title?: string }) => ({
            ...d,
            code: d.code || d.title || "",
          }));
          setAllDiscounts(mapped);
          setLoading(false);
        });
    } catch {
      setAllDiscounts([]);
      setLoading(false);
    }
  };

  const saveDiscount = async (discount: Partial<Discount>) => {
    if (!supabase || !discount.code || !discount.type || discount.value === undefined)
      return;

    try {
      if (editing?.id) {
        await supabase
          .from("discounts")
          .update({
            title: discount.code,
            type: discount.type,
            value: discount.value,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editing.id);
      } else {
        await supabase.from("discounts").insert({
          title: discount.code,
          type: discount.type,
          value: discount.value,
        });
      }

      setEditing(null);
      loadDiscounts();
    } catch (error) {
      console.error("Error saving discount:", error);
    }
  };

  const deleteDiscount = async (id: string) => {
    if (!supabase || !confirm("Are you sure you want to delete this discount?")) return;

    try {
      await supabase.from("discounts").delete().eq("id", id);
      loadDiscounts();
    } catch (error) {
      console.error("Error deleting discount:", error);
    }
  };

  const tableColumns = [
    {
      key: "code" as const,
      label: "Discount Code",
      width: "150px",
      render: (value: string) => <span className="font-mono font-semibold">{value}</span>,
    },
    {
      key: "type" as const,
      label: "Type",
      render: (value: "percent" | "fixed") => (
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
            value === "percent"
              ? "bg-blue-100 text-blue-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {value === "percent" ? "% Percentage" : "$ Fixed"}
        </span>
      ),
    },
    {
      key: "value" as const,
      label: "Value",
      render: (value: number, row: Discount) =>
        row.type === "percent" ? `${value}%` : `$${value.toFixed(2)}`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Discounts</h1>
          <p className="mt-2 text-slate-600">
            Manage discount codes ({filteredDiscounts.length} discounts)
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditing({
              id: "",
              code: "",
              type: "percent",
              value: 0,
            } as Discount)
          }
          className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700"
        >
          + Add Discount
        </button>
      </div>

      {/* Search and Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Search Discounts
            </label>
            <SearchInput
              placeholder="Search by discount code..."
              onSearch={setSearchTerm}
            />
          </div>
          <FilterSelect
            label="Filter by Type"
            options={[
              { value: "all", label: "All Types" },
              { value: "percent", label: "Percentage" },
              { value: "fixed", label: "Fixed Amount" },
            ]}
            value={typeFilter}
            onChange={setTypeFilter}
          />
        </div>
      </div>

      {/* Discounts Table */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <DataTable
          columns={tableColumns}
          data={filteredDiscounts}
          loading={loading}
          actions={(discount) => (
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(discount)}
                className="text-blue-600 font-medium hover:text-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => deleteDiscount(discount.id)}
                className="text-red-600 font-medium hover:text-red-700"
              >
                Delete
              </button>
            </div>
          )}
        />
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editing}
        title={editing?.id ? "Edit Discount" : "Add New Discount"}
        onClose={() => setEditing(null)}
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (!editing) return;
                saveDiscount(editing);
              }}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700"
            >
              Save Discount
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
              saveDiscount(editing);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Discount Code *
              </label>
              <input
                required
                value={editing.code}
                onChange={(e) =>
                  setEditing({ ...editing, code: e.target.value.toUpperCase() })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="SUMMER20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Discount Type *
              </label>
              <select
                required
                value={editing.type}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    type: e.target.value as "percent" | "fixed",
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Value *
              </label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={editing.value}
                onChange={(e) =>
                  setEditing({ ...editing, value: Number(e.target.value) })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={editing.type === "percent" ? "20" : "19.99"}
              />
              <p className="mt-1 text-xs text-slate-500">
                {editing.type === "percent"
                  ? "Enter percentage value (e.g., 20 for 20%)"
                  : "Enter fixed amount (e.g., 19.99 for $19.99)"}
              </p>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
