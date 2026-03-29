"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, Package, Plus, RadioTower } from "lucide-react";

import type { Product } from "@/types/domain";

interface SellerProductsViewProps {
  attentionCountByProduct: Map<string, number>;
  launchingProductId: string | null;
  onLaunch: (product: Product) => void | Promise<void>;
  onOpenSessions: (productId: string) => void | Promise<void>;
  products: Product[];
  sessionCountByProduct: Map<string, number>;
}

export function SellerProductsView({
  attentionCountByProduct,
  launchingProductId,
  onLaunch,
  onOpenSessions,
  products,
  sessionCountByProduct,
}: SellerProductsViewProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display ui-text-large font-semibold">Products</h2>
          <p className="mt-1 ui-text-small text-muted-foreground">
            Set up this device as a kiosk or inspect product sessions that need attention.
          </p>
        </div>
        <Link
          href="/seller/products/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 ui-text-small font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-4 py-5 ui-text-small text-muted-foreground sm:col-span-2 xl:col-span-3">
            No products yet. Add one before setting up a kiosk device.
          </div>
        ) : (
          products.map((product) => {
            const attentionCount = attentionCountByProduct.get(product.id) ?? 0;
            const sessionCount = sessionCountByProduct.get(product.id) ?? 0;

            return (
              <motion.div
                key={product.id}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="aspect-[4/3] overflow-hidden border-b border-border bg-muted/40">
                  {product.idleMediaUrl ? (
                    <div
                      aria-hidden="true"
                      className="h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${product.idleMediaUrl})` }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(37,99,235,0.14),rgba(59,130,246,0.05))]">
                      <Package className="h-8 w-8 text-primary/60" />
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="ui-text-small text-muted-foreground">
                        {product.brand} · {product.category}
                      </p>
                    </div>

                    {attentionCount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 ui-text-small font-medium text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {attentionCount}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                    <Link
                      href={`/seller/products/${product.id}`}
                      className="rounded-lg border border-border px-3 py-1.5 ui-text-small text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => void onLaunch(product)}
                      disabled={launchingProductId === product.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 ui-text-small font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      <RadioTower className="h-3.5 w-3.5" />
                      {launchingProductId === product.id ? "Setting up" : "Set up here"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onOpenSessions(product.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 ui-text-small transition-colors ${
                        attentionCount > 0
                          ? "border-destructive/40 bg-destructive/8 text-destructive"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Sessions{sessionCount > 0 ? ` (${sessionCount})` : ""}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </section>
  );
}
