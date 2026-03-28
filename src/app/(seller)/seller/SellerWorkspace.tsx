"use client";

import { useState } from "react";

import { LeadInboxPanel } from "./LeadInboxPanel";
import { ProductCatalogPanel } from "./ProductCatalogPanel";
import { ProductEditorPanel } from "./ProductEditorPanel";
import {
  buildLeadProductLabels,
  EMPTY_PRODUCT_FORM,
  getProductLabel,
  type LaunchState,
  type ProductFormState,
  sortLeads,
  toProductFormState,
  upsertProduct,
} from "./sellerWorkspaceUtils";
import {
  fetchLeadsRequest,
  launchProductRequest,
  saveProductRequest,
} from "./workspaceApi";
import type { Lead, Product } from "@/types/domain";

interface SellerWorkspaceProps {
  initialLeads: Lead[];
  initialProducts: Product[];
  sellerEmail: string | null;
  storeId: string;
}

export default function SellerWorkspace({
  initialLeads,
  initialProducts,
  sellerEmail,
  storeId,
}: SellerWorkspaceProps) {
  const [products, setProducts] = useState(initialProducts);
  const [leads, setLeads] = useState(sortLeads(initialLeads));
  const [productForm, setProductForm] = useState<ProductFormState>(
    EMPTY_PRODUCT_FORM,
  );
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isRefreshingLeads, setIsRefreshingLeads] = useState(false);
  const [launchingProductId, setLaunchingProductId] = useState<string | null>(
    null,
  );
  const [launchState, setLaunchState] = useState<LaunchState | null>(null);

  const leadProductLabels = buildLeadProductLabels(products);

  function resetProductForm() {
    setEditingProductId(null);
    setProductForm(EMPTY_PRODUCT_FORM);
  }

  function updateProductForm<K extends keyof ProductFormState>(
    field: K,
    value: ProductFormState[K],
  ) {
    setProductForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function startEditingProduct(product: Product) {
    setEditingProductId(product.id);
    setProductForm(toProductFormState(product));
    setWorkspaceError(null);
    setWorkspaceNotice(`Editing ${getProductLabel(product)}.`);
  }

  async function handleSaveProduct() {
    setWorkspaceError(null);
    setWorkspaceNotice(null);
    setIsSavingProduct(true);

    try {
      const savedProduct = await saveProductRequest(productForm, editingProductId);

      setProducts((currentProducts) => upsertProduct(currentProducts, savedProduct));
      resetProductForm();
      setWorkspaceNotice(
        editingProductId
          ? `${getProductLabel(savedProduct)} updated.`
          : `${getProductLabel(savedProduct)} created.`,
      );
    } catch (error) {
      setWorkspaceError(
        error instanceof Error ? error.message : "Failed to save the product.",
      );
    } finally {
      setIsSavingProduct(false);
    }
  }

  async function handleLaunchProduct(product: Product) {
    setWorkspaceError(null);
    setWorkspaceNotice(null);
    setLaunchingProductId(product.id);

    try {
      const deviceSession = await launchProductRequest(product.id);
      const nextUrl = `/kiosk?session=${deviceSession.id}`;
      setLaunchState({
        productId: product.id,
        url: nextUrl,
      });
      setWorkspaceNotice(
        `${getProductLabel(product)} launched. Open the live kiosk session.`,
      );

      const kioskTab = window.open(nextUrl, "_blank", "noopener,noreferrer");

      if (kioskTab) {
        kioskTab.focus();
      }
    } catch (error) {
      setWorkspaceError(
        error instanceof Error
          ? error.message
          : "Failed to launch the kiosk session.",
      );
    } finally {
      setLaunchingProductId(null);
    }
  }

  async function handleRefreshLeads() {
    setWorkspaceError(null);
    setWorkspaceNotice(null);
    setIsRefreshingLeads(true);

    try {
      const nextLeads = await fetchLeadsRequest();

      setLeads(sortLeads(nextLeads));
      setWorkspaceNotice("Lead list refreshed.");
    } catch (error) {
      setWorkspaceError(
        error instanceof Error ? error.message : "Failed to refresh leads.",
      );
    } finally {
      setIsRefreshingLeads(false);
    }
  }

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="flex flex-col gap-8">
        <header className="seller-panel seller-hero rounded-[2rem] p-8 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary">
                Seller surface
              </p>
              <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
                Live store workspace for products, launches, and captured leads.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
                This page now uses the real Milestone 1 backend. You can create
                or update products, launch a live kiosk device session, and
                refresh captured leads without leaving the seller route.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-border/70 bg-white/70 px-5 py-4 text-sm shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur">
                <p className="text-muted-foreground">Store scope</p>
                <p className="mt-1 font-semibold text-foreground">{storeId}</p>
              </div>
              <div className="rounded-[1.5rem] border border-border/70 bg-white/70 px-5 py-4 text-sm shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur">
                <p className="text-muted-foreground">Manager</p>
                <p className="mt-1 font-semibold text-foreground">
                  {sellerEmail ?? "Store manager"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {workspaceNotice ? (
          <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {workspaceNotice}
          </div>
        ) : null}
        {workspaceError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {workspaceError}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <ProductEditorPanel
            editingProductId={editingProductId}
            isSavingProduct={isSavingProduct}
            productForm={productForm}
            onFieldChange={updateProductForm}
            onReset={resetProductForm}
            onSave={handleSaveProduct}
          />

          <div className="space-y-6">
            <ProductCatalogPanel
              launchingProductId={launchingProductId}
              launchState={launchState}
              products={products}
              onEdit={startEditingProduct}
              onLaunch={handleLaunchProduct}
            />
            <LeadInboxPanel
              isRefreshingLeads={isRefreshingLeads}
              leadProductLabels={leadProductLabels}
              leads={leads}
              onRefresh={handleRefreshLeads}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
