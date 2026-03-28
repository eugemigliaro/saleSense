import type { FormEvent } from "react";

import { ArrowRight, Mail, Phone, UserCircle2 } from "lucide-react";

interface KioskLeadViewProps {
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  isSubmittingLead: boolean;
  leadError: string | null;
  productName: string;
  onCustomerEmailChange: (value: string) => void;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange: (value: string) => void;
  onReset: () => void;
  onSubmit: () => void | Promise<void>;
}

export function KioskLeadView({
  customerEmail,
  customerName,
  customerPhone,
  isSubmittingLead,
  leadError,
  productName,
  onCustomerEmailChange,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onReset,
  onSubmit,
}: KioskLeadViewProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit();
  }

  return (
    <main className="kiosk-screen kiosk-text relative min-h-screen overflow-hidden px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg items-center">
        <div className="w-full rounded-[2rem] border border-white/10 bg-white/6 p-8 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.9)] backdrop-blur-xl">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full kiosk-gradient-bg kiosk-glow">
              <UserCircle2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">
              Stay in touch?
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/65">
              Leave your details and the store team can follow up with the
              best next recommendation for {productName}.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <label htmlFor="customer-name" className="text-sm font-medium text-white/82">
                Name
              </label>
              <div className="relative">
                <UserCircle2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  id="customer-name"
                  value={customerName}
                  onChange={(event) => onCustomerNameChange(event.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/8 px-11 py-3.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-primary/55"
                  placeholder="Your name"
                  type="text"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="customer-email" className="text-sm font-medium text-white/82">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  id="customer-email"
                  value={customerEmail}
                  onChange={(event) => onCustomerEmailChange(event.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/8 px-11 py-3.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-primary/55"
                  placeholder="you@example.com"
                  type="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="customer-phone" className="text-sm font-medium text-white/82">
                Phone
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  id="customer-phone"
                  value={customerPhone}
                  onChange={(event) => onCustomerPhoneChange(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/8 px-11 py-3.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-primary/55"
                  placeholder="Optional phone number"
                  type="tel"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="submit"
                disabled={isSubmittingLead}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl kiosk-gradient-bg px-5 text-sm font-semibold text-white transition-opacity hover:opacity-92"
              >
                {isSubmittingLead ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving lead
                  </>
                ) : (
                  <>
                    Submit lead
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onReset}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/12 bg-white/6 px-5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
              >
                Skip
              </button>
            </div>

            {leadError ? (
              <div className="rounded-xl border border-amber-400/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                {leadError}
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </main>
  );
}
