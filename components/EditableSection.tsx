"use client";

import React from "react";

export function EditableSection({
  id,
  label,
  isEditor,
  isHighlighted,
  children,
}: {
  id: string;
  label: string;
  isEditor: boolean;
  isHighlighted: boolean;
  children: React.ReactNode;
}) {
  if (!isEditor) return <>{children}</>;
  
  return (
    <div
      data-section={id}
      className={`relative group/es cursor-pointer transition-all ${isHighlighted ? "ring-2 ring-inset ring-blue-500" : ""}`}
      onClickCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          window.parent?.postMessage({ type: "BB_SECTION_SELECT", id, label }, "*");
        } catch {}
      }}
    >
      {/* Hover highlight border */}
      <div className="pointer-events-none absolute inset-0 z-[9999] border-2 border-transparent transition-all group-hover/es:border-blue-500" />
      {/* Label badge on hover */}
      <div className="pointer-events-none absolute left-2 top-2 z-[9999] flex items-center gap-1.5 rounded bg-blue-500 px-2 py-0.5 opacity-0 transition-opacity group-hover/es:opacity-100 shadow-lg">
        <span className="text-[10px] font-black uppercase tracking-wide text-white">{label}</span>
        <span className="text-[9px] text-blue-200">Click to edit</span>
      </div>
      {children}
    </div>
  );
}
