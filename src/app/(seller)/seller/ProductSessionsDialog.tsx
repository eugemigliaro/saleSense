"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Clock3, EyeOff, RadioTower, X } from "lucide-react";

import type { MonitoredDeviceSession } from "@/types/domain";

interface ProductSessionsDialogProps {
  isDismissingSessionId: string | null;
  onClose: () => void;
  onDismissSession: (deviceSessionId: string) => void | Promise<void>;
  productName: string;
  sessions: MonitoredDeviceSession[];
}

function formatRelativeTime(value: string | null) {
  if (!value) {
    return "Not seen yet";
  }

  const deltaSeconds = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 1000),
  );

  if (deltaSeconds < 60) {
    return `${deltaSeconds}s ago`;
  }

  const deltaMinutes = Math.round(deltaSeconds / 60);

  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);

  return `${deltaHours}h ago`;
}

function formatStartedAt(value: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function ProductSessionsDialog({
  isDismissingSessionId,
  onClose,
  onDismissSession,
  productName,
  sessions,
}: ProductSessionsDialogProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="font-display text-xl font-semibold">{productName} sessions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Healthy devices stay neutral. Sessions with no visible heartbeat turn
              red so the store manager can check them.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close sessions dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
              No active or attention-needed sessions for this product.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const needsAttention = session.attentionState === "attention-needed";

                return (
                  <div
                    key={session.id}
                    className={`rounded-2xl border px-4 py-4 ${
                      needsAttention
                        ? "border-destructive/35 bg-destructive/8"
                        : "border-border bg-background"
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            {session.label?.trim() || "Unnamed kiosk session"}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              needsAttention
                                ? "bg-destructive/12 text-destructive"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {needsAttention ? "Needs attention" : "Healthy"}
                          </span>
                        </div>

                        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4" />
                            Started {formatStartedAt(session.startedAt)}
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioTower className="h-4 w-4" />
                            Last visible {formatRelativeTime(session.lastPresenceAt)}
                          </div>
                          <div className="flex items-center gap-2">
                            <EyeOff className="h-4 w-4" />
                            State {session.state}
                          </div>
                          <div className="flex items-center gap-2">
                            {needsAttention ? (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            ) : (
                              <RadioTower className="h-4 w-4 text-primary" />
                            )}
                            Session {session.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>

                      {needsAttention ? (
                        <button
                          type="button"
                          onClick={() => void onDismissSession(session.id)}
                          disabled={isDismissingSessionId === session.id}
                          className="rounded-lg bg-destructive px-3.5 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {isDismissingSessionId === session.id
                            ? "Dismissing..."
                            : "Dismiss alert"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
