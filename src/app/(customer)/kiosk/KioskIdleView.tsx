import { Sparkles } from "lucide-react";

interface KioskIdleViewProps {
  brandName: string;
  productName: string;
  sourceLabel: string;
  onStart: () => void | Promise<void>;
}

export function KioskIdleView({
  brandName,
  productName,
  sourceLabel,
  onStart,
}: KioskIdleViewProps) {
  return (
    <main className="kiosk-screen kiosk-text relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.22),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_48%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:clamp(3.5rem,7vw,6rem)_clamp(3.5rem,7vw,6rem)] opacity-20" />

      <button
        type="button"
        className="relative z-10 flex min-h-screen w-full items-center justify-center px-6 py-10 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/60 sm:px-10"
        onClick={() => void onStart()}
        aria-label="Tap anywhere to start the kiosk experience"
      >
        <div className="flex w-full max-w-6xl flex-col justify-between gap-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-white/55">
                SaleSense
              </p>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/65">
                {sourceLabel}. This kiosk is ready to guide the next in-store
                customer.
              </p>
            </div>

            <div className="inline-flex items-center gap-3 self-start rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/72 backdrop-blur">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary shadow-[0_0_18px_rgba(96,165,250,0.95)]" />
              Idle mode
            </div>
          </div>

          <div className="max-w-4xl">
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-primary/90">
              {brandName}
            </p>
            <h1 className="mt-6 max-w-3xl font-display text-5xl font-bold leading-[0.92] tracking-[-0.04em] text-balance sm:text-7xl lg:text-[5.75rem]">
              {productName}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
              Tap to wake the sales guide and start a guided conversation
              about this product.
            </p>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="inline-flex w-fit items-center gap-4 rounded-full border border-white/12 bg-white/10 px-6 py-4 backdrop-blur-md">
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full kiosk-gradient-bg kiosk-glow text-white">
                <Sparkles className="h-6 w-6" />
                <span className="kiosk-pulse-ring absolute inset-0 rounded-full border border-primary/60" />
              </span>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-white/45">
                  Interaction
                </p>
                <p className="mt-1 text-lg font-medium tracking-tight">
                  Tap anywhere to begin
                </p>
              </div>
            </div>

            <p className="max-w-sm text-sm leading-6 text-white/55 sm:text-right">
              Milestone 1 keeps the interaction typed and kiosk-like, with a
              clear reset back to idle after the session ends.
            </p>
          </div>
        </div>
      </button>
    </main>
  );
}
