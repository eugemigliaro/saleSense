"use client";

import { Plus, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { ProductFormState } from "./sellerWorkspaceUtils";

interface ProductEditorPanelProps {
  editingProductId: string | null;
  isSavingProduct: boolean;
  productForm: ProductFormState;
  onFieldChange: (field: keyof ProductFormState, value: string) => void;
  onReset: () => void;
  onSave: () => void | Promise<void>;
}

export function ProductEditorPanel({
  editingProductId,
  isSavingProduct,
  productForm,
  onFieldChange,
  onReset,
  onSave,
}: ProductEditorPanelProps) {
  return (
    <div className="seller-panel rounded-[1.75rem] p-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
            Product authoring
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {editingProductId ? "Edit product" : "Add product"}
          </h2>
        </div>

        {editingProductId ? (
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl"
            onClick={onReset}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel edit
          </Button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="product-name">Product name</Label>
          <Input
            id="product-name"
            value={productForm.name}
            onChange={(event) => onFieldChange("name", event.target.value)}
            placeholder="iPhone Demo"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-brand">Brand</Label>
          <Input
            id="product-brand"
            value={productForm.brand}
            onChange={(event) => onFieldChange("brand", event.target.value)}
            placeholder="Apple"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-category">Category</Label>
          <Input
            id="product-category"
            value={productForm.category}
            onChange={(event) => onFieldChange("category", event.target.value)}
            placeholder="Phone"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-idle-media">Idle media URL</Label>
          <Input
            id="product-idle-media"
            value={productForm.idleMediaUrl}
            onChange={(event) => onFieldChange("idleMediaUrl", event.target.value)}
            placeholder="https://example.com/demo.jpg"
          />
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="product-comparison-snippet">
          Comparison snippet
        </Label>
        <Textarea
          id="product-comparison-snippet"
          rows={4}
          value={productForm.comparisonSnippetMarkdown}
          onChange={(event) =>
            onFieldChange("comparisonSnippetMarkdown", event.target.value)
          }
          placeholder="Designed for customers who care about camera quality and all-day feel."
        />
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="product-details">Details markdown</Label>
        <Textarea
          id="product-details"
          rows={10}
          value={productForm.detailsMarkdown}
          onChange={(event) => onFieldChange("detailsMarkdown", event.target.value)}
          placeholder={`# Product details\n- Bright display\n- Responsive camera controls\n- Strong battery impression`}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() => void onSave()}
          disabled={isSavingProduct}
          className="h-11 rounded-xl px-5"
        >
          {isSavingProduct ? (
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : editingProductId ? (
            <Save className="mr-2 h-4 w-4" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          {editingProductId ? "Save changes" : "Create product"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          className="h-11 rounded-xl border-border/80 bg-white/75 px-5"
        >
          Reset form
        </Button>
      </div>
    </div>
  );
}
