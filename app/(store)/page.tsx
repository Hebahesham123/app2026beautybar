"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { mergeBuiltinOrder } from "@/lib/builtin-sections";
import { ExtraBuiltinSection } from "@/components/home/ExtraBuiltinSections";
import { orderProductsByIds, useHomeShelfFromViewAll } from "@/hooks/useHomeShelfFromViewAll";
import { useSupabase } from "@/lib/supabase";
import { dummyProducts, dummyCollections } from "@/lib/dummy-data";
import {
  slugify,
  getProductImageUrl,
  isProductVisibleInStore,
  isCollectionVisibleInStore,
  normalizeCollectionProductIds,
} from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { useTheme } from "@/context/ThemeContext";
import { EditableSection } from "@/components/EditableSection";
import type { Product, Collection } from "@/types";

const PINK = "#D4617A";
const ROSE_HOT = "#E8325A";
const ROSE_DEEP = "#B84060";
const CREAM = "#FDF7F2";
const BLUSH = "#F9EBE8";
const ROSE_PALE = "#F2D4D4";
const WARM_DK = "#2A1820";
const WARM_MUTED = "#9A7080";

/** Product photo for home shelf tiles; falls back to gradient + emoji if URL missing or load fails. */
function ProductTileImage({
  product,
  shellClassName,
  gradient,
  fallback,
}: {
  product: Product;
  shellClassName: string;
  gradient: string;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const url = getProductImageUrl(product);
  return (
    <div className={`relative overflow-hidden ${shellClassName}`} style={{ background: gradient }}>
      {url && !failed ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 z-[1] h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
      <div
        className={`absolute inset-0 z-0 flex items-center justify-center ${url && !failed ? "pointer-events-none opacity-0" : ""}`}
        aria-hidden
      >
        {fallback}
      </div>
    </div>
  );
}

// ─── HERO SECTION ─────────────────────────────────────────────────────────────
function HeroSection({ isEditor, isHighlighted, config }: { isEditor: boolean; isHighlighted: boolean; config?: Record<string, unknown> }) {
  const { add } = useCart();
  const themeContext = useTheme();
  const theme = themeContext?.theme;
  const [featuredProduct, setFeaturedProduct] = useState<Product | null>(null);
  const supabase = useSupabase();

  // Get config from theme settings
  let sectionConfig: Record<string, unknown> = config || {};
  if (theme?.home_blocks_json) {
    try {
      const blocks = JSON.parse(theme.home_blocks_json);
      if (blocks.builtin_sections?.hero) {
        sectionConfig = blocks.builtin_sections.hero;
      }
    } catch (e) {
      // Use default config
    }
  }

  const badge = (sectionConfig.badge as string) || "Eid Collection 2025";
  const title = (sectionConfig.title as string) || "Wear What\nMakes You\nUnforgettable";
  const subtitle = (sectionConfig.subtitle as string) || "Luxury bags, heels & fragrance. Cash on delivery. Free returns.";
  const cta1Text = (sectionConfig.cta1_text as string) || "Shop Now";
  const cta1Href = (sectionConfig.cta1_href as string) || "/products";
  const cta2Text = (sectionConfig.cta2_text as string) || "Watch Live";
  const selectedProductId = (() => {
    try {
      const u = new URL(cta1Href, "http://local");
      return (u.searchParams.get("pid") || "").trim();
    } catch {
      return "";
    }
  })();
  const selectedProductSlug = (() => {
    const m = cta1Href.match(/^\/product\/([^?#]+)/);
    return m?.[1]?.trim() || "";
  })();

  useEffect(() => {
    if (!supabase) {
      const fallback =
        dummyProducts.find((p) => p.id === selectedProductId) ||
        dummyProducts.find((p) => (p.slug || slugify(p.name)) === selectedProductSlug) ||
        dummyProducts[0] ||
        null;
      setFeaturedProduct(fallback);
      return;
    }
    const fallback =
      dummyProducts.find((p) => p.id === selectedProductId) ||
      dummyProducts.find((p) => (p.slug || slugify(p.name)) === selectedProductSlug) ||
      dummyProducts[0] ||
      null;
    const pickFromRows = (rows: Product[]) => {
      if (selectedProductId) {
        const byId = rows.find((p) => p.id === selectedProductId);
        if (byId) return byId;
      }
      if (selectedProductSlug) {
        const bySlug = rows.find((p) => (p.slug || slugify(p.name)) === selectedProductSlug);
        if (bySlug) return bySlug;
      }
      return rows[0] || null;
    };
    if (selectedProductId) {
      supabase
        .from("products")
        .select("*")
        .eq("id", selectedProductId)
        .limit(1)
        .then((res: { data: Product[] | null; error?: { message: string } }) => {
          if (res.data?.[0]) {
            setFeaturedProduct(res.data[0]);
            return;
          }
          supabase
            .from("products")
            .select("*")
            .limit(1200)
            .then((res2: { data: Product[] | null; error?: { message: string } }) => {
              if (res2.error) {
                console.warn("[Hero] products:", res2.error.message, res2.error);
                setFeaturedProduct(fallback);
                return;
              }
              const rows = (res2.data || []).filter(isProductVisibleInStore);
              setFeaturedProduct(pickFromRows(rows) || fallback);
            });
        });
      return;
    }
    supabase
      .from("products")
      .select("*")
      .limit(1200)
      .then((res: { data: Product[] | null; error?: { message: string } }) => {
        if (res.error) {
          console.warn("[Hero] products:", res.error.message, res.error);
          setFeaturedProduct(fallback);
          return;
        }
        const rows = (res.data || []).filter(isProductVisibleInStore);
        setFeaturedProduct(pickFromRows(rows) || fallback);
      });
  }, [supabase, selectedProductId, selectedProductSlug]);

  return (
    <EditableSection id="hero" label="Hero Section" isEditor={isEditor} isHighlighted={isHighlighted}>
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-101px)] overflow-hidden" style={{ background: CREAM }}>
        {/* Left side - Text */}
        <div className="px-4 md:px-12 py-8 md:py-16 flex flex-col justify-center relative md:pl-16">
          <div className="absolute bottom-0 right-0 w-[55%] h-[35%] bg-gradient-radial from-pink-200/22 to-transparent pointer-events-none hidden md:block" />
          
          <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1 rounded-full mb-4 md:mb-6 w-fit" style={{ background: BLUSH, border: `1px solid ${ROSE_PALE}` }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: ROSE_HOT }} />
            <span className="text-[9px] md:text-[10px] tracking-widest uppercase font-bold" style={{ color: PINK }}>{badge}</span>
          </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-normal leading-[0.95] mb-4 md:mb-5" style={{ fontFamily: "var(--font-playfair)", color: WARM_DK }}>
          {title.split("\n").map((line, i, arr) => {
            const isLastLine = i === arr.length - 1;
            const isUnforgettable = line.toLowerCase().includes("unforgettable");
            const content = isUnforgettable ? <em style={{ color: PINK, fontStyle: "italic" }}>{line}</em> : line;
            return (
              <React.Fragment key={i}>
                {content}
                {!isLastLine && <br />}
              </React.Fragment>
            );
          })}
        </h1>

        <p className="text-sm md:text-[15px] leading-relaxed mb-6 md:mb-9 max-w-full md:max-w-[370px]" style={{ color: WARM_MUTED }}>
          {subtitle}
        </p>

        <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mb-6 md:mb-11">
          <Link href={cta1Href} className="px-6 md:px-8 py-3 md:py-3.5 rounded-md text-xs md:text-[13px] font-semibold text-white text-center transition-all hover:scale-105" style={{ background: ROSE_HOT, boxShadow: "0 6px 20px rgba(232,50,90,.34)" }}>
            {cta1Text}
          </Link>
          <button className="px-6 md:px-7 py-3 md:py-3.5 rounded-md text-xs md:text-[13px] font-semibold transition-all hover:bg-pink-50" style={{ border: `1.5px solid ${ROSE_PALE}`, color: PINK }}>
            {cta2Text}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-8">
          {[
            { num: "24h", label: "Delivery" },
            { num: "COD", label: "Available" },
            { num: "14-Day", label: "Returns" },
            { num: "2,400+", label: "Products" },
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-xl md:text-2xl font-medium" style={{ fontFamily: "var(--font-playfair)", color: ROSE_DEEP }}>{stat.num}</div>
              <div className="text-[9px] md:text-[10px] tracking-wider uppercase mt-0.5" style={{ color: WARM_MUTED }}>{stat.label}</div>
            </div>
          ))}
      </div>
      </div>

      {/* Right side - Product card */}
      <div className="relative overflow-hidden flex items-center justify-center min-h-[300px] md:min-h-0" style={{ background: "linear-gradient(140deg, #F9E8EE, #F2D4DC, #F0C8D4)" }}>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-gradient-radial from-pink-500/11 to-transparent hidden md:block" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-gradient-radial from-pink-400/8 to-transparent hidden md:block" />

        {featuredProduct && (
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-2xl transform -rotate-2 transition-transform hover:rotate-0 hover:scale-105 relative z-10 text-center mx-4 md:mx-0" style={{ boxShadow: "0 12px 48px rgba(180,60,90,.16)" }}>
            {getProductImageUrl(featuredProduct) ? (
              <div className="mb-2 md:mb-3.5 overflow-hidden rounded-xl bg-slate-50">
                <img
                  src={getProductImageUrl(featuredProduct) || ""}
                  alt={featuredProduct.name}
                  className="h-40 md:h-52 w-full object-cover"
                />
              </div>
            ) : (
              <div className="text-6xl md:text-9xl mb-2 md:mb-3.5" style={{ filter: "drop-shadow(0 8px 18px rgba(180,60,90,.18))" }}>👜</div>
            )}
            <div className="text-base md:text-lg font-medium mb-1" style={{ fontFamily: "var(--font-playfair)", color: WARM_DK }}>
              {featuredProduct.name}
            </div>
            <div className="text-xs md:text-sm font-bold mb-2 md:mb-3" style={{ color: PINK }}>LE {Number(featuredProduct.price).toLocaleString()}</div>
            <button
              onClick={() => add(featuredProduct)}
              className="px-4 md:px-5 py-1.5 md:py-2 rounded-full text-[10px] md:text-[11.5px] font-bold text-white transition-all hover:scale-105"
              style={{ background: ROSE_HOT }}
            >
              Add to Cart
            </button>
          </div>
        )}

        <div className="absolute top-[10%] md:top-[15%] left-[2%] bg-white rounded-xl px-2 md:px-3 py-1.5 md:py-2 shadow-lg border text-[10px] md:text-[11px] font-semibold z-20 animate-bounce hidden sm:block" style={{ borderColor: ROSE_PALE }}>
          ⭐ Bestseller<br /><span className="text-[9px] md:text-[10.5px]" style={{ color: PINK }}>3,200+ sold</span>
        </div>
        <div className="absolute bottom-[10%] md:bottom-[18%] right-[2%] bg-white rounded-xl px-2 md:px-3 py-1.5 md:py-2 shadow-lg border text-[10px] md:text-[11px] font-semibold z-20 animate-bounce hidden sm:block" style={{ borderColor: ROSE_PALE, animationDelay: "0.5s" }}>
          ✦ Gold Member<br /><span className="text-[9px] md:text-[10.5px]" style={{ color: PINK }}>+320 pts earned</span>
        </div>
      </div>
      </div>
    </EditableSection>
  );
}

// ─── SHOP BY STYLE (WOMEN/MEN) ────────────────────────────────────────────────
function ShopByStyle({ collections, isEditor, isHighlighted, config }: { collections: Collection[]; isEditor: boolean; isHighlighted: boolean; config?: Record<string, unknown> }) {
  const { theme } = useTheme();
  const womenCol = collections[0] || dummyCollections[0];
  const menCol = collections[1] || dummyCollections[1];

  // Get config from theme settings
  let sectionConfig: Record<string, unknown> = {};
  try {
    if (theme?.home_blocks_json) {
      const blocks = JSON.parse(theme.home_blocks_json);
      sectionConfig = blocks.builtin_sections?.["shop-by-style"] || config || {};
    } else {
      sectionConfig = config || {};
    }
  } catch {
    sectionConfig = config || {};
  }

  const tag = (sectionConfig.tag as string) || "Collections";
  const title = (sectionConfig.title as string) || "Shop by Style";
  const womenLabel = (sectionConfig.women_label as string) || "New Collection";
  const womenTitle = (sectionConfig.women_title as string) || "Shop Women";
  const womenHref = (sectionConfig.women_href as string) || (womenCol ? `/collection/${womenCol.slug}` : "/collections");
  const womenImage = (sectionConfig.women_image as string) || "";
  const menLabel = (sectionConfig.men_label as string) || "New Arrivals";
  const menTitle = (sectionConfig.men_title as string) || "Shop Men";
  const menHref = (sectionConfig.men_href as string) || (menCol ? `/collection/${menCol.slug}` : "/collections");
  const menImage = (sectionConfig.men_image as string) || "";
  const getCollectionImageUrl = (c?: Collection | null): string => {
    if (!c) return "";
    const row = c as unknown as Record<string, unknown>;
    const candidates = [c.banner_image, row.image_url, row.image, row.cover_image, row.thumbnail];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
    return "";
  };
  const womenBgImage = womenImage || getCollectionImageUrl(womenCol);
  const menBgImage = menImage || getCollectionImageUrl(menCol);

  return (
    <EditableSection id="shop-by-style" label="Shop by Style" isEditor={isEditor} isHighlighted={isHighlighted}>
      <section className="px-4 md:px-12 py-8 md:py-14" style={{ background: CREAM }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-6 md:mb-8 gap-3">
        <div>
            <div className="text-[9px] md:text-[10px] tracking-widest uppercase font-bold mb-1 md:mb-2" style={{ color: PINK }}>{tag}</div>
            <h2 className="text-3xl md:text-4xl font-normal leading-tight" style={{ fontFamily: "var(--font-playfair)", color: WARM_DK }}>
              {title.split(" ").map((word, i, arr) => {
                const isLastWord = i === arr.length - 1;
                return (
                  <React.Fragment key={i}>
                    {isLastWord ? <em style={{ fontStyle: "italic", color: PINK }}>{word}</em> : word}
                    {i < arr.length - 1 && " "}
                  </React.Fragment>
                );
              })}
            </h2>
          </div>
          <Link href="/collections" className="text-[10px] md:text-[11.5px] tracking-wide uppercase font-semibold border-b pb-0.5 transition-colors whitespace-nowrap" style={{ color: "#C4809A", borderColor: ROSE_PALE }}>
            View all →
          </Link>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {/* Women */}
          <Link href={womenHref} className="relative rounded-2xl h-64 md:h-80 overflow-hidden cursor-pointer flex items-end group">
            {womenBgImage ? (
              <img
                src={womenBgImage}
                alt={womenTitle}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-6xl md:text-8xl transition-transform duration-500 group-hover:scale-105" style={{ background: "linear-gradient(145deg, #F9E0EA, #F4C8D8, #EEC0D0)" }}>👜</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
            <div className="relative z-10 p-5 md:p-7 w-full">
              <div className="text-[9px] md:text-[10px] tracking-widest uppercase font-bold mb-1 text-white/70">{womenLabel}</div>
              <div className="text-2xl md:text-3xl font-normal mb-2 md:mb-3 text-white" style={{ fontFamily: "var(--font-playfair)" }}>{womenTitle}</div>
              <button className="inline-block px-5 md:px-6 py-2 md:py-2.5 bg-white rounded-full text-[10px] md:text-xs font-bold transition-all hover:bg-pink-500 hover:text-white" style={{ color: WARM_DK }}>
                Explore →
              </button>
        </div>
            </Link>

          {/* Men */}
          <Link href={menHref} className="relative rounded-2xl h-64 md:h-80 overflow-hidden cursor-pointer flex items-end group">
            {menBgImage ? (
              <img
                src={menBgImage}
                alt={menTitle}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-6xl md:text-8xl transition-transform duration-500 group-hover:scale-105" style={{ background: "linear-gradient(145deg, #DDE8F4, #C8D8EC, #BACCE8)" }}>👟</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
            <div className="relative z-10 p-5 md:p-7 w-full">
              <div className="text-[9px] md:text-[10px] tracking-widest uppercase font-bold mb-1 text-white/70">{menLabel}</div>
              <div className="text-2xl md:text-3xl font-normal mb-2 md:mb-3 text-white" style={{ fontFamily: "var(--font-playfair)" }}>{menTitle}</div>
              <button className="inline-block px-5 md:px-6 py-2 md:py-2.5 bg-white rounded-full text-[10px] md:text-xs font-bold transition-all hover:bg-pink-500 hover:text-white" style={{ color: WARM_DK }}>
                Explore →
              </button>
          </div>
          </Link>
      </div>
    </section>
    </EditableSection>
  );
}

// ─── CATEGORIES (HORIZONTAL SCROLL) ───────────────────────────────────────────
function CategoriesSection({ isEditor, isHighlighted, config }: { isEditor: boolean; isHighlighted: boolean; config?: Record<string, unknown> }) {
  const { theme } = useTheme();
  const defaultCategories = [
    { icon: "👜", name: "Bags", count: "240 items", bg: "linear-gradient(145deg, #FDE8EE, #F9D4DC)" },
    { icon: "👠", name: "Heels", count: "180 items", bg: "linear-gradient(145deg, #FDF0E4, #F5E0CC)" },
    { icon: "👟", name: "Sneakers", count: "95 items", bg: "linear-gradient(145deg, #EEF0FD, #DDE0FA)" },
    { icon: "🥿", name: "Loafers", count: "76 items", bg: "linear-gradient(145deg, #F0FDE8, #DDFAD4)" },
    { icon: "🩰", name: "Ballerinas", count: "58 items", bg: "linear-gradient(145deg, #FDE8F8, #F9D4F4)" },
    { icon: "👢", name: "Boots", count: "112 items", bg: "linear-gradient(145deg, #FDF4E8, #F9EDCC)" },
    { icon: "🌸", name: "Perfumes", count: "148 items", bg: "linear-gradient(145deg, #F0FAFA, #D4F0F4)" },
    { icon: "🎁", name: "Gifts", count: "44 items", bg: "linear-gradient(145deg, #FFF0E8, #FFE4CC)" },
  ];
  let sectionConfig: Record<string, unknown> = config || {};
  try {
    if (theme?.home_blocks_json) {
      const blocks = JSON.parse(theme.home_blocks_json);
      sectionConfig = blocks.builtin_sections?.categories || config || {};
    }
  } catch {
    sectionConfig = config || {};
  }
  const tag = (sectionConfig.tag as string) || "Browse";
  const title = (sectionConfig.title as string) || "Shop by Category";
  const viewAllHref = (sectionConfig.view_all as string) || "/products";
  const categoryLines = Array.isArray(sectionConfig.categories) && sectionConfig.categories.length > 0
    ? (sectionConfig.categories as string[])
    : defaultCategories.map((c) => `${c.name}|${c.count}`);
  const categories = categoryLines
    .map((line, i) => {
      const fallback = defaultCategories[i % defaultCategories.length];
      const [nameRaw, countRaw, hrefRaw, imageRaw, iconRaw] = line.split("|").map((s) => s.trim());
      const name = nameRaw || fallback.name;
      const count = countRaw || fallback.count;
      const href = hrefRaw || `/products?q=${encodeURIComponent(name)}`;
      const image = imageRaw || "";
      const icon = iconRaw || fallback.icon;
      return { name, count, href, image, icon, bg: fallback.bg };
    })
    .filter((c) => c.name);

  return (
    <EditableSection id="categories" label="Categories" isEditor={isEditor} isHighlighted={isHighlighted}>
      <section className="px-4 md:px-12 py-6 md:py-10" style={{ background: CREAM }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-4 md:mb-6 gap-3">
            <div>
          <div className="text-[9px] md:text-[10px] tracking-widest uppercase font-bold mb-1 md:mb-2" style={{ color: PINK }}>{tag}</div>
          <h2 className="text-3xl md:text-4xl font-normal leading-tight" style={{ fontFamily: "var(--font-playfair)", color: WARM_DK }}>
            {title.split(" ").map((word, i, arr) => (
              <React.Fragment key={`${word}-${i}`}>
                {i === arr.length - 1 ? <em style={{ fontStyle: "italic", color: PINK }}>{word}</em> : word}
                {i < arr.length - 1 && " "}
              </React.Fragment>
            ))}
          </h2>
            </div>
        <Link href={viewAllHref} className="text-[10px] md:text-[11.5px] tracking-wide uppercase font-semibold border-b pb-0.5 transition-colors whitespace-nowrap" style={{ color: "#C4809A", borderColor: ROSE_PALE }}>
          All →
        </Link>
          </div>

      <div className="flex gap-3 md:gap-3.5 overflow-x-auto pb-8 md:pb-12 scrollbar-hide px-2 md:px-0" style={{ paddingLeft: "0", paddingRight: "0" }}>
        {categories.map((cat, i) => (
          <Link key={i} href={cat.href} className="flex-shrink-0 w-24 md:w-32 text-center transition-transform hover:-translate-y-1 cursor-pointer">
            <div
              className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-4xl md:text-5xl mb-2 md:mb-2.5 border-2.5 border-transparent transition-all hover:border-pink-500"
              style={{ background: cat.bg, boxShadow: "0 0 0 3px rgba(232,50,90,.12)" }}
            >
              {cat.image ? (
                <img src={cat.image} alt={cat.name} className="h-16 w-16 md:h-20 md:w-20 object-contain" />
              ) : (
                cat.icon
              )}
          </div>
            <div className="text-[11px] md:text-xs font-semibold" style={{ color: WARM_DK }}>{cat.name}</div>
            <div className="text-[9px] md:text-[10.5px]" style={{ color: WARM_MUTED }}>{cat.count}</div>
          </Link>
        ))}
      </div>
      </section>
    </EditableSection>
  );
}

// ─── HOT OFFERS ───────────────────────────────────────────────────────────────
function HotOffersSection({ isEditor, isHighlighted, config }: { isEditor: boolean; isHighlighted: boolean; config?: Record<string, unknown> }) {
  const { theme } = useTheme();
  const defaultOffers = [
    { tag: "Up to 50% off", title: "Eid Sale\nHas Arrived", subtitle: "All bags & shoes this week", href: "/products?q=sale", buttonText: "Shop Sale →", image: "", icon: "👜", bg: "linear-gradient(140deg, #1A0818, #2E1228, #1E0A20)" },
    { tag: "−30% Heels", title: "New Season\nArrivals", subtitle: "Fresh drops every Friday", href: "/products?q=heels", buttonText: "Explore →", image: "", icon: "👠", bg: "linear-gradient(140deg, #F9E0EA, #F4C0D0)" },
    { tag: "Free Gift", title: "Buy 2\nGet 1 Free", subtitle: "All perfumes this month", href: "/products?q=perfumes", buttonText: "Shop →", image: "", icon: "🌸", bg: "linear-gradient(140deg, #E8F4F8, #C8E4EE)" },
    { tag: "Premium", title: "Gift Sets\nfor Her", subtitle: "Curated luxury boxes", href: "/products?q=gift", buttonText: "Shop →", image: "", icon: "💎", bg: "linear-gradient(145deg, #FDE8F0, #F9D4E8)" },
    { tag: "Accessories", title: "New In\nAccessories", subtitle: "Scarves, belts & more", href: "/products?q=accessories", buttonText: "Shop →", image: "", icon: "✨", bg: "linear-gradient(145deg, #F4F4E0, #EDE8C0)" },
  ];
  let sectionConfig: Record<string, unknown> = config || {};
  try {
    if (theme?.home_blocks_json) {
      const blocks = JSON.parse(theme.home_blocks_json);
      sectionConfig = blocks.builtin_sections?.["hot-offers"] || config || {};
    }
  } catch {
    sectionConfig = config || {};
  }
  const sectionTag = (sectionConfig.tag as string) || "🔥 Limited Time";
  const sectionTitle = (sectionConfig.title as string) || "Hot Offers";
  const viewAllHref = (sectionConfig.view_all as string) || "/products?q=sale";
  const offerLines = Array.isArray(sectionConfig.offers) && sectionConfig.offers.length > 0
    ? (sectionConfig.offers as string[])
    : defaultOffers.map((o) => `${o.tag}|${o.title}|${o.subtitle}|${o.href}|${o.buttonText}|${o.image}|${o.icon}|${o.bg}`);
  const offers = offerLines.map((line, i) => {
    const fallback = defaultOffers[i % defaultOffers.length];
    const [tag, title, subtitle, href, buttonText, image, icon, bg] = line.split("|").map((s) => s.trim());
    return {
      tag: tag || fallback.tag,
      title: title || fallback.title,
      subtitle: subtitle || fallback.subtitle,
      href: href || fallback.href,
      buttonText: buttonText || fallback.buttonText,
      image: image || "",
      icon: icon || fallback.icon,
      bg: bg || fallback.bg,
    };
  }).slice(0, 5);

  return (
    <EditableSection id="hot-offers" label="Hot Offers" isEditor={isEditor} isHighlighted={isHighlighted}>
      <section className="px-4 md:px-12 py-8 md:py-14" style={{ background: CREAM }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-6 md:mb-8 gap-3">
      <div>
            <div className="text-[9px] md:text-[10px] tracking-widest uppercase font-bold mb-1 md:mb-2" style={{ color: ROSE_HOT }}>{sectionTag}</div>
          <h2 className="text-3xl md:text-4xl font-normal leading-tight" style={{ fontFamily: "var(--font-playfair)", color: WARM_DK }}>
            {sectionTitle.split(" ").map((word, i, arr) => (
              <React.Fragment key={`${word}-${i}`}>
                {i === 0 ? <em style={{ fontStyle: "italic", color: PINK }}>{word}</em> : word}
                {i < arr.length - 1 && " "}
              </React.Fragment>
            ))}
        </h2>
      </div>
        <Link href={viewAllHref} className="text-[10px] md:text-[11.5px] tracking-wide uppercase font-semibold border-b pb-0.5 transition-colors whitespace-nowrap" style={{ color: "#C4809A", borderColor: ROSE_PALE }}>
          All offers →
        </Link>
    </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {/* Tall offer */}
        <Link href={offers[0]?.href || "/products"} className="relative rounded-2xl h-[280px] md:h-[340px] overflow-hidden cursor-pointer flex flex-col items-end group">
          {offers[0]?.image ? (
            <img src={offers[0].image} alt={offers[0].title} className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-5xl md:text-7xl opacity-80 transition-transform duration-500 group-hover:scale-105" style={{ background: offers[0]?.bg }}>
              {offers[0]?.icon}
            </div>
          )}
          <div className="relative z-10 p-5 md:p-6 w-full">
            <div className="inline-block px-2.5 md:px-3 py-0.5 md:py-1 rounded-full text-[8.5px] md:text-[9.5px] font-bold tracking-wider uppercase mb-2 text-white" style={{ background: offers[0].tagBg }}>
              {offers[0]?.tag}
          </div>
            <div className="text-2xl md:text-3xl font-normal leading-tight mb-1 text-white whitespace-pre-line" style={{ fontFamily: "var(--font-playfair)" }}>
              {offers[0]?.title}
        </div>
            <div className="text-[11px] md:text-xs mb-3 md:mb-3.5 text-white/65">{offers[0]?.subtitle}</div>
            <button className="inline-block px-4 md:px-5 py-1.5 md:py-2 bg-white rounded-full text-[10px] md:text-[11.5px] font-bold transition-all hover:bg-pink-50" style={{ color: WARM_DK }}>
              {offers[0]?.buttonText || "Shop Sale →"}
      </button>
          </div>
        </Link>

        {/* Two small offers - column 1 */}
        <div className="flex flex-col gap-3 md:gap-4">
          {offers.slice(1, 3).map((offer, i) => (
            <Link key={i} href={offer.href || "/products"} className="relative rounded-2xl h-[140px] md:h-[160px] overflow-hidden cursor-pointer flex items-end group">
              {offer.image ? (
                <img src={offer.image} alt={offer.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-4xl md:text-5xl transition-transform duration-500 group-hover:scale-105" style={{ background: offer.bg }}>
                  {offer.icon}
                </div>
              )}
              <div className="relative z-10 p-4 md:p-6 w-full">
                <div className="inline-block px-2.5 md:px-3 py-0.5 md:py-1 rounded-full text-[8.5px] md:text-[9.5px] font-bold tracking-wider uppercase mb-1.5 md:mb-2" style={{ background: offer.tagBg, color: i === 0 ? ROSE_DEEP : WARM_DK }}>
                  {offer.tag}
          </div>
                <div className="text-lg md:text-xl font-normal leading-tight mb-1 whitespace-pre-line" style={{ fontFamily: "var(--font-playfair)", color: offer.textColor }}>
                  {offer.title}
        </div>
                <div className="text-[10px] md:text-xs mb-2 md:mb-3.5" style={{ color: offer.textColor === "#fff" ? "rgba(255,255,255,.65)" : WARM_MUTED }}>
                  {offer.subtitle}
                </div>
      <button
                  className="inline-block px-4 md:px-5 py-1.5 md:py-2 rounded-full text-[10px] md:text-[11.5px] font-bold transition-all"
                style={{
                    background: offer.textColor === "#fff" ? "#fff" : ROSE_HOT,
                    color: offer.textColor === "#fff" ? WARM_DK : "#fff",
                  }}
                >
                  {offer.buttonText || (i === 0 ? "Explore →" : "Shop →")}
      </button>
      </div>
            </Link>
            ))}
      </div>

        {/* Two small offers - column 2 */}
        <div className="flex flex-col gap-3 md:gap-4">
          {offers.slice(3).map((offer, i) => (
            <Link key={i} href={offer.href || "/products"} className="relative rounded-2xl h-[140px] md:h-[160px] overflow-hidden cursor-pointer flex items-end group">
              {offer.image ? (
                <img src={offer.image} alt={offer.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-4xl md:text-5xl transition-transform duration-500 group-hover:scale-105" style={{ background: offer.bg }}>
                  {offer.icon}
                </div>
              )}
              <div className="relative z-10 p-4 md:p-6 w-full">
                <div className="inline-block px-2.5 md:px-3 py-0.5 md:py-1 rounded-full text-[8.5px] md:text-[9.5px] font-bold tracking-wider uppercase mb-1.5 md:mb-2" style={{ background: offer.tagBg, color: WARM_DK }}>
                  {offer.tag}
      </div>
                <div className="text-lg md:text-xl font-normal leading-tight mb-1 whitespace-pre-line" style={{ fontFamily: "var(--font-playfair)", color: offer.textColor }}>
                  {offer.title}
      </div>
                <div className="text-[10px] md:text-xs mb-2 md:mb-3.5" style={{ color: WARM_MUTED }}>
                  {offer.subtitle}
              </div>
                <button className="inline-block px-4 md:px-5 py-1.5 md:py-2 rounded-full text-[10px] md:text-[11.5px] font-bold transition-all text-white" style={{ background: ROSE_HOT }}>
                  {offer.buttonText || "Shop →"}
                </button>
            </div>
          </Link>
        ))}
      </div>
      </div>
    </section>
    </EditableSection>
  );
}

// ─── NEW ARRIVALS ─────────────────────────────────────────────────────────────
function NewArrivalsSection({ products, collections, isEditor, isHighlighted, config }: { products: Product[]; collections: Collection[]; isEditor: boolean; isHighlighted: boolean; config?: Record<string, unknown> }) {
  const { add } = useCart();
  const { theme } = useTheme();
  const supabase = useSupabase();
  const [collectionProductsFromDb, setCollectionProductsFromDb] = useState<Product[] | null>(null);

  let sectionConfig: Record<string, unknown> = config || {};
  try {
    if (theme?.home_blocks_json) {
      const blocks = JSON.parse(theme.home_blocks_json);
      sectionConfig = blocks.builtin_sections?.["new-arrivals"] || config || {};
    }
  } catch {
    sectionConfig = config || {};
  }
  const tag = (sectionConfig.tag as string) || "Just Landed";
  const title = (sectionConfig.title as string) || "New Arrivals";
  const viewAllHref = (sectionConfig.view_all as string) || "/products";
  const sourceCollectionHref = (sectionConfig.source_collection as string) || "";
  const selectedCollectionSlug = (() => {
    const fromSource = sourceCollectionHref.match(/^\/collection\/([^?#]+)/)?.[1]?.trim();
    if (fromSource) return fromSource.replace(/[\s{[<(].*$/, "").replace(/-+$/, "");
    const fromView = viewAllHref.match(/^\/collection\/([^?#]+)/)?.[1]?.trim() || "";
    return fromView ? fromView.replace(/[\s{[<(].*$/, "").replace(/-+$/, "") : "";
  })();
  const selectedCollection = selectedCollectionSlug
    ? collections.find((c) => (c.slug || "").toLowerCase() === selectedCollectionSlug.toLowerCase()) ||
      collections.find(
        (c) =>
          (((c as unknown as Record<string, unknown>).handle as string) || "").toLowerCase() ===
          selectedCollectionSlug.toLowerCase()
      ) ||
      collections.find(
        (c) => c.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") === selectedCollectionSlug.toLowerCase()
      ) ||
      null
    : null;

  const countRaw = Number(sectionConfig.product_count);
  const productCount = Number.isFinite(countRaw) ? Math.max(1, Math.min(24, Math.floor(countRaw))) : 4;
  const productLinks = Array.isArray(sectionConfig.product_links)
    ? (sectionConfig.product_links as string[]).map((s) => (s || "").trim())
    : [];

  const productsInSelectedCollection = (() => {
    if (!selectedCollection) return products;
    const raw = selectedCollection as unknown as Record<string, unknown>;
    const ids = normalizeCollectionProductIds(raw.product_ids, raw);
    if (ids.length > 0) {
      const idSet = new Set(ids.map((id) => String(id)));
      const byIds = products.filter((p) => idSet.has(String(p.id)));
      if (byIds.length > 0) return byIds;
    }
    const colId = String(selectedCollection.id);
    return products.filter((p) => p.collection_id != null && String(p.collection_id) === colId);
  })();

  const useSourceCollection = Boolean(sourceCollectionHref.trim() && selectedCollection);

  useEffect(() => {
    if (!supabase || !useSourceCollection || !selectedCollection) {
      setCollectionProductsFromDb(null);
      return;
    }
    let cancelled = false;
    const col = selectedCollection;
    const raw = col as unknown as Record<string, unknown>;
    const ids = normalizeCollectionProductIds(raw.product_ids, raw);

    const applyRows = (rows: Product[] | null) => {
      if (cancelled) return;
      setCollectionProductsFromDb(((rows || []) as Product[]).filter(isProductVisibleInStore));
    };

    (async () => {
      if (ids.length > 0) {
        const res = await supabase
          .from("products")
          .select("*")
          .in("id", ids)
          .order("created_at", { ascending: false });
        if (cancelled) return;
        if (res.error) {
          setCollectionProductsFromDb([]);
          return;
        }
        let rows = (res.data || []) as Product[];
        if (rows.length === 0) {
          const r2 = await supabase
            .from("products")
            .select("*")
            .eq("collection_id", col.id)
            .order("created_at", { ascending: false });
          if (!cancelled && !r2.error) rows = (r2.data || []) as Product[];
        }
        applyRows(rows);
        return;
      }

      const res = await supabase
        .from("products")
        .select("*")
        .eq("collection_id", col.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (res.error) {
        setCollectionProductsFromDb([]);
        return;
      }
      let rows = (res.data || []) as Product[];
      if (rows.length === 0) {
        const r2 = await supabase
          .from("products")
          .select("*")
          .eq("collection_id", String(col.id))
          .order("created_at", { ascending: false });
        if (!cancelled && !r2.error) rows = (r2.data || []) as Product[];
      }
      applyRows(rows);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, useSourceCollection, selectedCollection?.id, sourceCollectionHref]);

  const unknownCollectionSlug =
    Boolean(sourceCollectionHref.trim() && selectedCollectionSlug) &&
    collections.length > 0 &&
    !selectedCollection;

  const newProducts = (
    unknownCollectionSlug
      ? []
      : useSourceCollection && collectionProductsFromDb !== null
        ? collectionProductsFromDb
        : productsInSelectedCollection
  ).slice(0, productCount);

  return (
    <EditableSection id="new-arrivals" label="New Arrivals" isEditor={isEditor} isHighlighted={isHighlighted}>
      <section className="px-4 md:px-12 py-8 md:py-14" style={{ background: CREAM }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-6 md:mb-8 gap-3">
      <div>
            <div className="text-[9px] md:text-[10px] tracking-widest uppercase font-bold mb-1 md:mb-2" style={{ color: PINK }}>{tag}</div>
          <h2 className="text-3xl md:text-4xl font-normal leading-tight" style={{ fontFamily: "var(--font-playfair)", color: WARM_DK }}>
            {title.split(" ").map((word, i, arr) => (
              <React.Fragment key={`${word}-${i}`}>
                {i === arr.length - 1 ? <em style={{ fontStyle: "italic", color: PINK }}>{word}</em> : word}
                {i < arr.length - 1 && " "}
              </React.Fragment>
            ))}
        </h2>
        </div>
        <Link href={viewAllHref} className="text-[10px] md:text-[11.5px] tracking-wide uppercase font-semibold border-b pb-0.5 transition-colors whitespace-nowrap" style={{ color: "#C4809A", borderColor: ROSE_PALE }}>
          View all →
        </Link>
        </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {newProducts.map((product, idx) => {
          const img = getProductImageUrl(product);
  const slug = product.slug || slugify(product.name);
  const cardHref = productLinks[idx] || `/product/${slug}`;
  const price = Number(product.price) || 0;
  const compareAt = product.compare_at_price ? Number(product.compare_at_price) : null;

  return (
            <div key={product.id} className="rounded-xl overflow-hidden bg-white shadow-sm cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl border border-transparent hover:border-pink-200">
              <Link href={cardHref} className="block">
                <div className="h-36 md:h-48 flex items-center justify-center text-4xl md:text-6xl relative" style={{ background: "linear-gradient(145deg, #FDE8EE, #F9D4DC)" }}>
                  {img ? (
                    <img src={img} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <span>👜</span>
                  )}
                  <span className="absolute top-1.5 md:top-2 left-1.5 md:left-2 px-1.5 md:px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-bold tracking-wider uppercase text-white" style={{ background: WARM_DK }}>
                    New
                  </span>
                  <button className="absolute top-1.5 md:top-2 right-1.5 md:right-2 w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/90 border-none cursor-pointer flex items-center justify-center text-xs md:text-sm transition-all hover:bg-white hover:scale-110">
                    🤍
                  </button>
        </div>
                <div className="p-2.5 md:p-3.5">
                  <div className="text-[8.5px] md:text-[9.5px] tracking-wider uppercase font-bold mb-0.5 md:mb-1" style={{ color: WARM_MUTED }}>{product.category || "Product"}</div>
                  <div className="text-[12px] md:text-[13px] font-medium mb-1 md:mb-1.5 truncate" style={{ color: WARM_DK }}>{product.name}</div>
                  <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-2.5">
                    <span className="text-xs md:text-sm font-bold" style={{ color: ROSE_DEEP }}>LE {price.toLocaleString()}</span>
                    {compareAt && compareAt > price && (
                      <span className="text-[10px] md:text-[11.5px] line-through" style={{ color: "#C4A8B0" }}>LE {compareAt.toLocaleString()}</span>
                    )}
        </div>
      <button
                    onClick={(e) => {
                      e.preventDefault();
                      add(product);
                    }}
                    className="w-full py-1.5 md:py-2 rounded-md text-[10px] md:text-[11.5px] font-bold transition-all hover:bg-pink-500 hover:text-white hover:border-pink-500"
                    style={{ background: BLUSH, border: `1.5px solid ${ROSE_PALE}`, color: ROSE_DEEP }}
                  >
                    Add to Cart
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

// ─── INSTALLMENTS BANNER ─────────────────────────────────────────────────────
function InstallmentsCta({
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
  const h = (href || "/products").trim() || "/products";
  if (/^https?:\/\//i.test(h) || h.startsWith("mailto:") || h.startsWith("tel:")) {
    return (
      <a
        href={h}
        className={className}
        style={style}
        target="_blank"
        rel="noopener noreferrer"
      >
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

function InstallmentsSection({
  isEditor,
  isHighlighted,
  config,
}: {
  isEditor: boolean;
  isHighlighted: boolean;
  config?: Record<string, unknown>;
}) {
  const { theme } = useTheme();
  let sectionConfig: Record<string, unknown> = config || {};
  try {
    if (theme?.home_blocks_json) {
      const blocks = JSON.parse(theme.home_blocks_json);
      sectionConfig = blocks.builtin_sections?.installments || config || {};
    }
  } catch {
    sectionConfig = config || {};
  }

  const tag = (sectionConfig.tag as string) || "💳 Pay Easy";
  const title = (sectionConfig.title as string) || "Shop Now, Pay in Installments";
  const desc =
    (sectionConfig.desc as string) ||
    "0% interest on orders above EGP 1,000. Choose 3, 6, or 12 months.";
  const providers = Array.isArray(sectionConfig.providers)
    ? (sectionConfig.providers as string[])
    : ["Shahry", "valU", "Sympl", "Visa"];
  const buttonText = (sectionConfig.button_text as string) || "Shop on Installments →";
  const buttonHref = (sectionConfig.button_href as string) || "/products";

  const titleNode = (() => {
    const m = title.match(/^(.*?),\s*(.+)$/);
    if (m && /installments/i.test(m[2])) {
      const rest = m[2].replace(/\s*installments\s*/i, "");
      return (
        <>
          {m[1].trim()},<br />
          {rest}
          <em style={{ fontStyle: "italic", color: "#EDA0B0" }}>Installments</em>
        </>
      );
    }
    return title;
  })();

  const ctaClass =
    "inline-flex items-center justify-center px-6 md:px-8 py-3 md:py-3.5 rounded-lg text-xs md:text-[13px] font-bold text-white transition-all hover:-translate-y-0.5 whitespace-nowrap w-full md:w-auto text-center";
  const ctaStyle = { background: ROSE_HOT, boxShadow: "0 6px 20px rgba(232,50,90,.35)" } as const;

  return (
    <EditableSection id="installments" label="Installments" isEditor={isEditor} isHighlighted={isHighlighted}>
      <section className="px-4 md:px-12 py-6 md:py-10" style={{ background: CREAM }}>
        <div className="rounded-2xl p-6 md:p-9 grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-4 md:gap-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1A0818, #2E1228)" }}>
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-gradient-radial from-pink-500/12 to-transparent pointer-events-none hidden md:block" />
        <div>
          <div className="inline-flex items-center gap-2 px-3 md:px-3.5 py-0.5 md:py-1 rounded-full mb-3 md:mb-3.5 w-fit" style={{ background: "rgba(232,50,90,.18)", border: "1px solid rgba(232,50,90,.3)" }}>
            <span className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase" style={{ color: "rgba(232,50,90,.9)" }}>{tag}</span>
        </div>
          <div className="text-3xl md:text-4xl font-normal mb-1 md:mb-1.5 leading-tight" style={{ fontFamily: "var(--font-playfair)", color: "#fff" }}>
            {titleNode}
        </div>
          <div className="text-xs md:text-sm mb-4 md:mb-4.5 max-w-full md:max-w-[460px]" style={{ color: "rgba(255,255,255,.55)" }}>
            {desc}
      </div>
          <div className="flex flex-wrap gap-2 md:gap-3">
            {providers.map((provider) => (
              <div key={provider} className="px-4 md:px-5 py-2 md:py-2.5 rounded-lg text-[11px] md:text-xs font-bold whitespace-nowrap" style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.14)", color: "rgba(255,255,255,.85)" }}>
                {provider}
              </div>
        ))}
      </div>
      </div>
        <InstallmentsCta href={buttonHref} className={ctaClass} style={ctaStyle}>
          {buttonText}
        </InstallmentsCta>
      </div>
    </section>
    </EditableSection>
  );
}

const MIX_DEFAULT_LABELS = ["The Bag", "The Heel", "The Scent", "The Accent"];
const MIX_DEFAULT_GRADS = [
  "linear-gradient(145deg, #F9E0EA, #F4C8D8)",
  "linear-gradient(145deg, #FDF0E4, #F5E0CC)",
  "linear-gradient(145deg, #F0FDE8, #DDFAD4)",
  "linear-gradient(145deg, #EEF0FD, #DDE0FA)",
];
const MIX_FALLBACK_EMOJI = ["👜", "👠", "🌸", "🕶️"];

function MixMatchTitle({ title }: { title: string }) {
  const amp = title.indexOf("&");
  if (amp === -1) {
    return (
      <h2 className="text-3xl md:text-4xl font-normal leading-tight" style={{ fontFamily: "var(--font-playfair)", color: WARM_DK }}>
        {title}
      </h2>
    );
  }
  const left = title.slice(0, amp).trimEnd();
  const right = title.slice(amp + 1).trim();
  return (
    <h2 className="text-3xl md:text-4xl font-normal leading-tight" style={{ fontFamily: "var(--font-playfair)", color: WARM_DK }}>
      {left}
      {" "}&{" "}
      <em style={{ fontStyle: "italic", color: PINK }}>{right}</em>
    </h2>
  );
}

type MixSlotDef = { product_id: string; pill: string; title: string; sub: string };

function buildMixSlotDefs(sectionConfig: Record<string, unknown>, slotCount: number): MixSlotDef[] {
  const ms = Array.isArray(sectionConfig.mix_slots) ? (sectionConfig.mix_slots as Record<string, unknown>[]) : [];
  const hasConfigured = ms.some((r) => String(r?.product_id || "").trim());
  if (hasConfigured) {
    const padded = [...ms];
    while (padded.length < slotCount) padded.push({});
    return padded.slice(0, slotCount).map((row, i) => ({
      product_id: String(row?.product_id || "").trim(),
      pill: String(row?.pill || "").trim() || MIX_DEFAULT_LABELS[i] || `Slot ${i + 1}`,
      title: String(row?.title || "").trim(),
      sub: String(row?.sub || "").trim(),
    }));
  }
  const ids = Array.isArray(sectionConfig.mix_product_ids)
    ? (sectionConfig.mix_product_ids as string[]).map((s) => String(s).trim()).filter(Boolean)
    : [];
  const labels = Array.isArray(sectionConfig.tile_labels) ? (sectionConfig.tile_labels as string[]) : [];
  return Array.from({ length: slotCount }, (_, i) => ({
    product_id: ids[i] || "",
    pill: (labels[i] && String(labels[i]).trim()) || MIX_DEFAULT_LABELS[i] || `Slot ${i + 1}`,
    title: "",
    sub: "",
  }));
}

// ─── MIX & MATCH ─────────────────────────────────────────────────────────────
function MixMatchSection({
  products,
  isEditor,
  isHighlighted,
  config,
}: {
  products: Product[];
  isEditor: boolean;
  isHighlighted: boolean;
  config?: Record<string, unknown>;
}) {
  const { add } = useCart();
  const { theme } = useTheme();
  const supabase = useSupabase();
  const [pinnedFromDb, setPinnedFromDb] = useState<Product[] | null>(null);

  let sectionConfig: Record<string, unknown> = config || {};
  try {
    if (theme?.home_blocks_json) {
      const blocks = JSON.parse(theme.home_blocks_json);
      sectionConfig = blocks.builtin_sections?.["mix-match"] || config || {};
    }
  } catch {
    sectionConfig = config || {};
  }

  const tag = (sectionConfig.tag as string) || "Style Together";
  const title = (sectionConfig.title as string) || "Mix & Match";
  const buildLookText = (sectionConfig.build_look_text as string) || "Build a look →";
  const buildLookHref = (sectionConfig.build_look_href as string) || "/products";
  const bundleLabel = (sectionConfig.bundle_button_text as string) || "Add Full Look to Cart";

  const slotCount = Math.min(4, Math.max(1, Number(sectionConfig.mix_slot_count) || 4));
  const slotDefs = buildMixSlotDefs(sectionConfig, slotCount);
  const slotIds = slotDefs.map((s) => s.product_id).filter(Boolean);

  const gradLines = Array.isArray(sectionConfig.tile_backgrounds) ? (sectionConfig.tile_backgrounds as string[]) : [];
  const tileGradient = (slotIndex: number) => {
    const g = gradLines[slotIndex];
    return typeof g === "string" && g.trim() ? g.trim() : MIX_DEFAULT_GRADS[slotIndex] || MIX_DEFAULT_GRADS[0];
  };

  useEffect(() => {
    if (!supabase || slotIds.length === 0) {
      setPinnedFromDb(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("products")
      .select("*")
      .in("id", slotIds)
      .then((res: { data: Product[] | null; error?: { message: string } }) => {
        if (cancelled) return;
        if (res.error) {
          setPinnedFromDb([]);
          return;
        }
        // Show curated picks even if status is draft — avoids empty/wrong fallback in Mix & Match.
        const rows = (res.data || []) as Product[];
        setPinnedFromDb(orderProductsByIds(rows, slotIds));
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, slotIds.join("|")]);

  const mergedProducts = new Map<string, Product>();
  for (const p of products) mergedProducts.set(String(p.id).trim(), p);
  if (pinnedFromDb) for (const p of pinnedFromDb) mergedProducts.set(String(p.id).trim(), p);

  type MixRow = {
    key: string;
    slotIndex: number;
    product: Product | null;
    pill: string;
    displayTitle: string;
    displaySub: string;
    state: "ok" | "loading" | "missing";
  };

  const configuredPinned = slotDefs.some((d) => String(d.product_id || "").trim() !== "");
  const loadingRemote = Boolean(supabase && slotIds.length > 0 && pinnedFromDb === null);

  let displayRows: MixRow[] = [];
  for (let slotIndex = 0; slotIndex < slotDefs.length; slotIndex++) {
    const def = slotDefs[slotIndex];
    const id = String(def.product_id || "").trim();
    if (!id) continue;
    const product = mergedProducts.get(id) ?? null;
    if (product) {
      const price = Number(product.price) || 0;
      displayRows.push({
        key: `${id}-${slotIndex}`,
        slotIndex,
        product,
        pill: def.pill,
        displayTitle: def.title || product.name,
        displaySub: def.sub || `LE ${price.toLocaleString()}`,
        state: "ok",
      });
      continue;
    }
    if (loadingRemote) {
      displayRows.push({
        key: `loading-${slotIndex}-${id}`,
        slotIndex,
        product: null,
        pill: def.pill,
        displayTitle: "Loading…",
        displaySub: "",
        state: "loading",
      });
      continue;
    }
    displayRows.push({
      key: `missing-${slotIndex}-${id}`,
      slotIndex,
      product: null,
      pill: def.pill,
      displayTitle: "Couldn't load product",
      displaySub: "Save theme & check product ID",
      state: "missing",
    });
  }

  if (!configuredPinned && displayRows.length === 0) {
    displayRows = products.slice(0, slotCount).map((product, i) => ({
      key: String(product.id),
      slotIndex: i,
      product,
      pill: MIX_DEFAULT_LABELS[i] || `Item ${i + 1}`,
      displayTitle: product.name,
      displaySub: `LE ${(Number(product.price) || 0).toLocaleString()}`,
      state: "ok" as const,
    }));
  }

  const total = displayRows
    .filter((r) => r.state === "ok" && r.product)
    .reduce((sum, r) => sum + (Number(r.product!.price) || 0), 0);
  const n = Math.min(Math.max(displayRows.length, 1), 4);
  const mdGridClass = n === 1 ? "md:grid-cols-1" : n === 2 ? "md:grid-cols-2" : n === 3 ? "md:grid-cols-3" : "md:grid-cols-4";

  return (
    <EditableSection id="mix-match" label="Mix & Match" isEditor={isEditor} isHighlighted={isHighlighted}>
      <section className="px-3 sm:px-4 md:px-12 py-8 md:py-14" style={{ background: CREAM }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-5 md:mb-8 gap-3">
          <div>
            <div className="text-[9px] md:text-[10px] tracking-widest uppercase font-bold mb-1 md:mb-2" style={{ color: PINK }}>{tag}</div>
            <MixMatchTitle title={title} />
        </div>
        <InstallmentsCta
          href={buildLookHref}
          className="text-[10px] md:text-[11.5px] tracking-wide uppercase font-semibold border-b pb-0.5 transition-colors whitespace-nowrap"
          style={{ color: "#C4809A", borderColor: ROSE_PALE }}
        >
          {buildLookText}
        </InstallmentsCta>
      </div>

      <div
        className={`flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pt-1 scrollbar-hide md:grid md:gap-0 md:overflow-visible md:pb-0 md:pt-0 ${mdGridClass} relative`}
      >
        {displayRows.map((row, i) => {
          const slug = row.product ? row.product.slug || slugify(row.product.name) : "";
          const pct = ((i + 1) / displayRows.length) * 100;
          const emoji = MIX_FALLBACK_EMOJI[row.slotIndex] ?? MIX_FALLBACK_EMOJI[i] ?? "👜";

          const cardClass =
            "group relative flex h-[min(72vw,320px)] w-[min(82vw,300px)] shrink-0 snap-center flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-900 shadow-md md:h-[300px] md:w-auto md:min-w-0 md:flex-1 md:rounded-none md:border-0 md:shadow-none";

          const cardInner = (
            <>
              <div className="pointer-events-none absolute inset-0">
                {row.state === "ok" && row.product ? (
                  <>
                    <ProductTileImage
                      product={row.product}
                      shellClassName="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
                      gradient={tileGradient(row.slotIndex)}
                      fallback={<span className="text-5xl md:text-7xl">{emoji}</span>}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/35 to-black/25 md:from-black/80 md:via-black/25 md:to-transparent" />
                  </>
                ) : (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3"
                    style={{ background: tileGradient(row.slotIndex) }}
                  >
                    {row.state === "loading" ? (
                      <>
                        <span className="h-8 w-8 animate-pulse rounded-full bg-white/30" />
                        <span className="text-[11px] font-medium text-white/90">Loading product…</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl opacity-60">🛍️</span>
                        <span className="text-center text-[10px] font-medium leading-snug text-white/85">
                          Couldn&apos;t load this product. Check it exists and IDs match.
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 p-2.5 md:p-3">
                <span
                  className="inline-block max-w-[min(100%,13rem)] truncate rounded-full bg-white/95 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-slate-800 shadow-sm md:max-w-[11rem] md:text-[9px]"
                  style={{ color: WARM_DK }}
                >
                  {row.pill}
                </span>
              </div>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 space-y-1 px-3 pb-3 pt-2 md:px-4 md:pb-4 md:pt-3">
                <p
                  className="line-clamp-2 text-[11px] font-medium leading-snug text-white md:text-sm md:leading-snug"
                  style={{
                    fontFamily: "var(--font-playfair)",
                    textShadow: "0 1px 3px rgba(0,0,0,.9), 0 2px 12px rgba(0,0,0,.5)",
                  }}
                >
                  {row.displayTitle}
                </p>
                {row.displaySub ? (
                  <p
                    className="line-clamp-1 text-[10px] font-bold text-white/95 md:text-xs"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,.9)" }}
                  >
                    {row.displaySub}
                  </p>
                ) : null}
              </div>
            </>
          );

          return (
            <React.Fragment key={row.key}>
              {row.state === "ok" && row.product ? (
                <Link href={`/product/${slug}`} className={cardClass}>
                  {cardInner}
                </Link>
              ) : (
                <div className={`${cardClass} cursor-default`}>{cardInner}</div>
              )}
              {i < displayRows.length - 1 && (
                <div
                  className="hidden md:flex absolute top-1/2 z-30 h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold text-white shadow-lg md:h-7 md:w-7 md:text-sm"
                  style={{ background: ROSE_HOT, left: `calc(${pct}% - 14px)` }}
                >
                  +
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="text-center mt-6 md:mt-9">
        <button
          type="button"
          onClick={() => displayRows.forEach((r) => r.state === "ok" && r.product && add(r.product))}
          className="px-6 md:px-8 py-2.5 md:py-3 rounded-md text-xs md:text-[12.5px] font-bold text-white transition-all hover:scale-105 w-full sm:w-auto"
          style={{ background: ROSE_HOT, boxShadow: "0 6px 20px rgba(232,50,90,.34)" }}
        >
          {bundleLabel} — LE {total.toLocaleString()}
        </button>
      </div>
    </section>
    </EditableSection>
  );
}

// ─── BEST SELLERS ────────────────────────────────────────────────────────────
function BestSellersSection({
  products,
  collections,
  isEditor,
  isHighlighted,
  config,
}: {
  products: Product[];
  collections: Collection[];
  isEditor: boolean;
  isHighlighted: boolean;
  config?: Record<string, unknown>;
}) {
  const { add } = useCart();
  const { viewAllHref, items: bestSellers } = useHomeShelfFromViewAll({
    products,
    collections,
    config,
    builtinsKey: "best-sellers",
    defaultProductCount: 5,
    defaultViewAll: "/products",
  });

  return (
    <EditableSection id="best-sellers" label="Best Sellers" isEditor={isEditor} isHighlighted={isHighlighted}>
      <section className="px-4 md:px-12 py-8 md:py-14" style={{ background: CREAM }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-6 md:mb-8 gap-3">
          <div>
            <div className="text-[9px] md:text-[10px] tracking-widest uppercase font-bold mb-1 md:mb-2" style={{ color: PINK }}>Customer Favourites</div>
          <h2 className="text-3xl md:text-4xl font-normal leading-tight" style={{ fontFamily: "var(--font-playfair)", color: WARM_DK }}>
            Best <em style={{ fontStyle: "italic", color: PINK }}>Sellers</em>
          </h2>
        </div>
        <Link href={viewAllHref} className="text-[10px] md:text-[11.5px] tracking-wide uppercase font-semibold border-b pb-0.5 transition-colors whitespace-nowrap" style={{ color: "#C4809A", borderColor: ROSE_PALE }}>
          View all →
      </Link>
    </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-3.5">
        {bestSellers.map((product) => {
          const slug = product.slug || slugify(product.name);
          const price = Number(product.price) || 0;
          const compareAt = product.compare_at_price ? Number(product.compare_at_price) : null;

  return (
            <div key={product.id} className="rounded-xl overflow-hidden bg-white shadow-sm cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl border border-transparent hover:border-pink-200">
              <Link href={`/product/${slug}`} className="block">
                <div className="relative">
                  <ProductTileImage
                    product={product}
                    shellClassName="h-32 md:h-36"
                    gradient="linear-gradient(145deg, #FDE8EE, #F9D4DC)"
                    fallback={<span className="text-4xl md:text-5xl">👜</span>}
                  />
                  <button type="button" className="absolute top-1.5 md:top-2 right-1.5 md:right-2 z-[2] w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/90 border-none cursor-pointer flex items-center justify-center text-xs md:text-sm transition-all hover:bg-white hover:scale-110">
                    🤍
                  </button>
                </div>
                <div className="p-2.5 md:p-3.5">
                  <div className="text-[8.5px] md:text-[9.5px] tracking-wider uppercase font-bold mb-0.5 md:mb-1" style={{ color: WARM_MUTED }}>{product.category || "Product"}</div>
                  <div className="text-[12px] md:text-[13px] font-medium mb-1 md:mb-1.5 truncate" style={{ color: WARM_DK }}>{product.name}</div>
                  <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-2.5">
                    <span className="text-xs md:text-sm font-bold" style={{ color: ROSE_DEEP }}>LE {price.toLocaleString()}</span>
                    {compareAt && compareAt > price && (
                      <span className="text-[10px] md:text-[11.5px] line-through" style={{ color: "#C4A8B0" }}>LE {compareAt.toLocaleString()}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      add(product);
                    }}
                    className="w-full py-1.5 md:py-2 rounded-md text-[10px] md:text-[11.5px] font-bold transition-all hover:bg-pink-500 hover:text-white hover:border-pink-500"
                    style={{ background: BLUSH, border: `1.5px solid ${ROSE_PALE}`, color: ROSE_DEEP }}
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

// ─── LAST CHANCE ──────────────────────────────────────────────────────────────
function LastChanceSection({
  products,
  collections,
  isEditor,
  isHighlighted,
  config,
}: {
  products: Product[];
  collections: Collection[];
  isEditor: boolean;
  isHighlighted: boolean;
  config?: Record<string, unknown>;
}) {
  const { add } = useCart();
  const { sectionConfig, viewAllHref, items: lastChance } = useHomeShelfFromViewAll({
    products,
    collections,
    config,
    builtinsKey: "last-chance",
    defaultProductCount: 6,
    defaultViewAll: "/products?q=sale",
  });

  const tag = (sectionConfig.tag as string) || "⏳ Almost Gone";
  const titleRaw = ((sectionConfig.title as string) || "Last Chance").trim();
  const titleWords = titleRaw.split(/\s+/).filter(Boolean);
  const titleLast = titleWords.length ? titleWords[titleWords.length - 1] : "Chance";
  const titleBefore = titleWords.length > 1 ? titleWords.slice(0, -1).join(" ") : "";

  return (
    <EditableSection id="last-chance" label="Last Chance" isEditor={isEditor} isHighlighted={isHighlighted}>
      <section className="px-4 md:px-12 py-8 md:py-14" style={{ background: CREAM }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-6 md:mb-8 gap-3">
          <div>
            <div className="text-[9px] md:text-[10px] tracking-widest uppercase font-bold mb-1 md:mb-2" style={{ color: PINK }}>{tag}</div>
          <h2 className="text-3xl md:text-4xl font-normal leading-tight" style={{ fontFamily: "var(--font-playfair)", color: WARM_DK }}>
            {titleBefore ? <>{titleBefore} </> : null}
            <em style={{ fontStyle: "italic", color: PINK }}>{titleLast}</em>
          </h2>
      </div>
        <Link href={viewAllHref} className="text-[10px] md:text-[11.5px] tracking-wide uppercase font-semibold border-b pb-0.5 transition-colors whitespace-nowrap" style={{ color: "#C4809A", borderColor: ROSE_PALE }}>
          View all →
          </Link>
      </div>

      <div className="flex gap-3 md:gap-3.5 overflow-x-auto pb-1.5 scrollbar-hide">
        {lastChance.map((product) => {
          const slug = product.slug || slugify(product.name);
          const price = Number(product.price) || 0;
          const compareAt = product.compare_at_price ? Number(product.compare_at_price) : null;

  return (
            <div key={product.id} className="flex-shrink-0 w-[180px] md:w-[195px] rounded-xl overflow-hidden bg-white border cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl" style={{ borderColor: ROSE_PALE }}>
              <Link href={`/product/${slug}`} className="block">
                <div className="relative">
                  <ProductTileImage
                    product={product}
                    shellClassName="h-36 md:h-40"
                    gradient="linear-gradient(145deg, #FDE8EE, #F9D4DC)"
                    fallback={<span className="text-4xl md:text-5xl">👜</span>}
                  />
                  <div className="pointer-events-none absolute bottom-1.5 md:bottom-2 left-1/2 z-[2] -translate-x-1/2 whitespace-nowrap px-2 md:px-2.5 py-0.5 rounded-full text-[8.5px] md:text-[9.5px] font-bold text-white flex items-center gap-1 md:gap-1.5" style={{ background: "rgba(42,24,32,.88)" }}>
                    <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full animate-pulse" style={{ background: ROSE_HOT }} />
                    02:14:38
                  </div>
                </div>
                <div className="p-2.5 md:p-3">
                  <div className="text-[11.5px] md:text-[12.5px] font-medium mb-1 truncate" style={{ color: WARM_DK }}>{product.name}</div>
                  <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-2.5">
                    <span className="text-xs md:text-[13.5px] font-bold" style={{ color: ROSE_HOT }}>LE {price.toLocaleString()}</span>
                    {compareAt && compareAt > price && (
                      <span className="text-[10px] md:text-[11px] line-through" style={{ color: "#C4A8B0" }}>LE {compareAt.toLocaleString()}</span>
                    )}
                  </div>
                  <button
      onClick={(e) => {
                      e.preventDefault();
                      add(product);
                    }}
                    className="w-full py-1.5 rounded-md text-[10px] md:text-[11px] font-bold text-white transition-all hover:bg-pink-600"
                    style={{ background: ROSE_HOT }}
                  >
                    Grab it →
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

// ─── DIVIDER ──────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div className="h-px mx-4 md:mx-12 my-0" style={{ background: "linear-gradient(to right, transparent, #F2D4D4, transparent)" }} />
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { theme } = useTheme();
  const [products, setProducts] = useState<Product[]>(dummyProducts);
  const [collections, setCollections] = useState<Collection[]>(dummyCollections);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [isEditor, setIsEditor] = useState(false);
  const supabase = useSupabase();

  // Detect editor mode from URL
  useEffect(() => {
    setIsEditor(window.location.search.includes("editor=1"));
  }, []);

  // Listen for "highlight" message from admin sidebar
  useEffect(() => {
    if (!isEditor) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "BB_SECTION_HIGHLIGHT") {
        const id = e.data.id;
        setHighlighted(typeof id === "string" ? id : null);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isEditor]);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(600)
      .then((res: { data: Product[] | null; error?: { message: string } }) => {
        if (res.error) {
          console.warn("[Home] products:", res.error.message, res.error);
          return;
        }
        const rows = (res.data || []).filter(isProductVisibleInStore).slice(0, 60);
        if (rows.length) {
          setProducts(rows);
        } else if (res.data?.length) {
          console.info("[Home] All products are draft/archived. Set status to Active in Admin.");
        } else {
          console.info("[Home] No product rows returned. Enable public read on products (see supabase-rls-storefront-read.sql).");
        }
      });
    supabase
      .from("collections")
      .select("*")
      .limit(80)
      .then((res: { data: Collection[] | null; error?: { message: string } }) => {
        if (res.error) {
          console.warn("[Home] collections:", res.error.message);
          return;
        }
        const rows = (res.data || []).filter(isCollectionVisibleInStore);
        if (rows.length) setCollections(rows);
      });
  }, [supabase]);

  // Parse theme settings for section configurations
  let sectionConfig: Record<string, { hidden?: boolean; [key: string]: unknown }> = {};
  try {
    const blocks = JSON.parse(theme.home_blocks_json || "{}");
    sectionConfig = blocks.builtin_sections ?? {};
  } catch {}

  const isSectionHidden = (id: string) => sectionConfig[id]?.hidden === true;

  const builtinOrder = useMemo(() => mergeBuiltinOrder(theme.home_blocks_json), [theme.home_blocks_json]);
  const visibleBuiltins = useMemo(
    () => builtinOrder.filter((bid) => !isSectionHidden(bid)),
    [builtinOrder, theme.home_blocks_json]
  );

  const renderHomeBuiltin = (id: string) => {
    const c = sectionConfig[id];
    const hi = highlighted === id;
    switch (id) {
      case "hero":
        return <HeroSection isEditor={isEditor} isHighlighted={hi} config={c} />;
      case "shop-by-style":
        return (
          <ShopByStyle collections={collections} isEditor={isEditor} isHighlighted={hi} config={c} />
        );
      case "categories":
        return <CategoriesSection isEditor={isEditor} isHighlighted={hi} config={c} />;
      case "hot-offers":
        return <HotOffersSection isEditor={isEditor} isHighlighted={hi} config={c} />;
      case "new-arrivals":
        return (
          <NewArrivalsSection
            products={products}
            collections={collections}
            isEditor={isEditor}
            isHighlighted={hi}
            config={c}
          />
        );
      case "installments":
        return <InstallmentsSection isEditor={isEditor} isHighlighted={hi} config={c} />;
      case "mix-match":
        return (
          <MixMatchSection products={products} isEditor={isEditor} isHighlighted={hi} config={c} />
        );
      case "best-sellers":
        return (
          <BestSellersSection
            products={products}
            collections={collections}
            isEditor={isEditor}
            isHighlighted={hi}
            config={c}
          />
        );
      case "last-chance":
        return (
          <LastChanceSection
            products={products}
            collections={collections}
            isEditor={isEditor}
            isHighlighted={hi}
            config={c}
          />
        );
      default:
        return (
          <ExtraBuiltinSection
            id={id}
            config={c}
            products={products}
            collections={collections}
            isEditor={isEditor}
            isHighlighted={hi}
          />
        );
    }
  };

  return (
    <div style={{ background: CREAM }}>
      {visibleBuiltins.map((id, i) => (
        <React.Fragment key={id}>
          {renderHomeBuiltin(id)}
          {i < visibleBuiltins.length - 1 ? <Divider /> : null}
        </React.Fragment>
      ))}
    </div>
  );
}
