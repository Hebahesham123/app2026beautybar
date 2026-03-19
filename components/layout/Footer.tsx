"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTheme } from "@/context/ThemeContext";
import { mergeFooterSettings } from "@/lib/footer-settings";
import { EditableSection } from "@/components/EditableSection";

const SOCIAL_ICONS: Record<
  "instagram" | "tiktok" | "whatsapp",
  { label: string; icon: ReactNode }
> = {
  instagram: {
    label: "Instagram",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  tiktok: {
    label: "TikTok",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.28 8.28 0 004.84 1.54V6.78a4.85 4.85 0 01-1.07-.09z" />
      </svg>
    ),
  },
  whatsapp: {
    label: "WhatsApp",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
};

export function Footer() {
  const { theme } = useTheme();
  const f = useMemo(() => mergeFooterSettings(theme.footer_json), [theme.footer_json]);
  const [isEditor, setIsEditor] = useState(false);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    setIsEditor(
      typeof window !== "undefined" && window.location.search.includes("editor=1")
    );
  }, []);

  useEffect(() => {
    if (!isEditor) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "BB_SECTION_HIGHLIGHT") {
        setHighlighted((e.data.id as string) || null);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isEditor]);

  const socialEntries: { key: keyof typeof SOCIAL_ICONS; href: string }[] = [
    { key: "instagram", href: f.social_instagram },
    { key: "tiktok", href: f.social_tiktok },
    { key: "whatsapp", href: f.social_whatsapp },
  ];

  return (
    <footer className="border-t border-pink-100 bg-white">
      <EditableSection
        id="footer-promo"
        label="Footer: Promo bar"
        isEditor={isEditor}
        isHighlighted={highlighted === "footer-promo"}
      >
        <div className="bg-[#D4457A] py-3 text-center">
          <p className="text-xs font-bold text-white tracking-wide px-2">{f.promo_banner}</p>
        </div>
      </EditableSection>

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <EditableSection
              id="footer-brand"
              label="Footer: Brand & social"
              isEditor={isEditor}
              isHighlighted={highlighted === "footer-brand"}
            >
              <Link href="/" className="text-lg font-black tracking-[0.2em] text-gray-900">
                {f.brand_name}
              </Link>
              <p className="mt-2 text-xs text-gray-500 leading-relaxed max-w-[220px]">{f.brand_tagline}</p>
              <div className="mt-4 flex gap-3">
                {socialEntries.map(({ key, href }) => {
                  const s = SOCIAL_ICONS[key];
                  return (
                    <Link
                      key={key}
                      href={href || "#"}
                      aria-label={s.label}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-pink-200 bg-[#FFF0F6] text-[#D4457A] transition hover:bg-[#D4457A] hover:text-white"
                    >
                      {s.icon}
                    </Link>
                  );
                })}
              </div>
            </EditableSection>
          </div>

          <EditableSection
            id="footer-quick-shop"
            label="Footer: Quick Shop"
            isEditor={isEditor}
            isHighlighted={highlighted === "footer-quick-shop"}
          >
            <div>
              <h3 className="mb-4 text-[11px] font-black uppercase tracking-widest text-gray-900">
                {f.quick_shop_heading}
              </h3>
              <ul className="space-y-2">
                {f.quick_shop_links.map((l) => (
                  <li key={`${l.href}-${l.label}`}>
                    <Link href={l.href} className="text-xs text-gray-500 transition hover:text-[#D4457A]">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </EditableSection>

          <EditableSection
            id="footer-information"
            label="Footer: Information"
            isEditor={isEditor}
            isHighlighted={highlighted === "footer-information"}
          >
            <div>
              <h3 className="mb-4 text-[11px] font-black uppercase tracking-widest text-gray-900">
                {f.info_heading}
              </h3>
              <ul className="space-y-2">
                {f.info_links.map((l) => (
                  <li key={`${l.href}-${l.label}`}>
                    <Link href={l.href} className="text-xs text-gray-500 transition hover:text-[#D4457A]">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </EditableSection>

          <div className="col-span-2 flex flex-col gap-6 md:col-span-1">
            <EditableSection
              id="footer-pay-later"
              label="Footer: Pay Later"
              isEditor={isEditor}
              isHighlighted={highlighted === "footer-pay-later"}
            >
              <div>
                <h3 className="mb-4 text-[11px] font-black uppercase tracking-widest text-gray-900">
                  {f.pay_later_heading}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {f.pay_later_providers.map((p) => (
                    <span
                      key={p}
                      className="rounded-lg border border-pink-200 bg-[#FFF5F8] px-2.5 py-1 text-[10px] font-bold text-gray-700"
                    >
                      {p}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-gray-400">{f.pay_later_subtext}</p>
              </div>
            </EditableSection>

            <EditableSection
              id="footer-contact"
              label="Footer: Contact"
              isEditor={isEditor}
              isHighlighted={highlighted === "footer-contact"}
            >
              <div>
                <h3 className="mb-3 text-[11px] font-black uppercase tracking-widest text-gray-900">
                  {f.contact_heading}
                </h3>
                <Link
                  href={f.contact_whatsapp_href || "#"}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#1fba57]"
                >
                  <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  {f.contact_button_label}
                </Link>
              </div>
            </EditableSection>
          </div>
        </div>

        <EditableSection
          id="footer-we-accept"
          label="Footer: We Accept"
          isEditor={isEditor}
          isHighlighted={highlighted === "footer-we-accept"}
        >
          <div className="mt-8 border-t border-pink-100 pt-6">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">{f.we_accept_heading}</p>
            <div className="flex flex-wrap gap-2">
              {f.payment_methods.map((m) => (
                <span
                  key={m}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-semibold text-gray-600"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </EditableSection>

        <EditableSection
          id="footer-copyright"
          label="Footer: Copyright"
          isEditor={isEditor}
          isHighlighted={highlighted === "footer-copyright"}
        >
          <div className="mt-6 border-t border-pink-100 pt-6 text-center">
            <p className="text-[11px] text-gray-400">
              © {new Date().getFullYear()}{" "}
              <span className="font-bold text-[#D4457A]">{f.copyright_brand}</span>. All rights reserved.
            </p>
          </div>
        </EditableSection>
      </div>
    </footer>
  );
}
