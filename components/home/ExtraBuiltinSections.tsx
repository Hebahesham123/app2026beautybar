"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EditableSection } from "@/components/EditableSection";
import { useCart } from "@/context/CartContext";
import { useTheme } from "@/context/ThemeContext";
import { builtinLabel } from "@/lib/builtin-sections";
import { getProductImageUrl, slugify } from "@/lib/utils";
import { useHomeShelfFromViewAll } from "@/hooks/useHomeShelfFromViewAll";
import type { Collection, Product } from "@/types";

const PINK = "#D4617A";
const CREAM = "#FDF7F2";
const ROSE_HOT = "#E8325A";
const ROSE_DEEP = "#B84060";
const BLUSH = "#F9EBE8";
const ROSE_PALE = "#F2D4D4";
const WARM_DK = "#2A1820";
const WARM_MUTED = "#9A7080";

function ExternalOrLink({
  href,
  className,
  style,
  children,
}: {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const h = (href || "#").trim() || "#";
  if (/^https?:\/\//i.test(h) || h.startsWith("mailto:") || h.startsWith("tel:")) {
    return (
      <a href={h} className={className} style={style} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={h} className={className} style={style}>
      {children}
    </Link>
  );
}

function useMergedBuiltinConfig(id: string, config?: Record<string, unknown>) {
  const { theme } = useTheme();
  return useMemo(() => {
    let c: Record<string, unknown> = config || {};
    try {
      if (theme?.home_blocks_json) {
        const blocks = JSON.parse(theme.home_blocks_json);
        c = blocks.builtin_sections?.[id] || c;
      }
    } catch {
      c = config || {};
    }
    return c;
  }, [theme?.home_blocks_json, id, config]);
}

function PromoStripBlock({
  id,
  label,
  cfg,
  isEditor,
  isHighlighted,
}: {
  id: string;
  label: string;
  cfg: Record<string, unknown>;
  isEditor: boolean;
  isHighlighted: boolean;
}) {
  const messages =
    Array.isArray(cfg.messages) && (cfg.messages as string[]).length > 0
      ? (cfg.messages as string[])
      : ["Free shipping on orders over 500 EGP", "Use code WELCOME10 for 10% off", "New arrivals every Friday"];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (messages.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % messages.length), 4500);
    return () => clearInterval(t);
  }, [messages.length]);
  return (
    <EditableSection id={id} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
      <div className="bg-[#D4457A] py-2.5 text-center">
        <p className="px-3 text-[11px] font-bold tracking-wide text-white transition-all">{messages[idx]}</p>
      </div>
    </EditableSection>
  );
}

function SocialTickerBlock({
  id,
  label,
  cfg,
  isEditor,
  isHighlighted,
}: {
  id: string;
  label: string;
  cfg: Record<string, unknown>;
  isEditor: boolean;
  isHighlighted: boolean;
}) {
  const prefix = (cfg.prefix as string) || "Someone just bought";
  const itemList =
    Array.isArray(cfg.items) && (cfg.items as string[]).length > 0
      ? (cfg.items as string[])
      : ["a designer bag", "new heels", "a gold watch"];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (itemList.length <= 1) return;
    const t = setInterval(() => setI((x) => (x + 1) % itemList.length), 5000);
    return () => clearInterval(t);
  }, [itemList.length]);
  const phrase = `${prefix} ${itemList[i]}`;
  return (
    <EditableSection id={id} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
      <div className="border-y border-pink-100 bg-pink-50/50 py-2 text-center">
        <p className="text-[11px] font-medium text-slate-700">{phrase}</p>
      </div>
    </EditableSection>
  );
}

function ProductRail({
  builtinsKey,
  label,
  config,
  products,
  collections,
  isEditor,
  isHighlighted,
  defaultTitle,
  defaultViewAll,
  defaultCount,
  flashEnd,
}: {
  builtinsKey: string;
  label: string;
  config?: Record<string, unknown>;
  products: Product[];
  collections: Collection[];
  isEditor: boolean;
  isHighlighted: boolean;
  defaultTitle: string;
  defaultViewAll: string;
  defaultCount: number;
  flashEnd?: string;
}) {
  const { add } = useCart();
  const { sectionConfig, viewAllHref, items } = useHomeShelfFromViewAll({
    products,
    collections,
    config,
    builtinsKey,
    defaultProductCount: defaultCount,
    defaultViewAll,
  });
  const title = (sectionConfig.title as string) || defaultTitle;
  const endMs = flashEnd ? new Date(flashEnd).getTime() : 0;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!endMs) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [endMs]);
  const countdown =
    endMs > 0
      ? (() => {
          const ms = Math.max(0, endMs - Date.now());
          const s = Math.floor(ms / 1000);
          const h = Math.floor(s / 3600);
          const m = Math.floor((s % 3600) / 60);
          const sec = s % 60;
          return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
        })()
      : "";

  return (
    <EditableSection id={builtinsKey} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
      <section className="px-4 md:px-12 py-8 md:py-12" style={{ background: CREAM }}>
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-2xl md:text-3xl font-normal" style={{ fontFamily: "var(--font-playfair)", color: WARM_DK }}>
            {title}
          </h2>
          <Link
            href={viewAllHref}
            className="text-[10px] font-semibold uppercase tracking-wide border-b pb-0.5 whitespace-nowrap"
            style={{ color: "#C4809A", borderColor: ROSE_PALE }}
          >
            View all →
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {items.map((product) => {
            const slug = product.slug || slugify(product.name);
            const price = Number(product.price) || 0;
            const compareAt = product.compare_at_price ? Number(product.compare_at_price) : null;
            const img = getProductImageUrl(product);
            return (
              <div
                key={product.id}
                className="w-[min(72vw,200px)] shrink-0 overflow-hidden rounded-xl border bg-white shadow-sm"
                style={{ borderColor: ROSE_PALE }}
              >
                <Link href={`/product/${slug}`} className="block">
                  <div className="relative h-40 bg-gradient-to-br from-pink-50 to-rose-100">
                    {img ? (
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl">🛍️</div>
                    )}
                    {countdown ? (
                      <div
                        className="pointer-events-none absolute bottom-2 left-1/2 z-[2] flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[8px] font-bold text-white"
                        style={{ background: "rgba(42,24,32,.88)" }}
                      >
                        <span className="h-1 w-1 animate-pulse rounded-full" style={{ background: ROSE_HOT }} />
                        {countdown}
                      </div>
                    ) : null}
                  </div>
                  <div className="p-2.5">
                    <div className="mb-1 truncate text-xs font-medium" style={{ color: WARM_DK }}>
                      {product.name}
                    </div>
                    <div className="mb-2 flex items-center gap-1.5">
                      <span className="text-xs font-bold" style={{ color: ROSE_HOT }}>
                        LE {price.toLocaleString()}
                      </span>
                      {compareAt && compareAt > price ? (
                        <span className="text-[10px] line-through text-slate-400">LE {compareAt.toLocaleString()}</span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        add(product);
                      }}
                      className="w-full rounded-md py-1.5 text-[10px] font-bold text-white"
                      style={{ background: ROSE_HOT }}
                    >
                      Add
                    </button>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </EditableSection>
  );
}

export function ExtraBuiltinSection({
  id,
  config,
  products,
  collections,
  isEditor,
  isHighlighted,
}: {
  id: string;
  config?: Record<string, unknown>;
  products: Product[];
  collections: Collection[];
  isEditor: boolean;
  isHighlighted: boolean;
}) {
  const label = builtinLabel(id);
  const cfg = useMergedBuiltinConfig(id, config);

  if (id === "promo-strip") {
    return <PromoStripBlock id={id} label={label} cfg={cfg} isEditor={isEditor} isHighlighted={isHighlighted} />;
  }

  if (id === "category-bar") {
    const cats =
      Array.isArray(cfg.categories) && (cfg.categories as string[]).length > 0
        ? (cfg.categories as string[])
        : ["Bags", "Heels", "Sneakers", "Wallets", "Perfumes"];
    return (
      <EditableSection id={id} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
        <div className="border-b border-pink-100 bg-white py-3">
          <div className="flex gap-2 overflow-x-auto px-4 scrollbar-hide md:justify-center md:px-12">
            {cats.map((c) => (
              <Link
                key={c}
                href={`/products?q=${encodeURIComponent(c)}`}
                className="shrink-0 rounded-full border px-4 py-1.5 text-[11px] font-semibold transition hover:border-[#D4457A] hover:text-[#D4457A]"
                style={{ borderColor: ROSE_PALE, color: WARM_DK }}
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      </EditableSection>
    );
  }

  if (id === "hero-carousel") {
    const title = (cfg.title as string) || "New Season. New You.";
    const subtitle = (cfg.subtitle as string) || "Discover the latest from top brands.";
    const cta1 = (cfg.cta_text as string) || "Shop Now";
    const cta1h = (cfg.cta_href as string) || "/products";
    const cta2 = (cfg.cta2_text as string) || "";
    const cta2h = (cfg.cta2_href as string) || "/collections";
    const image = (cfg.image as string) || "";
    return (
      <EditableSection id={id} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
        <section className="relative min-h-[280px] md:min-h-[360px] overflow-hidden" style={{ background: CREAM }}>
          {image ? (
            <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-pink-100 to-rose-200" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="relative z-[1] flex min-h-[280px] md:min-h-[360px] flex-col justify-end px-5 pb-10 pt-16 md:px-12 md:pb-14">
            <h2 className="mb-2 text-3xl font-normal text-white md:text-5xl" style={{ fontFamily: "var(--font-playfair)" }}>
              {title}
            </h2>
            <p className="mb-6 max-w-lg text-sm text-white/90">{subtitle}</p>
            <div className="flex flex-wrap gap-3">
              <ExternalOrLink
                href={cta1h}
                className="rounded-full bg-white px-6 py-2.5 text-xs font-bold text-slate-900 shadow-md"
              >
                {cta1}
              </ExternalOrLink>
              {cta2 ? (
                <ExternalOrLink
                  href={cta2h}
                  className="rounded-full border-2 border-white px-6 py-2.5 text-xs font-bold text-white"
                >
                  {cta2}
                </ExternalOrLink>
              ) : null}
            </div>
          </div>
        </section>
      </EditableSection>
    );
  }

  if (id === "trust-row") {
    const badges =
      Array.isArray(cfg.badges) && (cfg.badges as string[]).length > 0
        ? (cfg.badges as string[])
        : ["100% Authentic", "Free Returns", "Fast Delivery", "Secure Payment"];
    return (
      <EditableSection id={id} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
        <div className="border-y border-pink-100 bg-white py-4">
          <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-3 px-4 md:gap-6">
            {badges.map((b) => (
              <span key={b} className="text-[10px] font-bold uppercase tracking-wider text-slate-600 md:text-[11px]">
                ✓ {b}
              </span>
            ))}
          </div>
        </div>
      </EditableSection>
    );
  }

  if (id === "stats-row") {
    const stats =
      Array.isArray(cfg.stats) && (cfg.stats as string[]).length > 0
        ? (cfg.stats as string[])
        : ["10K+ Happy Customers", "500+ Top Brands", "100% Authentic", "24/7 Support"];
    return (
      <EditableSection id={id} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
        <div className="py-8" style={{ background: "#1A0818" }}>
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 md:grid-cols-4 md:gap-6">
            {stats.map((s) => (
              <div key={s} className="text-center">
                <p className="text-sm font-bold text-white md:text-base" style={{ fontFamily: "var(--font-playfair)" }}>
                  {s}
                </p>
              </div>
            ))}
          </div>
        </div>
      </EditableSection>
    );
  }

  if (id === "hot-prices") {
    return (
      <ProductRail
        builtinsKey={id}
        label={label}
        config={config}
        products={products}
        collections={collections}
        isEditor={isEditor}
        isHighlighted={isHighlighted}
        defaultTitle="Hot Prices"
        defaultViewAll="/products?q=sale"
        defaultCount={8}
      />
    );
  }

  if (id === "flash-deals") {
    const end = (cfg.countdown_to as string) || "";
    return (
      <ProductRail
        builtinsKey={id}
        label={label}
        config={config}
        products={products}
        collections={collections}
        isEditor={isEditor}
        isHighlighted={isHighlighted}
        defaultTitle="Flash Deals"
        defaultViewAll="/products?q=sale"
        defaultCount={6}
        flashEnd={end}
      />
    );
  }

  if (id === "editors-picks") {
    return (
      <ProductRail
        builtinsKey={id}
        label={label}
        config={config}
        products={products}
        collections={collections}
        isEditor={isEditor}
        isHighlighted={isHighlighted}
        defaultTitle="Editor's Picks"
        defaultViewAll="/products"
        defaultCount={3}
      />
    );
  }

  if (id === "featured") {
    return (
      <ProductRail
        builtinsKey={id}
        label={label}
        config={config}
        products={products}
        collections={collections}
        isEditor={isEditor}
        isHighlighted={isHighlighted}
        defaultTitle="Featured"
        defaultViewAll="/products"
        defaultCount={8}
      />
    );
  }

  if (id === "trending") {
    return (
      <ProductRail
        builtinsKey={id}
        label={label}
        config={config}
        products={products}
        collections={collections}
        isEditor={isEditor}
        isHighlighted={isHighlighted}
        defaultTitle="Trending Now"
        defaultViewAll="/products"
        defaultCount={8}
      />
    );
  }

  if (id === "campaign-banner") {
    const eyebrow = (cfg.eyebrow as string) || "";
    const title = (cfg.title as string) || "Your moment.";
    const desc = (cfg.desc as string) || "";
    const image = (cfg.image as string) || "";
    const c1 = (cfg.cta1_text as string) || "Explore";
    const c1h = (cfg.cta1_href as string) || "/collections";
    const c2 = (cfg.cta2_text as string) || "";
    const c2h = (cfg.cta2_href as string) || "/products";
    return (
      <EditableSection id={id} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
        <section className="relative min-h-[240px] overflow-hidden md:min-h-[300px]">
          {image ? <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 to-black/30" />
          <div className="relative z-[1] mx-auto flex max-w-6xl flex-col justify-center px-5 py-12 md:px-12 md:py-16">
            {eyebrow ? (
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-pink-200">{eyebrow}</p>
            ) : null}
            <h2 className="mb-3 max-w-xl text-3xl font-normal text-white md:text-4xl" style={{ fontFamily: "var(--font-playfair)" }}>
              {title}
            </h2>
            {desc ? <p className="mb-6 max-w-lg text-sm text-white/85">{desc}</p> : null}
            <div className="flex flex-wrap gap-3">
              <ExternalOrLink href={c1h} className="rounded-full bg-white px-5 py-2 text-xs font-bold text-slate-900">
                {c1}
              </ExternalOrLink>
              {c2 ? (
                <ExternalOrLink href={c2h} className="rounded-full border border-white px-5 py-2 text-xs font-bold text-white">
                  {c2}
                </ExternalOrLink>
              ) : null}
            </div>
          </div>
        </section>
      </EditableSection>
    );
  }

  if (id === "gender-split") {
    const wt = (cfg.women_title as string) || "Shop Women";
    const wh = (cfg.women_href as string) || "/collections";
    const wi = (cfg.women_image as string) || "";
    const mt = (cfg.men_title as string) || "Shop Men";
    const mh = (cfg.men_href as string) || "/collections";
    const mi = (cfg.men_image as string) || "";
    return (
      <EditableSection id={id} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
        <section className="grid grid-cols-1 md:grid-cols-2" style={{ background: CREAM }}>
          <Link href={wh} className="relative flex min-h-[200px] items-end p-6 md:min-h-[280px] md:p-10">
            {wi ? <img src={wi} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
              <div className="absolute inset-0 bg-gradient-to-br from-pink-200 to-rose-300" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <span className="relative z-[1] text-2xl font-normal text-white" style={{ fontFamily: "var(--font-playfair)" }}>
              {wt}
            </span>
          </Link>
          <Link href={mh} className="relative flex min-h-[200px] items-end p-6 md:min-h-[280px] md:p-10">
            {mi ? <img src={mi} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-600 to-slate-800" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <span className="relative z-[1] text-2xl font-normal text-white" style={{ fontFamily: "var(--font-playfair)" }}>
              {mt}
            </span>
          </Link>
        </section>
      </EditableSection>
    );
  }

  if (id === "brands-strip") {
    const brands =
      Array.isArray(cfg.brands) && (cfg.brands as string[]).length > 0
        ? (cfg.brands as string[])
        : ["LOUIS VUITTON", "GUCCI", "DIOR", "CHANEL"];
    return (
      <EditableSection id={id} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
        <div className="border-y border-pink-100 bg-white py-4">
          <div className="flex gap-10 overflow-x-auto px-4 scrollbar-hide md:justify-center">
            {brands.map((b) => (
              <span key={b} className="shrink-0 text-xs font-black tracking-[0.2em] text-slate-400 md:text-sm">
                {b}
              </span>
            ))}
          </div>
        </div>
      </EditableSection>
    );
  }

  if (id === "gift-ideas") {
    const title = (cfg.title as string) || "Gift Ideas";
    const cats =
      Array.isArray(cfg.categories) && (cfg.categories as string[]).length > 0
        ? (cfg.categories as string[])
        : ["For Her", "For Him", "Under 500 EGP"];
    const va = (cfg.view_all as string) || "/products";
    return (
      <EditableSection id={id} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
        <section className="px-4 py-8 md:px-12" style={{ background: CREAM }}>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-normal" style={{ fontFamily: "var(--font-playfair)", color: WARM_DK }}>
              {title}
            </h2>
            <Link href={va} className="text-[10px] font-semibold uppercase border-b" style={{ color: "#C4809A", borderColor: ROSE_PALE }}>
              View all →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <Link
                key={c}
                href={`/products?q=${encodeURIComponent(c)}`}
                className="rounded-full border px-4 py-2 text-xs font-semibold"
                style={{ borderColor: ROSE_PALE, color: WARM_DK }}
              >
                {c}
              </Link>
            ))}
          </div>
        </section>
      </EditableSection>
    );
  }

  if (id === "price-tiers") {
    const title = (cfg.title as string) || "Shop by Budget";
    const tiers =
      Array.isArray(cfg.tiers) && (cfg.tiers as string[]).length > 0
        ? (cfg.tiers as string[])
        : ["Under 500 EGP", "500–1000 EGP", "1000+ EGP"];
    return (
      <EditableSection id={id} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
        <section className="px-4 py-8 md:px-12" style={{ background: CREAM }}>
          <h2 className="mb-4 text-2xl font-normal" style={{ fontFamily: "var(--font-playfair)", color: WARM_DK }}>
            {title}
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {tiers.map((t) => (
              <Link
                key={t}
                href={`/products?q=${encodeURIComponent(t)}`}
                className="rounded-xl border bg-white p-4 text-center text-xs font-bold shadow-sm transition hover:border-[#D4457A]"
                style={{ borderColor: ROSE_PALE, color: WARM_DK }}
              >
                {t}
              </Link>
            ))}
          </div>
        </section>
      </EditableSection>
    );
  }

  if (id === "buy2get1") {
    const eyebrow = (cfg.eyebrow as string) || "Special offer";
    const title = (cfg.title as string) || "BUY 2 GET 1 FREE";
    const desc = (cfg.desc as string) || "";
    const cta = (cfg.cta_text as string) || "Shop the Offer";
    const ch = (cfg.cta_href as string) || "/products";
    return (
      <EditableSection id={id} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
        <section className="px-4 py-8 md:px-12" style={{ background: "linear-gradient(135deg,#2E1228,#1A0818)" }}>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-pink-300">{eyebrow}</p>
          <h2 className="mb-2 text-2xl font-normal text-white md:text-3xl" style={{ fontFamily: "var(--font-playfair)" }}>
            {title}
          </h2>
          {desc ? <p className="mb-4 max-w-xl text-sm text-white/75">{desc}</p> : null}
          <ExternalOrLink href={ch} className="inline-block rounded-full bg-[#D4457A] px-6 py-2.5 text-xs font-bold text-white">
            {cta}
          </ExternalOrLink>
        </section>
      </EditableSection>
    );
  }

  if (id === "category-grid") {
    const title = (cfg.title as string) || "Shop by Category";
    const items =
      Array.isArray(cfg.items) && (cfg.items as string[]).length > 0
        ? (cfg.items as string[])
        : ["Bags", "Heels", "Sneakers", "Watches", "Perfumes", "Belts"];
    const show = items.slice(0, 6);
    return (
      <EditableSection id={id} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
        <section className="px-4 py-8 md:px-12" style={{ background: CREAM }}>
          <h2 className="mb-4 text-2xl font-normal" style={{ fontFamily: "var(--font-playfair)", color: WARM_DK }}>
            {title}
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {show.map((name, i) => (
              <Link
                key={name}
                href={`/products?q=${encodeURIComponent(name)}`}
                className="flex aspect-[4/3] items-center justify-center rounded-2xl text-sm font-bold text-white shadow-md"
                style={{
                  background: `linear-gradient(145deg, hsl(${330 + i * 25}, 45%, ${82 - i * 3}%), hsl(${350 + i * 20}, 50%, 75%))`,
                }}
              >
                {name}
              </Link>
            ))}
          </div>
        </section>
      </EditableSection>
    );
  }

  if (id === "mystery-box") {
    const title = (cfg.title as string) || "Mystery Box";
    const subtitle = (cfg.subtitle as string) || "";
    const price = (cfg.price as string) || "From 299 EGP";
    const image = (cfg.image as string) || "";
    const href = (cfg.href as string) || "/products";
    const cta = (cfg.cta_text as string) || "Get Your Box";
    return (
      <EditableSection id={id} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
        <section className="mx-4 my-6 overflow-hidden rounded-2xl border md:mx-12" style={{ borderColor: ROSE_PALE, background: "#FFF5F8" }}>
          <div className="grid grid-cols-1 items-center gap-4 p-6 md:grid-cols-2 md:p-10">
            <div>
              <h2 className="mb-2 text-2xl font-normal" style={{ fontFamily: "var(--font-playfair)", color: WARM_DK }}>
                {title}
              </h2>
              {subtitle ? <p className="mb-2 text-sm text-slate-600">{subtitle}</p> : null}
              <p className="mb-4 text-sm font-bold" style={{ color: PINK }}>
                {price}
              </p>
              <ExternalOrLink href={href} className="inline-block rounded-full bg-[#D4457A] px-5 py-2 text-xs font-bold text-white">
                {cta}
              </ExternalOrLink>
            </div>
            <div className="flex justify-center">
              {image ? (
                <img src={image} alt="" className="max-h-48 rounded-xl object-contain" />
              ) : (
                <span className="text-8xl">📦</span>
              )}
            </div>
          </div>
        </section>
      </EditableSection>
    );
  }

  if (id === "text-banner") {
    const dark = (cfg.dark as boolean) !== false;
    const eyebrow = (cfg.eyebrow as string) || "";
    const title = (cfg.title as string) || "Campaign";
    const cta = (cfg.cta_text as string) || "";
    const ch = (cfg.cta_href as string) || "/products";
    return (
      <EditableSection id={id} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
        <section
          className="px-5 py-10 text-center md:px-12 md:py-14"
          style={{
            background: dark ? "#1A0818" : CREAM,
            color: dark ? "#fff" : WARM_DK,
          }}
        >
          {eyebrow ? <p className="mb-2 text-[10px] font-bold uppercase tracking-widest opacity-70">{eyebrow}</p> : null}
          <h2 className="mx-auto mb-4 max-w-2xl text-2xl font-normal md:text-3xl" style={{ fontFamily: "var(--font-playfair)" }}>
            {title}
          </h2>
          {cta ? (
            <ExternalOrLink
              href={ch}
              className="inline-block rounded-full border px-5 py-2 text-xs font-bold"
              style={{
                borderColor: dark ? "rgba(255,255,255,.4)" : ROSE_PALE,
                color: dark ? "#fff" : WARM_DK,
              }}
            >
              {cta}
            </ExternalOrLink>
          ) : null}
        </section>
      </EditableSection>
    );
  }

  if (id === "social-ticker") {
    return <SocialTickerBlock id={id} label={label} cfg={cfg} isEditor={isEditor} isHighlighted={isHighlighted} />;
  }

  if (id === "whatsapp") {
    const title = (cfg.title as string) || "Need help? Chat with us";
    const subtitle = (cfg.subtitle as string) || "Instant replies on WhatsApp";
    const href = (cfg.href as string) || "#";
    return (
      <EditableSection id={id} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
        <section className="mx-4 my-4 rounded-2xl border p-5 md:mx-12" style={{ borderColor: ROSE_PALE, background: "#ecfdf5" }}>
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="text-sm text-slate-600">{subtitle}</p>
            </div>
            <ExternalOrLink
              href={href}
              className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-bold text-white"
            >
              💬 Open WhatsApp
            </ExternalOrLink>
          </div>
        </section>
      </EditableSection>
    );
  }

  if (id === "pay-later") {
    const title = (cfg.title as string) || "Pay Later. Wear Now.";
    const desc = (cfg.desc as string) || "";
    const providers = Array.isArray(cfg.providers)
      ? (cfg.providers as string[])
      : ["TRU", "ValU", "SUHOOLA", "HALAN"];
    return (
      <EditableSection id={id} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
        <section className="px-4 py-8 md:px-12" style={{ background: CREAM }}>
          <h2 className="mb-2 text-2xl font-normal" style={{ fontFamily: "var(--font-playfair)", color: WARM_DK }}>
            {title}
          </h2>
          {desc ? <p className="mb-4 max-w-xl text-sm text-slate-600">{desc}</p> : null}
          <div className="flex flex-wrap gap-2">
            {providers.map((p) => (
              <span
                key={p}
                className="rounded-lg border px-3 py-1.5 text-[10px] font-bold text-slate-700"
                style={{ borderColor: ROSE_PALE, background: BLUSH }}
              >
                {p}
              </span>
            ))}
          </div>
        </section>
      </EditableSection>
    );
  }

  if (id === "quick-links") {
    const links =
      Array.isArray(cfg.links) && (cfg.links as string[]).length > 0
        ? (cfg.links as string[])
        : ["Sale", "New In", "Bags", "Shoes"];
    return (
      <EditableSection id={id} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
        <div className="border-b border-pink-50 bg-white px-4 py-3 md:px-12">
          <div className="flex flex-wrap justify-center gap-2">
            {links.map((l) => (
              <Link
                key={l}
                href={`/products?q=${encodeURIComponent(l)}`}
                className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide"
                style={{ background: BLUSH, color: ROSE_DEEP }}
              >
                {l}
              </Link>
            ))}
          </div>
        </div>
      </EditableSection>
    );
  }

  return (
    <EditableSection id={id} label={label} isEditor={isEditor} isHighlighted={isHighlighted}>
      <div
        className="mx-4 my-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500 md:mx-12"
      >
        Section <span className="font-mono font-semibold">{id}</span> — configure it under Theme → Page.
      </div>
    </EditableSection>
  );
}
