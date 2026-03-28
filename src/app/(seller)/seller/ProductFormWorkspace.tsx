"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Product } from "@/types/domain";

import {
  EMPTY_PRODUCT_FORM,
  toProductFormState,
  type ProductFormState,
} from "./sellerWorkspaceUtils";
import { saveProductRequest } from "./workspaceApi";

interface ProductFormWorkspaceProps {
  initialProduct?: Product | null;
}

export function ProductFormWorkspace({
  initialProduct = null,
}: ProductFormWorkspaceProps) {
  const isEdit = Boolean(initialProduct);
  const router = useRouter();
  const [formState, setFormState] = useState<ProductFormState>(
    initialProduct ? toProductFormState(initialProduct) : EMPTY_PRODUCT_FORM,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function updateField<K extends keyof ProductFormState>(
    field: K,
    value: ProductFormState[K],
  ) {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSaving(true);

    try {
      await saveProductRequest(formState, initialProduct?.id ?? null);
      router.push("/seller");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save the product.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-4 border-b border-border px-6 py-4">
        <Link
          href="/seller"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-lg font-semibold">
          {isEdit ? `Edit ${initialProduct?.name}` : "New Product"}
        </h1>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        {errorMessage ? (
          <div className="mb-5 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Product Name</label>
              <input
                value={formState.name}
                onChange={(event) => updateField("name", event.target.value)}
                required
                placeholder="iPhone 16 Pro Max"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Brand</label>
              <input
                value={formState.brand}
                onChange={(event) => updateField("brand", event.target.value)}
                required
                placeholder="Apple"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Category</label>
            <input
              value={formState.category}
              onChange={(event) => updateField("category", event.target.value)}
              required
              placeholder="Smartphones"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Product Details (Markdown)</label>
            <textarea
              value={formState.detailsMarkdown}
              onChange={(event) => updateField("detailsMarkdown", event.target.value)}
              rows={10}
              required
              placeholder="# Product Name&#10;&#10;Write detailed product information here..."
              className={`${inputClass} resize-y font-mono text-xs`}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Comparison Snippet</label>
            <textarea
              value={formState.comparisonSnippetMarkdown}
              onChange={(event) =>
                updateField("comparisonSnippetMarkdown", event.target.value)
              }
              rows={3}
              required
              placeholder="Short summary used by other product agents for comparison..."
              className={`${inputClass} resize-y`}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Idle Media URL</label>
            <input
              value={formState.idleMediaUrl}
              onChange={(event) => updateField("idleMediaUrl", event.target.value)}
              required
              placeholder="https://example.com/demo.jpg"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
          </button>
        </motion.form>
      </main>
    </div>
  );
}
