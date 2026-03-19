"use client";

import { useEffect, useState, useMemo } from "react";
import { useSupabase, type QueryResult } from "@/lib/supabase";
import SearchInput from "@/components/admin/SearchInput";
import FilterSelect from "@/components/admin/FilterSelect";
import DataTable from "@/components/admin/DataTable";
import type { Order } from "@/types";

export default function AdminOrdersPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      const matchesStatus = statusFilter === "all" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [allOrders, searchTerm, statusFilter]);

  useEffect(() => {
    if (!supabase) return;
    setLoading(true);
    supabase
      .from("order")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then((res: QueryResult<Order[]>) => {
        setAllOrders(res.data || []);
        setLoading(false);
      });
  }, [supabase]);

  const tableColumns = [
    {
      key: "id" as const,
      label: "Order ID",
      render: (value: string) => value.slice(0, 12).toUpperCase(),
      width: "140px",
    },
    {
      key: "customer_name" as const,
      label: "Customer",
      render: (value: string | null) => value || "—",
    },
    {
      key: "customer_email" as const,
      label: "Email",
      render: (value: string | null) => value || "—",
    },
    {
      key: "total" as const,
      label: "Total",
      render: (value: number) => `$${Number(value).toFixed(2)}`,
    },
    {
      key: "status" as const,
      label: "Status",
      render: (value: string) => (
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
            value === "completed"
              ? "bg-green-100 text-green-800"
              : value === "processing"
                ? "bg-blue-100 text-blue-800"
                : value === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-slate-100 text-slate-800"
          }`}
        >
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Orders</h1>
        <p className="mt-2 text-slate-600">
          Manage customer orders ({filteredOrders.length} orders)
        </p>
      </div>

      {/* Search and Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Search Orders
            </label>
            <SearchInput
              placeholder="Search by order ID, customer name or email..."
              onSearch={setSearchTerm}
            />
          </div>
          <FilterSelect
            label="Filter by Status"
            options={[
              { value: "all", label: "All Statuses" },
              { value: "pending", label: "Pending" },
              { value: "processing", label: "Processing" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <DataTable columns={tableColumns} data={filteredOrders} loading={loading} />
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-600">Completed Orders</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {allOrders.filter((o) => o.status === "completed").length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-600">Processing Orders</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {allOrders.filter((o) => o.status === "processing").length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-600">Pending Orders</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {allOrders.filter((o) => o.status === "pending").length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-600">Total Revenue</p>
          <p className="mt-2 text-2xl font-bold text-green-600">
            ${allOrders.reduce((sum, o) => sum + (o.total || 0), 0).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
