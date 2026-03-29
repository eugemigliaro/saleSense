"use client";

import { motion } from "framer-motion";
import { Monitor, Package, Users } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";

import { SlideTabs } from "@/components/ui/slide-tabs";
import type { Lead, Product } from "@/types/domain";

import { SellerDashboardView } from "./SellerDashboardView";
import { SellerLeadsView } from "./SellerLeadsView";
import { SellerProductsView } from "./SellerProductsView";
import { fetchLeadsRequest, launchProductRequest } from "./workspaceApi";

interface SellerWorkspaceProps {
  activeDevicesCount: number;
  initialLeads: Lead[];
  initialProducts: Product[];
}
type SellerWorkspaceTab = "products" | "dashboard" | "leads";

export default function SellerWorkspace({
  activeDevicesCount,
  initialLeads,
  initialProducts,
}: SellerWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<SellerWorkspaceTab>("products");
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
  const tabs: Array<{ key: SellerWorkspaceTab; label: string }> = [
    { key: "products", label: "Products" },
    { key: "dashboard", label: "Dashboard" },
    { key: "leads", label: "Leads" },
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      {errorMessage ? (
        <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 ui-text-small text-destructive">
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
                <p className="font-display ui-text-large font-bold">{stat.value}</p>
                <p className="ui-text-small text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mb-6 flex justify-center">
        <SlideTabs
          items={tabs}
          activeKey={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <div className="min-h-[32rem]">
        {activeTab === "products" ? (
          <SellerProductsView
            launchingProductId={launchingProductId}
            onLaunch={handleLaunch}
            products={initialProducts}
          />
        ) : null}

        {activeTab === "dashboard" ? (
          <SellerDashboardView leads={leads} products={initialProducts} />
        ) : null}

        {activeTab === "leads" ? (
          <SellerLeadsView leads={leads} products={initialProducts} />
        ) : null}
      </div>
    </main>
  );
}
