"use client";

import { motion } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";

interface KioskFeedbackViewProps {
  feedbackError: string | null;
  isSubmittingFeedback: boolean;
  onSkip: () => void | Promise<void>;
  onSubmit: (rating: number) => void | Promise<void>;
}

export function KioskFeedbackView({
  feedbackError,
  isSubmittingFeedback,
  onSkip,
  onSubmit,
}: KioskFeedbackViewProps) {
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center px-6 kiosk-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-xl rounded-[2rem] border border-white/12 bg-slate-950/55 p-8 text-center shadow-[0_40px_120px_-42px_rgba(2,6,23,0.95)] backdrop-blur-xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full kiosk-gradient-bg kiosk-glow">
          <Star className="h-8 w-8 text-primary-foreground" />
        </div>
        <h2 className="font-display ui-text-large font-bold kiosk-text">
          How was your conversation?
        </h2>
        <p className="mt-2 ui-text-small kiosk-muted">
          Leave a quick rating from 1 to 5 stars before you finish.
        </p>

        {feedbackError ? (
          <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-300/10 px-4 py-3 ui-text-small text-amber-100">
            {feedbackError}
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => void onSubmit(rating)}
              disabled={isSubmittingFeedback}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-3 py-5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Star className="h-7 w-7 fill-current text-amber-300 transition-colors group-hover:text-amber-200" />
              <span className="ui-text-small font-medium text-white/80">
                {rating}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void onSkip()}
          disabled={isSubmittingFeedback}
          className="mt-6 inline-flex items-center gap-2 ui-text-small text-white/60 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Skip rating
          <ArrowRight className="h-4 w-4" />
        </button>
      </motion.div>
    </motion.div>
  );
}
