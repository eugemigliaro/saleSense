"use client";

import { ArrowUpRight, Loader2, MonitorSmartphone, Package, PencilLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Product } from "@/types/domain";

import {
  formatDateTime,
  getProductLabel,
  type LaunchState,
  truncateText,
} from "./sellerWorkspaceUtils";

interface ProductCatalogPanelProps {
  launchingProductId: string | null;
  launchState: LaunchState | null;
  products: Product[];
  onEdit: (product: Product) => void;
  onLaunch: (product: Product) => void | Promise<void>;
}

export function ProductCatalogPanel({
  launchingProductId,
  launchState,
  products,
  onEdit,
  onLaunch,
}: ProductCatalogPanelProps) {
  return (
    <div className="seller-panel rounded-[1.75rem] p-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
            Current products
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {products.length} product{products.length === 1 ? "" : "s"}
          </h2>
        </div>
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <Package className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {products.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-white/55 px-5 py-6 text-sm leading-6 text-muted-foreground">
            No products yet. Create one, then launch a live kiosk session
            from this page.
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="rounded-[1.5rem] border border-border/80 bg-white/70 p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.45)]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                    {product.category}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                    {getProductLabel(product)}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {truncateText(product.comparisonSnippetMarkdown, 180)}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    Updated {formatDateTime(product.updatedAt)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-border/80 bg-white/80"
                    onClick={() => onEdit(product)}
                  >
                    <PencilLine className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void onLaunch(product)}
                    disabled={launchingProductId === product.id}
                    className="rounded-xl"
                  >
                    {launchingProductId === product.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MonitorSmartphone className="mr-2 h-4 w-4" />
                    )}
                    Launch kiosk
                  </Button>
                </div>
              </div>

              {launchState?.productId === product.id ? (
                <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/6 px-4 py-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">
                    Live session ready
                  </p>
                  <a
                    href={launchState.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    Open {getProductLabel(product)} in kiosk mode
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
