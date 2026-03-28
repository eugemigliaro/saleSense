"use client";

import { motion } from "framer-motion";

export function KioskThanksView() {
  return (
    <motion.div
      className="fixed inset-0 kiosk-bg flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-center">
        <div className="mb-4 text-6xl text-white">✓</div>
        <h2 className="kiosk-text font-display text-3xl font-bold">Thank you!</h2>
        <p className="kiosk-muted mt-2">A team member will reach out soon.</p>
      </div>
    </motion.div>
  );
}
