import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  CreateProductInput,
  UpdateProductInput,
} from "@/lib/schemas";
import type { Database } from "@/types/database";
import type { Product } from "@/types/domain";

type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductScopeRow = Pick<ProductRow, "id" | "store_id">;
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];
type ProductComparisonRow = Pick<
  ProductRow,
  "id" | "name" | "brand" | "category" | "comparison_snippet_markdown"
>;

const PRODUCT_COLUMNS = [
  "id",
  "store_id",
  "name",
  "brand",
  "category",
  "details_markdown",
  "comparison_snippet_markdown",
  "idle_media_url",
  "created_at",
  "updated_at",
].join(", ");

export interface ProductScope {
  id: string;
  storeId: string;
}

export interface ComparisonProduct {
  brand: string;
  category: string;
  comparisonSnippetMarkdown: string;
  id: string;
  name: string;
}

function asProductRow(value: unknown) {
  return value as ProductRow;
}

function asProductRows(value: unknown) {
  return value as ProductRow[];
}

function asProductScopeRow(value: unknown) {
  return value as ProductScopeRow;
}

function asProductComparisonRows(value: unknown) {
  return value as ProductComparisonRow[];
}

export function mapProductRow(row: ProductRow): Product {
  return {
    brand: row.brand,
    category: row.category,
    comparisonSnippetMarkdown: row.comparison_snippet_markdown,
    createdAt: row.created_at,
    detailsMarkdown: row.details_markdown,
    id: row.id,
    idleMediaUrl: row.idle_media_url,
    name: row.name,
    storeId: row.store_id,
    updatedAt: row.updated_at,
  };
}

export function mapComparisonProductRow(
  row: ProductComparisonRow,
): ComparisonProduct {
  return {
    brand: row.brand,
    category: row.category,
    comparisonSnippetMarkdown: row.comparison_snippet_markdown,
    id: row.id,
    name: row.name,
  };
}

export async function createProductForStore(
  storeId: string,
  input: CreateProductInput,
) {
  const supabase = createAdminSupabaseClient();
  const insertPayload: ProductInsert = {
    brand: input.brand,
    category: input.category,
    comparison_snippet_markdown: input.comparisonSnippetMarkdown,
    details_markdown: input.detailsMarkdown,
    idle_media_url: input.idleMediaUrl,
    name: input.name,
    store_id: storeId,
  };

  const { data, error } = await supabase
    .from("products")
    .insert(insertPayload)
    .select(PRODUCT_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Failed to create product: ${error.message}`);
  }

  return mapProductRow(asProductRow(data));
}

export async function findProductScopeById(productId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, store_id")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up product scope: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: asProductScopeRow(data).id,
    storeId: asProductScopeRow(data).store_id,
  } satisfies ProductScope;
}

export async function getProductById(productId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load product: ${error.message}`);
  }

  return data ? mapProductRow(asProductRow(data)) : null;
}

export async function listProductsByStore(storeId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("store_id", storeId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load products: ${error.message}`);
  }

  return asProductRows(data).map(mapProductRow);
}

export async function listComparisonProductsByStore(
  storeId: string,
  activeProductId: string,
) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, brand, category, comparison_snippet_markdown")
    .eq("store_id", storeId)
    .neq("id", activeProductId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load comparison products: ${error.message}`);
  }

  return asProductComparisonRows(data).map(mapComparisonProductRow);
}

export async function updateProductForStore(
  productId: string,
  storeId: string,
  input: UpdateProductInput,
) {
  const supabase = createAdminSupabaseClient();
  const updatePayload: ProductUpdate = {};

  if (input.brand !== undefined) {
    updatePayload.brand = input.brand;
  }

  if (input.category !== undefined) {
    updatePayload.category = input.category;
  }

  if (input.comparisonSnippetMarkdown !== undefined) {
    updatePayload.comparison_snippet_markdown = input.comparisonSnippetMarkdown;
  }

  if (input.detailsMarkdown !== undefined) {
    updatePayload.details_markdown = input.detailsMarkdown;
  }

  if (input.idleMediaUrl !== undefined) {
    updatePayload.idle_media_url = input.idleMediaUrl;
  }

  if (input.name !== undefined) {
    updatePayload.name = input.name;
  }

  const { data, error } = await supabase
    .from("products")
    .update(updatePayload)
    .eq("id", productId)
    .eq("store_id", storeId)
    .select(PRODUCT_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update product: ${error.message}`);
  }

  return data ? mapProductRow(asProductRow(data)) : null;
}
