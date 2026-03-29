"use client";

import { ArrowRight, Mail } from "lucide-react";

import type { LeadCaptureInstruction } from "@/types/api";

interface KioskInlineLeadPromptProps {
  email: string;
  error: string | null;
  instruction: LeadCaptureInstruction | null;
  isSubmitting: boolean;
  onDismiss: () => void | Promise<void>;
  onEmailChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  status: "prompted" | "submitted" | "idle" | "dismissed";
}

export function KioskInlineLeadPrompt({
  email,
  error,
  instruction,
  isSubmitting,
  onDismiss,
  onEmailChange,
  onSubmit,
  status,
}: KioskInlineLeadPromptProps) {
  if (status === "idle" || status === "dismissed") {
    return null;
  }

  if (status === "submitted") {
    return null;
  }

  if (!instruction) {
    return null;
  }

  return (
    <div className="flex justify-start">
      <div className="mr-3 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/8">
        <Mail className="h-4.5 w-4.5 text-blue-300" />
      </div>
      <div className="max-w-[92%] rounded-3xl rounded-bl-xl border border-white/10 bg-white/10 px-4 py-4 text-white/92 backdrop-blur-md sm:max-w-[74%] sm:px-5">
        <p className="ui-text-medium leading-7">{instruction.prompt}</p>

        {error ? (
          <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-300/10 px-3 py-2 ui-text-small text-amber-100">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
            <input
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder={
                instruction.language === "es"
                  ? "Tu email"
                  : "Your email"
              }
              disabled={isSubmitting}
              className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/55 pl-10 pr-4 ui-text-small text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isSubmitting || email.trim().length === 0}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-600 px-5 ui-text-small font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting
              ? instruction.language === "es"
                ? "Enviando..."
                : "Sending..."
              : instruction.language === "es"
                ? "Enviar"
                : "Send"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => void onDismiss()}
          disabled={isSubmitting}
          className="mt-3 ui-text-small text-white/55 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {instruction.language === "es" ? "Ahora no" : "Not now"}
        </button>
      </div>
    </div>
  );
}
