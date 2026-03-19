"use client";

const CUSTOMER_ORDERS = [
  { name: "Maha", city: "Cairo" },
  { name: "Ahmed", city: "Alexandria" },
  { name: "Sara", city: "Giza" },
  { name: "Omar", city: "Mansoura" },
  { name: "Layla", city: "Luxor" },
  { name: "Youssef", city: "Aswan" },
  { name: "Nour", city: "Port Said" },
  { name: "Karim", city: "Suez" },
  { name: "Dina", city: "Ismailia" },
  { name: "Hassan", city: "Tanta" },
];

function OrderIcon() {
  return (
    <svg
      className="h-3 w-3 shrink-0 text-emerald-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
      />
    </svg>
  );
}

function TickerItem({ name, city }: { name: string; city: string }) {
  return (
    <div
      className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 shadow-sm shadow-slate-200/50 backdrop-blur-sm transition-all duration-300 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/10"
      style={{ minWidth: "max-content" }}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10">
        <OrderIcon />
      </span>
      <span className="text-xs text-slate-600">
        <span className="font-semibold text-slate-900">{name}</span>
        <span className="mx-1 text-slate-400">·</span>
        <span>ordered from</span>
        <span className="mx-1 font-medium text-slate-800">{city}</span>
      </span>
    </div>
  );
}

export function CustomersTicker() {
  const items = [...CUSTOMER_ORDERS, ...CUSTOMER_ORDERS];

  return (
    <div className="ticker-pause-hover relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-white py-2">
      {/* Edge fades */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-slate-50 via-slate-50/80 to-transparent md:w-28"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-slate-50 via-slate-50/80 to-transparent md:w-28"
        aria-hidden
      />

      {/* Scrolling track only */}
      <div className="flex">
        <div className="flex animate-ticker-scroll gap-3 pr-3">
          {items.map(({ name, city }, i) => (
            <TickerItem key={`${name}-${city}-${i}`} name={name} city={city} />
          ))}
        </div>
      </div>
    </div>
  );
}
