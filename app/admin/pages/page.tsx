"use client";

import { useEffect, useState, useMemo } from "react";
import { useSupabase, type QueryResult } from "@/lib/supabase";
import SearchInput from "@/components/admin/SearchInput";
import DataTable from "@/components/admin/DataTable";
import Modal from "@/components/admin/Modal";
import type { Page } from "@/types";

export default function AdminPagesPage() {
  const [allPages, setAllPages] = useState<Page[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editing, setEditing] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState(false);
  const supabase = useSupabase();

  // Filter and search pages
  const filteredPages = useMemo(() => {
    return allPages.filter((page) => {
      return (
        page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (page.type?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      );
    });
  }, [allPages, searchTerm]);

  useEffect(() => {
    if (!supabase) return;
    loadPages();
  }, [supabase]);

  const loadPages = () => {
    if (!supabase) return;
    setLoading(true);
    try {
      supabase
        .from("pages")
        .select("*")
        .order("created_at", { ascending: false })
        .then((res: QueryResult<Page[]>) => {
          if ((res as {error?: {code?: string}}).error?.code === "42P01") {
            setTableError(true);
          }
          setAllPages(res.data || []);
          setLoading(false);
        });
    } catch {
      setAllPages([]);
      setLoading(false);
    }
  };

  const savePage = async (page: Partial<Page>) => {
    if (!supabase || !page.title || !page.slug) {
      alert("Title and Slug are required.");
      return;
    }

    try {
      if (editing?.id) {
        await supabase
          .from("pages")
          .update({
            title: page.title,
            slug: page.slug,
            type: page.type,
            content: page.content,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editing.id);
      } else {
        await supabase.from("pages").insert({
          title: page.title,
          slug: page.slug,
          type: page.type || "page",
          content: page.content || "",
        });
      }

      setEditing(null);
      loadPages();
    } catch (error) {
      console.error("Error saving page:", error);
    }
  };

  const deletePage = async (id: string) => {
    if (!supabase || !confirm("Are you sure you want to delete this page?")) return;

    try {
      await supabase.from("pages").delete().eq("id", id);
      loadPages();
    } catch (error) {
      console.error("Error deleting page:", error);
    }
  };

  const tableColumns = [
    {
      key: "title" as const,
      label: "Title",
      width: "250px",
    },
    {
      key: "slug" as const,
      label: "URL Path",
      render: (value: string | null) => `/policy/${value ?? ""}`,
    },
    {
      key: "type" as const,
      label: "Type",
      render: (value: string | null) => value || "page",
    },
    {
      key: "content" as const,
      label: "Content Length",
      render: (value: string | null) => `${(value?.length || 0)} chars`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pages & Policies</h1>
          <p className="mt-2 text-slate-600">
            Manage pages and policies ({filteredPages.length} pages)
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditing({
              id: "",
              title: "",
              slug: "",
              type: "page",
              content: "",
            } as Page)
          }
          className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700"
        >
          + Add Page
        </button>
      </div>

      {/* Table missing warning */}
      {tableError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>⚠️ The &quot;pages&quot; table does not exist in Supabase.</strong>
          <p className="mt-1">Go to Supabase → SQL Editor and run the SQL in <code>supabase-pages-table.sql</code>.</p>
        </div>
      )}

      {/* Search */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Search Pages
        </label>
        <SearchInput
          placeholder="Search by title, slug or type..."
          onSearch={setSearchTerm}
        />
      </div>

      {/* Pages Table */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <DataTable
          columns={tableColumns}
          data={filteredPages}
          loading={loading}
          actions={(page) => (
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(page)}
                className="text-blue-600 font-medium hover:text-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => deletePage(page.id)}
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
        title={editing?.id ? "Edit Page" : "Add New Page"}
        onClose={() => setEditing(null)}
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (!editing) return;
                savePage(editing);
              }}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700"
            >
              Save Page
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
              savePage(editing);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Page Title *
              </label>
              <input
                required
                value={editing.title}
                onChange={(e) => {
                  const title = e.target.value;
                  const autoSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                  setEditing({ ...editing, title, slug: editing.slug || autoSlug });
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter page title"
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
                placeholder="about-us"
              />
              <p className="mt-1 text-xs text-slate-500">
                URL will be: /policy/{editing.slug}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Type
              </label>
              <select
                value={editing.type || "page"}
                onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="page">Page</option>
                <option value="policy">Policy</option>
                <option value="terms">Terms & Conditions</option>
                <option value="privacy">Privacy Policy</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Content
              </label>
              <textarea
                value={editing.content || ""}
                onChange={(e) =>
                  setEditing({ ...editing, content: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm"
                placeholder="Enter page content (HTML or plain text)"
                rows={6}
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
