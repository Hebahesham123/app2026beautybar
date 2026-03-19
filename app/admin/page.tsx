"use client";

import { useEffect, useState } from "react";
import { useSupabase, type QueryResult } from "@/lib/supabase";
import StatCard from "@/components/admin/StatCard";
import DataTable from "@/components/admin/DataTable";
import type { Order, Product } from "@/types";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    customers: 0,
    activeProducts: 0,
    totalRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const supabase = useSupabase();

  useEffect(() => {
    if (!supabase) return;

    Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("order").select("id", { count: "exact", head: true }),
      supabase.from("customer_data").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id").eq("status", "active").then((res) => res),
      supabase.from("order").select("total").then((res) => res),
    ]).then(([p, o, c, active, revenue]) => {
      const totalRevenue = (revenue.data as { total: number }[] || []).reduce(
        (sum, order) => sum + (order.total || 0),
        0
      );

      setStats({
        products: (p as { count?: number })?.count ?? 0,
        orders: (o as { count?: number })?.count ?? 0,
        customers: (c as { count?: number })?.count ?? 0,
        activeProducts: (active.data as { id: string }[] || []).length,
        totalRevenue,
      });
    });

    // Fetch recent orders
    supabase
      .from("order")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)
      .then((res: QueryResult<Order[]>) => {
        setRecentOrders(res.data || []);
        setLoadingOrders(false);
      });
  }, [supabase]);

  const orderColumns = [
    {
      key: "id" as const,
      label: "Order ID",
      render: (value: string) => value.slice(0, 8).toUpperCase(),
      width: "100px",
    },
    {
      key: "customer_name" as const,
      label: "Customer",
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
          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
            value === "completed"
              ? "bg-green-100 text-green-800"
              : value === "pending"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-slate-100 text-slate-800"
          }`}
        >
          {value}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-slate-600">Welcome to your admin panel. Here's an overview of your store.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Products" value={stats.products} type="primary" icon="📦" />
        <StatCard label="Active Products" value={stats.activeProducts} type="success" icon="✓" />
        <StatCard label="Total Orders" value={stats.orders} type="warning" icon="📋" />
        <StatCard label="Customers" value={stats.customers} type="primary" icon="👥" />
        <StatCard
          label="Total Revenue"
          value={`$${Number(stats.totalRevenue).toFixed(2)}`}
          type="success"
          icon="💰"
        />
      </div>

      {/* Recent Orders */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent Orders</h2>
        <DataTable
          columns={orderColumns as any[]}
          data={recentOrders}
          loading={loadingOrders}
        />
      </div>

      {/* Quick Action Links */}
      <div className="grid gap-4 md:grid-cols-2">
        <a
          href="/admin/products"
          className="rounded-lg border border-slate-200 bg-white p-4 transition hover:shadow-lg"
        >
          <h3 className="font-semibold text-slate-900">Manage Products</h3>
          <p className="mt-1 text-sm text-slate-600">Add, edit, or remove products</p>
        </a>
        <a
          href="/admin/orders"
          className="rounded-lg border border-slate-200 bg-white p-4 transition hover:shadow-lg"
        >
          <h3 className="font-semibold text-slate-900">View Orders</h3>
          <p className="mt-1 text-sm text-slate-600">Manage customer orders and status</p>
        </a>
        <a
          href="/admin/customers"
          className="rounded-lg border border-slate-200 bg-white p-4 transition hover:shadow-lg"
        >
          <h3 className="font-semibold text-slate-900">Customer List</h3>
          <p className="mt-1 text-sm text-slate-600">View and manage customers</p>
        </a>
        <a
          href="/admin/pages"
          className="rounded-lg border border-slate-200 bg-white p-4 transition hover:shadow-lg"
        >
          <h3 className="font-semibold text-slate-900">Manage Pages</h3>
          <p className="mt-1 text-sm text-slate-600">Create and edit pages and policies</p>
        </a>
      </div>
    </div>
  );
}
