"use client";

import { motion } from "framer-motion";

interface LaunchDeviceDialogProps {
  errorMessage: string | null;
  isLaunching: boolean;
  label: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  onLabelChange: (value: string) => void;
  productName: string;
}

export function LaunchDeviceDialog({
  errorMessage,
  isLaunching,
  label,
  onClose,
  onConfirm,
  onLabelChange,
  productName,
}: LaunchDeviceDialogProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
      >
        <div className="mb-5">
          <h2 className="font-display text-xl font-semibold">Set up this device</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This will sign the manager out and switch this browser into kiosk mode
            for <span className="font-medium text-foreground">{productName}</span>.
          </p>
        </div>

        <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="device-label">
          Device label <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          id="device-label"
          value={label}
          onChange={(event) => onLabelChange(event.target.value)}
          placeholder="Front table, Window display, Demo 3..."
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
        />

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isLaunching}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isLaunching ? "Setting up..." : "Set up here"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
