import { Suspense } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobilePreviewViewport } from "@/components/layout/MobilePreviewViewport";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <MobilePreviewViewport />
      </Suspense>
      <div
        className="flex flex-col bg-white text-gray-900 md:min-h-screen"
        style={{
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        {/* Mobile: fixed viewport, scrollable main + footer. BottomNav outside overflow so it's never clipped. */}
        <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden pb-20 md:h-auto md:max-h-none md:min-h-screen md:overflow-visible md:pb-20">
          <Suspense fallback={<header className="h-14 border-b border-slate-200 bg-white md:h-16" />}>
            <Navbar />
          </Suspense>
          <main className="min-h-0 flex-1 overflow-y-auto pb-20 md:min-h-0 md:flex-1 md:overflow-visible">
            {children}
            <Footer />
          </main>
        </div>
        <BottomNav />
      </div>
    </>
  );
}
