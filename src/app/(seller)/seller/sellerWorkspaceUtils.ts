import type { Product } from "@/types/domain";

export interface ProductFormState {
  brand: string;
  category: string;
  comparisonSnippetMarkdown: string;
  detailsMarkdown: string;
  idleMediaUrl: string;
  name: string;
  sourceUrls: string[];
}

export const EMPTY_PRODUCT_FORM: ProductFormState = {
  brand: "",
  category: "",
  comparisonSnippetMarkdown: "",
  detailsMarkdown: "",
  idleMediaUrl: "",
  name: "",
  sourceUrls: [],
};

export function toProductFormState(product: Product): ProductFormState {
  return {
    brand: product.brand,
    category: product.category,
    comparisonSnippetMarkdown: product.comparisonSnippetMarkdown,
    detailsMarkdown: product.detailsMarkdown,
    idleMediaUrl: product.idleMediaUrl,
    name: product.name,
    sourceUrls: product.sourceUrls,
  };
}
