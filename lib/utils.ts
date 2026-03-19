export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function pickStringUrl(v: unknown): string | null {
  if (typeof v === "string") {
    const s = v.trim();
    if (s) return s;
  }
  return null;
}

function pickUrlFromUnknown(v: unknown): string | null {
  const s = pickStringUrl(v);
  if (s) return s;
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    return pickStringUrl(o.src) || pickStringUrl(o.url) || pickStringUrl(o.src_url) || pickStringUrl(o.preview_image_url);
  }
  return null;
}

/** Get the first displayable image URL from a product (Supabase/Shopify/import may use many shapes). */
export function getProductImageUrl(product: {
  images?: unknown;
  image?: unknown;
  image_url?: unknown;
}): string | null {
  const row = product as unknown as Record<string, unknown>;

  let imagesRaw: unknown = row.images ?? product.images;
  if (typeof imagesRaw === "string" && imagesRaw.trim()) {
    const t = imagesRaw.trim();
    if (t.startsWith("[") || t.startsWith("{")) {
      try {
        imagesRaw = JSON.parse(t) as unknown;
      } catch {
        if (t.startsWith("http") || t.startsWith("/")) return t;
        imagesRaw = null;
      }
    } else if (t.startsWith("http") || t.startsWith("/")) {
      return t;
    }
  }

  if (Array.isArray(imagesRaw) && imagesRaw.length > 0) {
    for (const item of imagesRaw) {
      const u = pickUrlFromUnknown(item);
      if (u) return u;
    }
  }

  const media = row.media;
  if (Array.isArray(media) && media.length > 0) {
    for (const item of media) {
      const u = pickUrlFromUnknown(item);
      if (u) return u;
    }
  }

  const singleKeys = [
    "image_url",
    "image",
    "thumbnail",
    "thumbnail_url",
    "photo",
    "picture",
    "featured_image",
    "main_image",
    "img",
    "cover_image",
    "primary_image",
    "image_src",
  ];
  for (const k of singleKeys) {
    const u = pickUrlFromUnknown(row[k]);
    if (u) return u;
  }

  return null;
}

/** Storefront: show unless status is explicitly draft/archived (handles null/empty/unknown). */
export function isProductVisibleInStore(p: { status?: string | null }): boolean {
  const s = (p.status ?? "").toString().toLowerCase().trim();
  if (s === "draft" || s === "archived") return false;
  return true;
}

/** Storefront collections: hide only when is_active is explicitly false. */
export function isCollectionVisibleInStore(c: { is_active?: boolean | null }): boolean {
  return c.is_active !== false;
}

/**
 * Coerce `collections.product_ids` (or similar) from Supabase into string IDs.
 * Handles uuid[]/jsonb arrays, JSON-in-text, comma/whitespace-separated strings, and optional alternate key `products`.
 */
export function normalizeCollectionProductIds(
  value: unknown,
  row?: Record<string, unknown> | null
): string[] {
  const raw = value ?? row?.products;
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((v) => (typeof v === "string" ? v.trim() : v != null ? String(v).trim() : ""))
      .filter(Boolean);
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return [];
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        return normalizeCollectionProductIds(JSON.parse(s), null);
      } catch {
        /* ignore */
      }
    }
    return s.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
  }
  return [];
}
