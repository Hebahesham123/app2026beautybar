/** Footer regions clickable in theme preview (`footer-*` ids → Footer tab). */
export const FOOTER_EDITOR_SECTIONS = [
  { id: "footer-promo", label: "Footer: Promo bar", icon: "📣", desc: "Pink strip above the footer" },
  { id: "footer-brand", label: "Footer: Brand & social", icon: "✨", desc: "Name, tagline, Instagram / TikTok / WhatsApp" },
  { id: "footer-quick-shop", label: "Footer: Quick Shop", icon: "🛍️", desc: "Heading and category links" },
  { id: "footer-information", label: "Footer: Information", icon: "ℹ️", desc: "Heading and policy / info links" },
  { id: "footer-pay-later", label: "Footer: Pay Later", icon: "💳", desc: "BNPL badges and subtext" },
  { id: "footer-contact", label: "Footer: Contact", icon: "💬", desc: "WhatsApp button" },
  { id: "footer-we-accept", label: "Footer: We Accept", icon: "💵", desc: "Payment method pills" },
  { id: "footer-copyright", label: "Footer: Copyright", icon: "©️", desc: "© line and brand name" },
] as const;

export type FooterEditorSectionId = (typeof FOOTER_EDITOR_SECTIONS)[number]["id"];

export const FOOTER_SECTION_IDS: string[] = FOOTER_EDITOR_SECTIONS.map((s) => s.id);

export function isFooterEditorSectionId(id: string): id is FooterEditorSectionId {
  return FOOTER_SECTION_IDS.includes(id);
}

export function footerEditorLabel(id: string): string {
  return FOOTER_EDITOR_SECTIONS.find((s) => s.id === id)?.label ?? id;
}
