"use client";

import { motion } from "framer-motion";

interface KioskIdleViewProps {
  brandName: string;
  idleMediaUrl: string | null;
  productName: string;
  onStart: () => void | Promise<void>;
}

export function KioskIdleView({
  brandName,
  idleMediaUrl,
  productName,
  onStart,
}: KioskIdleViewProps) {
  return (
    <motion.div
      className="fixed inset-0 kiosk-bg flex cursor-pointer flex-col items-center justify-center overflow-hidden select-none"
      onClick={() => void onStart()}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="absolute inset-0">
        {idleMediaUrl ? (
          <div
            aria-hidden="true"
            className="h-full w-full bg-cover bg-center opacity-60"
            style={{ backgroundImage: `url(${idleMediaUrl})` }}
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.18),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.16),transparent)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(222_47%_6%)] via-[hsl(222_47%_6%_/0.7)] to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-8 text-center">
        <motion.p
          className="kiosk-muted text-sm font-medium uppercase tracking-[0.3em]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {brandName}
        </motion.p>

        <motion.h1
          className="kiosk-text font-display text-5xl leading-tight font-bold md:text-7xl lg:text-8xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {productName}
        </motion.h1>

        <motion.div
          className="mt-12 flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <div className="relative">
            <div className="kiosk-gradient-bg kiosk-glow flex h-20 w-20 items-center justify-center rounded-full">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="hsl(210 40% 98%)"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div className="kiosk-pulse-ring absolute inset-0 rounded-full border-2 border-primary" />
          </div>

          <p className="kiosk-muted text-lg font-light">
            Tap anywhere to start a voice-guided demo
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
