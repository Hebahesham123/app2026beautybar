import type { FooterNavLink, StoreFooterSettings } from "@/types";

const DEFAULT_QUICK_SHOP: FooterNavLink[] = [
  { label: "Bags", href: "/products?q=bags" },
  { label: "Sneakers", href: "/products?q=sneakers" },
  { label: "Slippers", href: "/products?q=slippers" },
  { label: "Heels", href: "/products?q=heels" },
  { label: "Watches", href: "/products?q=watches" },
  { label: "Wallets", href: "/products?q=wallets" },
  { label: "Perfume", href: "/products?q=perfume" },
  { label: "Sunglasses", href: "/products?q=sunglasses" },
];

const DEFAULT_INFO: FooterNavLink[] = [
  { label: "Search", href: "/search" },
  { label: "Privacy Policy", href: "/policy/privacy" },
  { label: "Terms of Service", href: "/policy/terms" },
  { label: "Refund Policy", href: "/policy/returns" },
  { label: "Shipping Policy", href: "/policy/shipping" },
  { label: "About Us", href: "/policies" },
  { label: "Contact Us", href: "/account" },
];

export const DEFAULT_STORE_FOOTER: StoreFooterSettings = {
  promo_banner:
    "🌸 Free shipping on orders over LE 500 · 🔒 Secure checkout · ↩️ Easy returns",
  brand_name: "BEAUTY BAR",
  brand_tagline:
    "Your destination for authentic luxury fashion — bags, shoes, accessories & more.",
  social_instagram: "#",
  social_tiktok: "#",
  social_whatsapp: "#",
  quick_shop_heading: "Quick Shop",
  quick_shop_links: DEFAULT_QUICK_SHOP,
  info_heading: "Information",
  info_links: DEFAULT_INFO,
  pay_later_heading: "Pay Later",
  pay_later_providers: ["TRU", "ValU", "SUHOOLA", "HALAN"],
  pay_later_subtext: "0% Interest · 0% Fees",
  contact_heading: "Contact",
  contact_whatsapp_href: "#",
  contact_button_label: "WhatsApp Us",
  we_accept_heading: "We Accept",
  payment_methods: ["Visa", "Mastercard", "InstaPay", "Fawry", "Cash on Delivery"],
  copyright_brand: "Beauty Bar",
};

export function defaultFooterJson(): string {
  return JSON.stringify(DEFAULT_STORE_FOOTER);
}

function isLinkArray(x: unknown): x is FooterNavLink[] {
  return (
    Array.isArray(x) &&
    x.every((i) => i && typeof i === "object" && typeof (i as FooterNavLink).label === "string" && typeof (i as FooterNavLink).href === "string")
  );
}

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((s) => typeof s === "string");
}

/** Merge saved JSON with defaults so partial / legacy themes still render. */
export function mergeFooterSettings(rawJson: string | null | undefined): StoreFooterSettings {
  const base = DEFAULT_STORE_FOOTER;
  if (!rawJson || !String(rawJson).trim()) return { ...base, quick_shop_links: [...base.quick_shop_links], info_links: [...base.info_links] };
  try {
    const o = JSON.parse(rawJson) as Record<string, unknown>;
    return {
      promo_banner: typeof o.promo_banner === "string" ? o.promo_banner : base.promo_banner,
      brand_name: typeof o.brand_name === "string" ? o.brand_name : base.brand_name,
      brand_tagline: typeof o.brand_tagline === "string" ? o.brand_tagline : base.brand_tagline,
      social_instagram: typeof o.social_instagram === "string" ? o.social_instagram : base.social_instagram,
      social_tiktok: typeof o.social_tiktok === "string" ? o.social_tiktok : base.social_tiktok,
      social_whatsapp: typeof o.social_whatsapp === "string" ? o.social_whatsapp : base.social_whatsapp,
      quick_shop_heading: typeof o.quick_shop_heading === "string" ? o.quick_shop_heading : base.quick_shop_heading,
      quick_shop_links: isLinkArray(o.quick_shop_links) ? o.quick_shop_links : [...base.quick_shop_links],
      info_heading: typeof o.info_heading === "string" ? o.info_heading : base.info_heading,
      info_links: isLinkArray(o.info_links) ? o.info_links : [...base.info_links],
      pay_later_heading: typeof o.pay_later_heading === "string" ? o.pay_later_heading : base.pay_later_heading,
      pay_later_providers: isStringArray(o.pay_later_providers) ? o.pay_later_providers : [...base.pay_later_providers],
      pay_later_subtext: typeof o.pay_later_subtext === "string" ? o.pay_later_subtext : base.pay_later_subtext,
      contact_heading: typeof o.contact_heading === "string" ? o.contact_heading : base.contact_heading,
      contact_whatsapp_href: typeof o.contact_whatsapp_href === "string" ? o.contact_whatsapp_href : base.contact_whatsapp_href,
      contact_button_label: typeof o.contact_button_label === "string" ? o.contact_button_label : base.contact_button_label,
      we_accept_heading: typeof o.we_accept_heading === "string" ? o.we_accept_heading : base.we_accept_heading,
      payment_methods: isStringArray(o.payment_methods) ? o.payment_methods : [...base.payment_methods],
      copyright_brand: typeof o.copyright_brand === "string" ? o.copyright_brand : base.copyright_brand,
    };
  } catch {
    return { ...base, quick_shop_links: [...base.quick_shop_links], info_links: [...base.info_links] };
  }
}

/** Theme editor: one line per link, `Label|/path` */
export function footerLinksFromLines(text: string): FooterNavLink[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf("|");
      if (i === -1) return { label: line, href: "#" };
      const label = line.slice(0, i).trim();
      const href = line.slice(i + 1).trim() || "#";
      return { label, href };
    });
}

export function footerLinksToLines(links: FooterNavLink[]): string {
  return links.map((l) => `${l.label}|${l.href}`).join("\n");
}

export function stringsFromLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function stringsToLines(items: string[]): string {
  return items.join("\n");
}
