"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSupabase, type QueryResult } from "@/lib/supabase";
import { slugify, getProductImageUrl } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { dummyProducts } from "@/lib/dummy-data";
import type { Product, ProductVariant } from "@/types";

const PINK = "#D4457A";

// ─── STAR RATING ─────────────────────────────────────────────────────────────
function Stars({ rating = 4.9, count = 128 }: { rating?: number; count?: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className="text-sm"
            style={{ color: i < full || (i === full && half) ? "#F59E0B" : "#D1D5DB" }}
          >
            ★
          </span>
        ))}
      </div>
      <span className="text-[11px] font-bold text-gray-700">{rating.toFixed(1)}</span>
      <span className="text-[11px] text-gray-400">({count} reviews)</span>
    </div>
  );
}

// ─── TRUST BADGES ────────────────────────────────────────────────────────────
const TRUST_ITEMS = [
  { icon: "🚚", label: "Free Delivery" },
  { icon: "✓", label: "High Quality" },
  { icon: "↩", label: "Easy Returns" },
  { icon: "💬", label: "WhatsApp Support" },
];
function TrustBadges() {
  return (
    <div className="grid grid-cols-4 gap-1 border border-gray-100 py-3">
      {TRUST_ITEMS.map((t) => (
        <div key={t.label} className="flex flex-col items-center gap-1 text-center px-1">
          <span className="text-lg">{t.icon}</span>
          <span className="text-[9px] font-semibold text-gray-600 leading-tight">{t.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── FAKE REVIEWS ────────────────────────────────────────────────────────────
const FAKE_REVIEWS = [
  { name: "Sara M., Cairo", text: "Absolutely stunning quality. Arrived beautifully packaged — exactly as described. 100% authentic!" },
  { name: "Nour A., Giza", text: "Fast delivery and genuine item. Exceeded my expectations. Will definitely order again." },
  { name: "Dina K., Alexandria", text: "Payment made it so easy to afford my dream piece. Delivery was smooth and product is flawless." },
];

// ─── DESCRIPTION ACCORDION ───────────────────────────────────────────────────
function DescriptionAccordion({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const SHORT = 200;
  const truncated = text.length > SHORT && !open;
  return (
    <div className="border-t border-gray-100 pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between pb-2 text-left"
      >
        <span className="text-[13px] font-black uppercase tracking-widest text-gray-900">Description</span>
        <span className="text-gray-400 text-lg leading-none">{open ? "−" : "+"}</span>
      </button>
      <p className="text-[12px] leading-relaxed text-gray-600">
        {truncated ? text.slice(0, SHORT) + "…" : text}
      </p>
      {text.length > SHORT && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1 text-[11px] font-bold"
          style={{ color: PINK }}
        >
          {open ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}

// ─── BUNDLE UPSELL ────────────────────────────────────────────────────────────
function BundleUpsell({ price }: { price: number }) {
  return (
    <div className="border border-gray-100 p-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: PINK }}>
        ✦ Buy 2 Get 1 FREE — Lowest item free ✦
      </p>
      <h3 className="mt-2 text-[13px] font-black text-gray-900">Complete the Bundle</h3>
      <p className="text-[11px] text-gray-500">Add 3 items — cheapest is free</p>
      <div className="mt-3 flex items-center gap-2">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center border border-gray-200 bg-gray-50 text-2xl"
          title="This item"
        >
          👜
        </div>
        <span className="text-gray-300 text-xl font-light">+</span>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50 text-[9px] font-bold text-gray-400 text-center leading-tight px-1">
          FREE
        </div>
        <span className="text-gray-300 text-xl font-light">+</span>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50 text-[9px] font-bold text-gray-400 text-center leading-tight px-1">
          FREE
        </div>
      </div>
      <Link
        href="/products"
        className="mt-3 flex w-full items-center justify-center py-2.5 text-[11px] font-black uppercase tracking-widest text-white transition active:opacity-80"
        style={{ background: PINK }}
      >
        🛍 Add Bundle — 1 Item FREE
      </Link>
      <p className="mt-1.5 text-center text-[9px] text-gray-400">No code needed · Discount applied at checkout</p>
    </div>
  );
}

// ─── RELATED PRODUCT CARD ─────────────────────────────────────────────────────
function RelatedCard({ product }: { product: Product }) {
  const { add } = useCart();
  const slug = product.slug || slugify(product.name);
  const price = Number(product.price) || 0;
  const compareAt = product.compare_at_price ? Number(product.compare_at_price) : null;
  const img = getProductImageUrl(product);
  const [err, setErr] = useState(false);
  const pct = compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : null;

  return (
    <article className="flex flex-col bg-white border border-gray-100">
      <Link href={`/product/${slug}`} className="block">
        <div className="relative overflow-hidden bg-gray-50" style={{ aspectRatio: "3/4" }}>
          {img && !err
            ? <img src={img} alt={product.name} className="h-full w-full object-cover" onError={() => setErr(true)} />
            : <div className="flex h-full w-full items-center justify-center text-gray-200 text-4xl select-none">◻</div>
          }
          {pct && (
            <span className="absolute left-0 top-2.5 px-2 py-0.5 text-[9px] font-black text-white" style={{ background: PINK }}>
              -{pct}%
            </span>
          )}
        </div>
        <div className="px-2.5 pt-2">
          {product.category && (
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{product.category}</p>
          )}
          <p className="mt-0.5 line-clamp-2 text-[12px] font-semibold text-gray-900 leading-snug">{product.name}</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[13px] font-black text-gray-900">LE {price.toLocaleString()}</span>
            {compareAt && compareAt > price && (
              <span className="text-[10px] text-gray-400 line-through">LE {compareAt.toLocaleString()}</span>
            )}
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => add(product)}
        className="mx-2.5 mb-2.5 mt-2 py-2 text-[10px] font-bold uppercase tracking-widest transition active:scale-95"
        style={{ background: PINK, color: "#fff" }}
      >
        Add to Bag
      </button>
    </article>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function ProductPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [qty, setQty] = useState(1);
  const [imgError, setImgError] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [inventoryQty, setInventoryQty] = useState<number | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [descOpen, setDescOpen] = useState(false);
  const [addedAnim, setAddedAnim] = useState(false);
  const supabase = useSupabase();
  const { add } = useCart();

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .maybeSingle()
      .then((res: QueryResult<Product | null>) => {
        let p = res.data as Product | null;
        if (p) {
          const row = p as unknown as Record<string, unknown>;
          const stock =
            row.stock != null ? Number(row.stock) :
            row.quantity != null ? Number(row.quantity) :
            row.inventory_quantity != null ? Number(row.inventory_quantity) : undefined;
          setProduct(stock !== undefined ? { ...p, stock } : p);
          return;
        }
        supabase.from("products").select("*").limit(500).then((res2: QueryResult<Record<string, unknown>[]>) => {
          const all = (res2.data || []) as Product[];
          const found =
            all.find((x) => (x.slug || slugify(x.name)) === slug) ||
            all.find((x) => x.name.toLowerCase().includes(slug.replace(/-/g, " "))) ||
            dummyProducts.find((x) => (x.slug || slugify(x.name)) === slug);
          if (found) {
            const row = found as unknown as Record<string, unknown>;
            const stock =
              row.stock != null ? Number(row.stock) :
              row.quantity != null ? Number(row.quantity) :
              row.inventory_quantity != null ? Number(row.inventory_quantity) : undefined;
            setProduct(stock !== undefined ? { ...found, stock } : found);
          }
        });
      });
  }, [supabase, slug]);

  useEffect(() => {
    if (!product || (product.variants && product.variants.length > 0) || !supabase) return;
    supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", product.id)
      .then((res: QueryResult<Record<string, unknown>[]>) => {
        const raw = res.data || [];
        const variants: ProductVariant[] = raw.map((row) => {
          const stock =
            row.stock != null ? Number(row.stock) :
            row.inventory_quantity != null ? Number(row.inventory_quantity) :
            (row as Record<string, unknown>).quantity != null ? Number((row as Record<string, unknown>).quantity) : null;
          return {
            id: String(row.id),
            product_id: row.product_id != null ? String(row.product_id) : undefined,
            title: String(row.title ?? "Option"),
            value: String(row.value ?? ""),
            price: row.price != null ? Number(row.price) : null,
            compare_at_price: row.compare_at_price != null ? Number(row.compare_at_price) : null,
            sku: row.sku != null ? String(row.sku) : null,
            stock,
          };
        });
        if (variants.length > 0)
          setProduct((prev) => (prev ? { ...prev, variants } : null));
      });
  }, [product?.id, product?.variants, supabase]);

  useEffect(() => {
    if (!product?.id || !supabase) return;
    setInventoryQty(null);
    supabase
      .from("inventory")
      .select("*")
      .eq("product_id", product.id)
      .then((res: { data: Record<string, unknown>[] | null }) => {
        const rows = res.data || [];
        const variants = product?.variants ?? [];
        const hasVariantRows = variants.length > 0;
        const qtyByVariantId: Record<string, number> = {};
        const qtyBySku: Record<string, number> = {};
        for (const r of rows) {
          const qty = Number(r.quantity) ?? 0;
          const vid =
            (r.variant_id ?? r.product_variant_id) != null
              ? String(r.variant_id ?? r.product_variant_id)
              : r.id != null ? String(r.id) : "";
          const sku = r.sku != null ? String(r.sku).trim() : "";
          if (vid) qtyByVariantId[vid] = (qtyByVariantId[vid] || 0) + qty;
          if (sku) qtyBySku[sku] = (qtyBySku[sku] || 0) + qty;
        }
        const hasVariantLevelData = Object.keys(qtyByVariantId).length > 0 || Object.keys(qtyBySku).length > 0;
        if (hasVariantRows && (hasVariantLevelData || rows.length > 0)) {
          setProduct((prev) => {
            if (!prev?.variants?.length) return prev;
            const updatedVariants = prev.variants.map((v, index) => {
              const byId = qtyByVariantId[v.id] ?? qtyByVariantId[String(v.id)];
              const bySku = v.sku ? qtyBySku[v.sku.trim()] : undefined;
              const byOrder =
                byId === undefined && bySku === undefined && rows.length > index
                  ? Number(rows[index]?.quantity) ?? 0 : undefined;
              const variantQty = byId ?? bySku ?? byOrder ?? (prev.variants?.[index]?.stock ?? null);
              return { ...v, stock: variantQty };
            });
            const total = updatedVariants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
            setInventoryQty(total);
            return { ...prev, stock: total, variants: updatedVariants };
          });
        } else if (hasVariantRows) {
          const total = variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
          setInventoryQty(total > 0 ? total : null);
        } else if (rows.length > 0) {
          const total = rows.reduce((sum, r) => sum + (Number(r.quantity) ?? 0), 0);
          setInventoryQty(total);
          setProduct((prev) => (prev ? { ...prev, stock: total } : null));
        }
      })
      .catch(() => {});
  }, [product?.id, product?.variants, supabase]);

  useEffect(() => {
    if (!product) return;
    const cat = product.category;
    const fromDummy = dummyProducts.filter((x) => x.category === cat && x.id !== product.id).slice(0, 6);
    if (fromDummy.length > 0) { setRelated(fromDummy); return; }
    if (!supabase) return;
    supabase
      .from("products")
      .select("*")
      .neq("id", product.id)
      .or(`category.eq.${cat},collection_id.eq.${cat}`)
      .limit(6)
      .then((res: QueryResult<Product[]>) => setRelated(res.data || []));
  }, [supabase, product]);

  useEffect(() => {
    setImgError(false);
    setSelectedVariant(null);
    setActiveImg(0);
  }, [product?.id]);

  const variants = product?.variants && product.variants.length > 0 ? product.variants : [];
  const variantGroups = useMemo(() => {
    const byTitle: Record<string, ProductVariant[]> = {};
    for (const v of variants) {
      const t = v.title || "Option";
      if (!byTitle[t]) byTitle[t] = [];
      byTitle[t].push(v);
    }
    return Object.entries(byTitle);
  }, [variants]);

  const displayPrice =
    product != null
      ? (selectedVariant?.price != null ? Number(selectedVariant.price) : Number(product.price) || 0)
      : 0;
  const displayCompareAt =
    product != null
      ? (selectedVariant?.compare_at_price != null
          ? Number(selectedVariant.compare_at_price)
          : product.compare_at_price != null ? Number(product.compare_at_price) : null)
      : null;
  const savings = displayCompareAt && displayCompareAt > displayPrice ? displayCompareAt - displayPrice : null;

  const rawProduct = product as unknown as { stock?: number; quantity?: number } | null;
  const productStockQty =
    rawProduct?.stock != null ? Number(rawProduct.stock) : rawProduct?.quantity != null ? Number(rawProduct.quantity) : inventoryQty;
  const variantStock = (v: ProductVariant) => v.stock != null ? v.stock : productStockQty;
  const isVariantOutOfStock = (v: ProductVariant) => {
    const q = variantStock(v);
    return q !== null && q !== undefined && q <= 0;
  };
  const selectedOutOfStock = selectedVariant != null && isVariantOutOfStock(selectedVariant);
  const productOutOfStock = variants.length === 0 && productStockQty != null && productStockQty <= 0;
  const canAddToCart = (variants.length === 0 || selectedVariant != null) && !selectedOutOfStock && !productOutOfStock;
  const maxQty =
    selectedVariant != null
      ? (variantStock(selectedVariant) ?? 0) > 0 ? variantStock(selectedVariant)! : null
      : productStockQty != null && productStockQty > 0 ? productStockQty : null;

  // Build image list (main + extras from product.images if available)
  const mainImage = product ? getProductImageUrl(product) : null;
  const extraImages: string[] = useMemo(() => {
    if (!product) return [];
    const raw = product as unknown as Record<string, unknown>;
    if (Array.isArray(raw.images)) {
      return (raw.images as string[]).filter((u) => typeof u === "string" && u.length > 0).slice(0, 5);
    }
    return [];
  }, [product]);
  const allImages = useMemo(() => {
    const imgs: string[] = [];
    if (mainImage) imgs.push(mainImage);
    for (const u of extraImages) {
      if (!imgs.includes(u)) imgs.push(u);
    }
    return imgs.slice(0, 6);
  }, [mainImage, extraImages]);
  const currentImg = allImages[activeImg] ?? null;

  // Monthly installment estimate (TRU) — 12 months
  const monthlyInstallment = displayPrice > 0 ? (displayPrice / 12).toFixed(2) : null;

  const handleAddToCart = () => {
    if (!canAddToCart || !product) return;
    add(product, qty, selectedVariant ?? undefined);
    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 1500);
  };

  if (!product)
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200" style={{ borderTopColor: PINK }} />
        <p className="text-[12px] text-gray-500">Loading product…</p>
        <Link href="/products" className="text-[11px] font-bold" style={{ color: PINK }}>← Browse all products</Link>
      </div>
    );

  return (
    <div className="bg-white pb-24">
      {/* ── Breadcrumb ── */}
      <div className="border-b border-gray-100 px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden whitespace-nowrap">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          <span>/</span>
          {product.category && (
            <>
              <Link href={`/products?q=${encodeURIComponent(product.category)}`} className="hover:text-gray-700">{product.category}</Link>
              <span>/</span>
            </>
          )}
          <span className="text-gray-700 font-medium truncate max-w-[160px]">{product.name}</span>
        </div>
      </div>

      {/* ── Image Gallery ── */}
      <div className="relative bg-gray-50">
        {/* Discount badge */}
        {savings && displayCompareAt && (
          <div
            className="absolute left-3 top-3 z-10 px-2 py-1 text-[11px] font-black text-white"
            style={{ background: PINK }}
          >
            −{Math.round((1 - displayPrice / displayCompareAt) * 100)}%
          </div>
        )}
        {/* Main image */}
        <div className="relative overflow-hidden" style={{ aspectRatio: "1/1" }}>
          {currentImg && !imgError ? (
            <img
              src={currentImg}
              alt={product.name}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gray-100">
              <span className="text-6xl select-none opacity-30">📦</span>
            </div>
          )}
        </div>
        {/* Thumbnails */}
        {allImages.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {allImages.map((u, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setActiveImg(i); setImgError(false); }}
                className="h-14 w-14 shrink-0 overflow-hidden border-2 transition"
                style={{ borderColor: activeImg === i ? PINK : "transparent" }}
              >
                <img src={u} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Product Info ── */}
      <div className="px-4 pt-4">
        {/* Brand / category */}
        {product.category && (
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">{product.category}</p>
        )}

        {/* Name */}
        <h1 className="mt-1 text-[18px] font-black leading-tight text-gray-900">{product.name}</h1>

        {/* Stars */}
        <div className="mt-2">
          <Stars />
        </div>

        {/* Price block */}
        <div className="mt-3 flex items-baseline gap-3 flex-wrap">
          <span className="text-[22px] font-black text-gray-900">LE {displayPrice.toLocaleString()}</span>
          {displayCompareAt && displayCompareAt > displayPrice && (
            <span className="text-[15px] text-gray-400 line-through">LE {displayCompareAt.toLocaleString()}</span>
          )}
          {savings && (
            <span className="text-[12px] font-bold" style={{ color: PINK }}>
              Save LE {savings.toLocaleString()}
            </span>
          )}
        </div>

        {/* Installment */}
        {monthlyInstallment && (
          <p className="mt-1.5 text-[11px] text-gray-500">
            Pay{" "}
            <span className="font-bold text-gray-800">LE {monthlyInstallment}/month</span>{" "}
            with TRU —{" "}
            <span className="font-semibold" style={{ color: PINK }}>0% INTEREST · 0% FEES</span>
          </p>
        )}

        {/* Variant selector */}
        {variantGroups.length > 0 && (
          <div className="mt-4">
            {(() => {
              // If all groups have exactly 1 variant each, they're individual options (e.g. sizes stored as titles)
              // — flatten them all into one single horizontal row
              const allSingle = variantGroups.every(([, opts]) => opts.length === 1);
              if (allSingle) {
                const allOptions = variantGroups.map(([title, opts]) => ({ label: title, v: opts[0] }));
                const groupLabel = allOptions[0]?.v.value ? allOptions[0].v.title : "Size";
                return (
                  <div>
                    <p className="mb-2 text-[12px] font-bold uppercase tracking-widest text-gray-700">{groupLabel}</p>
                    <div className="flex flex-wrap gap-2">
                      {allOptions.map(({ label, v }) => {
                        const outOfStock = isVariantOutOfStock(v);
                        const selected = selectedVariant?.id === v.id;
                        const display = v.value && v.value !== "" ? v.value : label;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            disabled={outOfStock}
                            onClick={() => !outOfStock && setSelectedVariant(v)}
                            className="relative min-w-[44px] border-2 px-3 py-2 text-[12px] font-semibold transition active:scale-95"
                            style={
                              outOfStock
                                ? { borderColor: "#FECACA", color: "#9CA3AF", background: "#FEF2F2", textDecoration: "line-through" }
                                : selected
                                  ? { borderColor: "#111", background: "#111", color: "#fff" }
                                  : { borderColor: "#E5E7EB", color: "#374151", background: "#fff" }
                            }
                          >
                            {display}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              // Multiple options per group — render each group separately
              return (
                <div className="space-y-4">
                  {variantGroups.map(([optionTitle, options]) => (
                    <div key={optionTitle}>
                      <p className="mb-2 text-[12px] font-bold uppercase tracking-widest text-gray-700">{optionTitle}</p>
                      <div className="flex flex-wrap gap-2">
                        {options.map((v) => {
                          const outOfStock = isVariantOutOfStock(v);
                          const selected = selectedVariant?.id === v.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              disabled={outOfStock}
                              onClick={() => !outOfStock && setSelectedVariant(v)}
                              className="min-w-[44px] border-2 px-3 py-2 text-[12px] font-semibold transition active:scale-95"
                              style={
                                outOfStock
                                  ? { borderColor: "#FECACA", color: "#9CA3AF", background: "#FEF2F2", textDecoration: "line-through" }
                                  : selected
                                    ? { borderColor: "#111", background: "#111", color: "#fff" }
                                    : { borderColor: "#E5E7EB", color: "#374151", background: "#fff" }
                              }
                            >
                              {v.value || v.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Qty + Add to Cart */}
        <div className="mt-5 flex items-stretch gap-2">
          {/* Qty stepper */}
          <div className="flex items-center border border-gray-200">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-12 w-10 items-center justify-center text-xl font-light text-gray-700 transition hover:bg-gray-50 active:bg-gray-100"
            >
              −
            </button>
            <span className="flex h-12 w-10 items-center justify-center border-x border-gray-200 text-[14px] font-bold text-gray-900 tabular-nums">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => (maxQty != null ? Math.min(q + 1, maxQty) : q + 1))}
              className="flex h-12 w-10 items-center justify-center text-xl font-light text-gray-700 transition hover:bg-gray-50 active:bg-gray-100"
            >
              +
            </button>
          </div>

          {/* Add to Cart */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            className="flex-1 h-12 text-[12px] font-black uppercase tracking-widest text-white transition active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: addedAnim ? "#16A34A" : PINK }}
          >
            {addedAnim ? "✓ Added!" : selectedOutOfStock || productOutOfStock ? "Out of Stock" : "Add to Cart"}
          </button>
        </div>

        {/* Buy Now */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            if (!canAddToCart || !product) return;
            add(product, qty, selectedVariant ?? undefined);
            window.location.href = "/checkout";
          }}
          disabled={!canAddToCart}
          className="mt-2 flex h-12 w-full items-center justify-center border-2 text-[12px] font-black uppercase tracking-widest transition active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderColor: "#111", color: "#111" }}
        >
          Buy Now — Checkout in 60 seconds
        </button>

        {variants.length > 0 && !selectedVariant && (
          <p className="mt-2 text-[11px] font-medium text-amber-600">Please select an option above.</p>
        )}

        {/* Trust badges */}
        <div className="mt-4">
          <TrustBadges />
        </div>

        {/* Social proof + delivery */}
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-semibold text-gray-700">
            🔥 <span className="font-black" style={{ color: PINK }}>12 people</span> viewing this now
          </p>
          <p className="text-[11px] text-gray-600">
            Order now — delivery <span className="font-bold text-gray-900">within 48 hours</span> across Egypt
          </p>
        </div>

        {/* Stock status */}
        <p className="mt-2 text-[11px] font-medium" role="status" aria-live="polite">
          {(() => {
            const stockQty =
              variants.length > 0 && selectedVariant != null
                ? variantStock(selectedVariant)
                : productStockQty;
            if (stockQty !== undefined && stockQty !== null) {
              return stockQty <= 0 ? (
                <span className="text-red-600 font-bold">Out of stock</span>
              ) : (
                <span className="text-emerald-700">✓ In stock — {stockQty} available</span>
              );
            }
            return <span className="text-emerald-700">✓ In stock</span>;
          })()}
        </p>
      </div>

      {/* ── Description ── */}
      {product.description && (
        <div className="mt-4 px-4">
          <DescriptionAccordion text={product.description} />
        </div>
      )}

      {/* ── Bundle Upsell ── */}
      <div className="mt-5 px-4">
        <BundleUpsell price={displayPrice} />
      </div>

      {/* ── Customer Reviews ── */}
      <div className="mt-6 px-4">
        <div className="border-t border-gray-100 pt-4">
          <h2 className="text-[13px] font-black uppercase tracking-widest text-gray-900">Customer Reviews</h2>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-[32px] font-black text-gray-900">4.9</span>
            <div>
              <Stars />
              <p className="text-[10px] text-gray-400 mt-0.5">Based on 128 reviews</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {FAKE_REVIEWS.map((r, i) => (
              <div key={i} className="border border-gray-100 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <span key={j} className="text-[11px]" style={{ color: "#F59E0B" }}>★</span>
                  ))}
                </div>
                <p className="text-[11px] text-gray-700 leading-relaxed">"{r.text}"</p>
                <p className="mt-1.5 text-[10px] font-bold text-gray-400">— {r.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Related Products ── */}
      {related.length > 0 && (
        <div className="mt-6 px-4">
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-black uppercase tracking-widest text-gray-900">You May Also Like</h2>
              <Link href="/products" className="text-[10px] font-bold" style={{ color: PINK }}>See All</Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {related.slice(0, 4).map((p) => (
                <RelatedCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Links ── */}
      <div className="mt-6 px-4 pb-4">
        <div className="border-t border-gray-100 pt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Quick Shop</p>
          <div className="flex flex-wrap gap-1.5">
            {["Bags", "Sneakers", "Slippers", "Heels", "Watches", "Wallets", "Perfume", "Sunglasses"].map((c) => (
              <Link
                key={c}
                href={`/products?q=${c.toLowerCase()}`}
                className="border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-gray-600 transition hover:border-[#D4457A] hover:text-[#D4457A]"
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
