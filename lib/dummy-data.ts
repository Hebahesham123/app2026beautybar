import type { Product, Collection, Page } from "@/types";

/** Example products when Supabase is empty – all clickable, navigate to /product/[slug] */
export const dummyProducts: Product[] = [
  {
    id: "dummy-1",
    name: "Classic Cotton Tee",
    description: "Soft organic cotton, relaxed fit. Perfect for everyday wear.",
    sku: "TEE-001",
    price: 29.99,
    category: "Tops",
    slug: "classic-cotton-tee",
    images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400"],
    compare_at_price: 39.99,
    status: "active",
    variants: [
      { id: "dummy-1-v-s", product_id: "dummy-1", title: "Size", value: "S", price: 29.99, sku: "TEE-001-S" },
      { id: "dummy-1-v-m", product_id: "dummy-1", title: "Size", value: "M", price: 29.99, sku: "TEE-001-M" },
      { id: "dummy-1-v-l", product_id: "dummy-1", title: "Size", value: "L", price: 29.99, sku: "TEE-001-L" },
      { id: "dummy-1-v-xl", product_id: "dummy-1", title: "Size", value: "XL", price: 32.99, sku: "TEE-001-XL" },
    ],
  },
  {
    id: "dummy-2",
    name: "Slim Fit Chinos",
    description: "Lightweight chinos with a modern slim fit. Available in multiple colors.",
    sku: "CHI-002",
    price: 59.99,
    category: "Bottoms",
    slug: "slim-fit-chinos",
    images: ["https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400"],
    status: "active",
    variants: [
      { id: "dummy-2-v-navy", product_id: "dummy-2", title: "Color", value: "Navy", price: 59.99, sku: "CHI-002-N" },
      { id: "dummy-2-v-khaki", product_id: "dummy-2", title: "Color", value: "Khaki", price: 59.99, sku: "CHI-002-K" },
      { id: "dummy-2-v-black", product_id: "dummy-2", title: "Color", value: "Black", price: 59.99, sku: "CHI-002-B" },
    ],
  },
  {
    id: "dummy-3",
    name: "Leather Crossbody Bag",
    description: "Handcrafted genuine leather. Compact and stylish.",
    sku: "BAG-003",
    price: 89.99,
    category: "Accessories",
    slug: "leather-crossbody-bag",
    images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400"],
    compare_at_price: 120,
    status: "active",
  },
  {
    id: "dummy-4",
    name: "Running Sneakers",
    description: "Lightweight cushioning for all-day comfort. Breathable upper.",
    sku: "SNK-004",
    price: 79.99,
    category: "Footwear",
    slug: "running-sneakers",
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400"],
    status: "active",
    variants: [
      { id: "dummy-4-v-8", product_id: "dummy-4", title: "Size", value: "8", price: 79.99, sku: "SNK-004-8" },
      { id: "dummy-4-v-9", product_id: "dummy-4", title: "Size", value: "9", price: 79.99, sku: "SNK-004-9" },
      { id: "dummy-4-v-10", product_id: "dummy-4", title: "Size", value: "10", price: 79.99, sku: "SNK-004-10" },
      { id: "dummy-4-v-11", product_id: "dummy-4", title: "Size", value: "11", price: 79.99, sku: "SNK-004-11" },
    ],
  },
  {
    id: "dummy-5",
    name: "Wool Blend Sweater",
    description: "Cozy wool blend for cool weather. Ribbed cuffs and hem.",
    sku: "SWE-005",
    price: 69.99,
    category: "Tops",
    slug: "wool-blend-sweater",
    images: ["https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400"],
    status: "active",
  },
  {
    id: "dummy-6",
    name: "Minimalist Watch",
    description: "Quartz movement, stainless steel case. Water resistant.",
    sku: "WAT-006",
    price: 129.99,
    category: "Accessories",
    slug: "minimalist-watch",
    images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400"],
    status: "active",
  },
];

/** Example collections – all clickable, navigate to /collection/[slug] */
export const dummyCollections: Collection[] = [
  {
    id: "col-1",
    title: "Tops",
    slug: "tops",
    description: "T-shirts, sweaters, and casual tops.",
    banner_image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800",
    is_active: true,
  },
  {
    id: "col-2",
    title: "Bottoms",
    slug: "bottoms",
    description: "Pants, chinos, and shorts.",
    banner_image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800",
    is_active: true,
  },
  {
    id: "col-3",
    title: "Accessories",
    slug: "accessories",
    description: "Bags, watches, and more.",
    banner_image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800",
    is_active: true,
  },
  {
    id: "col-4",
    title: "Footwear",
    slug: "footwear",
    description: "Sneakers and shoes.",
    banner_image: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800",
    is_active: true,
  },
];

/** Example policy pages – all clickable, navigate to /policy/[slug] */
export const dummyPages: Page[] = [
  {
    id: "page-1",
    type: "policy",
    title: "Shipping & Delivery",
    slug: "shipping",
    content: "<p>We offer standard shipping on all orders. Delivery typically takes 5–7 business days. Free shipping on orders over $50.</p><p>Express options are available at checkout.</p>",
    updated_at: new Date().toISOString(),
  },
  {
    id: "page-2",
    type: "policy",
    title: "Returns & Refunds",
    slug: "returns",
    content: "<p>You may return unused items within 30 days for a full refund. Items must be in original condition with tags attached.</p><p>Contact support@example.com to start a return.</p>",
    updated_at: new Date().toISOString(),
  },
  {
    id: "page-3",
    type: "policy",
    title: "Privacy Policy",
    slug: "privacy",
    content: "<p>We respect your privacy. We collect only the information needed to process orders and improve your experience.</p><p>We do not sell your data to third parties.</p>",
    updated_at: new Date().toISOString(),
  },
  {
    id: "page-4",
    type: "policy",
    title: "Terms of Service",
    slug: "terms",
    content: "<p>By using this store you agree to our terms. Please shop responsibly.</p><p>For questions contact support@example.com.</p>",
    updated_at: new Date().toISOString(),
  },
];

/** Default nav + footer links so Policies and policy pages are always clickable */
export const defaultNavJson = {
  top: [
    { label: "Collections", href: "/collections" },
    { label: "Policies", href: "/policies" },
    { label: "Account", href: "/account" },
  ],
  footer: [
    { label: "Policies", href: "/policies" },
    { label: "Shipping", href: "/policy/shipping" },
    { label: "Returns", href: "/policy/returns" },
    { label: "Privacy", href: "/policy/privacy" },
    { label: "Terms", href: "/policy/terms" },
  ],
};
