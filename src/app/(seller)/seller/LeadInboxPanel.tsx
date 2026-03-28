"use client";

import { Loader2, RefreshCcw, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Lead } from "@/types/domain";

import { formatDateTime } from "./sellerWorkspaceUtils";

interface LeadInboxPanelProps {
  isRefreshingLeads: boolean;
  leadProductLabels: Map<string, string>;
  leads: Lead[];
  onRefresh: () => void | Promise<void>;
}

export function LeadInboxPanel({
  isRefreshingLeads,
  leadProductLabels,
  leads,
  onRefresh,
}: LeadInboxPanelProps) {
  return (
    <div className="seller-panel rounded-[1.75rem] p-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
            Captured leads
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {leads.length} lead{leads.length === 1 ? "" : "s"}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void onRefresh()}
            disabled={isRefreshingLeads}
            className="rounded-xl border-border/80 bg-white/80"
          >
            {isRefreshingLeads ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {leads.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-white/55 px-5 py-6 text-sm leading-6 text-muted-foreground">
            No leads captured yet. Launch a live kiosk session, chat on
            the product page, and submit the lead form to populate this
            list.
          </div>
        ) : (
          leads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-[1.5rem] border border-border/80 bg-white/70 p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.45)]"
            >
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-display text-2xl font-semibold tracking-tight">
                    {lead.customerName}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lead.customerEmail}
                    {lead.customerPhone ? ` • ${lead.customerPhone}` : ""}
                  </p>
                </div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  {formatDateTime(lead.createdAt)}
                </p>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-white/80 px-4 py-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Product</p>
                  <p className="mt-1">
                    {leadProductLabels.get(lead.productId) ?? lead.productId}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-white/80 px-4 py-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">
                    Inferred interest
                  </p>
                  <p className="mt-1">
                    {lead.inferredInterest ?? "Not captured yet"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-border/70 bg-white/80 px-4 py-4 text-sm leading-6 text-muted-foreground">
                <p className="font-medium text-foreground">Conversation summary</p>
                <p className="mt-2">
                  {lead.aiSummary ?? "Summary not available yet."}
                </p>
                {lead.nextBestProduct ? (
                  <p className="mt-3">
                    Suggested next product:{" "}
                    <span className="font-medium text-foreground">
                      {lead.nextBestProduct}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
