/** Single option e.g. Size M, Color Blue – may have its own price/sku */
export type ProductVariant = {
  id: string;
  product_id?: string;
  /** Option name e.g. "Size", "Color" */
  title: string;
  /** Option value e.g. "M", "Navy" */
  value: string;
  price?: number | null;
  compare_at_price?: number | null;
  sku?: string | null;
  stock?: number | null;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number;
  category: string | null;
  slug?: string;
  /** Array of image URLs or objects with src/url (from Shopify sync or app) */
  images?: (string | { src?: string; url?: string })[] | null;
  /** Single image URL or object – Supabase/Shopify sync often uses this column */
  image?: string | { src?: string; url?: string } | null;
  image_url?: string | null;
  compare_at_price?: number | null;
  collection_id?: string | null;
  status?: string | null;
  stock?: number;
  created_at?: string;
  /** Variants (Size, Color, etc.) – from API or product_variants table */
  variants?: ProductVariant[] | null;
};

export type Collection = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  banner_image: string | null;
  is_active: boolean;
  /** UUIDs of products in this collection (used on /collection/[slug]) */
  product_ids?: string[] | null;
  created_at?: string;
};

export type Discount = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_subtotal: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export type CartItem = {
  id?: string;
  product_id: string;
  product?: Product;
  qty: number;
  price_snapshot: number;
  /** Selected variant id when product has variants */
  variant_id?: string | null;
  /** e.g. "Size: M" for line item display */
  variant_title?: string | null;
};

export type Order = {
  id: string;
  user_id?: string | null;
  customer_id?: string | null;
  customer_name?: string;
  phone?: string;
  email?: string;
  address_json?: Record<string, unknown>;
  subtotal?: number;
  discount_code?: string | null;
  discount_amount?: number;
  shipping_fee?: number;
  total: number;
  payment_method?: "cod" | "paid";
  status: string;
  created_at?: string;
  notes?: string | null;
  order_items?: { product_id: string; title_snapshot: string; qty: number; price_snapshot: number }[];
};

export type Page = {
  id: string;
  type: string;
  title: string;
  slug: string;
  content: string | null;
  updated_at: string;
};

/** Home page section – one of several types, editable in Theme Editor */
export type HomeSection =
  | { type: "promo"; text: string; link_url?: string; link_text?: string; bg_color: string; text_color: string }
  | { type: "ticker"; enabled: boolean }
  | {
      type: "hero";
      title: string;
      subtitle: string;
      image_url: string | null;
      cta_primary_text: string;
      cta_primary_href: string;
      cta_secondary_text: string;
      cta_secondary_href: string;
      overlay_color: string;
      text_color: string;
    }
  | {
      type: "collections";
      title: string;
      view_all_link: string;
      collection_ids: string[];
      bg_color: string;
      text_color: string;
    }
  | {
      type: "products";
      title: string;
      view_all_link: string;
      product_ids: string[];
      bg_color: string;
      text_color: string;
    }
  | {
      type: "banner";
      title: string;
      subtitle?: string;
      image_url?: string | null;
      link_url: string;
      button_text: string;
      bg_color: string;
      text_color: string;
    }
  | { type: "custom"; title?: string; content: string; bg_color: string; text_color: string }
  | { type: "spacer"; height_px: number }
  | {
      type: "liquid";
      liquid_code: string;
      /** JSON object for section.settings (e.g. {"heading":"Sale"}) */
      settings_json?: string;
      bg_color?: string;
      text_color?: string;
    };

export type HomeSectionType = HomeSection["type"];

/** Default config for a new section of the given type */
export function getDefaultSection(type: HomeSectionType): HomeSection {
  switch (type) {
    case "promo":
      return { type: "promo", text: "", link_url: "", link_text: "", bg_color: "#0f172a", text_color: "#ffffff" };
    case "ticker":
      return { type: "ticker", enabled: true };
    case "hero":
      return {
        type: "hero",
        title: "Welcome",
        subtitle: "Discover our collection",
        image_url: null,
        cta_primary_text: "Shop collections",
        cta_primary_href: "/collections",
        cta_secondary_text: "Products",
        cta_secondary_href: "/products",
        overlay_color: "#1e293b",
        text_color: "#ffffff",
      };
    case "collections":
      return {
        type: "collections",
        title: "Collections",
        view_all_link: "/collections",
        collection_ids: [],
        bg_color: "#ffffff",
        text_color: "#0f172a",
      };
    case "products":
      return {
        type: "products",
        title: "Featured products",
        view_all_link: "/products",
        product_ids: [],
        bg_color: "#ffffff",
        text_color: "#0f172a",
      };
    case "banner":
      return {
        type: "banner",
        title: "Banner",
        subtitle: "",
        image_url: null,
        link_url: "/collections",
        button_text: "Shop now",
        bg_color: "#f1f5f9",
        text_color: "#0f172a",
      };
    case "custom":
      return { type: "custom", title: "", content: "<p>Your content here</p>", bg_color: "#ffffff", text_color: "#0f172a" };
    case "spacer":
      return { type: "spacer", height_px: 48 };
    case "liquid":
      return {
        type: "liquid",
        liquid_code: "<div class=\"liquid-section\">\n  <h2>{{ section.settings.heading | default: 'Custom Section' }}</h2>\n  <p>{{ section.settings.text }}</p>\n</div>",
        settings_json: "{}",
        bg_color: "#ffffff",
        text_color: "#0f172a",
      };
    default:
      return { type: "promo", text: "", bg_color: "#0f172a", text_color: "#ffffff" };
  }
}

/** Footer column link */
export type FooterNavLink = { label: string; href: string };

/** Store footer (serialized as `footer_json` on theme_settings). */
export type StoreFooterSettings = {
  promo_banner: string;
  brand_name: string;
  brand_tagline: string;
  social_instagram: string;
  social_tiktok: string;
  social_whatsapp: string;
  quick_shop_heading: string;
  quick_shop_links: FooterNavLink[];
  info_heading: string;
  info_links: FooterNavLink[];
  pay_later_heading: string;
  pay_later_providers: string[];
  pay_later_subtext: string;
  contact_heading: string;
  contact_whatsapp_href: string;
  contact_button_label: string;
  we_accept_heading: string;
  payment_methods: string[];
  copyright_brand: string;
};

export type ThemeSettings = {
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  radius: string;
  promo_text: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image_url: string | null;
  home_blocks_json: string;
  /** JSON array of HomeSection – defines order and config of home page sections */
  home_sections_json: string;
  nav_json: string;
  /** JSON object – StoreFooterSettings */
  footer_json: string;
};

const defaultSections: HomeSection[] = [
  {
    type: "promo",
    text: "Free shipping on orders over 500 EGP • Use code WELCOME10 for 10% off",
    bg_color: "#0f172a",
    text_color: "#ffffff",
  },
  { type: "ticker", enabled: true },
  {
    type: "hero",
    title: "Welcome to the Shop",
    subtitle: "Discover our collection",
    image_url: null,
    cta_primary_text: "Shop collections",
    cta_primary_href: "/collections",
    cta_secondary_text: "Featured product",
    cta_secondary_href: "/products",
    overlay_color: "#1e293b",
    text_color: "#ffffff",
  },
  {
    type: "collections",
    title: "Collections",
    view_all_link: "/collections",
    collection_ids: [],
    bg_color: "#ffffff",
    text_color: "#0f172a",
  },
  {
    type: "products",
    title: "Featured products",
    view_all_link: "/products",
    product_ids: [],
    bg_color: "#ffffff",
    text_color: "#0f172a",
  },
];

export const defaultTheme: ThemeSettings = {
  logo_url: null,
  primary_color: "#0f172a",
  secondary_color: "#64748b",
  background_color: "#f8fafc",
  text_color: "#0f172a",
  radius: "0.75rem",
  promo_text: "Free shipping on orders over $50",
  hero_title: "Welcome to the Shop",
  hero_subtitle: "Discover our collection",
  hero_image_url: null,
  home_blocks_json: "{}",
  home_sections_json: JSON.stringify(defaultSections),
  nav_json:
    '{"top":[{"label":"Collections","href":"/collections"},{"label":"Policies","href":"/policies"},{"label":"Account","href":"/account"}],"footer":[{"label":"Policies","href":"/policies"},{"label":"Shipping","href":"/policy/shipping"},{"label":"Returns","href":"/policy/returns"},{"label":"Privacy","href":"/policy/privacy"},{"label":"Terms","href":"/policy/terms"}]}',
  footer_json: "",
};
