# Project Architecture & Database Connection Guide

## Overview
This is a **Next.js 14 e-commerce application** with Supabase as the backend database. The app is mobile-first and includes both a public storefront and an admin panel.

## Technology Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: React Context API
- **Styling**: Tailwind CSS
- **Language**: TypeScript

---

## Database Connection Architecture

### 1. Supabase Client Setup (`lib/supabase.ts`)

The app uses a **client-side Supabase connection** that:
- Reads environment variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Creates the Supabase client only in the browser (client-side only)
- Returns `null` if Supabase is not configured
- Provides a `useSupabase()` hook for React components

**Key Pattern**: The app gracefully falls back to dummy data if Supabase is not configured.

```typescript
// If supabase is null, pages use dummyProducts/dummyCollections
const supabase = useSupabase();
useEffect(() => {
  if (!supabase) return; // Skip DB queries if not configured
  supabase.from("products").select("*")...
}, [supabase]);
```

### 2. Database Tables Structure

#### Core Tables:
1. **`products`** - Main product catalog
   - Fields: `id`, `name`, `description`, `price`, `category`, `slug`, `image_url`, `status`, `stock`, `created_at`
   - Status values: `"active"`, `"draft"`, `"archived"`

2. **`collections`** - Product collections/categories
   - Fields: `id`, `title`, `slug`, `description`, `banner_image`, `is_active`, `product_ids` (JSON array)
   - Links to products via `product_ids` array

3. **`product_variants`** - Product options (Size, Color, etc.)
   - Fields: `id`, `product_id`, `title`, `value`, `price`, `compare_at_price`, `sku`, `stock`
   - Example: `{title: "Size", value: "M", price: 29.99}`

4. **`inventory`** - Stock tracking
   - Fields: `product_id`, `variant_id`, `quantity`, `sku`
   - Supports both product-level and variant-level inventory

5. **`order`** - Customer orders
   - Fields: `id`, `user_id`, `customer_name`, `email`, `phone`, `address_json`, `subtotal`, `total`, `status`, `payment_method`, `created_at`

6. **`order_items`** - Order line items
   - Fields: `order_id`, `product_id`, `title_snapshot`, `qty`, `price_snapshot`

7. **`profiles`** - User profiles with roles
   - Fields: `id` (UUID, references auth.users), `role` ("admin" | "customer"), `name`, `phone`
   - Created automatically on signup via trigger

8. **`discounts`** - Discount codes
   - Fields: `id`, `code`, `type` ("percent" | "fixed"), `value`, `min_subtotal`, `active`, `starts_at`, `ends_at`

9. **`pages`** - Policy/custom pages
   - Fields: `id`, `title`, `slug`, `type`, `content`, `created_at`, `updated_at`

10. **`theme_settings`** - Store theme configuration
    - Fields: `logo_url`, `primary_color`, `home_sections_json`, `home_blocks_json`, etc.

### 3. SQL Setup Files
The project includes SQL files to create tables:
- `supabase-profiles-table.sql` - Creates profiles table with RLS policies
- `supabase-product-variants-table.sql` - Creates variants table
- `supabase-pages-table.sql` - Creates pages table
- `supabase-inventory-variant-id.sql` - Inventory schema
- `supabase-theme-sections.sql` - Theme settings

---

## Context Providers (State Management)

### 1. **AuthContext** (`context/AuthContext.tsx`)
- Manages user authentication state
- Fetches user role from `profiles` table
- Provides: `user`, `role`, `loading`, `signIn()`, `signUp()`, `signOut()`
- **Database Queries**:
  - `supabase.auth.getSession()` - Get current session
  - `supabase.from("profiles").select("role").eq("id", uid)` - Get user role
  - `supabase.auth.signInWithPassword()` - Sign in
  - `supabase.auth.signUp()` - Sign up (creates profile via trigger)

### 2. **CartContext** (`context/CartContext.tsx`)
- Manages shopping cart state
- **Storage**: LocalStorage (key: `"ec_cart"`)
- Provides: `items`, `add()`, `updateQty()`, `remove()`, `total`, `count`
- **No database queries** - cart is client-side only until checkout

### 3. **ThemeContext** (`context/ThemeContext.tsx`)
- Manages store theme settings
- **Database Query**: `supabase.from("theme_settings").select("*").limit(1).single()`
- Listens for live updates via `postMessage` (for admin theme editor)
- Falls back to `defaultTheme` if no DB data

### 4. **Providers Wrapper** (`components/providers.tsx`)
Wraps the app with all three contexts:
```tsx
<AuthProvider>
  <CartProvider>
    <ThemeProvider>{children}</ThemeProvider>
  </CartProvider>
</AuthProvider>
```

---

## Page Structure & Routing

### Store Pages (Public) - `app/(store)/`

#### 1. **Home Page** (`app/(store)/page.tsx`)
- **Database Queries**:
  - `supabase.from("products").select("*").eq("status", "active").limit(60)`
  - `supabase.from("collections").select("*").eq("is_active", true)`
- **Fallback**: Uses `dummyProducts` and `dummyCollections` if DB empty
- **Features**: 
  - Dynamic sections (hero, products, collections, etc.)
  - Theme-driven layout (from `theme_settings.home_sections_json`)
  - Editor mode support (`?editor=1` for admin preview)

#### 2. **Product Page** (`app/(store)/product/[slug]/page.tsx`)
- **Database Queries**:
  - `supabase.from("products").select("*").eq("slug", slug).maybeSingle()` - Get product
  - `supabase.from("product_variants").select("*").eq("product_id", product.id)` - Get variants
  - `supabase.from("inventory").select("*").eq("product_id", product.id)` - Get stock
  - `supabase.from("products").select("*").neq("id", product.id).limit(6)` - Related products
- **Fallback**: Falls back to `dummyProducts` if not found
- **Features**: Variant selection, inventory display, related products

#### 3. **Collection Page** (`app/(store)/collection/[slug]/page.tsx`)
- **Database Queries**:
  - `supabase.from("collections").select("*")` - Find collection by slug
  - `supabase.from("products").select("*").in("id", product_ids)` - Get collection products
- **Fallback**: Uses `dummyCollections` and `dummyProducts`
- **Features**: Search, sort, filter products in collection

#### 4. **Cart Page** (`app/(store)/cart/page.tsx`)
- **Database Queries**:
  - `supabase.from("discounts").select("*").eq("code", code).eq("active", true)` - Apply discount
- **Storage**: Cart stored in LocalStorage, no DB until checkout

#### 5. **Checkout Page** (`app/(store)/checkout/page.tsx`)
- **Database Queries**:
  - `supabase.from("order").insert({...})` - Create order
  - `supabase.from("order_items").insert({...})` - Create order items (loop)
- **Features**: Customer info form, payment method selection, order creation

#### 6. **Other Store Pages**:
- `/products` - All products listing
- `/collections` - All collections
- `/search` - Search results
- `/account` - User account/login
- `/policies` - Policy pages index
- `/policy/[slug]` - Individual policy page
- `/order/[id]` - Order confirmation

### Admin Pages - `app/admin/`

#### 1. **Admin Dashboard** (`app/admin/page.tsx`)
- **Database Queries**:
  - `supabase.from("products").select("id", {count: "exact"})` - Product count
  - `supabase.from("order").select("id", {count: "exact"})` - Order count
  - `supabase.from("customer_data").select("id", {count: "exact"})` - Customer count
  - `supabase.from("products").select("id").eq("status", "active")` - Active products
  - `supabase.from("order").select("total")` - Revenue calculation
  - `supabase.from("order").select("*").order("created_at", {ascending: false}).limit(5)` - Recent orders

#### 2. **Admin Products** (`app/admin/products/page.tsx`)
- **Database Queries**:
  - `supabase.from("products").select("*").order("created_at", {ascending: false})` - List all
  - `supabase.from("products").update({...}).eq("id", id)` - Update product
  - `supabase.from("products").insert({...})` - Create product
  - `supabase.from("products").delete().eq("id", id)` - Delete product
- **Features**: CRUD operations, search, filter, pagination

#### 3. **Other Admin Pages**:
- `/admin/collections` - Manage collections
- `/admin/orders` - View/manage orders
- `/admin/customers` - Customer list
- `/admin/discounts` - Discount codes
- `/admin/pages` - Policy pages
- `/admin/theme` - Theme editor

### Admin Protection
- **Admin Layout** (`app/admin/layout.tsx`) - Sidebar navigation
- **Auth Check**: Admin pages should check `useAuth().role === "admin"` (not enforced in layout, but should be added)

---

## Data Flow Patterns

### 1. **Product Data Flow**
```
Supabase DB (products table)
  ↓
useSupabase() hook
  ↓
useEffect with query
  ↓
setState (products)
  ↓
Render components
  ↓
Fallback to dummyProducts if DB empty/null
```

### 2. **Cart Flow**
```
User clicks "Add to Cart"
  ↓
CartContext.add(product, qty, variant)
  ↓
Update LocalStorage
  ↓
Update React state
  ↓
Checkout page reads from CartContext
  ↓
Create order in Supabase
  ↓
Clear LocalStorage
```

### 3. **Authentication Flow**
```
User signs up
  ↓
supabase.auth.signUp()
  ↓
Trigger creates profile row
  ↓
AuthContext fetches role from profiles table
  ↓
User state updated
  ↓
Admin pages check role === "admin"
```

---

## Key Patterns & Best Practices

### 1. **Graceful Degradation**
- All pages check `if (!supabase) return;` before DB queries
- Fallback to `dummyProducts`, `dummyCollections`, `dummyPages`
- App works without Supabase configured (demo mode)

### 2. **Error Handling**
- Database queries use `.then()` with type-safe `QueryResult<T>`
- Errors are caught silently (`.catch(() => {})`)
- UI shows loading states while fetching

### 3. **Type Safety**
- All database types defined in `types/index.ts`
- `QueryResult<T>` type for Supabase responses
- TypeScript throughout

### 4. **Client-Side Only**
- Supabase client created only in browser (`typeof window !== "undefined"`)
- No server-side rendering of DB data
- All queries in `useEffect` hooks

### 5. **State Management**
- Context API for global state (Auth, Cart, Theme)
- Local state for page-specific data
- LocalStorage for cart persistence

---

## Environment Variables

Required in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

If missing, app uses dummy data and still functions.

---

## Database Schema Summary

### Relationships:
- `profiles.id` → `auth.users.id` (1:1)
- `product_variants.product_id` → `products.id` (many:1)
- `inventory.product_id` → `products.id` (many:1)
- `inventory.variant_id` → `product_variants.id` (many:1)
- `order_items.order_id` → `order.id` (many:1)
- `order_items.product_id` → `products.id` (many:1)
- `collections.product_ids` → `products.id[]` (JSON array, many:many)

### Row Level Security (RLS):
- `profiles`: Users can read/update own profile
- `product_variants`: Public read access
- `pages`: Public read access
- Other tables: May need RLS policies for production

---

## File Organization

```
app/
  (store)/          # Public store pages
    page.tsx        # Home
    product/[slug]/ # Product detail
    collection/     # Collection listing
    cart/           # Shopping cart
    checkout/       # Checkout
    ...
  admin/            # Admin pages (protected)
    page.tsx        # Dashboard
    products/       # Product management
    ...
context/            # React contexts
  AuthContext.tsx
  CartContext.tsx
  ThemeContext.tsx
lib/
  supabase.ts       # Supabase client
  dummy-data.ts     # Fallback data
  utils.ts          # Helper functions
types/
  index.ts          # TypeScript types
components/         # Reusable components
```

---

## Summary

This is a **fully functional e-commerce app** with:
- ✅ Supabase database integration
- ✅ Graceful fallback to dummy data
- ✅ Authentication & role-based access
- ✅ Shopping cart (LocalStorage)
- ✅ Order management
- ✅ Admin panel for CRUD operations
- ✅ Theme customization
- ✅ Mobile-first responsive design

The app is designed to work **with or without** Supabase configured, making it easy to demo and develop.
