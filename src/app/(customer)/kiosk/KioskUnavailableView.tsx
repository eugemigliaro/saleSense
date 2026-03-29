export function KioskUnavailableView() {
  return (
    <div className="kiosk-bg fixed inset-0 flex items-center justify-center overflow-hidden px-6">
      <div className="max-w-lg rounded-[2rem] border border-white/10 bg-slate-950/60 px-8 py-10 text-center text-white shadow-[0_40px_120px_-42px_rgba(2,6,23,0.95)] backdrop-blur-xl">
        <p className="text-xs font-medium uppercase tracking-[0.32em] text-white/45">
          SaleSense
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-tight">
          This kiosk session is not active on this device.
        </h1>
        <p className="mt-4 text-sm leading-7 text-white/68">
          Ask a store manager to sign in on this display and set the product up
          again. The kiosk URL alone is not enough to open the live experience.
        </p>
      </div>
    </div>
  );
}
