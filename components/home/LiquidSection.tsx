"use client";

import { useEffect, useState } from "react";
import type { LiquidSectionData } from "@/types/home-sections";

function parseSettings(json: string): Record<string, unknown> {
  try {
    const o = JSON.parse(json || "{}");
    return typeof o === "object" && o !== null ? o : {};
  } catch {
    return {};
  }
}

export function LiquidSectionRender({ section }: { section: LiquidSectionData }) {
  const [html, setHtml] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const settings = parseSettings(section.settings_json ?? "{}");
    import("liquidjs").then(({ Liquid }) => {
      if (cancelled) return;
      const engine = new Liquid();
      const context = {
        shop: { name: "Shop" },
        section: { settings },
      };
      engine
        .parseAndRender(section.liquid_code || "", context)
        .then((out) => {
          if (!cancelled) setHtml(out);
        })
        .catch((err) => {
          if (!cancelled) setError(String(err?.message || err));
        });
    });
    return () => {
      cancelled = true;
    };
  }, [section.liquid_code, section.settings_json]);

  if (error) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Liquid error: {error}
        </div>
      </section>
    );
  }

  return (
    <section
      className="liquid-section mx-auto max-w-6xl px-4 py-10"
      style={{
        backgroundColor: section.bg_color ?? "#ffffff",
        color: section.text_color ?? "#0f172a",
      }}
    >
      <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: html || "" }} />
    </section>
  );
}
