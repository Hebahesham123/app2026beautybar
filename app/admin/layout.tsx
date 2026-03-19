"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Dashboard", href: "/admin", icon: "📊" },
  { label: "Products", href: "/admin/products", icon: "📦" },
  { label: "Collections", href: "/admin/collections", icon: "📂" },
  { label: "Orders", href: "/admin/orders", icon: "📋" },
  { label: "Customers", href: "/admin/customers", icon: "👥" },
  { label: "Discounts", href: "/admin/discounts", icon: "🏷️" },
  { label: "Pages", href: "/admin/pages", icon: "📄" },
  { label: "Theme", href: "/admin/theme", icon: "🎨" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-56 border-r border-slate-200 bg-white p-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
          <span className="text-xl">🏢</span>
          Admin Panel
        </Link>
        <nav className="mt-8 space-y-2">
          {NAV.map((l) => {
            const isActive = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="text-lg">{l.icon}</span>
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 border-t border-slate-200 pt-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <span>←</span>
            Back to Store
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white border-b border-slate-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm text-slate-500">
                {pathname === "/admin" ? "Dashboard" : "Management"}
              </h2>
            </div>
            <div className="text-sm text-slate-500">Admin v1.0</div>
          </div>
        </div>
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}
