"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useEffectEvent, useMemo, useState } from "react";

import { SlideTabs } from "@/components/ui/slide-tabs";
import type {
  ConversationAnalytics,
  Lead,
  MonitoredDeviceSession,
  Product,
} from "@/types/domain";

import { LaunchDeviceDialog } from "./LaunchDeviceDialog";
import { ProductSessionsDialog } from "./ProductSessionsDialog";
import { SellerDashboardView } from "./SellerDashboardView";
import { SellerLeadsView } from "./SellerLeadsView";
import { SellerProductsView } from "./SellerProductsView";
import { buildMockConversationAnalytics } from "./sellerAnalytics";
import {
  dismissDeviceSessionRequest,
  fetchDeviceSessionsRequest,
  fetchLeadsRequest,
  launchProductRequest,
  updateLeadSaleConfirmationRequest,
} from "./workspaceApi";

interface SellerWorkspaceProps {
  initialAnalytics: ConversationAnalytics[];
  initialDeviceSessions: MonitoredDeviceSession[];
  initialLeads: Lead[];
  initialProducts: Product[];
}

type SellerWorkspaceTab = "products" | "dashboard" | "leads";

function getAttentionCountByProduct(deviceSessions: MonitoredDeviceSession[]) {
  const counts = new Map<string, number>();

  for (const session of deviceSessions) {
    if (session.attentionState !== "attention-needed") {
      continue;
    }

    counts.set(session.productId, (counts.get(session.productId) ?? 0) + 1);
  }

  return counts;
}

function getSessionCountByProduct(deviceSessions: MonitoredDeviceSession[]) {
  const counts = new Map<string, number>();

  for (const session of deviceSessions) {
    counts.set(session.productId, (counts.get(session.productId) ?? 0) + 1);
  }

  return counts;
}

export default function SellerWorkspace({
  initialAnalytics,
  initialDeviceSessions,
  initialLeads,
  initialProducts,
}: SellerWorkspaceProps) {
  const usesPersistedAnalytics = initialAnalytics.length > 0;
  const [activeTab, setActiveTab] = useState<SellerWorkspaceTab>("products");
  const [deviceSessions, setDeviceSessions] = useState(initialDeviceSessions);
  const [leads, setLeads] = useState(initialLeads);
  const [analytics, setAnalytics] = useState<ConversationAnalytics[]>(
    usesPersistedAnalytics
      ? initialAnalytics
      : buildMockConversationAnalytics(initialLeads, initialProducts),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [launchingProduct, setLaunchingProduct] = useState<Product | null>(null);
  const [launchLabel, setLaunchLabel] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);
  const [sessionProductId, setSessionProductId] = useState<string | null>(null);
  const [isDismissingSessionId, setIsDismissingSessionId] = useState<string | null>(
    null,
  );
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);

  const tabs: Array<{ key: SellerWorkspaceTab; label: string }> = [
    { key: "products", label: "Products" },
    { key: "dashboard", label: "Dashboard" },
    { key: "leads", label: "Leads" },
  ];

  function syncAnalyticsWithLeads(
    nextAnalytics: ConversationAnalytics[],
    nextLeads: Lead[],
  ) {
    const saleConfirmationByChatSessionId = new Map(
      nextLeads
        .filter((lead) => Boolean(lead.chatSessionId))
        .map((lead) => [lead.chatSessionId as string, lead.isSaleConfirmed]),
    );

    return nextAnalytics.map((entry) => ({
      ...entry,
      manualSaleConfirmed:
        saleConfirmationByChatSessionId.get(entry.chatSessionId) ??
        entry.manualSaleConfirmed,
    }));
  }

  const attentionCountByProduct = useMemo(
    () => getAttentionCountByProduct(deviceSessions),
    [deviceSessions],
  );
  const sessionCountByProduct = useMemo(
    () => getSessionCountByProduct(deviceSessions),
    [deviceSessions],
  );
  const activeSessionProduct = useMemo(
    () =>
      sessionProductId
        ? initialProducts.find((product) => product.id === sessionProductId) ?? null
        : null,
    [initialProducts, sessionProductId],
  );
  const sessionsForActiveProduct = useMemo(
    () =>
      sessionProductId
        ? deviceSessions.filter((session) => session.productId === sessionProductId)
        : [],
    [deviceSessions, sessionProductId],
  );

  async function loadDeviceSessions() {
    try {
      const nextDeviceSessions = await fetchDeviceSessionsRequest();
      setDeviceSessions(nextDeviceSessions);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to refresh device sessions.",
      );
    }
  }

  async function loadLeads() {
    try {
      const nextLeads = await fetchLeadsRequest();
      setLeads(nextLeads);

      if (usesPersistedAnalytics) {
        setAnalytics((currentAnalytics) =>
          syncAnalyticsWithLeads(currentAnalytics, nextLeads),
        );
      } else {
        setAnalytics(buildMockConversationAnalytics(nextLeads, initialProducts));
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to refresh leads.",
      );
    }
  }

  async function handleLaunchConfirm() {
    if (!launchingProduct) {
      return;
    }

    setErrorMessage(null);
    setIsLaunching(true);

    try {
      const launchResult = await launchProductRequest(
        launchingProduct.id,
        launchLabel.trim() || undefined,
      );

      window.location.assign(launchResult.kioskUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to set up this device.",
      );
      setIsLaunching(false);
    }
  }

  async function handleDismissSession(deviceSessionId: string) {
    setErrorMessage(null);
    setIsDismissingSessionId(deviceSessionId);

    try {
      await dismissDeviceSessionRequest(deviceSessionId);
      await loadDeviceSessions();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to dismiss the device alert.",
      );
    } finally {
      setIsDismissingSessionId(null);
    }
  }

  async function handleToggleLeadSaleConfirmation(targetLead: Lead) {
    setErrorMessage(null);
    setUpdatingLeadId(targetLead.id);

    const previousLeads = leads;
    const previousAnalytics = analytics;
    const nextSaleConfirmedState = !targetLead.isSaleConfirmed;
    const nextLeads = leads.map((lead) =>
      lead.id === targetLead.id
        ? { ...lead, isSaleConfirmed: nextSaleConfirmedState }
        : lead,
    );

    setLeads(nextLeads);

    if (usesPersistedAnalytics) {
      setAnalytics(syncAnalyticsWithLeads(previousAnalytics, nextLeads));
    } else {
      setAnalytics(buildMockConversationAnalytics(nextLeads, initialProducts));
    }

    try {
      const updatedLead = await updateLeadSaleConfirmationRequest(
        targetLead.id,
        nextSaleConfirmedState,
      );
      const syncedLeads = nextLeads.map((lead) =>
        lead.id === updatedLead.id ? updatedLead : lead,
      );

      setLeads(syncedLeads);

      if (usesPersistedAnalytics) {
        setAnalytics((currentAnalytics) =>
          syncAnalyticsWithLeads(currentAnalytics, syncedLeads),
        );
      } else {
        setAnalytics(buildMockConversationAnalytics(syncedLeads, initialProducts));
      }
    } catch (error) {
      setLeads(previousLeads);
      setAnalytics(previousAnalytics);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to update lead sale confirmation.",
      );
    } finally {
      setUpdatingLeadId(null);
    }
  }

  const refreshDeviceSessions = useEffectEvent(() => {
    void loadDeviceSessions();
  });

  const refreshLeads = useEffectEvent(() => {
    void loadLeads();
  });

  useEffect(() => {
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshDeviceSessions();
      }
    }, 5000);

    return () => {
      window.clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    function handleWindowFocus() {
      void refreshLeads();
      void refreshDeviceSessions();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshLeads();
        void refreshDeviceSessions();
      }
    }

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <>
      <main className="mx-auto max-w-5xl px-6 py-8">
        {errorMessage ? (
          <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 ui-text-small text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <div className="mb-6 flex justify-center">
          <SlideTabs items={tabs} activeKey={activeTab} onChange={setActiveTab} />
        </div>

        <div className="min-h-[32rem]">
          {activeTab === "products" ? (
            <SellerProductsView
              attentionCountByProduct={attentionCountByProduct}
              launchingProductId={isLaunching ? launchingProduct?.id ?? null : null}
              onLaunch={(product) => {
                setErrorMessage(null);
                setLaunchLabel("");
                setLaunchingProduct(product);
              }}
              onOpenSessions={(productId) => {
                setErrorMessage(null);
                setSessionProductId(productId);
              }}
              products={initialProducts}
              sessionCountByProduct={sessionCountByProduct}
            />
          ) : null}

          {activeTab === "dashboard" ? (
            <SellerDashboardView
              analytics={analytics}
              capturedContactCount={leads.length}
              confirmedSaleCount={leads.filter((lead) => lead.isSaleConfirmed).length}
              products={initialProducts}
            />
          ) : null}

          {activeTab === "leads" ? (
            <SellerLeadsView
              leads={leads}
              onToggleSaleConfirmation={handleToggleLeadSaleConfirmation}
              products={initialProducts}
              updatingLeadId={updatingLeadId}
            />
          ) : null}
        </div>
      </main>

      <AnimatePresence>
        {launchingProduct ? (
          <LaunchDeviceDialog
            errorMessage={errorMessage}
            isLaunching={isLaunching}
            label={launchLabel}
            onClose={() => {
              if (isLaunching) {
                return;
              }

              setLaunchingProduct(null);
              setLaunchLabel("");
            }}
            onConfirm={handleLaunchConfirm}
            onLabelChange={setLaunchLabel}
            productName={launchingProduct.name}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {activeSessionProduct ? (
          <ProductSessionsDialog
            isDismissingSessionId={isDismissingSessionId}
            onClose={() => setSessionProductId(null)}
            onDismissSession={handleDismissSession}
            productName={activeSessionProduct.name}
            sessions={sessionsForActiveProduct}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
