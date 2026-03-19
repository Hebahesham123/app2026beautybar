"use client";

import { useEffect, useState, useMemo } from "react";
import { useSupabase, type QueryResult } from "@/lib/supabase";
import SearchInput from "@/components/admin/SearchInput";
import DataTable from "@/components/admin/DataTable";
import Pagination from "@/components/admin/Pagination";

type Customer = { id: string; name: string; email: string | null; phone: string | null };

const ITEMS_PER_PAGE = 50;

export default function AdminCustomersPage() {
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();

  // Filter and search customers
  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (customer.phone?.includes(searchTerm) ?? false)
      );
    });
  }, [allCustomers, searchTerm]);

  // Paginate filtered customers
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredCustomers.slice(startIndex, endIndex);
  }, [filteredCustomers, currentPage]);

  useEffect(() => {
    if (!supabase) return;
    setLoading(true);
    supabase
      .from("customer_data")
      .select("id, name, email, phone")
      .order("created_at", { ascending: false })
      .then((res: QueryResult<Customer[]>) => {
        setAllCustomers(res.data || []);
        setCurrentPage(1);
        setLoading(false);
      });
  }, [supabase]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const tableColumns = [
    {
      key: "name" as const,
      label: "Customer Name",
      width: "250px",
    },
    {
      key: "email" as const,
      label: "Email",
      render: (value: string | null) => value || "—",
    },
    {
      key: "phone" as const,
      label: "Phone",
      render: (value: string | null) => value || "—",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
        <p className="mt-2 text-slate-600">
          Manage your customers ({filteredCustomers.length} customers)
        </p>
      </div>

      {/* Search */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Search Customers
        </label>
        <SearchInput
          placeholder="Search by name, email or phone..."
          onSearch={setSearchTerm}
        />
      </div>

      {/* Customers Table */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <DataTable columns={tableColumns} data={paginatedCustomers} loading={loading} />
        <Pagination
          currentPage={currentPage}
          totalItems={filteredCustomers.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-600">Total Customers</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{allCustomers.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-600">With Email</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {allCustomers.filter((c) => c.email).length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-600">With Phone</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {allCustomers.filter((c) => c.phone).length}
          </p>
        </div>
      </div>
    </div>
  );
}
