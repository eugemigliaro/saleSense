import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { CreateLeadInput } from "@/lib/schemas";
import type { Database } from "@/types/database";
import type { Lead } from "@/types/domain";

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type ProductScopeRow = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  "id" | "store_id"
>;

const LEAD_COLUMNS = [
  "id",
  "store_id",
  "product_id",
  "customer_name",
  "customer_email",
  "customer_phone",
  "ai_summary",
  "inferred_interest",
  "next_best_product",
  "created_at",
].join(", ");

function asLeadRow(value: unknown) {
  return value as LeadRow;
}

function asLeadRows(value: unknown) {
  return value as LeadRow[];
}

function asProductScopeRow(value: unknown) {
  return value as ProductScopeRow;
}

export function mapLeadRow(row: LeadRow): Lead {
  return {
    aiSummary: row.ai_summary,
    createdAt: row.created_at,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    id: row.id,
    inferredInterest: row.inferred_interest,
    nextBestProduct: row.next_best_product,
    productId: row.product_id,
    storeId: row.store_id,
  };
}

export async function createLeadForProduct(input: CreateLeadInput) {
  const supabase = createAdminSupabaseClient();
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, store_id")
    .eq("id", input.productId)
    .maybeSingle();

  if (productError) {
    throw new Error(
      `Failed to look up product for lead creation: ${productError.message}`,
    );
  }

  if (!product) {
    return null;
  }

  const insertPayload: LeadInsert = {
    ai_summary: input.aiSummary,
    customer_email: input.customerEmail,
    customer_name: input.customerName,
    customer_phone: input.customerPhone,
    inferred_interest: input.inferredInterest,
    next_best_product: input.nextBestProduct,
    product_id: input.productId,
    store_id: asProductScopeRow(product).store_id,
  };

  const { data, error } = await supabase
    .from("leads")
    .insert(insertPayload)
    .select(LEAD_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Failed to create lead: ${error.message}`);
  }

  return mapLeadRow(asLeadRow(data));
}

export async function listLeadsByStore(storeId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load leads: ${error.message}`);
  }

  return asLeadRows(data).map(mapLeadRow);
}
