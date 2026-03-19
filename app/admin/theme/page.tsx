"use client";

import {
  useState, useMemo, useEffect, useRef, useCallback,
  type DragEvent,
  type MutableRefObject,
} from "react";
import { createPortal } from "react-dom";
import { useSupabase, type QueryResult } from "@/lib/supabase";
import { useTheme } from "@/context/ThemeContext";
import { dummyProducts, dummyCollections } from "@/lib/dummy-data";
import { getProductImageUrl, normalizeCollectionProductIds } from "@/lib/utils";
import type { ThemeSettings, HomeSection, HomeSectionType, Collection, Product, StoreFooterSettings } from "@/types";
import { BUILTIN_SECTIONS as BUILTIN } from "@/lib/builtin-sections";
import { FOOTER_EDITOR_SECTIONS, isFooterEditorSectionId } from "@/lib/footer-sections";
import {
  mergeFooterSettings,
  footerLinksFromLines,
  footerLinksToLines,
  stringsFromLines,
  stringsToLines,
  defaultFooterJson,
} from "@/lib/footer-settings";
import { getDefaultSection } from "@/types";

// ─── SQL needed to set up the theme_settings table ───────────────────────────
const SETUP_SQL = `-- Run in Supabase Dashboard → SQL Editor
CREATE TABLE IF NOT EXISTS theme_settings (
  id TEXT PRIMARY KEY DEFAULT '1',
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  background_color TEXT,
  text_color TEXT,
  radius TEXT,
  promo_text TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_image_url TEXT,
  home_blocks_json TEXT,
  home_sections_json TEXT,
  nav_json TEXT,
  footer_json TEXT,
  updated_at TIMESTAMPTZ
);

-- If the table already exists from an older setup, add the column:
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS footer_json TEXT;

-- Insert the one settings row if it doesn't exist yet
INSERT INTO theme_settings (id) VALUES ('1') ON CONFLICT (id) DO NOTHING;

-- Allow full access (tighten with RLS for production)
ALTER TABLE theme_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_theme" ON theme_settings;
CREATE POLICY "allow_all_theme" ON theme_settings FOR ALL USING (true);

-- Reload PostgREST schema cache so the table is immediately usable
NOTIFY pgrst, 'reload schema';`;

// ─── Extended section type (adds _id and _hidden at runtime) ─────────────────
type ES = HomeSection & { _id: string; _hidden?: boolean };
let _c = 0;
const genId = () => `s_${Date.now()}_${++_c}`;

function parse(json: string): ES[] {
  try {
    const a = JSON.parse(json || "[]");
    return Array.isArray(a) ? a.map((s: ES) => ({ ...s, _id: s._id || genId() })) : [];
  } catch { return []; }
}

// ─── Built-in section settings helpers ───────────────────────────────────────
type BuiltinSetting = { hidden?: boolean; [key: string]: unknown };
type BuiltinSettings = Record<string, BuiltinSetting>;

/** One tile in the Mix & Match section (stored in home_blocks_json). */
type MixMatchSlotSetting = {
  product_id?: string;
  pill?: string;
  title?: string;
  sub?: string;
};

function mixMatchActiveCount(settings: BuiltinSetting): number {
  return Math.min(4, Math.max(1, Number(settings.mix_slot_count) || 4));
}

function ensureMixSlotsArray(settings: BuiltinSetting, count: number): MixMatchSlotSetting[] {
  const raw = Array.isArray(settings.mix_slots) ? ([...(settings.mix_slots as MixMatchSlotSetting[])]) : [];
  while (raw.length < count) raw.push({});
  return raw.slice(0, count).map((x) => ({
    product_id: typeof x?.product_id === "string" ? x.product_id : "",
    pill: typeof x?.pill === "string" ? x.pill : "",
    title: typeof x?.title === "string" ? x.title : "",
    sub: typeof x?.sub === "string" ? x.sub : "",
  }));
}

/** Searchable list + thumbnails for Mix & Match slot product (stores same `product_id` UUID as before). */
function MixSlotProductSelector({
  products,
  value,
  onChange,
}: {
  products: Product[];
  value: string;
  onChange: (productId: string) => void;
}) {
  const [q, setQ] = useState("");
  const sorted = useMemo(
    () => [...products].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [products]
  );
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return sorted;
    return sorted.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      const cat = (p.category || "").toLowerCase();
      const id = String(p.id).toLowerCase();
      return name.includes(t) || sku.includes(t) || cat.includes(t) || id.includes(t);
    });
  }, [sorted, q]);
  const MAX = 100;
  const list = filtered.slice(0, MAX);
  const selected = useMemo(
    () => products.find((p) => String(p.id) === String(value)),
    [products, value]
  );
  const selThumb = selected ? getProductImageUrl(selected) : null;

  return (
    <div className="space-y-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, SKU, category, or ID…"
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
      />
      {value && !selected ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-2 py-2">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold text-amber-900">ID saved but not in editor list</div>
            <div className="truncate font-mono text-[10px] text-amber-800">{value}</div>
            <p className="mt-0.5 text-[9px] text-amber-700">Still works on the store. Reload theme or expand product load if needed.</p>
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-50"
          >
            Clear
          </button>
        </div>
      ) : null}
      {selected ? (
        <div className="flex items-center gap-2 rounded-lg border border-pink-200 bg-pink-50/70 px-2 py-2">
          {selThumb ? (
            <img src={selThumb} alt="" className="h-9 w-9 shrink-0 rounded-md border border-slate-200 object-cover" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-base">
              🛍️
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-slate-900">{selected.name}</div>
            <div className="truncate font-mono text-[10px] text-slate-500">ID: {selected.id}</div>
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-50"
          >
            Clear
          </button>
        </div>
      ) : null}
      <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => onChange("")}
          className="w-full border-b border-slate-100 px-3 py-2 text-left text-xs text-slate-400 hover:bg-slate-50"
        >
          — No product —
        </button>
        {list.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-slate-400">No products match your search.</p>
        ) : (
          list.map((p) => {
            const img = getProductImageUrl(p);
            const active = String(p.id) === String(value);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onChange(String(p.id));
                  setQ("");
                }}
                className={`flex w-full items-center gap-2 border-b border-slate-50 px-2 py-2 text-left transition hover:bg-pink-50/80 ${
                  active ? "bg-pink-50" : ""
                }`}
              >
                {img ? (
                  <img src={img} alt="" className="h-9 w-9 shrink-0 rounded object-cover bg-slate-100" />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-100 text-sm">🛍️</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-slate-800">{p.name}</div>
                  <div className="truncate text-[10px] text-slate-500">
                    LE {Number(p.price) || 0}
                    {p.sku ? ` · ${p.sku}` : ""}
                  </div>
                </div>
              </button>
            );
          })
        )}
        {filtered.length > MAX ? (
          <p className="border-t border-slate-100 px-2 py-1.5 text-center text-[10px] text-slate-400">
            Showing {MAX} of {filtered.length} — refine search
          </p>
        ) : null}
      </div>
    </div>
  );
}

function parseBuiltin(json: string): BuiltinSettings {
  try { return JSON.parse(json || "{}").builtin_sections || {}; } catch { return {}; }
}
function saveBuiltin(json: string, settings: BuiltinSettings): string {
  try {
    const obj = JSON.parse(json || "{}");
    return JSON.stringify({ ...obj, builtin_sections: settings });
  } catch { return JSON.stringify({ builtin_sections: settings }); }
}

// ─── JSON-driven section metadata ────────────────────────────────────────────
const META: { type: HomeSectionType; label: string; desc: string; icon: string }[] = [
  { type: "promo",       label: "Announcement Bar",  desc: "Scrolling promo text",        icon: "📣" },
  { type: "ticker",      label: "Customers Ticker",  desc: "Live customer activity",      icon: "👁️" },
  { type: "hero",        label: "Hero Banner",       desc: "Full-width hero with CTAs",   icon: "🖼️" },
  { type: "collections", label: "Collections Grid",  desc: "Showcase your collections",   icon: "📦" },
  { type: "products",    label: "Products Grid",     desc: "Feature your products",       icon: "🛍️" },
  { type: "banner",      label: "Image Banner",      desc: "Image with text overlay",     icon: "🎨" },
  { type: "custom",      label: "Custom HTML",       desc: "Write raw HTML/CSS",          icon: "💻" },
  { type: "liquid",      label: "Liquid Template",   desc: "Shopify-style liquid code",   icon: "💧" },
  { type: "spacer",      label: "Spacer",            desc: "Add whitespace",              icon: "↕️" },
];

const STATIC_PAGES = [
  { label: "Home",            href: "/" },
  { label: "All Products",    href: "/products" },
  { label: "All Collections", href: "/collections" },
  { label: "Cart",            href: "/cart" },
  { label: "Wishlist",        href: "/wishlist" },
  { label: "Account",         href: "/account" },
  { label: "Search",          href: "/search" },
  { label: "Privacy Policy",  href: "/policy/privacy" },
  { label: "Terms of Service",href: "/policy/terms" },
  { label: "Shipping Policy", href: "/policy/shipping" },
  { label: "Refund Policy",   href: "/policy/refund" },
  { label: "About Us",        href: "/pages/about" },
  { label: "Contact",         href: "/pages/contact" },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHARED FIELD COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function FL({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{children}</label>;
}
function TxtField({ label, value, onChange, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <FL>{label}</FL>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition" />
      {hint && <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}
function TxtArea({ label, value, onChange, rows = 4, mono = false, hint }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; mono?: boolean; hint?: string;
}) {
  return (
    <div>
      <FL>{label}</FL>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition resize-y ${mono ? "font-mono text-xs" : ""}`} />
      {hint && <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <FL>{label}</FL>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="h-9 w-11 cursor-pointer rounded-lg border border-slate-200 p-0.5" />
        <input value={value} onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-800 outline-none focus:border-pink-400 transition" />
      </div>
    </div>
  );
}
function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
      <div>
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
      </div>
      <div className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-[#D4457A]" : "bg-slate-200"}`} onClick={() => onChange(!value)}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
    </label>
  );
}
function NumField({ label, value, onChange, min = 0, max = 1000, step = 1, display = "px" }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
  /** "px" for dimensions (spacer height); "plain" for counts (e.g. products to show). */
  display?: "px" | "plain";
}) {
  const shown = display === "px" ? `${value}px` : String(value);
  return (
    <div>
      <FL>{label} — <span className="font-bold text-slate-700">{shown}</span></FL>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#D4457A]" />
    </div>
  );
}
function ImgField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [err, setErr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { setErr(false); }, [value]);
  const onPickFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string" && result.trim()) {
        onChange(result);
        setErr(false);
      }
    };
    reader.readAsDataURL(file);
  };
  return (
    <div>
      <FL>{label}</FL>
      <input value={value} onChange={(e) => { onChange(e.target.value); setErr(false); }} placeholder="https://..."
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 transition" />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Choose image file
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onPickFile(e.target.files?.[0] || null);
          e.currentTarget.value = "";
        }}
      />
      {value && !err && (
        <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 aspect-video bg-slate-100">
          <img src={value} alt="" className="h-full w-full object-cover" onError={() => setErr(true)} />
        </div>
      )}
      {value && err && <p className="mt-1 text-[11px] text-red-500">⚠ Could not load image</p>}
    </div>
  );
}

function getCollectionImageUrl(collection: Collection): string | null {
  const row = collection as unknown as Record<string, unknown>;
  const candidates = [
    collection.banner_image,
    row.image_url,
    row.image,
    row.cover_image,
    row.thumbnail,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

/** Resolve `/collection/my-slug` (and minor typos like trailing `{`) to a loaded collection row. */
function collectionFromLinkValue(href: string, collections: Collection[]): Collection | null {
  const m = href.trim().match(/^\/collection\/([^?#]+)/i);
  if (!m) return null;
  let slug = m[1].trim().replace(/[\s{[<(].*$/, "").replace(/-+$/, "");
  if (!slug) return null;
  const lower = slug.toLowerCase();
  return (
    collections.find((c) => (c.slug || "").toLowerCase() === lower) ||
    collections.find(
      (c) => (((c as unknown as Record<string, string>).handle || "").toLowerCase() === lower)
    ) ||
    collections.find(
      (c) =>
        (c.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") === lower
    ) ||
    null
  );
}

/** Products belonging to a collection: explicit `product_ids` order first, else `collection_id` FK. */
function productsForCollectionPicker(collection: Collection, products: Product[]): Product[] {
  const row = collection as unknown as Record<string, unknown>;
  const idList = normalizeCollectionProductIds(row.product_ids, row);
  const cid = String(collection.id);
  const byId = new Map(products.map((p) => [String(p.id), p]));
  if (idList.length > 0) {
    const out: Product[] = [];
    for (const id of idList) {
      const p = byId.get(String(id));
      if (p) out.push(p);
    }
    if (out.length > 0) return out;
  }
  return products.filter((p) => p.collection_id != null && String(p.collection_id) === cid);
}

/** Banner/cover if set; otherwise up to 4 product thumbnails for the link picker row. */
function collectionPickerImageUrls(collection: Collection, products: Product[], max = 4): string[] {
  const banner = getCollectionImageUrl(collection);
  if (banner) return [banner];
  const urls: string[] = [];
  for (const p of productsForCollectionPicker(collection, products)) {
    const u = getProductImageUrl(p);
    if (u) urls.push(u);
    if (urls.length >= max) break;
  }
  return urls;
}

function CollectionPickerThumb({ collection, products }: { collection: Collection; products: Product[] }) {
  const urls = collectionPickerImageUrls(collection, products, 4);
  const box = "h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100";
  if (urls.length === 0) {
    return <span className={`flex ${box} items-center justify-center text-base`}>🗂️</span>;
  }
  if (urls.length === 1) {
    return <img src={urls[0]} alt="" className={`${box} object-cover`} />;
  }
  const cells = [...urls.slice(0, 4)];
  while (cells.length < 4) cells.push("");
  return (
    <div className={`grid grid-cols-2 grid-rows-2 gap-px ${box} p-px bg-slate-200`}>
      {cells.map((src, i) =>
        src ? (
          <img key={i} src={src} alt="" className="h-full w-full object-cover bg-slate-50" />
        ) : (
          <div key={i} className="bg-slate-50" />
        )
      )}
    </div>
  );
}

function linkPickerInitialTab(
  value: string,
  preferred?: "pages" | "collections" | "products" | "custom"
): "pages" | "collections" | "products" | "custom" {
  if (preferred) return preferred;
  const v = value.trim();
  if (/^\/collection\//i.test(v)) return "collections";
  if (/\/product\//i.test(v)) return "products";
  return "pages";
}

// ─── Link Picker Modal (portaled to body so fixed positioning isn’t clipped by sidebar scroll/stacking) ──
function LinkPicker({ value, onSelect, onClose, collections, products, initialTab }: {
  value: string; onSelect: (href: string) => void; onClose: () => void;
  collections: Collection[]; products: Product[];
  initialTab?: "pages" | "collections" | "products" | "custom";
}) {
  const [tab, setTab] = useState<"pages" | "collections" | "products" | "custom">(() =>
    linkPickerInitialTab(value, initialTab)
  );
  const [custom, setCustom] = useState(value);
  const [search, setSearch] = useState("");
  const q = search.toLowerCase().trim();
  const filteredC = collections.filter((c) => {
    const title = (c.title || "").toLowerCase();
    const slug = (c.slug || "").toLowerCase();
    const handle = String((c as unknown as Record<string, string>).handle || "").toLowerCase();
    return title.includes(q) || slug.includes(q) || handle.includes(q);
  });
  const filteredP = products.filter((p) => (p.name || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q));
  const modal = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose} role="presentation">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Pick a link">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-black text-slate-900">🔗 Pick a Link</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="flex border-b border-slate-100">
          {(["pages", "collections", "products", "custom"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setSearch(""); }}
              className={`flex-1 py-2.5 text-[11px] font-semibold uppercase tracking-wide transition capitalize ${tab === t ? "border-b-2 border-[#D4457A] text-[#D4457A]" : "text-slate-400 hover:text-slate-600"}`}>
              {t}
            </button>
          ))}
        </div>
        {(tab === "collections" || tab === "products") && (
          <div className="px-4 pt-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${tab}…`}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-pink-400" />
          </div>
        )}
        <div className="max-h-[420px] overflow-y-auto p-3 space-y-1">
          {tab === "pages" && STATIC_PAGES.map((p) => (
            <button key={p.href} onClick={() => onSelect(p.href)}
              className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-left transition hover:bg-pink-50 ${value === p.href ? "bg-pink-50 font-semibold text-[#D4457A]" : "text-slate-700"}`}>
              {p.label} <span className="text-[10px] text-slate-400 font-mono">{p.href}</span>
            </button>
          ))}
          {tab === "collections" && (filteredC.length === 0
            ? <p className="py-4 text-center text-xs text-slate-400">No collections found</p>
            : filteredC.map((c) => {
              const slug = c.slug || (c as unknown as Record<string,string>).handle || c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
              return (
                <button key={c.id} onClick={() => onSelect(`/collection/${slug}`)}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-left transition hover:bg-pink-50 text-slate-700">
                  <span className="flex min-w-0 items-center gap-2">
                    <CollectionPickerThumb collection={c} products={products} />
                    <span className="truncate">{c.title}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">/collection/{slug}</span>
                </button>
              );
            })
          )}
          {tab === "products" && (filteredP.length === 0
            ? <p className="py-4 text-center text-xs text-slate-400">No products found</p>
            : filteredP.map((p) => (
              <button key={p.id} onClick={() => {
                const slug = p.slug || p.name.toLowerCase().replace(/\s+/g, "-");
                onSelect(`/product/${slug}?pid=${encodeURIComponent(p.id)}`);
              }}
                className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-left transition hover:bg-pink-50 text-slate-700">
                <span className="flex min-w-0 items-center gap-2">
                  {getProductImageUrl(p) ? (
                    <img src={getProductImageUrl(p) || ""} alt="" className="h-10 w-10 rounded-md object-cover border border-slate-200 bg-slate-100" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-base">🛍️</span>
                  )}
                  <span className="truncate">{p.name}</span>
                </span>
                <span className="ml-2 shrink-0 text-[10px] text-slate-400">LE {p.price}</span>
              </button>
            ))
          )}
          {tab === "custom" && (
            <div className="p-2 space-y-2">
              <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="https://... or /path/to/page"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-pink-400" />
              <button onClick={() => onSelect(custom)}
                className="w-full rounded-lg bg-[#D4457A] py-2.5 text-sm font-bold text-white">Use this URL</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}

function LinkField({ label, value, onChange, collections, products, pickerDefaultTab }: {
  label: string; value: string; onChange: (v: string) => void; collections: Collection[]; products: Product[];
  /** Opens the picker on this tab (e.g. "collections" for “View all” links). */
  pickerDefaultTab?: "pages" | "collections" | "products" | "custom";
}) {
  const [open, setOpen] = useState(false);
  const linkedCollection = useMemo(
    () => collectionFromLinkValue(value, collections),
    [value, collections]
  );
  return (
    <div>
      <FL>{label}</FL>
      <div className="flex items-center gap-1.5">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="/products"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 transition" />
        <button type="button" onClick={() => setOpen(true)} className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">🔗 Pick</button>
        {linkedCollection ? (
          <div
            className="shrink-0 rounded-md border border-slate-200 bg-slate-50 p-0.5"
            title={linkedCollection.title}
          >
            <CollectionPickerThumb collection={linkedCollection} products={products} />
          </div>
        ) : null}
      </div>
      {open && (
        <LinkPicker
          value={value}
          initialTab={linkPickerInitialTab(value, pickerDefaultTab)}
          onSelect={(v) => { onChange(v); setOpen(false); }}
          onClose={() => setOpen(false)}
          collections={collections}
          products={products}
        />
      )}
    </div>
  );
}

function MultiPick({ label, selected, onUpdate, items, itemLabel }: {
  label: string; selected: string[]; onUpdate: (ids: string[]) => void;
  items: { id: string; label: string }[]; itemLabel: string;
}) {
  const [search, setSearch] = useState("");
  const available = items.filter((i) => !selected.includes(i.id) && i.label.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <FL>{label}</FL>
      {selected.length > 0 && (
        <ul className="mb-2 space-y-1">
          {selected.map((id, idx) => {
            const item = items.find((i) => i.id === id);
            return (
              <li key={id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-2 py-1.5 text-xs">
                <span className="flex-1 truncate text-slate-700">{item?.label ?? id.slice(0, 8)}</span>
                <button onClick={() => { const n = [...selected]; [n[idx], n[idx-1]] = [n[idx-1], n[idx]]; if (idx > 0) onUpdate(n); }} disabled={idx === 0} className="text-slate-300 hover:text-slate-600 disabled:opacity-30">↑</button>
                <button onClick={() => { const n = [...selected]; [n[idx], n[idx+1]] = [n[idx+1], n[idx]]; if (idx < selected.length-1) onUpdate(n); }} disabled={idx === selected.length-1} className="text-slate-300 hover:text-slate-600 disabled:opacity-30">↓</button>
                <button onClick={() => onUpdate(selected.filter((x) => x !== id))} className="text-red-400 hover:text-red-600">×</button>
              </li>
            );
          })}
        </ul>
      )}
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${itemLabel}…`}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-pink-400" />
      {search && (
        <ul className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          {available.length === 0
            ? <li className="px-3 py-2 text-xs text-slate-400">No results</li>
            : available.slice(0, 20).map((i) => (
              <li key={i.id}>
                <button className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-pink-50 transition"
                  onClick={() => { onUpdate([...selected, i.id]); setSearch(""); }}>
                  + {i.label}
                </button>
              </li>
            ))
          }
        </ul>
      )}
      <p className="mt-1 text-[10px] text-slate-400">
        {selected.length === 0 ? `Leave empty to show all ${itemLabel}s automatically.` : `${selected.length} pinned.`}
      </p>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION PROPERTY PANEL (for JSON sections)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function SectionProps({ section, onChange, onClose, collections, products }: {
  section: ES; onChange: (s: ES) => void; onClose: () => void;
  collections: Collection[]; products: Product[];
}) {
  const up = (patch: object) => onChange({ ...section, ...patch } as ES);
  const lp = (field: string) => (v: string) => up({ [field]: v });
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3 shrink-0">
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition text-lg leading-none">←</button>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Editing</p>
          <p className="text-sm font-black text-slate-900">{META.find((m) => m.type === section.type)?.label ?? section.type}</p>
        </div>
        <Toggle label="" value={!section._hidden} onChange={(v) => up({ _hidden: !v })} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {section.type === "promo" && <>
          <TxtField label="Announcement Text" value={section.text} onChange={lp("text")} />
          <LinkField label="Link URL" value={section.link_url || ""} onChange={lp("link_url")} collections={collections} products={products} />
          <TxtField label="Link button text" value={section.link_text || ""} onChange={lp("link_text")} placeholder="Shop now" />
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Background" value={section.bg_color} onChange={lp("bg_color")} />
            <ColorField label="Text" value={section.text_color} onChange={lp("text_color")} />
          </div>
        </>}
        {section.type === "ticker" && <Toggle label="Show customers ticker" value={section.enabled} onChange={(v) => up({ enabled: v })} />}
        {section.type === "hero" && <>
          <TxtField label="Title" value={section.title} onChange={lp("title")} />
          <TxtField label="Subtitle" value={section.subtitle} onChange={lp("subtitle")} />
          <ImgField label="Background Image" value={section.image_url || ""} onChange={(v) => up({ image_url: v || null })} />
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Overlay" value={section.overlay_color} onChange={lp("overlay_color")} />
            <ColorField label="Text" value={section.text_color} onChange={lp("text_color")} />
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Primary Button</p>
            <TxtField label="Text" value={section.cta_primary_text} onChange={lp("cta_primary_text")} />
            <LinkField label="Link" value={section.cta_primary_href} onChange={lp("cta_primary_href")} collections={collections} products={products} />
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Secondary Button</p>
            <TxtField label="Text" value={section.cta_secondary_text} onChange={lp("cta_secondary_text")} />
            <LinkField label="Link" value={section.cta_secondary_href} onChange={lp("cta_secondary_href")} collections={collections} products={products} />
          </div>
        </>}
        {section.type === "collections" && <>
          <TxtField label="Section title" value={section.title} onChange={lp("title")} />
          <LinkField label="View all link" value={section.view_all_link} onChange={lp("view_all_link")} collections={collections} products={products} pickerDefaultTab="collections" />
          <MultiPick label="Pinned Collections" selected={section.collection_ids} onUpdate={(ids) => up({ collection_ids: ids })} items={collections.map((c) => ({ id: c.id, label: c.title }))} itemLabel="collection" />
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Background" value={section.bg_color} onChange={lp("bg_color")} />
            <ColorField label="Text" value={section.text_color} onChange={lp("text_color")} />
          </div>
        </>}
        {section.type === "products" && <>
          <TxtField label="Section title" value={section.title} onChange={lp("title")} />
          <LinkField label="View all link" value={section.view_all_link} onChange={lp("view_all_link")} collections={collections} products={products} pickerDefaultTab="collections" />
          <MultiPick label="Pinned Products" selected={section.product_ids} onUpdate={(ids) => up({ product_ids: ids })} items={products.map((p) => ({ id: p.id, label: p.name }))} itemLabel="product" />
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Background" value={section.bg_color} onChange={lp("bg_color")} />
            <ColorField label="Text" value={section.text_color} onChange={lp("text_color")} />
          </div>
        </>}
        {section.type === "banner" && <>
          <TxtField label="Title" value={section.title} onChange={lp("title")} />
          <TxtField label="Subtitle" value={section.subtitle || ""} onChange={lp("subtitle")} />
          <ImgField label="Background Image" value={section.image_url || ""} onChange={(v) => up({ image_url: v || null })} />
          <TxtField label="Button text" value={section.button_text} onChange={lp("button_text")} />
          <LinkField label="Button link" value={section.link_url} onChange={lp("link_url")} collections={collections} products={products} />
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Background" value={section.bg_color} onChange={lp("bg_color")} />
            <ColorField label="Text" value={section.text_color} onChange={lp("text_color")} />
          </div>
        </>}
        {section.type === "custom" && <>
          <TxtField label="Title (optional)" value={section.title || ""} onChange={lp("title")} />
          <TxtArea label="HTML content" value={section.content} onChange={lp("content")} rows={10} mono />
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Background" value={section.bg_color} onChange={lp("bg_color")} />
            <ColorField label="Text" value={section.text_color} onChange={lp("text_color")} />
          </div>
        </>}
        {section.type === "liquid" && <>
          <TxtArea label="Liquid template code" value={section.liquid_code} onChange={lp("liquid_code")} rows={12} mono hint='Use {{ section.settings.heading }} to reference settings' />
          <TxtArea label="Section settings (JSON)" value={section.settings_json ?? "{}"} onChange={lp("settings_json")} rows={4} mono />
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Background" value={section.bg_color ?? "#fff"} onChange={lp("bg_color")} />
            <ColorField label="Text" value={section.text_color ?? "#111"} onChange={lp("text_color")} />
          </div>
        </>}
        {section.type === "spacer" && <NumField label="Height" value={section.height_px} onChange={(v) => up({ height_px: v })} min={8} max={400} step={4} />}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUILT-IN SECTION SETTINGS PANEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function BuiltinSettings({ id, label, settings, onUpdate, onClose, collections, products }: {
  id: string; label: string; settings: BuiltinSetting;
  onUpdate: (s: BuiltinSetting) => void; onClose: () => void;
  collections: Collection[]; products: Product[];
}) {
  const up = (patch: Partial<BuiltinSetting>) => onUpdate({ ...settings, ...patch });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3 shrink-0">
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition text-lg leading-none">←</button>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4457A]">Page Section</p>
          <p className="text-sm font-black text-slate-900">{label}</p>
        </div>
        <Toggle label="" value={!settings.hidden} onChange={(v) => up({ hidden: !v })} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <Toggle label="Visible on store" value={!settings.hidden} onChange={(v) => up({ hidden: !v })} hint="Toggle to show/hide this section" />
        <div className="my-1 border-t border-slate-100" />

        {/* ── Promo Strip ── */}
        {id === "promo-strip" && (
          <TxtArea label="Promo messages (one per line)" rows={4}
            value={Array.isArray(settings.messages) ? (settings.messages as string[]).join("\n") : "Free shipping on orders over 500 EGP\nUse code WELCOME10 for 10% off\nNew arrivals every Friday"}
            onChange={(v) => up({ messages: v.split("\n").filter(Boolean) })}
            hint="Each line is a separate rotating message" />
        )}

        {/* ── Category Bar ── */}
        {id === "category-bar" && (
          <TxtArea label="Category labels (one per line)" rows={8}
            value={Array.isArray(settings.categories) ? (settings.categories as string[]).join("\n") : "Bags\nHeels\nSneakers\nWallets\nPerfumes\nSwimwear\nWatches\nBelts\nSunglasses\nLoafers"}
            onChange={(v) => up({ categories: v.split("\n").filter(Boolean) })}
            hint="Each line becomes a tappable category chip" />
        )}

        {/* ── Hero Carousel ── */}
        {id === "hero-carousel" && <>
          <TxtField label="Main headline" value={(settings.title as string) || ""} onChange={(v) => up({ title: v })} placeholder="New Season. New You." />
          <TxtField label="Subtitle" value={(settings.subtitle as string) || ""} onChange={(v) => up({ subtitle: v })} placeholder="Discover the latest from top brands." />
          <TxtField label="Primary button text" value={(settings.cta_text as string) || "Shop Now"} onChange={(v) => up({ cta_text: v })} />
          <LinkField label="Primary button link" value={(settings.cta_href as string) || "/products"} onChange={(v) => up({ cta_href: v })} collections={collections} products={products} />
          <TxtField label="Secondary button text" value={(settings.cta2_text as string) || ""} onChange={(v) => up({ cta2_text: v })} placeholder="View Collections" />
          <LinkField label="Secondary button link" value={(settings.cta2_href as string) || "/collections"} onChange={(v) => up({ cta2_href: v })} collections={collections} products={products} />
          <ImgField label="Hero image URL (slide 1)" value={(settings.image as string) || ""} onChange={(v) => up({ image: v })} />
        </>}

        {/* ── Trust Row ── */}
        {id === "trust-row" && (
          <TxtArea label="Trust badges (one per line)" rows={4}
            value={Array.isArray(settings.badges) ? (settings.badges as string[]).join("\n") : "100% Authentic\nFree Returns\nFast Delivery\nSecure Payment"}
            onChange={(v) => up({ badges: v.split("\n").filter(Boolean) })}
            hint="Each line = one trust badge label" />
        )}

        {/* ── Stats Row ── */}
        {id === "stats-row" && <>
          <TxtArea label="Stats (one per line, e.g. 10K+ Customers)" rows={4}
            value={Array.isArray(settings.stats) ? (settings.stats as string[]).join("\n") : "10K+ Happy Customers\n500+ Top Brands\n100% Authentic Products\n24/7 Live Support"}
            onChange={(v) => up({ stats: v.split("\n").filter(Boolean) })}
            hint="Each line = one stat. Use + or K for formatting." />
        </>}

        {/* ── Hot Prices / Flash Deals / Best Sellers / New Arrivals / Editors Picks / Featured / Trending ── */}
        {["hot-prices","flash-deals","best-sellers","new-arrivals","editors-picks","featured","trending"].includes(id) && <>
          <TxtField label="Section title" value={(settings.title as string) || ""} onChange={(v) => up({ title: v })} placeholder={
            id === "hot-prices" ? "Hot Prices" : id === "flash-deals" ? "Flash Deals" : id === "best-sellers" ? "Best Sellers" :
            id === "new-arrivals" ? "New Arrivals" : id === "editors-picks" ? "Editor's Picks" : id === "featured" ? "Featured" : "Trending Now"
          } />
          {id === "new-arrivals" && (
            <>
              <TxtField label="Section tag" value={(settings.tag as string) || "Just Landed"} onChange={(v) => up({ tag: v })} />
              <LinkField
                label="Products source collection (optional)"
                value={(settings.source_collection as string) || ""}
                onChange={(v) => up({ source_collection: v })}
                collections={collections}
                products={products}
                pickerDefaultTab="collections"
              />
              <NumField
                label="Products to show"
                value={Math.max(1, Math.min(24, Number(settings.product_count) || 4))}
                onChange={(v) => up({ product_count: Math.max(1, Math.min(24, Math.round(v))) })}
                min={1}
                max={24}
                step={1}
                display="plain"
              />
              <TxtArea
                label="Card links (one per product card)"
                rows={4}
                value={Array.isArray(settings.product_links) ? (settings.product_links as string[]).join("\n") : ""}
                onChange={(v) => up({ product_links: v.split("\n").map((s) => s.trim()) })}
                hint="Optional. Line 1 applies to card 1, line 2 to card 2... Leave empty to use each product page."
              />
            </>
          )}
          {id === "best-sellers" && (
            <NumField
              label="Products to show"
              value={Math.max(1, Math.min(24, Number(settings.product_count) || 5))}
              onChange={(v) => up({ product_count: Math.max(1, Math.min(24, Math.round(v))) })}
              min={1}
              max={24}
              step={1}
              display="plain"
            />
          )}
          {["hot-prices", "flash-deals", "editors-picks", "featured", "trending"].includes(id) && (
            <NumField
              label="Products to show"
              value={Math.max(
                1,
                Math.min(
                  24,
                  Number(settings.product_count) ||
                    (id === "editors-picks" ? 3 : id === "flash-deals" ? 6 : 8)
                )
              )}
              onChange={(v) => up({ product_count: Math.max(1, Math.min(24, Math.round(v))) })}
              min={1}
              max={24}
              step={1}
              display="plain"
            />
          )}
          <LinkField label="'View All' link" value={(settings.view_all as string) || "/products"} onChange={(v) => up({ view_all: v })} collections={collections} products={products} pickerDefaultTab="collections" />
          {id === "flash-deals" && (
            <div>
              <FL>Countdown ends at</FL>
              <input type="datetime-local" value={(settings.countdown_to as string) || "2026-04-30T00:00:00"}
                onChange={(e) => up({ countdown_to: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-pink-400" />
            </div>
          )}
        </>}

        {/* ── Campaign Banner ── */}
        {id === "campaign-banner" && <>
          <TxtField label="Eyebrow label" value={(settings.eyebrow as string) || ""} onChange={(v) => up({ eyebrow: v })} placeholder="Eid Al-Fitr 2026 · Limited Collection" />
          <TxtField label="Main title" value={(settings.title as string) || ""} onChange={(v) => up({ title: v })} placeholder="Dressed for your finest moment." />
          <TxtField label="Description" value={(settings.desc as string) || ""} onChange={(v) => up({ desc: v })} placeholder="Curated luxury fashion for every occasion." />
          <ImgField label="Banner background image" value={(settings.image as string) || ""} onChange={(v) => up({ image: v })} />
          <LinkField label="Primary CTA link" value={(settings.cta1_href as string) || "/collections"} onChange={(v) => up({ cta1_href: v })} collections={collections} products={products} />
          <TxtField label="Primary CTA text" value={(settings.cta1_text as string) || "Explore Collection"} onChange={(v) => up({ cta1_text: v })} />
          <LinkField label="Secondary CTA link" value={(settings.cta2_href as string) || "/products"} onChange={(v) => up({ cta2_href: v })} collections={collections} products={products} />
          <TxtField label="Secondary CTA text" value={(settings.cta2_text as string) || "All Products"} onChange={(v) => up({ cta2_text: v })} />
        </>}

        {/* ── Gender Split ── */}
        {id === "gender-split" && <>
          <TxtField label="Women section title" value={(settings.women_title as string) || "Shop Women"} onChange={(v) => up({ women_title: v })} />
          <LinkField label="Women section link" value={(settings.women_href as string) || "/collections"} onChange={(v) => up({ women_href: v })} collections={collections} products={products} />
          <ImgField label="Women image URL" value={(settings.women_image as string) || ""} onChange={(v) => up({ women_image: v })} />
          <div className="border-t border-slate-100 pt-3" />
          <TxtField label="Men section title" value={(settings.men_title as string) || "Shop Men"} onChange={(v) => up({ men_title: v })} />
          <LinkField label="Men section link" value={(settings.men_href as string) || "/collections"} onChange={(v) => up({ men_href: v })} collections={collections} products={products} />
          <ImgField label="Men image URL" value={(settings.men_image as string) || ""} onChange={(v) => up({ men_image: v })} />
        </>}

        {/* ── Brands Strip ── */}
        {id === "brands-strip" && (
          <TxtArea label="Brand names (one per line)" rows={8}
            value={Array.isArray(settings.brands) ? (settings.brands as string[]).join("\n") : "LOUIS VUITTON\nGUCCI\nHERMÈS\nDIOR\nVALENTINO\nCHANEL\nPRADA\nFENDI"}
            onChange={(v) => up({ brands: v.split("\n").filter(Boolean) })}
            hint="Each line is a scrolling brand name" />
        )}

        {/* ── Gift Ideas ── */}
        {id === "gift-ideas" && <>
          <TxtField label="Section title" value={(settings.title as string) || "Gift Ideas"} onChange={(v) => up({ title: v })} />
          <TxtArea label="Gift categories (one per line, e.g. For Her)" rows={4}
            value={Array.isArray(settings.categories) ? (settings.categories as string[]).join("\n") : "For Her\nFor Him\nUnder 500 EGP\nBest Sellers"}
            onChange={(v) => up({ categories: v.split("\n").filter(Boolean) })}
            hint="Each line is a gift category chip" />
          <LinkField label="Shop All Gifts link" value={(settings.view_all as string) || "/products"} onChange={(v) => up({ view_all: v })} collections={collections} products={products} pickerDefaultTab="collections" />
        </>}

        {/* ── Price Tiers ── */}
        {id === "price-tiers" && <>
          <TxtField label="Section title" value={(settings.title as string) || "Shop by Budget"} onChange={(v) => up({ title: v })} />
          <TxtArea label="Price tiers (one per line, e.g. Under 500 EGP)" rows={4}
            value={Array.isArray(settings.tiers) ? (settings.tiers as string[]).join("\n") : "Under 500 EGP\n500–1000 EGP\n1000–2500 EGP\nLuxury 2500+ EGP"}
            onChange={(v) => up({ tiers: v.split("\n").filter(Boolean) })} />
        </>}

        {/* ── Buy 2 Get 1 ── */}
        {id === "buy2get1" && <>
          <TxtField label="Eyebrow" value={(settings.eyebrow as string) || "Eid Offer"} onChange={(v) => up({ eyebrow: v })} />
          <TxtField label="Title" value={(settings.title as string) || "BUY 2 GET 1 FREE"} onChange={(v) => up({ title: v })} />
          <TxtField label="Description" value={(settings.desc as string) || ""} onChange={(v) => up({ desc: v })} placeholder="Buy any 2 items — bags, shoes, or accessories..." />
          <LinkField label="Button link" value={(settings.cta_href as string) || "/products"} onChange={(v) => up({ cta_href: v })} collections={collections} products={products} />
          <TxtField label="Button text" value={(settings.cta_text as string) || "Shop the Offer"} onChange={(v) => up({ cta_text: v })} />
        </>}

        {/* ── Category Grid ── */}
        {id === "category-grid" && <>
          <TxtField label="Section title" value={(settings.title as string) || "Shop by Category"} onChange={(v) => up({ title: v })} />
          <TxtArea label="Category names (one per line)" rows={6}
            value={Array.isArray(settings.items) ? (settings.items as string[]).join("\n") : "Bags\nHeels\nSneakers\nWatches\nPerfumes\nBelts"}
            onChange={(v) => up({ items: v.split("\n").filter(Boolean) })}
            hint="Up to 6 categories shown as grid squares" />
        </>}

        {/* ── Mystery Box ── */}
        {id === "mystery-box" && <>
          <TxtField label="Title" value={(settings.title as string) || "Mystery Box"} onChange={(v) => up({ title: v })} />
          <TxtField label="Subtitle" value={(settings.subtitle as string) || ""} onChange={(v) => up({ subtitle: v })} placeholder="Surprise someone special with a curated gift" />
          <TxtField label="Price label" value={(settings.price as string) || "Starting from 299 EGP"} onChange={(v) => up({ price: v })} />
          <ImgField label="Box image URL" value={(settings.image as string) || ""} onChange={(v) => up({ image: v })} />
          <LinkField label="Shop link" value={(settings.href as string) || "/products"} onChange={(v) => up({ href: v })} collections={collections} products={products} />
          <TxtField label="Button text" value={(settings.cta_text as string) || "Get Your Box"} onChange={(v) => up({ cta_text: v })} />
        </>}

        {/* ── Text Banner ── */}
        {id === "text-banner" && <>
          <TxtField label="Eyebrow" value={(settings.eyebrow as string) || ""} onChange={(v) => up({ eyebrow: v })} />
          <TxtField label="Title" value={(settings.title as string) || ""} onChange={(v) => up({ title: v })} />
          <TxtField label="Button text" value={(settings.cta_text as string) || ""} onChange={(v) => up({ cta_text: v })} />
          <LinkField label="Button link" value={(settings.cta_href as string) || "/products"} onChange={(v) => up({ cta_href: v })} collections={collections} products={products} />
          <Toggle label="Dark background" value={(settings.dark as boolean) !== false} onChange={(v) => up({ dark: v })} />
        </>}

        {/* ── Social Ticker ── */}
        {id === "social-ticker" && <>
          <TxtField label="Ticker prefix" value={(settings.prefix as string) || "Someone just bought"} onChange={(v) => up({ prefix: v })} />
          <TxtArea label="Items to ticker (one per line)" rows={5}
            value={Array.isArray(settings.items) ? (settings.items as string[]).join("\n") : "a Black Chanel Bag\na Louis Vuitton Wallet\nRed Heels from Zara\na Gold Watch"}
            onChange={(v) => up({ items: v.split("\n").filter(Boolean) })}
            hint="Each line = one random purchase notification" />
        </>}

        {/* ── WhatsApp ── */}
        {id === "whatsapp" && <>
          <TxtField label="Title" value={(settings.title as string) || "Need help? Chat with us"} onChange={(v) => up({ title: v })} />
          <TxtField label="Subtitle" value={(settings.subtitle as string) || "Instant replies on WhatsApp"} onChange={(v) => up({ subtitle: v })} />
          <TxtField label="WhatsApp link" value={(settings.href as string) || "#"} onChange={(v) => up({ href: v })} placeholder="https://wa.me/201234567890" />
        </>}

        {/* ── Pay Later ── */}
        {id === "pay-later" && <>
          <TxtField label="Main title" value={(settings.title as string) || "Pay Later. Wear Now."} onChange={(v) => up({ title: v })} />
          <TxtField label="Description" value={(settings.desc as string) || ""} onChange={(v) => up({ desc: v })} placeholder="From LE 500/month with zero interest..." />
          <TxtArea label="BNPL providers (comma-separated)" rows={2}
            value={Array.isArray(settings.providers) ? (settings.providers as string[]).join(", ") : "TRU, ValU, SUHOOLA, HALAN"}
            onChange={(v) => up({ providers: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
        </>}

        {/* ── Quick Links ── */}
        {id === "quick-links" && <>
          <TxtArea label="Quick link labels (one per line)" rows={6}
            value={Array.isArray(settings.links) ? (settings.links as string[]).join("\n") : "Sale\nNew In\nBags\nShoes\nAccessories\nPerfumes"}
            onChange={(v) => up({ links: v.split("\n").filter(Boolean) })}
            hint="Each line = one pill/chip below the search bar" />
        </>}

        {/* ── Hero Section ── */}
        {id === "hero" && <>
          <TxtField label="Badge text" value={(settings.badge as string) || "✦ Eid Collection 2025"} onChange={(v) => up({ badge: v })} />
          <TxtField label="Main headline" value={(settings.title as string) || ""} onChange={(v) => up({ title: v })} placeholder="Wear What Makes You Unforgettable" />
          <TxtField label="Subtitle" value={(settings.subtitle as string) || ""} onChange={(v) => up({ subtitle: v })} placeholder="Luxury bags, heels & fragrance..." />
          <TxtField label="Primary button text" value={(settings.cta1_text as string) || "Shop Now →"} onChange={(v) => up({ cta1_text: v })} />
          <LinkField label="Primary button link" value={(settings.cta1_href as string) || "/products"} onChange={(v) => up({ cta1_href: v })} collections={collections} products={products} />
          <TxtField label="Secondary button text" value={(settings.cta2_text as string) || "Watch Live ▶"} onChange={(v) => up({ cta2_text: v })} />
        </>}

        {/* ── Shop by Style ── */}
        {id === "shop-by-style" && <>
          <TxtField label="Section tag" value={(settings.tag as string) || "Collections"} onChange={(v) => up({ tag: v })} />
          <TxtField label="Section title" value={(settings.title as string) || "Shop by Style"} onChange={(v) => up({ title: v })} />
          <TxtField label="Women section label" value={(settings.women_label as string) || "New Collection"} onChange={(v) => up({ women_label: v })} />
          <TxtField label="Women section title" value={(settings.women_title as string) || "Shop Women"} onChange={(v) => up({ women_title: v })} />
          <LinkField label="Women section link" value={(settings.women_href as string) || "/collections"} onChange={(v) => up({ women_href: v })} collections={collections} products={products} />
          <ImgField label="Women image URL" value={(settings.women_image as string) || ""} onChange={(v) => up({ women_image: v })} />
          <TxtField label="Men section label" value={(settings.men_label as string) || "New Arrivals"} onChange={(v) => up({ men_label: v })} />
          <TxtField label="Men section title" value={(settings.men_title as string) || "Shop Men"} onChange={(v) => up({ men_title: v })} />
          <LinkField label="Men section link" value={(settings.men_href as string) || "/collections"} onChange={(v) => up({ men_href: v })} collections={collections} products={products} />
          <ImgField label="Men image URL" value={(settings.men_image as string) || ""} onChange={(v) => up({ men_image: v })} />
        </>}

        {/* ── Categories ── */}
        {id === "categories" && (() => {
          type CategoryRow = { name: string; count: string; link: string; image: string; icon: string };
          const defaults: CategoryRow[] = [
            { name: "Bags", count: "240 items", link: "/products?q=Bags", image: "", icon: "👜" },
            { name: "Heels", count: "180 items", link: "/products?q=Heels", image: "", icon: "👠" },
            { name: "Sneakers", count: "95 items", link: "/products?q=Sneakers", image: "", icon: "👟" },
            { name: "Loafers", count: "76 items", link: "/products?q=Loafers", image: "", icon: "🥿" },
            { name: "Ballerinas", count: "58 items", link: "/products?q=Ballerinas", image: "", icon: "🩰" },
            { name: "Boots", count: "112 items", link: "/products?q=Boots", image: "", icon: "👢" },
            { name: "Perfumes", count: "148 items", link: "/products?q=Perfumes", image: "", icon: "🌸" },
            { name: "Gifts", count: "44 items", link: "/products?q=Gifts", image: "", icon: "🎁" },
          ];
          const rawLines = Array.isArray(settings.categories) && settings.categories.length > 0
            ? (settings.categories as string[])
            : defaults.map((d) => `${d.name}|${d.count}|${d.link}|${d.image}|${d.icon}`);
          const rows: CategoryRow[] = rawLines.map((line, i) => {
            const parts = line.split("|").map((s) => s.trim());
            const fallback = defaults[i % defaults.length];
            return {
              name: parts[0] || fallback.name,
              count: parts[1] || fallback.count,
              link: parts[2] || fallback.link,
              image: parts[3] || "",
              icon: parts[4] || fallback.icon,
            };
          });
          const saveRows = (nextRows: CategoryRow[]) => {
            const lines = nextRows
              .map((r) => `${r.name}|${r.count}|${r.link}|${r.image}|${r.icon}`)
              .filter((line) => line.split("|")[0].trim().length > 0);
            up({ categories: lines });
          };
          return <>
            <TxtField label="Section tag" value={(settings.tag as string) || "Browse"} onChange={(v) => up({ tag: v })} />
            <TxtField label="Section title" value={(settings.title as string) || "Shop by Category"} onChange={(v) => up({ title: v })} />
            <LinkField label="'All' link" value={(settings.view_all as string) || "/products"} onChange={(v) => up({ view_all: v })} collections={collections} products={products} pickerDefaultTab="collections" />

            <div className="space-y-3">
              <FL>Category items</FL>
              {rows.map((row, idx) => (
                <div key={`cat-row-${idx}`} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-500">Category {idx + 1}</div>
                  <TxtField
                    label="Name"
                    value={row.name}
                    onChange={(v) => {
                      const next = rows.slice();
                      next[idx] = { ...next[idx], name: v };
                      saveRows(next);
                    }}
                  />
                  <TxtField
                    label="Count text"
                    value={row.count}
                    onChange={(v) => {
                      const next = rows.slice();
                      next[idx] = { ...next[idx], count: v };
                      saveRows(next);
                    }}
                  />
                  <LinkField
                    label="Link"
                    value={row.link}
                    onChange={(v) => {
                      const next = rows.slice();
                      next[idx] = { ...next[idx], link: v };
                      saveRows(next);
                    }}
                    collections={collections}
                    products={products}
                  />
                  <ImgField
                    label="Image URL (optional)"
                    value={row.image}
                    onChange={(v) => {
                      const next = rows.slice();
                      next[idx] = { ...next[idx], image: v };
                      saveRows(next);
                    }}
                  />
                  <TxtField
                    label="Icon (used when image is empty)"
                    value={row.icon}
                    onChange={(v) => {
                      const next = rows.slice();
                      next[idx] = { ...next[idx], icon: v };
                      saveRows(next);
                    }}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const next = rows.filter((_, i) => i !== idx);
                        saveRows(next);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => saveRows([...rows, { name: "New Category", count: "0 items", link: "/products", image: "", icon: "✨" }])}
                className="w-full rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                + Add category
              </button>
            </div>
          </>;
        })()}

        {/* ── Hot Offers ── */}
        {id === "hot-offers" && (() => {
          type OfferRow = {
            tag: string;
            title: string;
            subtitle: string;
            link: string;
            buttonText: string;
            image: string;
            icon: string;
            bg: string;
          };
          const defaults: OfferRow[] = [
            { tag: "Up to 50% off", title: "Eid Sale\nHas Arrived", subtitle: "All bags & shoes this week", link: "/products?q=sale", buttonText: "Shop Sale →", image: "", icon: "👜", bg: "linear-gradient(140deg, #1A0818, #2E1228, #1E0A20)" },
            { tag: "−30% Heels", title: "New Season\nArrivals", subtitle: "Fresh drops every Friday", link: "/products?q=heels", buttonText: "Explore →", image: "", icon: "👠", bg: "linear-gradient(140deg, #F9E0EA, #F4C0D0)" },
            { tag: "Free Gift", title: "Buy 2\nGet 1 Free", subtitle: "All perfumes this month", link: "/products?q=perfumes", buttonText: "Shop →", image: "", icon: "🌸", bg: "linear-gradient(140deg, #E8F4F8, #C8E4EE)" },
            { tag: "Premium", title: "Gift Sets\nfor Her", subtitle: "Curated luxury boxes", link: "/products?q=gift", buttonText: "Shop →", image: "", icon: "💎", bg: "linear-gradient(145deg, #FDE8F0, #F9D4E8)" },
            { tag: "Accessories", title: "New In\nAccessories", subtitle: "Scarves, belts & more", link: "/products?q=accessories", buttonText: "Shop →", image: "", icon: "✨", bg: "linear-gradient(145deg, #F4F4E0, #EDE8C0)" },
          ];
          const rawLines = Array.isArray(settings.offers) && settings.offers.length > 0
            ? (settings.offers as string[])
            : defaults.map((o) => `${o.tag}|${o.title}|${o.subtitle}|${o.link}|${o.buttonText}|${o.image}|${o.icon}|${o.bg}`);
          const rows: OfferRow[] = rawLines.map((line, i) => {
            const parts = line.split("|").map((s) => s.trim());
            const fallback = defaults[i % defaults.length];
            return {
              tag: parts[0] || fallback.tag,
              title: parts[1] || fallback.title,
              subtitle: parts[2] || fallback.subtitle,
              link: parts[3] || fallback.link,
              buttonText: parts[4] || fallback.buttonText,
              image: parts[5] || "",
              icon: parts[6] || fallback.icon,
              bg: parts[7] || fallback.bg,
            };
          });
          const saveRows = (nextRows: OfferRow[]) => {
            const lines = nextRows
              .map((r) => `${r.tag}|${r.title}|${r.subtitle}|${r.link}|${r.buttonText}|${r.image}|${r.icon}|${r.bg}`)
              .filter((line) => line.split("|")[0].trim().length > 0);
            up({ offers: lines });
          };
          return <>
            <TxtField label="Section tag" value={(settings.tag as string) || "🔥 Limited Time"} onChange={(v) => up({ tag: v })} />
            <TxtField label="Section title" value={(settings.title as string) || "Hot Offers"} onChange={(v) => up({ title: v })} />
            <LinkField label="'All Offers' link" value={(settings.view_all as string) || "/products?q=sale"} onChange={(v) => up({ view_all: v })} collections={collections} products={products} pickerDefaultTab="collections" />
            <div className="space-y-3">
              <FL>Offer cards</FL>
              {rows.map((row, idx) => (
                <div key={`offer-row-${idx}`} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-500">Offer {idx + 1}{idx === 0 ? " (featured)" : ""}</div>
                  <TxtField label="Tag" value={row.tag} onChange={(v) => { const next = rows.slice(); next[idx] = { ...next[idx], tag: v }; saveRows(next); }} />
                  <TxtArea label="Title" rows={2} value={row.title} onChange={(v) => { const next = rows.slice(); next[idx] = { ...next[idx], title: v }; saveRows(next); }} />
                  <TxtField label="Subtitle" value={row.subtitle} onChange={(v) => { const next = rows.slice(); next[idx] = { ...next[idx], subtitle: v }; saveRows(next); }} />
                  <LinkField label="Button/Card link" value={row.link} onChange={(v) => { const next = rows.slice(); next[idx] = { ...next[idx], link: v }; saveRows(next); }} collections={collections} products={products} />
                  <TxtField label="Button text" value={row.buttonText} onChange={(v) => { const next = rows.slice(); next[idx] = { ...next[idx], buttonText: v }; saveRows(next); }} />
                  <ImgField label="Image URL (optional)" value={row.image} onChange={(v) => { const next = rows.slice(); next[idx] = { ...next[idx], image: v }; saveRows(next); }} />
                  <TxtField label="Icon (used when image is empty)" value={row.icon} onChange={(v) => { const next = rows.slice(); next[idx] = { ...next[idx], icon: v }; saveRows(next); }} />
                  <TxtField label="Background (CSS gradient/color)" value={row.bg} onChange={(v) => { const next = rows.slice(); next[idx] = { ...next[idx], bg: v }; saveRows(next); }} />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const next = rows.filter((_, i) => i !== idx);
                        saveRows(next);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => saveRows([...rows, { tag: "New Offer", title: "Offer Title", subtitle: "Offer subtitle", link: "/products", buttonText: "Shop →", image: "", icon: "✨", bg: "linear-gradient(145deg, #FDE8F0, #F9D4E8)" }])}
                className="w-full rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                + Add offer
              </button>
            </div>
          </>;
        })()}

        {/* ── Installments ── */}
        {id === "installments" && <>
          <TxtField label="Tag text" value={(settings.tag as string) || "💳 Pay Easy"} onChange={(v) => up({ tag: v })} />
          <TxtField label="Main title" value={(settings.title as string) || "Shop Now, Pay in Installments"} onChange={(v) => up({ title: v })} />
          <TxtField label="Description" value={(settings.desc as string) || ""} onChange={(v) => up({ desc: v })} placeholder="0% interest on orders above EGP 1,000..." />
          <TxtArea label="Providers (one per line)" rows={4}
            value={Array.isArray(settings.providers) ? (settings.providers as string[]).join("\n") : "Shahry\nvalU\nSympl\nVisa"}
            onChange={(v) => up({ providers: v.split("\n").filter(Boolean) })} />
          <TxtField label="Button text" value={(settings.button_text as string) || "Shop on Installments →"} onChange={(v) => up({ button_text: v })} />
          <LinkField
            label="Button link"
            value={(settings.button_href as string) || "/products"}
            onChange={(v) => up({ button_href: v })}
            collections={collections}
            products={products}
          />
        </>}

        {/* ── Mix & Match ── */}
        {id === "mix-match" && (() => {
          const mixCount = mixMatchActiveCount(settings);
          const slots = ensureMixSlotsArray(settings, mixCount);
          const patchSlot = (index: number, patch: Partial<MixMatchSlotSetting>) => {
            const next = ensureMixSlotsArray(settings, mixCount);
            next[index] = { ...next[index], ...patch };
            up({ mix_slots: next });
          };
          return (
            <>
              <TxtField label="Section tag" value={(settings.tag as string) || "Style Together"} onChange={(v) => up({ tag: v })} />
              <TxtField label="Section title" value={(settings.title as string) || "Mix & Match"} onChange={(v) => up({ title: v })} hint="Use & to split: text after & is shown in pink italics (e.g. Mix & Match)." />
              <TxtField label="Build a look — link text" value={(settings.build_look_text as string) || "Build a look →"} onChange={(v) => up({ build_look_text: v })} />
              <LinkField
                label="Build a look — URL"
                value={(settings.build_look_href as string) || "/products"}
                onChange={(v) => up({ build_look_href: v })}
                collections={collections}
                products={products}
              />
              <TxtField
                label="Bundle button label"
                value={(settings.bundle_button_text as string) || "Add Full Look to Cart"}
                onChange={(v) => up({ bundle_button_text: v })}
                hint="The total price (LE …) is added automatically after this text."
              />
              <NumField
                label="Number of products"
                value={mixCount}
                onChange={(v) => {
                  const next = Math.min(4, Math.max(1, Math.round(v)));
                  const full = ensureMixSlotsArray(settings, Math.max(mixCount, next));
                  up({ mix_slot_count: next, mix_slots: full.slice(0, next) });
                }}
                min={1}
                max={4}
                step={1}
                display="plain"
              />
              <p className="text-[10px] text-slate-500 -mt-3 mb-1">Choose a product and the copy for each slot (best for mobile layout).</p>
              {slots.map((slot, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[#D4457A]">Slot {idx + 1}</p>
                  <div>
                    <FL>Product</FL>
                    <MixSlotProductSelector
                      products={products}
                      value={slot.product_id || ""}
                      onChange={(id) => patchSlot(idx, { product_id: id })}
                    />
                  </div>
                  <TxtField
                    label="Pill label (top badge)"
                    value={slot.pill || ""}
                    onChange={(v) => patchSlot(idx, { pill: v })}
                    placeholder={["The Bag", "The Heel", "The Scent", "The Accent"][idx]}
                  />
                  <TxtField
                    label="Title on card (optional)"
                    value={slot.title || ""}
                    onChange={(v) => patchSlot(idx, { title: v })}
                    placeholder="Leave empty to use product name"
                  />
                  <TxtField
                    label="Subline (optional)"
                    value={slot.sub || ""}
                    onChange={(v) => patchSlot(idx, { sub: v })}
                    placeholder="Leave empty for LE + price"
                  />
                </div>
              ))}
              <TxtArea
                label="Tile backgrounds (optional)"
                rows={4}
                mono
                value={Array.isArray(settings.tile_backgrounds) ? (settings.tile_backgrounds as string[]).join("\n") : ""}
                onChange={(v) => up({ tile_backgrounds: v.split("\n").map((s) => s.trim()) })}
                hint="One CSS linear-gradient per line, aligned to slots 1–4. Empty line = default gradient."
              />
            </>
          );
        })()}

        {/* ── Last Chance ── */}
        {id === "last-chance" && <>
          <TxtField label="Section tag" value={(settings.tag as string) || "⏳ Almost Gone"} onChange={(v) => up({ tag: v })} />
          <TxtField label="Section title" value={(settings.title as string) || "Last Chance"} onChange={(v) => up({ title: v })} hint="Last word is shown in pink italic (e.g. Last Chance → Last + Chance)" />
          <NumField
            label="Products to show"
            value={Math.max(1, Math.min(24, Number(settings.product_count) || 6))}
            onChange={(v) => up({ product_count: Math.max(1, Math.min(24, Math.round(v))) })}
            min={1}
            max={24}
            step={1}
            display="plain"
          />
          <LinkField
            label="'View All' link"
            value={(settings.view_all as string) || "/products?q=sale"}
            onChange={(v) => up({ view_all: v })}
            collections={collections}
            products={products}
            pickerDefaultTab="collections"
          />
        </>}
      </div>
    </div>
  );
}

// ─── Add Section Modal ────────────────────────────────────────────────────────
function AddSectionModal({ onAdd, onClose }: { onAdd: (type: HomeSectionType) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900">Add Section</h3>
            <p className="text-xs text-slate-500">Add a new editable section to the page</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="grid grid-cols-3 gap-2 p-4">
          {META.map((m) => (
            <button key={m.type} onClick={() => { onAdd(m.type); onClose(); }}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3 text-center transition hover:border-[#D4457A] hover:bg-pink-50 active:scale-[0.97]">
              <span className="text-2xl">{m.icon}</span>
              <span className="text-[11px] font-bold text-slate-700 leading-tight">{m.label}</span>
              <span className="text-[9px] text-slate-400 leading-tight">{m.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Navigation Tab ────────────────────────────────────────────────────────────
interface NavMenuItem {
  id: string;
  label: string;
  href: string;
  submenu?: NavMenuItem[];
}

function resolveNavPickerHref(links: NavMenuItem[], lp: string): string {
  const top = links.find((l) => l.id === lp);
  if (top) return top.href || "";
  for (const l of links) {
    const sub = (l.submenu || []).find((s) => s.id === lp);
    if (sub) return sub.href || "";
  }
  return "";
}

function NavTab({ theme, setTheme, collections, products }: {
  theme: ThemeSettings; setTheme: (p: Partial<ThemeSettings>) => void;
  collections: Collection[]; products: Product[];
}) {
  const [links, setLinks] = useState<NavMenuItem[]>(() => {
    try {
      const parsed = JSON.parse(theme.nav_json || "{}").top || [];
      // Ensure all items have IDs
      return parsed.map((item: NavMenuItem) => ({
        ...item,
        id: item.id || Math.random().toString(36).substr(2, 9),
        submenu: item.submenu?.map((sub: NavMenuItem) => ({
          ...sub,
          id: sub.id || Math.random().toString(36).substr(2, 9),
        })) || [],
      }));
    } catch {
      return [];
    }
  });

  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [lp, setLp] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const save = (next: NavMenuItem[]) => {
    setLinks(next);
    try {
      const existing = JSON.parse(theme.nav_json || "{}");
      setTheme({ nav_json: JSON.stringify({ ...existing, top: next }) });
    } catch {
      setTheme({ nav_json: JSON.stringify({ top: next }) });
    }
  };

  const addLink = () => {
    save([...links, { id: Math.random().toString(36).substr(2, 9), label: "New Link", href: "/", submenu: [] }]);
  };

  const addSubmenu = (parentId: string) => {
    const updated = links.map(link => {
      if (link.id === parentId) {
        return {
          ...link,
          submenu: [...(link.submenu || []), { id: Math.random().toString(36).substr(2, 9), label: "Submenu Item", href: "/" }],
        };
      }
      return link;
    });
    save(updated);
  };

  const deleteLink = (id: string) => {
    save(links.filter(link => link.id !== id));
  };

  const deleteSubmenu = (parentId: string, submenuId: string) => {
    const updated = links.map(link => {
      if (link.id === parentId) {
        return {
          ...link,
          submenu: (link.submenu || []).filter(sub => sub.id !== submenuId),
        };
      }
      return link;
    });
    save(updated);
  };

  const updateLink = (id: string, field: string, value: string) => {
    const updated = links.map(link => {
      if (link.id === id) {
        return { ...link, [field]: value };
      }
      return link;
    });
    save(updated);
  };

  const updateSubmenu = (parentId: string, submenuId: string, field: string, value: string) => {
    const updated = links.map(link => {
      if (link.id === parentId) {
        return {
          ...link,
          submenu: (link.submenu || []).map(sub => {
            if (sub.id === submenuId) {
              return { ...sub, [field]: value };
            }
            return sub;
          }),
        };
      }
      return link;
    });
    save(updated);
  };

  const moveLink = (fromIndex: number, toIndex: number) => {
    const updated = [...links];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    save(updated);
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-900">Navigation Menu</h3>
          <p className="text-[11px] text-slate-500">Create menus with submenus • Drag to reorder</p>
        </div>
        <button onClick={addLink}
          className="rounded-lg border border-[#D4457A] px-3 py-1.5 text-xs font-bold text-[#D4457A] hover:bg-pink-50 transition">
          + Add Item
        </button>
      </div>

      <ul className="space-y-2">
        {links.map((link, index) => (
          <div key={link.id}>
            <li
              draggable
              onDragStart={() => setDraggedItem(link.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedItem && draggedItem !== link.id) {
                  const draggedIndex = links.findIndex(l => l.id === draggedItem);
                  moveLink(draggedIndex, index);
                  setDraggedItem(null);
                }
              }}
              className={`rounded-xl border bg-white p-3 space-y-2 transition ${
                draggedItem === link.id ? "opacity-50 border-pink-400" : "border-slate-200"
              } cursor-move hover:border-slate-300`}
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">⋮⋮</span>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input
                    value={link.label}
                    onChange={(e) => updateLink(link.id, "label", e.target.value)}
                    placeholder="Menu Label"
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-pink-400"
                  />
                  <div className="flex gap-1">
                    <input
                      value={link.href}
                      onChange={(e) => updateLink(link.id, "href", e.target.value)}
                      placeholder="/products"
                      className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-pink-400 min-w-0"
                    />
                    <button onClick={() => setLp(link.id)} className="shrink-0 border border-slate-200 rounded-lg px-2 text-xs text-slate-500 hover:bg-slate-50">🔗</button>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleExpanded(link.id)}
                    title={expandedItems.has(link.id) ? "Hide sub-items" : "Add / show sub-items"}
                    className={`shrink-0 border rounded-lg px-2 py-1.5 text-xs font-bold transition ${
                      expandedItems.has(link.id)
                        ? "border-pink-300 bg-pink-50 text-[#D4457A]"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {expandedItems.has(link.id) ? "⊖" : "⊕"}
                  </button>
                  <button onClick={() => deleteLink(link.id)} className="shrink-0 text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                </div>
              </div>
            </li>

            {/* Submenu Items */}
            {expandedItems.has(link.id) && (
              <ul className="ml-6 mt-2 space-y-2 border-l-2 border-slate-200 pl-3">
                {(link.submenu || []).map((submenu) => (
                  <li key={submenu.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300 text-xs">→</span>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          value={submenu.label}
                          onChange={(e) => updateSubmenu(link.id, submenu.id, "label", e.target.value)}
                          placeholder="Submenu Label"
                          className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-pink-400"
                        />
                        <div className="flex gap-1">
                          <input
                            value={submenu.href}
                            onChange={(e) => updateSubmenu(link.id, submenu.id, "href", e.target.value)}
                            placeholder="/products"
                            className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-pink-400 min-w-0"
                          />
                          <button onClick={() => setLp(submenu.id)} className="shrink-0 border border-slate-200 rounded-lg px-2 text-xs text-slate-500 hover:bg-slate-50">🔗</button>
                        </div>
                      </div>
                      <button onClick={() => deleteSubmenu(link.id, submenu.id)} className="shrink-0 text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                    </div>
                  </li>
                ))}
                <button
                  onClick={() => addSubmenu(link.id)}
                  className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition"
                >
                  + Add Submenu Item
                </button>
              </ul>
            )}
          </div>
        ))}
        {links.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
            No menu items. Click + Add Item.
          </li>
        )}
      </ul>

      {lp !== null && (() => {
        const pickerHref = resolveNavPickerHref(links, lp);
        return (
          <LinkPicker
            value={pickerHref}
            initialTab={linkPickerInitialTab(pickerHref)}
            onSelect={(href) => {
              const link = links.find((l) => l.id === lp);
              if (link) {
                updateLink(link.id, "href", href);
              } else {
                links.forEach((l) => {
                  (l.submenu || []).forEach((sub) => {
                    if (sub.id === lp) updateSubmenu(l.id, sub.id, "href", href);
                  });
                });
              }
              setLp(null);
            }}
            onClose={() => setLp(null)}
            collections={collections}
            products={products}
          />
        );
      })()}
    </div>
  );
}

// ─── Footer Tab (per-block list + settings, matches preview EditableSections) ─
function FooterSectionPanel({
  sectionId,
  theme,
  setTheme,
  onClose,
}: {
  sectionId: string;
  theme: ThemeSettings;
  setTheme: (p: Partial<ThemeSettings>) => void;
  onClose: () => void;
}) {
  const f = useMemo(() => mergeFooterSettings(theme.footer_json), [theme.footer_json]);
  const patch = (partial: Partial<StoreFooterSettings>) => {
    setTheme({ footer_json: JSON.stringify({ ...f, ...partial }) });
  };
  const meta = FOOTER_EDITOR_SECTIONS.find((s) => s.id === sectionId);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-2.5">
        <button type="button" onClick={onClose} className="text-lg leading-none text-slate-400 hover:text-slate-700" aria-label="Back">
          ‹
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4457A]">Footer block</p>
          <p className="truncate text-sm font-black text-slate-900">{meta?.label ?? sectionId}</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-5">
        {sectionId === "footer-promo" && (
          <TxtField label="Top promo banner" value={f.promo_banner} onChange={(v) => patch({ promo_banner: v })} />
        )}
        {sectionId === "footer-brand" && (
          <>
            <TxtField label="Brand name" value={f.brand_name} onChange={(v) => patch({ brand_name: v })} />
            <TxtArea label="Tagline / description" rows={3} value={f.brand_tagline} onChange={(v) => patch({ brand_tagline: v })} />
            <TxtField label="Instagram URL" value={f.social_instagram} onChange={(v) => patch({ social_instagram: v })} placeholder="https://instagram.com/..." />
            <TxtField label="TikTok URL" value={f.social_tiktok} onChange={(v) => patch({ social_tiktok: v })} />
            <TxtField label="WhatsApp / third icon URL" value={f.social_whatsapp} onChange={(v) => patch({ social_whatsapp: v })} placeholder="https://wa.me/..." />
          </>
        )}
        {sectionId === "footer-quick-shop" && (
          <>
            <TxtField label="Quick Shop heading" value={f.quick_shop_heading} onChange={(v) => patch({ quick_shop_heading: v })} />
            <TxtArea
              label="Quick Shop links"
              rows={8}
              mono
              value={footerLinksToLines(f.quick_shop_links)}
              onChange={(v) => patch({ quick_shop_links: footerLinksFromLines(v) })}
              hint="One per line: Label|/url — e.g. Bags|/products?q=bags"
            />
          </>
        )}
        {sectionId === "footer-information" && (
          <>
            <TxtField label="Information heading" value={f.info_heading} onChange={(v) => patch({ info_heading: v })} />
            <TxtArea
              label="Information links"
              rows={7}
              mono
              value={footerLinksToLines(f.info_links)}
              onChange={(v) => patch({ info_links: footerLinksFromLines(v) })}
              hint="One per line: Label|/url"
            />
          </>
        )}
        {sectionId === "footer-pay-later" && (
          <>
            <TxtField label="Pay Later heading" value={f.pay_later_heading} onChange={(v) => patch({ pay_later_heading: v })} />
            <TxtArea
              label="Provider badges (one per line)"
              rows={4}
              value={stringsToLines(f.pay_later_providers)}
              onChange={(v) => patch({ pay_later_providers: stringsFromLines(v) })}
            />
            <TxtField label="Pay later subtext" value={f.pay_later_subtext} onChange={(v) => patch({ pay_later_subtext: v })} />
          </>
        )}
        {sectionId === "footer-contact" && (
          <>
            <TxtField label="Contact heading" value={f.contact_heading} onChange={(v) => patch({ contact_heading: v })} />
            <TxtField label="WhatsApp button link" value={f.contact_whatsapp_href} onChange={(v) => patch({ contact_whatsapp_href: v })} placeholder="https://wa.me/..." />
            <TxtField label="WhatsApp button label" value={f.contact_button_label} onChange={(v) => patch({ contact_button_label: v })} />
          </>
        )}
        {sectionId === "footer-we-accept" && (
          <>
            <TxtField label="We Accept heading" value={f.we_accept_heading} onChange={(v) => patch({ we_accept_heading: v })} />
            <TxtArea
              label="Payment methods (one per line)"
              rows={4}
              value={stringsToLines(f.payment_methods)}
              onChange={(v) => patch({ payment_methods: stringsFromLines(v) })}
            />
          </>
        )}
        {sectionId === "footer-copyright" && (
          <TxtField
            label="Copyright brand name"
            value={f.copyright_brand}
            onChange={(v) => patch({ copyright_brand: v })}
            hint="Shown in pink in the © line"
          />
        )}
        <button
          type="button"
          onClick={() => setTheme({ footer_json: defaultFooterJson() })}
          className="w-full rounded-lg border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Reset entire footer to defaults
        </button>
      </div>
    </div>
  );
}

function FooterTab({
  theme,
  setTheme,
  highlightedId,
  setHighlightedId,
  editingFooterSectionId,
  setEditingFooterSectionId,
  footerSectionRefs,
}: {
  theme: ThemeSettings;
  setTheme: (p: Partial<ThemeSettings>) => void;
  highlightedId: string | null;
  setHighlightedId: (id: string | null) => void;
  editingFooterSectionId: string | null;
  setEditingFooterSectionId: (id: string | null) => void;
  footerSectionRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  if (editingFooterSectionId) {
    return (
      <FooterSectionPanel
        sectionId={editingFooterSectionId}
        theme={theme}
        setTheme={setTheme}
        onClose={() => setEditingFooterSectionId(null)}
      />
    );
  }
  return (
    <>
      <div className="shrink-0 border-b border-blue-100 bg-blue-50 px-4 py-2.5">
        <p className="text-[11px] font-semibold text-blue-700">
          Click a footer block in the preview to edit it here
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1">
        {FOOTER_EDITOR_SECTIONS.map((s) => {
          const isHighlighted = highlightedId === s.id;
          return (
            <div
              key={s.id}
              ref={(el) => {
                footerSectionRefs.current[s.id] = el;
              }}
              className={`rounded-xl border bg-white transition-all ${
                isHighlighted ? "border-[#D4457A] ring-2 ring-[#D4457A]/20" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setEditingFooterSectionId(s.id);
                  setHighlightedId(s.id);
                }}
                className="flex w-full items-center gap-2 px-2.5 py-2.5 text-left transition hover:bg-slate-50 rounded-xl"
              >
                <span className="text-base leading-none shrink-0">{s.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-slate-800">{s.label}</p>
                  <p className="truncate text-[9px] text-slate-400">{s.desc}</p>
                </div>
                <span className="text-slate-300 text-xs shrink-0">›</span>
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Colors Tab ───────────────────────────────────────────────────────────────
function ColorsTab({ theme, setTheme }: { theme: ThemeSettings; setTheme: (p: Partial<ThemeSettings>) => void }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <div>
        <h3 className="text-sm font-black text-slate-900 mb-3">Brand Colors</h3>
        <div className="space-y-3">
          {[{ key: "primary_color", label: "Primary" }, { key: "secondary_color", label: "Secondary" }, { key: "background_color", label: "Background" }, { key: "text_color", label: "Body Text" }].map(({ key, label }) => (
            <ColorField key={key} label={label} value={theme[key as keyof ThemeSettings] as string} onChange={(v) => setTheme({ [key]: v })} />
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-black text-slate-900 mb-3">Logo</h3>
        <ImgField label="Logo Image URL" value={theme.logo_url || ""} onChange={(v) => setTheme({ logo_url: v || null })} />
        <p className="mt-1 text-[10px] text-slate-400">Leave empty to use BEAUTY BAR text logo</p>
      </div>
      <div>
        <h3 className="text-sm font-black text-slate-900 mb-3">Shape</h3>
        <div>
          <FL>Border radius</FL>
          <input value={theme.radius} onChange={(e) => setTheme({ radius: e.target.value })} placeholder="0.75rem"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-pink-400" />
          <p className="mt-0.5 text-[10px] text-slate-400">E.g. 0px (sharp), 0.5rem (rounded), 1rem (pill)</p>
        </div>
      </div>
    </div>
  );
}

// ─── Setup Banner — shown when DB table is missing ───────────────────────────
function SetupBanner({ dbError, saveError }: { dbError: string | null; saveError: string | null }) {
  const [copied, setCopied] = useState(false);

  // Prioritise the most meaningful error (save error beats stale db error)
  const err = saveError || dbError || "";
  const tableIsMissing =
    err.includes("theme_settings") ||
    err.includes("schema cache") ||
    err.includes("not found") ||
    err.includes("does not exist");

  const copy = () => {
    navigator.clipboard.writeText(SETUP_SQL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div className="mx-2 mt-1 rounded-lg border border-red-200 bg-red-50 overflow-hidden text-[10px] text-red-700">

      {/* Error message */}
      <div className="flex items-start gap-2 px-3 pt-3 pb-2">
        <span className="shrink-0 text-base">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-[12px] text-red-900">
            {tableIsMissing ? "Database table missing" : "Save failed"}
          </p>
          <p className="mt-0.5 break-all leading-snug text-red-600">{err}</p>
        </div>
      </div>

      {/* How to fix */}
      <div className="border-t border-red-200 bg-amber-50 px-3 py-2.5">
        <p className="font-bold text-amber-900 mb-2">
          {tableIsMissing ? "✅ Quick fix — run this SQL once in Supabase:" : "How to fix:"}
        </p>
        {tableIsMissing && (
          <ol className="space-y-1 text-amber-800 leading-snug mb-2">
            <li>1. <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
              className="underline font-semibold">Open Supabase Dashboard ↗</a></li>
            <li>2. Click <strong>SQL Editor</strong> → <strong>New query</strong></li>
            <li>3. Copy the SQL below → Paste → Click <strong>Run</strong></li>
          </ol>
        )}
      </div>

      {/* SQL block — always visible */}
      <div className="relative border-t border-red-200">
        <pre className="max-h-40 overflow-y-auto px-3 py-2.5 text-[9px] font-mono bg-slate-900 text-emerald-300 leading-relaxed whitespace-pre-wrap">
          {SETUP_SQL}
        </pre>
        <button
          onClick={copy}
          className={`absolute right-2 top-2 rounded px-2.5 py-1 text-[10px] font-bold shadow transition ${
            copied ? "bg-emerald-500 text-white" : "bg-white text-slate-800 hover:bg-slate-100"
          }`}
        >
          {copied ? "✓ Copied!" : "Copy SQL"}
        </button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function AdminThemePage() {
  const { theme, setTheme } = useTheme();
  const supabase = useSupabase();

  // ── Data (with dummy fallback) ────────────────────────────────────────────
  const [collections, setCollections] = useState<Collection[]>(dummyCollections);
  const [products, setProducts] = useState<Product[]>(dummyProducts);
  const [dbStatus, setDbStatus] = useState<"loading" | "connected" | "error">("loading");
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) { setDbStatus("error"); setDbError("Supabase not connected"); return; }
    (async () => {
      try {
        // Use select("*") to avoid column-mismatch errors on different DB schemas
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const colRes: any = await supabase.from("collections").select("*").limit(800);
        if (colRes.error) {
          console.error("[Theme] collections:", colRes.error);
          setDbError(`collections: ${colRes.error.message}`);
          setDbStatus("error");
          return;
        }
        if (Array.isArray(colRes.data) && colRes.data.length > 0) setCollections(colRes.data as Collection[]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prodRes: any = await supabase.from("products").select("*").limit(1200);
        if (prodRes.error) {
          console.error("[Theme] products:", prodRes.error);
          setDbError(`products: ${prodRes.error.message}`);
          setDbStatus("error");
          return;
        }
        if (Array.isArray(prodRes.data) && prodRes.data.length > 0) setProducts(prodRes.data as Product[]);

        // Clear stale error and mark connected
        setDbError(null);
        setDbStatus("connected");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[Theme] data load:", err);
        setDbError(msg);
        setDbStatus("error");
      }
    })();
  }, [supabase]);

  // ── JSON-driven sections ──────────────────────────────────────────────────
  const [sections, setSectionsState] = useState<ES[]>(() => parse(theme.home_sections_json ?? "[]"));
  const [history, setHistory] = useState<string[]>([JSON.stringify(sections)]);
  const [histIdx, setHistIdx] = useState(0);

  const pushHistory = useCallback((next: ES[]) => {
    const json = JSON.stringify(next);
    setHistory((h) => [...h.slice(0, histIdx + 1), json].slice(-30));
    setHistIdx((i) => Math.min(i + 1, 29));
  }, [histIdx]);

  const setSections = (next: ES[]) => {
    setSectionsState(next);
    setTheme({ home_sections_json: JSON.stringify(next) });
    pushHistory(next);
  };

  const undo = () => {
    if (histIdx <= 0) return;
    const idx = histIdx - 1;
    const parsed = parse(history[idx]);
    setSectionsState(parsed); setTheme({ home_sections_json: history[idx] }); setHistIdx(idx);
  };
  const redo = () => {
    if (histIdx >= history.length - 1) return;
    const idx = histIdx + 1;
    const parsed = parse(history[idx]);
    setSectionsState(parsed); setTheme({ home_sections_json: history[idx] }); setHistIdx(idx);
  };

  // ── Built-in section settings ─────────────────────────────────────────────
  const [builtinSettings, setBuiltinSettingsState] = useState<BuiltinSettings>(() => parseBuiltin(theme.home_blocks_json ?? "{}"));

  // ── Built-in section order (drag & drop) ─────────────────────────────────
  const DEFAULT_BUILTIN_ORDER: string[] = BUILTIN.map((b) => b.id as string);
  const [builtinOrder, setBuiltinOrderState] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(theme.home_blocks_json || "{}");
      const saved: string[] = parsed.builtin_order ?? [];
      // Merge: keep saved order, append any new sections not in saved
      const merged = [
        ...saved.filter((id: string) => DEFAULT_BUILTIN_ORDER.includes(id)),
        ...DEFAULT_BUILTIN_ORDER.filter((id) => !saved.includes(id)),
      ];
      return merged;
    } catch { return DEFAULT_BUILTIN_ORDER; }
  });

  // Save order + settings into home_blocks_json together
  const saveBlocksJson = (settings: BuiltinSettings, order: string[]) => {
    try {
      const existing = JSON.parse(theme.home_blocks_json || "{}");
      setTheme({ home_blocks_json: JSON.stringify({ ...existing, builtin_sections: settings, builtin_order: order }) });
    } catch {
      setTheme({ home_blocks_json: JSON.stringify({ builtin_sections: settings, builtin_order: order }) });
    }
  };

  const setBuiltinSettings = (next: BuiltinSettings) => {
    setBuiltinSettingsState(next);
    saveBlocksJson(next, builtinOrder);
  };
  const setBuiltinOrder = (next: string[]) => {
    setBuiltinOrderState(next);
    saveBlocksJson(builtinSettings, next);
  };
  const updateBuiltin = (id: string, s: BuiltinSetting) => setBuiltinSettings({ ...builtinSettings, [id]: s });
  const getBuiltin = (id: string): BuiltinSetting => builtinSettings[id] ?? {};

  // ── Drag & Drop for Page tab built-in sections ────────────────────────────
  const builtinDragRef = useRef<number | null>(null);
  const [builtinDragging, setBuiltinDragging] = useState<number | null>(null);
  const [builtinDragOver, setBuiltinDragOver] = useState<number | null>(null);

  const onBuiltinDragStart = (e: DragEvent, i: number) => {
    builtinDragRef.current = i;
    setBuiltinDragging(i);
    e.dataTransfer.setData("text/plain", String(i));
    e.dataTransfer.effectAllowed = "move";
  };
  const onBuiltinDragOver = (e: DragEvent, i: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setBuiltinDragOver(i);
  };
  const onBuiltinDrop = (e: DragEvent, toIdx: number) => {
    e.preventDefault();
    const fromIdx = builtinDragRef.current;
    builtinDragRef.current = null;
    setBuiltinDragging(null);
    setBuiltinDragOver(null);
    if (fromIdx === null || fromIdx === toIdx) return;
    const next = [...builtinOrder];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setBuiltinOrder(next);
  };
  const onBuiltinDragEnd = () => { builtinDragRef.current = null; setBuiltinDragging(null); setBuiltinDragOver(null); };

  // ── UI state ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"page" | "sections" | "colors" | "navigation" | "footer">("page");
  const [editingJsonId, setEditingJsonId] = useState<string | null>(null);
  const [editingBuiltinId, setEditingBuiltinId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("mobile");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewMounted, setPreviewMounted] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [editingFooterSectionId, setEditingFooterSectionId] = useState<string | null>(null);
  const builtinRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const footerSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // Always keep a ref to latest theme to avoid stale closure in save()
  const themeRef = useRef(theme);
  themeRef.current = theme;
  useEffect(() => { setPreviewMounted(true); }, []);

  // ── Push theme changes live into the preview iframe ───────────────────────
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const send = () => {
      iframe.contentWindow?.postMessage(
        { type: "BB_THEME_UPDATE", theme },
        "*"
      );
    };
    // If iframe is already loaded, send immediately; also send on future loads
    if (iframe.contentDocument?.readyState === "complete") {
      send();
    }
    iframe.addEventListener("load", send);
    return () => iframe.removeEventListener("load", send);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // ── Sync highlight to preview (home + footer blocks) ───────────────────────
  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: "BB_SECTION_HIGHLIGHT", id: highlightedId }, "*");
  }, [highlightedId]);

  // ── PostMessage: listen for section clicks from preview iframe ────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "BB_SECTION_SELECT") return;
      const id = e.data.id as string;
      setHighlightedId(id);
      if (isFooterEditorSectionId(id)) {
        setTab("footer");
        setEditingJsonId(null);
        setEditingBuiltinId(null);
        setEditingFooterSectionId(id);
        setTimeout(() => {
          footerSectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
        return;
      }
      const isBuiltin = BUILTIN.some((b) => b.id === id);
      if (isBuiltin) {
        setTab("page");
        setEditingJsonId(null);
        setEditingBuiltinId(id);
        setEditingFooterSectionId(null);
        setTimeout(() => {
          builtinRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // ── Drag & Drop for JSON sections ─────────────────────────────────────────
  // Use a ref (not state) for the source index to avoid stale closure in onDrop
  const dragSrcRef = useRef<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null); // visual only
  const [dragOver, setDragOver] = useState<number | null>(null);

  const onDragStart = (e: DragEvent, i: number) => {
    dragSrcRef.current = i;
    setDraggingIdx(i);
    // Required by Firefox and some Chromium versions to initiate drag
    e.dataTransfer.setData("text/plain", String(i));
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: DragEvent, i: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(i);
  };
  const onDrop = (e: DragEvent, targetIdx: number) => {
    e.preventDefault();
    const fromIdx = dragSrcRef.current;
    dragSrcRef.current = null;
    setDraggingIdx(null);
    setDragOver(null);
    if (fromIdx === null || fromIdx === targetIdx) return;
    const next = [...sections];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(targetIdx, 0, moved);
    setSections(next);
  };
  const onDragEnd = () => { dragSrcRef.current = null; setDraggingIdx(null); setDragOver(null); };

  // ── JSON section operations ───────────────────────────────────────────────
  const addSection = (type: HomeSectionType) => {
    const newS = { ...getDefaultSection(type), _id: genId() } as ES;
    setSections([...sections, newS]);
    setEditingJsonId(newS._id);
  };
  const duplicateSection = (idx: number) => {
    const copy = { ...sections[idx], _id: genId() } as ES;
    const next = [...sections]; next.splice(idx + 1, 0, copy);
    setSections(next);
  };
  const deleteSection = (id: string) => {
    setSections(sections.filter((s) => s._id !== id));
    if (editingJsonId === id) setEditingJsonId(null);
  };
  const toggleHidden = (id: string) => setSections(sections.map((s) => s._id === id ? { ...s, _hidden: !s._hidden } : s));
  const updateSection = (updated: ES) => setSections(sections.map((s) => s._id === updated._id ? updated : s));
  const moveSection = (idx: number, dir: 1 | -1) => {
    const next = [...sections]; const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setSections(next);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!supabase) { setSaveError("Supabase not connected. Check .env file."); return; }
    setSaving(true);
    setSaveError(null);
    try {
      // Use ref so we always capture latest theme at call time
      const snapshot = { ...themeRef.current };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await supabase.from("theme_settings").upsert(
        { id: "1", ...snapshot, updated_at: new Date().toISOString() } as Record<string, unknown>,
        { onConflict: "id" }
      );
      if (result.error) {
        console.error("[Theme] save:", result.error);
        setSaveError(result.error.message ?? "Save failed — check browser console");
      } else {
        setSavedAt(new Date());
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Theme] save caught:", err);
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const editingSection = sections.find((s) => s._id === editingJsonId) ?? null;
  const editingBuiltin = BUILTIN.find((b) => b.id === editingBuiltinId) ?? null;
  const previewUrl = `/?preview=mobile&editor=1`;

  return (
    <div className="flex h-[calc(100vh-4.5rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">

      {/* ═══ LEFT SIDEBAR ══════════════════════════════════════════════════════ */}
      <aside className="flex w-[300px] shrink-0 flex-col border-r border-slate-200 bg-slate-50">

        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Beauty Bar</p>
              <h1 className="text-sm font-black text-slate-900">Theme Editor</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={undo} disabled={histIdx <= 0} title="Undo" className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition">↩</button>
              <button onClick={redo} disabled={histIdx >= history.length - 1} title="Redo" className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition">↪</button>
              <button onClick={save} disabled={saving} className="rounded-lg bg-[#D4457A] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#C03468] disabled:opacity-60">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2">
            {savedAt && !saveError && (
              <p className="text-[10px] text-emerald-600 font-medium">✓ Saved {savedAt.toLocaleTimeString()}</p>
            )}
            {saveError && (
              <p className="text-[10px] text-red-600 font-bold">✗ Save failed — see below</p>
            )}
            <span
              className={`ml-auto flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold cursor-help ${dbStatus === "connected" ? "bg-emerald-50 text-emerald-600" : dbStatus === "error" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"}`}
              title={dbError ?? `DB ${dbStatus}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dbStatus === "connected" ? "bg-emerald-400" : dbStatus === "error" ? "bg-red-400 animate-pulse" : "bg-amber-400 animate-pulse"}`} />
              {dbStatus === "connected" ? "DB Live" : dbStatus === "error" ? "DB Err ⓘ" : "DB..."}
            </span>
          </div>
          {/* Inline DB/Save error with setup SQL button — only when there's a real error */}
          {(saveError || (dbStatus === "error" && dbError && !dbError.includes("not connected"))) && (
            <SetupBanner
              dbError={dbError}
              saveError={saveError}
            />
          )}
        </div>

        {/* Tabs */}
        <div className="shrink-0 grid grid-cols-5 border-b border-slate-200 bg-white">
          {([
            { id: "page",       label: "Page" },
            { id: "sections",   label: "Blocks" },
            { id: "colors",     label: "Colors" },
            { id: "navigation", label: "Nav" },
            { id: "footer",     label: "Footer" },
          ] as const).map((t) => (
            <button key={t.id} onClick={() => {
              setTab(t.id);
              setEditingJsonId(null);
              setEditingBuiltinId(null);
              if (t.id !== "footer") setEditingFooterSectionId(null);
            }}
              className={`py-2 text-[9px] font-bold uppercase tracking-wider transition ${tab === t.id ? "border-b-2 border-[#D4457A] text-[#D4457A]" : "text-slate-400 hover:text-slate-600"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

          {/* ── PAGE TAB: All 25 built-in home sections ── */}
          {tab === "page" && !editingBuiltin && (
            <>
              <div className="shrink-0 px-4 py-2.5 bg-blue-50 border-b border-blue-100">
                <p className="text-[11px] text-blue-700 font-semibold">
                  💡 Click any section in the preview to select it here
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {builtinOrder.map((bid, i) => {
                  const b = BUILTIN.find((x) => x.id === bid);
                  if (!b) return null;
                  const s = getBuiltin(b.id);
                  const isHidden = s.hidden === true;
                  const isHighlighted = highlightedId === b.id;
                  const isDragging = builtinDragging === i;
                  const isDragOver = builtinDragOver === i && builtinDragging !== i;
                  return (
                    <div
                      key={b.id}
                      ref={(el) => { builtinRefs.current[b.id] = el; }}
                      draggable
                      onDragStart={(e) => onBuiltinDragStart(e, i)}
                      onDragOver={(e) => onBuiltinDragOver(e, i)}
                      onDrop={(e) => onBuiltinDrop(e, i)}
                      onDragEnd={onBuiltinDragEnd}
                      className={`group rounded-xl border bg-white transition-all select-none ${
                        isDragging ? "opacity-40 border-dashed border-slate-300 scale-[0.98]" :
                        isDragOver ? "border-[#D4457A] shadow-md ring-2 ring-[#D4457A]/20" :
                        isHighlighted ? "border-[#D4457A] ring-2 ring-[#D4457A]/20" :
                        "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 px-2.5 py-2.5 cursor-pointer rounded-xl transition hover:bg-slate-50"
                        onClick={() => {
                          const next = editingBuiltinId === b.id ? null : b.id;
                          setEditingBuiltinId(next);
                          setHighlightedId(next);
                        }}>
                        {/* Drag handle */}
                        <span
                          className="cursor-grab text-slate-300 hover:text-slate-400 shrink-0 select-none text-base leading-none active:cursor-grabbing"
                          onMouseDown={(e) => e.stopPropagation()}
                          title="Drag to reorder"
                        >⠿</span>
                        <span className="text-base leading-none shrink-0">{b.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[12px] font-semibold truncate ${isHidden ? "line-through text-slate-400" : "text-slate-800"}`}>{b.label}</p>
                          <p className="text-[9px] text-slate-400 truncate">{b.desc}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Visibility quick toggle */}
                          <button
                            onClick={(e) => { e.stopPropagation(); updateBuiltin(b.id, { ...s, hidden: !s.hidden }); }}
                            className={`h-5 w-9 rounded-full flex items-center transition-colors ${isHidden ? "bg-slate-200" : "bg-[#D4457A]"}`}
                          >
                            <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${isHidden ? "translate-x-0.5" : "translate-x-4.5"}`} />
                          </button>
                          <span className="text-slate-300 text-xs">›</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── BUILTIN SECTION SETTINGS (slide-in) ── */}
          {tab === "page" && editingBuiltin && (
            <BuiltinSettings
              id={editingBuiltin.id}
              label={editingBuiltin.label}
              settings={getBuiltin(editingBuiltin.id)}
              onUpdate={(s) => updateBuiltin(editingBuiltin.id, s)}
              onClose={() => setEditingBuiltinId(null)}
              collections={collections}
              products={products}
            />
          )}

          {/* ── SECTIONS TAB (JSON-driven blocks) ── */}
          {tab === "sections" && !editingSection && (
            <>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {sections.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white py-10 text-center">
                    <p className="text-2xl mb-2">📭</p>
                    <p className="text-xs text-slate-500">No custom sections yet.</p>
                    <p className="text-xs text-slate-400">Click + Add Block below.</p>
                  </div>
                )}
                {sections.map((s, i) => {
                  const meta = META.find((m) => m.type === s.type);
                  return (
                    <div key={s._id}
                      draggable onDragStart={(e) => onDragStart(e, i)} onDragOver={(e) => onDragOver(e, i)}
                      onDrop={(e) => onDrop(e, i)} onDragEnd={onDragEnd}
                      className={`group rounded-xl border bg-white transition-all ${dragOver === i && draggingIdx !== i ? "border-[#D4457A] shadow-md" : draggingIdx === i ? "opacity-40 border-dashed border-slate-300" : "border-slate-200"}`}
                    >
                      <div className="flex items-center gap-2 px-2.5 py-2.5 cursor-pointer rounded-xl transition hover:bg-slate-50"
                        onClick={() => setEditingJsonId(editingJsonId === s._id ? null : s._id)}>
                        <span className="cursor-grab text-slate-300 select-none text-sm">⠿</span>
                        <span className="text-base leading-none">{meta?.icon ?? "▪"}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`truncate text-[12px] font-semibold ${s._hidden ? "line-through text-slate-400" : "text-slate-800"}`}>{meta?.label ?? s.type}</p>
                          <p className="text-[9px] text-slate-400 truncate">{meta?.desc}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button title={s._hidden ? "Show" : "Hide"} onClick={(e) => { e.stopPropagation(); toggleHidden(s._id); }}
                            className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 text-[10px] text-slate-500 hover:bg-slate-100">
                            {s._hidden ? "👁️‍🗨️" : "👁️"}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); duplicateSection(i); }} className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 text-[10px] text-slate-500 hover:bg-slate-100">⧉</button>
                          <button onClick={(e) => { e.stopPropagation(); moveSection(i, -1); }} disabled={i === 0} className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 text-[10px] disabled:opacity-30">↑</button>
                          <button onClick={(e) => { e.stopPropagation(); moveSection(i, 1); }} disabled={i === sections.length - 1} className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 text-[10px] disabled:opacity-30">↓</button>
                          <button onClick={(e) => { e.stopPropagation(); deleteSection(s._id); }} className="h-6 w-6 flex items-center justify-center rounded border border-red-100 text-[10px] text-red-400 hover:bg-red-50">×</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="shrink-0 border-t border-slate-200 bg-white p-3">
                <button onClick={() => setShowAdd(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-semibold text-slate-500 transition hover:border-[#D4457A] hover:bg-pink-50 hover:text-[#D4457A]">
                  + Add Block
                </button>
              </div>
            </>
          )}
          {tab === "sections" && editingSection && (
            <SectionProps section={editingSection} onChange={updateSection} onClose={() => setEditingJsonId(null)} collections={collections} products={products} />
          )}

          {tab === "colors" && <ColorsTab theme={theme} setTheme={setTheme} />}
          {tab === "navigation" && <NavTab theme={theme} setTheme={setTheme} collections={collections} products={products} />}
          {tab === "footer" && (
            <FooterTab
              theme={theme}
              setTheme={setTheme}
              highlightedId={highlightedId}
              setHighlightedId={setHighlightedId}
              editingFooterSectionId={editingFooterSectionId}
              setEditingFooterSectionId={setEditingFooterSectionId}
              footerSectionRefs={footerSectionRefs}
            />
          )}
        </div>
      </aside>

      {/* ═══ PREVIEW ═══════════════════════════════════════════════════════════ */}
      <main className="flex flex-1 flex-col overflow-hidden bg-slate-200">
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
          <div className="flex items-center gap-1.5">
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              {(["mobile", "desktop"] as const).map((m) => (
                <button key={m} onClick={() => setPreviewMode(m)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${previewMode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}>
                  {m === "mobile" ? "📱 Mobile" : "🖥 Desktop"}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-400">{previewMode === "mobile" ? "430px · iPhone 14 Pro Max" : "Full width"}</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">↗ Open store</a>
            <button onClick={save} disabled={saving} className="rounded-lg bg-[#D4457A] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#C03468] disabled:opacity-60">
              {saving ? "Saving…" : "Save theme"}
            </button>
          </div>
        </div>
        <div className="flex flex-1 items-start justify-center overflow-auto p-6">
          {!previewMounted ? (
            <div className="flex h-64 items-center justify-center text-slate-400">Loading preview…</div>
          ) : previewMode === "mobile" ? (
            <div className="relative shrink-0">
              <div className="relative rounded-[2.5rem] border-[8px] border-slate-800 bg-slate-800 shadow-2xl" style={{ width: 390, height: 844 }}>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-800 rounded-b-xl z-10" />
                <div className="h-full w-full overflow-hidden rounded-[1.8rem] bg-white">
                  <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    title="Mobile preview"
                    className="h-full w-full border-0"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    referrerPolicy="same-origin"
                    onLoad={() => {
                      iframeRef.current?.contentWindow?.postMessage(
                        { type: "BB_THEME_UPDATE", theme: themeRef.current },
                        "*"
                      );
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <iframe
                ref={iframeRef}
                src={`/?editor=1`}
                title="Desktop preview"
                className="h-full w-full border-0"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                referrerPolicy="same-origin"
                onLoad={() => {
                  iframeRef.current?.contentWindow?.postMessage(
                    { type: "BB_THEME_UPDATE", theme: themeRef.current },
                    "*"
                  );
                }}
              />
            </div>
          )}
        </div>
      </main>

      {showAdd && <AddSectionModal onAdd={addSection} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
