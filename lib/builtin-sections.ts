/** Single source for built-in home sections (Theme Editor + storefront order). */
export const BUILTIN_SECTIONS = [
  { id: "hero", label: "Hero Section", icon: "🖼️", desc: "Main hero with featured product" },
  { id: "shop-by-style", label: "Shop by Style", icon: "👥", desc: "Women / Men collection panels" },
  { id: "categories", label: "Categories", icon: "🏷️", desc: "Horizontal scrolling category circles" },
  { id: "hot-offers", label: "Hot Offers", icon: "🔥", desc: "Grid of promotional offer cards" },
  { id: "new-arrivals", label: "New Arrivals", icon: "✨", desc: "Latest products grid" },
  { id: "installments", label: "Installments", icon: "💳", desc: "Pay in installments banner" },
  { id: "mix-match", label: "Mix & Match", icon: "🎨", desc: "Complete look builder" },
  { id: "best-sellers", label: "Best Sellers", icon: "🏆", desc: "Top selling products" },
  { id: "last-chance", label: "Last Chance", icon: "⏳", desc: "Limited time deals with countdown" },
  { id: "promo-strip", label: "Announcement Strip", icon: "📣", desc: "Top rotating promo bar" },
  { id: "category-bar", label: "Category Bar", icon: "🏷️", desc: "Horizontal scrolling category chips" },
  { id: "hero-carousel", label: "Hero Carousel", icon: "🖼️", desc: "Main hero slider with CTAs" },
  { id: "trust-row", label: "Trust Icons", icon: "✅", desc: "Authentic · Free returns · Fast delivery" },
  { id: "stats-row", label: "Stats Bar", icon: "📊", desc: "10K+ customers · 500+ brands · 100% authentic" },
  { id: "hot-prices", label: "Hot Prices", icon: "🔥", desc: "Sale products horizontal carousel" },
  { id: "flash-deals", label: "Flash Deals", icon: "⚡", desc: "Limited-time countdown deals" },
  { id: "campaign-banner", label: "Campaign Banner", icon: "🎯", desc: "Full-width editorial brand message" },
  { id: "gender-split", label: "Shop Women / Men", icon: "👥", desc: "Split gender category panels" },
  { id: "brands-strip", label: "Top Brands", icon: "💎", desc: "LV · Gucci · Hermès scrolling strip" },
  { id: "editors-picks", label: "Editor's Picks", icon: "⭐", desc: "Asymmetric 3-product grid" },
  { id: "gift-ideas", label: "Gift Ideas", icon: "🎁", desc: "For her · for him · any budget" },
  { id: "price-tiers", label: "Price Tiers", icon: "💰", desc: "Entry · Premium · Signature · Prestige" },
  { id: "buy2get1", label: "Buy 2 Get 1 Free", icon: "🎉", desc: "Eid promotional offer banner" },
  { id: "category-grid", label: "Category Grid", icon: "⊞", desc: "6-square colored category blocks" },
  { id: "mystery-box", label: "Mystery Box", icon: "📦", desc: "Special occasion gift box offer" },
  { id: "featured", label: "Featured Season", icon: "🌟", desc: "Seasonal featured products carousel" },
  { id: "text-banner", label: "Text Campaign", icon: "📝", desc: "Full-width editorial text banner" },
  { id: "social-ticker", label: "Live Orders Ticker", icon: "📡", desc: "Real-time customer activity scroll" },
  { id: "trending", label: "Trending Now", icon: "📈", desc: "Trending products horizontal carousel" },
  { id: "whatsapp", label: "WhatsApp Chat", icon: "💬", desc: "WhatsApp contact quick strip" },
  { id: "pay-later", label: "Pay Later / BNPL", icon: "💳", desc: "0% installment partners TRU · ValU · HALAN" },
  { id: "quick-links", label: "Quick Links", icon: "🔗", desc: "Category quick access pills" },
] as const;

export const BUILTIN_IDS: string[] = BUILTIN_SECTIONS.map((b) => b.id);

export function builtinLabel(id: string): string {
  return BUILTIN_SECTIONS.find((b) => b.id === id)?.label ?? id;
}

/** Merge saved `builtin_order` with full catalog so new sections append correctly. */
export function mergeBuiltinOrder(homeBlocksJson: string | null | undefined): string[] {
  const all = [...BUILTIN_IDS];
  if (!homeBlocksJson?.trim()) return all;
  try {
    const parsed = JSON.parse(homeBlocksJson) as { builtin_order?: unknown };
    const saved = parsed.builtin_order;
    if (!Array.isArray(saved)) return all;
    const cleaned = saved.filter((x: unknown): x is string => typeof x === "string" && all.includes(x));
    return [...cleaned, ...all.filter((id) => !cleaned.includes(id))];
  } catch {
    return all;
  }
}
