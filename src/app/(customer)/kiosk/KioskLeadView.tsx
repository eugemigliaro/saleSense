"use client";

import type { FormEvent } from "react";

import { motion } from "framer-motion";
import { ArrowRight, Mail, UserCircle } from "lucide-react";

interface KioskLeadViewProps {
  customerEmail: string;
  customerName: string;
  isSubmittingLead: boolean;
  leadError: string | null;
  onCustomerEmailChange: (value: string) => void;
  onCustomerNameChange: (value: string) => void;
  onSkip: () => void;
  onSubmit: () => void | Promise<void>;
}

export function KioskLeadView({
  customerEmail,
  customerName,
  isSubmittingLead,
  leadError,
  onCustomerEmailChange,
  onCustomerNameChange,
  onSkip,
  onSubmit,
}: KioskLeadViewProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit();
  }

  const inputClass =
    "w-full kiosk-surface kiosk-text rounded-xl px-5 py-3.5 ui-text-medium placeholder:text-kiosk-muted focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <motion.div
      className="fixed inset-0 kiosk-bg flex items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="mb-8 text-center">
          <div className="kiosk-gradient-bg kiosk-glow mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <UserCircle className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="kiosk-text font-display ui-text-large font-bold">Stay in touch?</h2>
          <p className="kiosk-muted mt-2 ui-text-small">
            Leave your info and we&apos;ll follow up with personalized recommendations.
          </p>
        </div>

        {leadError ? (
          <div className="mb-4 rounded-xl border border-amber-400/20 bg-amber-300/10 px-4 py-3 ui-text-small text-amber-100">
            {leadError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <UserCircle className="kiosk-muted absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              value={customerName}
              onChange={(event) => onCustomerNameChange(event.target.value)}
              placeholder="Your name"
              required
              className={`${inputClass} pl-11`}
            />
          </div>

          <div className="relative">
            <Mail className="kiosk-muted absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="email"
              value={customerEmail}
              onChange={(event) => onCustomerEmailChange(event.target.value)}
              placeholder="Email address"
              required
              className={`${inputClass} pl-11`}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmittingLead}
            className="kiosk-gradient-bg kiosk-glow flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmittingLead ? "Sending..." : "Send my info"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <button
          onClick={onSkip}
          className="kiosk-muted hover:kiosk-text mt-3 w-full py-2 text-center ui-text-small transition-colors"
          type="button"
        >
          Continue without leaving my info
        </button>
      </motion.div>
    </motion.div>
  );
}
