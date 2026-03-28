export function KioskThanksView() {
  return (
    <main className="kiosk-screen kiosk-text flex min-h-screen items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full kiosk-gradient-bg kiosk-glow text-3xl font-semibold text-white">
          ✓
        </div>
        <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">
          Thank you
        </h1>
        <p className="mt-3 text-base leading-7 text-white/65">
          A team member can follow up soon. This kiosk will reset back to idle
          automatically.
        </p>
      </div>
    </main>
  );
}
