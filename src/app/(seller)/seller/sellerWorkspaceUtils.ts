import type { Lead, Product } from "@/types/domain";

export interface ProductFormState {
  brand: string;
  category: string;
  comparisonSnippetMarkdown: string;
  detailsMarkdown: string;
  idleMediaUrl: string;
  name: string;
}

export interface LaunchState {
  productId: string;
  url: string;
}

export const EMPTY_PRODUCT_FORM: ProductFormState = {
  brand: "",
  category: "",
  comparisonSnippetMarkdown: "",
  detailsMarkdown: "",
  idleMediaUrl: "",
  name: "",
};

export function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function toProductFormState(product: Product): ProductFormState {
  return {
    brand: product.brand,
    category: product.category,
    comparisonSnippetMarkdown: product.comparisonSnippetMarkdown,
    detailsMarkdown: product.detailsMarkdown,
    idleMediaUrl: product.idleMediaUrl,
    name: product.name,
  };
}

export function getProductLabel(product: Product) {
  return `${product.brand} ${product.name}`;
}

export function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

export function upsertProduct(products: Product[], nextProduct: Product) {
  const remainingProducts = products.filter((product) => product.id !== nextProduct.id);

  return [nextProduct, ...remainingProducts].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export function buildLeadProductLabels(products: Product[]) {
  return new Map(products.map((product) => [product.id, getProductLabel(product)]));
}

export function sortLeads(leads: Lead[]) {
  return [...leads].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}
