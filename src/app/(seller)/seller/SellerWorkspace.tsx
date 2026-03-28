"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink, Monitor, Package, Plus, Users } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";

import type { Lead, Product } from "@/types/domain";

import { fetchLeadsRequest, launchProductRequest } from "./workspaceApi";

interface SellerWorkspaceProps {
  activeDevicesCount: number;
  initialLeads: Lead[];
  initialProducts: Product[];
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

export default function SellerWorkspace({
  activeDevicesCount,
  initialLeads,
  initialProducts,
}: SellerWorkspaceProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [activeDevices, setActiveDevices] = useState(activeDevicesCount);
  const [launchingProductId, setLaunchingProductId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLaunch(product: Product) {
    setErrorMessage(null);
    setLaunchingProductId(product.id);

    try {
      const deviceSession = await launchProductRequest(product.id);
      setActiveDevices((currentCount) => currentCount + 1);
      const nextUrl = `/kiosk?session=${deviceSession.id}`;
      const kioskTab = window.open(nextUrl, "_blank", "noopener,noreferrer");

      if (kioskTab) {
        kioskTab.focus();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to launch the kiosk session.",
      );
    } finally {
      setLaunchingProductId(null);
    }
  }

  const refreshLeads = useEffectEvent(async () => {
    setErrorMessage(null);

    try {
      const nextLeads = await fetchLeadsRequest();
      setLeads(nextLeads);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to refresh leads.",
      );
    }
  });

  useEffect(() => {
    function handleWindowFocus() {
      void refreshLeads();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshLeads();
      }
    }

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const stats = [
    { label: "Products", value: initialProducts.length, icon: Package },
    { label: "Active Devices", value: activeDevices, icon: Monitor },
    { label: "Leads Captured", value: leads.length, icon: Users },
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      {errorMessage ? (
        <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <stat.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-display text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <section className="mb-10">
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

        <div className="space-y-3">
          {initialProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-4 py-5 text-sm text-muted-foreground">
              No products yet. Add one to launch a kiosk session.
            </div>
          ) : (
            initialProducts.map((product) => (
              <motion.div
                key={product.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div>
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {product.brand} · {product.category}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/seller/products/${product.id}`}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleLaunch(product)}
                    disabled={launchingProductId === product.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {launchingProductId === product.id ? "Launching" : "Launch"}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">Recent Leads</h2>
        <div className="space-y-3">
          {leads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-4 py-5 text-sm text-muted-foreground">
              No leads captured yet.
            </div>
          ) : (
            leads.map((lead) => (
              <div key={lead.id} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{lead.customerName}</h3>
                    <p className="text-sm text-muted-foreground">{lead.customerEmail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatLeadDate(lead.createdAt)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {lead.aiSummary ?? "Summary not available yet."}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {lead.inferredInterest ?? "Interest pending"}
                  </span>
                  {lead.nextBestProduct ? (
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                      Alt: {lead.nextBestProduct}
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
