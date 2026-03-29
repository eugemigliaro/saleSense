"use client";

import { Mail, Phone } from "lucide-react";

import type { Lead, Product } from "@/types/domain";

interface SellerLeadsViewProps {
  leads: Lead[];
  products: Product[];
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
  products,
}: SellerLeadsViewProps) {
  const productNameById = new Map(products.map((product) => [product.id, product.name]));

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Leads</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Captured contacts and conversation takeaways from active kiosk sessions.
          </p>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-8 text-sm text-muted-foreground">
          No leads captured yet. New kiosk conversations will populate this workspace.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {leads.map((lead) => {
            const productName = productNameById.get(lead.productId) ?? "Unknown product";

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
                    <p className="mt-1 text-sm text-muted-foreground">
                      Captured for {productName}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatLeadDate(lead.createdAt)}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    {lead.inferredInterest ?? "Interest pending"}
                  </span>
                  {lead.nextBestProduct ? (
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                      Next best: {lead.nextBestProduct}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary/80" />
                    <span className="truncate">{lead.customerEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary/80" />
                    <span>{lead.customerPhone ?? "Phone not provided"}</span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-muted/60 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    AI summary
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground/80">
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
