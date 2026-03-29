"use client";

import { Mail, Phone } from "lucide-react";

import type { Lead, Product } from "@/types/domain";

interface SellerLeadsViewProps {
  leads: Lead[];
  onToggleSaleConfirmation: (lead: Lead) => void | Promise<void>;
  products: Product[];
  updatingLeadId: string | null;
}

function formatLeadDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function SellerLeadsView({
  leads,
  onToggleSaleConfirmation,
  products,
  updatingLeadId,
}: SellerLeadsViewProps) {
  const productNameById = new Map(products.map((product) => [product.id, product.name]));

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display ui-text-large font-semibold">Leads</h2>
          <p className="mt-1 ui-text-small text-muted-foreground">
            Captured contacts and conversation takeaways from active kiosk sessions.
          </p>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-8 ui-text-small text-muted-foreground">
          No leads captured yet. New kiosk conversations will populate this
          workspace.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {leads.map((lead) => {
            const productName = productNameById.get(lead.productId) ?? "Unknown product";
            const isUpdating = updatingLeadId === lead.id;

            return (
              <article
                key={lead.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {lead.customerName || "Unnamed lead"}
                    </h3>
                    <p className="mt-1 ui-text-small text-muted-foreground">
                      Captured for {productName}
                    </p>
                  </div>
                  <span className="ui-text-small text-muted-foreground">
                    {formatLeadDate(lead.createdAt)}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 ui-text-small font-medium text-primary">
                    {lead.inferredInterest ?? "Interest pending"}
                  </span>
                  {lead.nextBestProduct ? (
                    <span className="rounded-full bg-secondary px-2.5 py-1 ui-text-small text-secondary-foreground">
                      Next best: {lead.nextBestProduct}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 ui-text-small text-muted-foreground sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary/80" />
                    <span className="truncate">{lead.customerEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary/80" />
                    <span>{lead.customerPhone ?? "Phone not provided"}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <div>
                    <p className="ui-text-small font-medium text-foreground">
                      Sale outcome
                    </p>
                    <p className="ui-text-small text-muted-foreground">
                      Mark whether this lead ended in a confirmed sale.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onToggleSaleConfirmation(lead)}
                    disabled={isUpdating}
                    className={`rounded-full px-4 py-2 ui-text-small font-medium transition-colors ${
                      lead.isSaleConfirmed
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background text-muted-foreground hover:text-foreground"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {isUpdating
                      ? "Saving..."
                      : lead.isSaleConfirmed
                        ? "Sale confirmed"
                        : "Mark as sold"}
                  </button>
                </div>

                <div className="mt-4 rounded-xl bg-muted/60 px-4 py-3">
                  <p className="ui-text-small font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    AI summary
                  </p>
                  <p className="mt-2 ui-text-small leading-6 text-foreground/80">
                    {lead.aiSummary ?? "Summary not available yet."}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
