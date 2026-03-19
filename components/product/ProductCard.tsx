"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/types";
import { slugify, getProductImageUrl } from "@/lib/utils";
import { useCart } from "@/context/CartContext";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const slug = product.slug || slugify(product.name);
  const price = Number(product.price) || 0;
  const compareAt = product.compare_at_price != null ? Number(product.compare_at_price) : null;
  const imgUrl = getProductImageUrl(product);
  const [imgError, setImgError] = useState(false);
  const showImg = imgUrl && !imgError;
  const discountPct =
    compareAt != null && compareAt > price
      ? Math.round((1 - price / compareAt) * 100)
      : null;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={`/product/${slug}`} className="block flex-1">
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          {showImg ? (
            <img
              src={imgUrl}
              alt={product.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300">
              <span className="text-4xl">👜</span>
            </div>
          )}
          {discountPct && (
            <span className="absolute left-2 top-2 rounded-full bg-[#D4457A] px-2 py-0.5 text-[10px] font-black text-white shadow">
              -{discountPct}%
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3">
          {product.category && (
            <p className="truncate text-[9px] font-bold uppercase tracking-widest text-[#D4457A]">{product.category}</p>
          )}
          <h3 className="mt-0.5 line-clamp-2 text-xs font-semibold leading-snug text-gray-800 transition group-hover:text-gray-900">
            {product.name}
          </h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-sm font-black text-gray-900">LE {price.toLocaleString()}</span>
            {compareAt != null && compareAt > price && (
              <span className="text-xs text-gray-400 line-through">LE {compareAt.toLocaleString()}</span>
            )}
          </div>
        </div>
      </Link>
      <div className="border-t border-gray-50 p-3">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            add(product);
          }}
          className="w-full rounded-xl bg-[#D4457A] py-2.5 text-xs font-bold text-white transition hover:bg-[#C03468] active:scale-[0.97]"
        >
          Add to Bag
        </button>
      </div>
    </article>
  );
}
