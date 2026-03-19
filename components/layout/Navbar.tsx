"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { useCart } from "@/context/CartContext";

interface NavMenuItem {
  id: string;
  label: string;
  href: string;
  submenu?: NavMenuItem[];
}

const DEFAULT_QUICK_LINKS: NavMenuItem[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "collections", label: "Collections", href: "/collections" },
  { id: "products", label: "Products", href: "/products" },
  { id: "account", label: "Account", href: "/account" },
  { id: "cart", label: "Cart", href: "/cart" },
];

export function Navbar() {
  const { theme } = useTheme();
  const { count } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSubmenus, setExpandedSubmenus] = useState<Set<string>>(new Set());

  const isPreviewMode = searchParams.get("preview") === "mobile";
  const showDrawer = !isPreviewMode;

  const siteName = theme.logo_url ? "Logo" : "BEAUTY BAR";

  // Parse nav_json from theme
  const navMenuItems = useMemo(() => {
    try {
      const parsed = JSON.parse(theme.nav_json || "{}");
      return (parsed.top || []) as NavMenuItem[];
    } catch {
      return DEFAULT_QUICK_LINKS;
    }
  }, [theme.nav_json]);

  useEffect(() => {
    if (!showDrawer) return;
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, showDrawer]);

  const closeDrawer = () => setMobileOpen(false);

  const toggleSubmenu = (id: string) => {
    const newExpanded = new Set(expandedSubmenus);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSubmenus(newExpanded);
  };

  return (
    <>
      {/* Beauty Bar header — white with pink accents */}
      <header className="sticky top-0 z-40 border-b border-pink-100 bg-white shadow-sm">
        <div className="flex h-14 items-center justify-between gap-2 px-3 md:h-16 md:px-4">
          <div className="flex min-w-[80px] items-center justify-start gap-0 md:min-w-0">
            {showDrawer ? (
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 transition hover:bg-pink-50 active:scale-95"
                aria-label="Menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            ) : (
              <span className="h-10 w-10 shrink-0" aria-hidden />
            )}
            <Link
              href="/search"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 transition hover:bg-pink-50 active:scale-95"
              aria-label="Search"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>
          </div>

          <Link
            href="/"
            className="absolute left-1/2 flex -translate-x-1/2 items-center"
            onClick={closeDrawer}
          >
            {theme.logo_url ? (
              <img src={theme.logo_url} alt="" className="h-8 object-contain md:h-9" />
            ) : (
              <span className="text-center text-[15px] font-black tracking-[0.2em] text-gray-900 md:text-base">
                {siteName}
              </span>
            )}
          </Link>

          <div className="flex min-w-[80px] items-center justify-end gap-0">
            <Link
              href="/account"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 transition hover:bg-pink-50 active:scale-95"
              aria-label="Account"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
            <button
              type="button"
              onClick={() => router.push("/cart")}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 transition hover:bg-pink-50 active:scale-95"
              aria-label="Cart"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#D4457A] px-1.5 text-xs font-bold text-white">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Desktop horizontal nav links */}
      <div className="hidden border-b border-pink-50 bg-white md:block">
        <div className="mx-auto flex max-w-6xl items-center gap-1 px-4">
          {navMenuItems.length > 0
            ? navMenuItems.map((item) => (
                <Link
                  key={item.id || item.href}
                  href={item.href}
                  className="px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:text-[#D4457A]"
                >
                  {item.label}
                </Link>
              ))
            : DEFAULT_QUICK_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:text-[#D4457A]"
                >
                  {item.label}
                </Link>
              ))}
        </div>
      </div>

      {/* Mobile drawer (hidden in theme editor preview) */}
      {showDrawer && mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <div
            className="absolute inset-y-0 left-0 w-[min(320px,85vw)] overflow-y-auto border-r border-slate-700 bg-slate-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col py-6">
              <div className="mb-2 px-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Menu</span>
              </div>
              <nav className="px-3">
                {navMenuItems.length > 0 ? (
                  navMenuItems.map((item) => (
                    <div key={item.id || item.href}>
                      <div className="flex items-center">
                        <Link
                          href={item.href}
                          onClick={closeDrawer}
                          className="flex-1 block rounded-lg px-3 py-2.5 text-base font-medium text-white transition hover:bg-slate-800"
                        >
                          {item.label}
                        </Link>
                        {item.submenu && item.submenu.length > 0 && (
                          <button
                            onClick={() => toggleSubmenu(item.id || item.href)}
                            className="px-3 py-2.5 text-white hover:bg-slate-800 rounded-lg transition"
                          >
                            {expandedSubmenus.has(item.id || item.href) ? "⊖" : "⊕"}
                          </button>
                        )}
                      </div>
                      {/* Submenus */}
                      {item.submenu && item.submenu.length > 0 && expandedSubmenus.has(item.id || item.href) && (
                        <div className="ml-4 border-l border-slate-700 pl-2">
                          {item.submenu.map((sub) => (
                            <Link
                              key={sub.id || sub.href}
                              href={sub.href}
                              onClick={closeDrawer}
                              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                            >
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  DEFAULT_QUICK_LINKS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeDrawer}
                      className="block rounded-lg px-3 py-2.5 text-base font-medium text-white transition hover:bg-slate-800"
                    >
                      {item.label}
                    </Link>
                  ))
                )}
              </nav>
              <div className="mt-auto px-5 pt-6">
                <Link
                  href="/admin"
                  onClick={closeDrawer}
                  className="text-sm font-medium text-amber-400 transition hover:text-amber-300"
                >
                  Admin
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
