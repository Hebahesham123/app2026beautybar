"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";

const navItems = [
  { href: "/", label: "HOME", id: "home" },
  { href: "/search", label: "SEARCH", id: "search" },
  { href: "/cart", label: "CART", id: "cart", center: true },
  { href: "/wishlist", label: "WISHLIST", id: "wishlist" },
  { href: "/account", label: "ACCOUNT", id: "account" },
];

const PINK = "#D4457A";

function IconHome({ active }: { active: boolean }) {
  return (
    <svg className={`h-6 w-6 ${active ? "text-[#D4457A]" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function IconSearch({ active }: { active: boolean }) {
  return (
    <svg className={`h-6 w-6 ${active ? "text-[#D4457A]" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function IconCart({ active, count }: { active: boolean; count: number }) {
  if (active) {
    return (
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D4457A] shadow-[0_4px_20px_rgba(212,69,122,0.4)] ring-4 ring-[#D4457A]/20">
        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </span>
    );
  }
  return (
    <span className="relative">
      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#D4457A] px-1 text-[10px] font-bold text-white shadow">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );
}

function IconHeart({ active }: { active: boolean }) {
  return (
    <svg className={`h-6 w-6 ${active ? "text-[#D4457A]" : "text-gray-400"}`} fill={active ? "#D4457A" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function IconAccount({ active }: { active: boolean }) {
  return (
    <svg className={`h-6 w-6 ${active ? "text-[#D4457A]" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { count } = useCart();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-gray-100 bg-white shadow-[0_-2px_16px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 transition active:scale-95 ${
                item.center ? "flex-1 max-w-[80px]" : "flex-1"
              } ${!item.center ? "hover:bg-pink-50" : ""}`}
            >
              {item.id === "home" && <IconHome active={active} />}
              {item.id === "search" && <IconSearch active={active} />}
              {item.id === "cart" && <IconCart active={active} count={count} />}
              {item.id === "wishlist" && <IconHeart active={active} />}
              {item.id === "account" && <IconAccount active={active} />}
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide transition ${
                  active && !item.center ? "text-[#D4457A]" : "text-gray-400"
                } ${item.center ? "invisible h-0 overflow-hidden" : ""}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
