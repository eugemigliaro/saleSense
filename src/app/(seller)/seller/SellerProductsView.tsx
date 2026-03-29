"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink, Package, Plus } from "lucide-react";

import type { Product } from "@/types/domain";

interface SellerProductsViewProps {
  launchingProductId: string | null;
  onLaunch: (product: Product) => void | Promise<void>;
  products: Product[];
}

export function SellerProductsView({
  launchingProductId,
  onLaunch,
  products,
}: SellerProductsViewProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Products</h2>
        <Link
          href="/seller/products/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-4 py-5 text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
            No products yet. Add one to launch a kiosk session.
          </div>
        ) : (
          products.map((product) => (
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
                <div>
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {product.brand} · {product.category}
                  </p>
                </div>
                <div className="mt-auto flex items-center gap-2 pt-4">
                  <Link
                    href={`/seller/products/${product.id}`}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => void onLaunch(product)}
                    disabled={launchingProductId === product.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {launchingProductId === product.id ? "Launching" : "Launch"}
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </section>
  );
}
