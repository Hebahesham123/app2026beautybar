# Ecommerce App (Next.js 14 + Supabase)

Full mobile-first ecommerce with separate files for every section. Edit any part independently.

## Database connection (`.env` / `.env.local`)

**Everything that talks to Supabase** (store, admin, auth, theme) uses **`lib/supabase.ts`**, which reads:

| Variable | Where to get it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → **Project Settings** → **API** → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page → **anon public** key (safe in the browser; never commit the **service_role** key) |

**Setup**

1. Copy the template: `copy .env.example .env.local` (Windows) or `cp .env.example .env.local` (Mac/Linux).
2. Edit **`.env.local`** and paste your real URL and anon key.

Next.js loads **`.env`**, **`.env.local`**, and mode-specific files. **`.env.local` is recommended** for secrets and is usually gitignored.

Example:

```
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**After changing env vars**, restart `npm run dev` (Next bakes `NEXT_PUBLIC_*` into the client at startup).

If variables are missing, the app runs with **demo data**. In development, the console shows a one-time reminder.

## Run

```bash
npm install
npm run dev
```

## File structure (edit any section separately)

### Root & layout
- `app/layout.tsx` — Root layout, providers
- `app/globals.css` — Global styles
- `app/not-found.tsx` — 404 page
- `components/providers.tsx` — Auth + Cart + Theme providers

### Store (public)
- `app/(store)/layout.tsx` — Store layout (Navbar + Footer)
- `app/(store)/page.tsx` — **Home** (hero, featured collections/products)
- `app/(store)/collections/page.tsx` — **All collections**
- `app/(store)/collection/[slug]/page.tsx` — **Collection** (products, search, sort)
- `app/(store)/product/[slug]/page.tsx` — **Product** (images, add to cart, related)
- `app/(store)/cart/page.tsx` — **Cart** (qty, remove, discount)
- `app/(store)/checkout/page.tsx` — **Checkout** (place order)
- `app/(store)/order/[id]/page.tsx` — **Order confirmation**
- `app/(store)/policies/page.tsx` — **Policies** index
- `app/(store)/policy/[slug]/page.tsx` — **Policy** page (e.g. shipping, returns)
- `app/(store)/account/page.tsx` — **Account** (login/register, orders)

### Admin (protected)
- `app/admin/layout.tsx` — Admin layout (sidebar, auth check)
- `app/admin/page.tsx` — **Dashboard** (stats)
- `app/admin/products/page.tsx` — **Products** CRUD
- `app/admin/collections/page.tsx` — **Collections**
- `app/admin/discounts/page.tsx` — **Discounts**
- `app/admin/customers/page.tsx` — **Customers**
- `app/admin/orders/page.tsx` — **Orders**
- `app/admin/pages/page.tsx` — **Pages / Policies**
- `app/admin/theme/page.tsx` — **Theme** editor (colors, hero, promo)

### Shared
- `components/layout/Navbar.tsx` — Header + nav + cart link
- `components/layout/Footer.tsx` — Footer + policy links
- `components/product/ProductCard.tsx` — Product card (used on home, collection, product)
- `context/AuthContext.tsx` — Auth state + sign in/up/out
- `context/CartContext.tsx` — Cart state (localStorage)
- `context/ThemeContext.tsx` — Theme from Supabase
- `lib/supabase.ts` — Supabase client + `useSupabase` hook
- `lib/utils.ts` — `slugify` helper
- `types/index.ts` — Product, Collection, Order, ThemeSettings, etc.

## Supabase

Use your existing tables: `products`, `customer_data`, `inventory`, `order`. Run the extension SQL in Supabase (Dashboard → SQL) to add: `profiles`, `collections`, `order_items`, `discounts`, `pages`, `theme_settings`, and optional columns on `order` and `products`. See the SQL block in the original single-file comments or ask for the schema.

Admin access: set `role = 'admin'` in the `profiles` row for your user (after signing up via the app).
