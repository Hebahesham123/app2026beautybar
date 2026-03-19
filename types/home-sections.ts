import type { HomeSection } from "./index";

export type PromoSectionData = Extract<HomeSection, { type: "promo" }>;
export type TickerSectionData = Extract<HomeSection, { type: "ticker" }>;
export type HeroSectionData = Extract<HomeSection, { type: "hero" }>;
export type CollectionsSectionData = Extract<HomeSection, { type: "collections" }>;
export type ProductsSectionData = Extract<HomeSection, { type: "products" }>;
export type BannerSectionData = Extract<HomeSection, { type: "banner" }>;
export type CustomSectionData = Extract<HomeSection, { type: "custom" }>;
export type SpacerSectionData = Extract<HomeSection, { type: "spacer" }>;
export type LiquidSectionData = Extract<HomeSection, { type: "liquid" }>;
