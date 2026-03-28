import "server-only";

import { generateLeadInsights } from "@/lib/ai/leadInsights";
import {
  getChatSessionContextById,
  listChatMessagesBySessionId,
} from "@/lib/chat-sessions";
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

interface LeadInsightValues {
  aiSummary: string | null;
  inferredInterest: string | null;
  nextBestProduct: string | null;
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

async function resolveLeadInsightValues(
  input: CreateLeadInput,
  storeId: string,
): Promise<LeadInsightValues> {
  const fallbackValues: LeadInsightValues = {
    aiSummary: input.aiSummary,
    inferredInterest: input.inferredInterest,
    nextBestProduct: input.nextBestProduct,
  };

  if (!input.chatSessionId) {
    return fallbackValues;
  }

  try {
    const chatSessionContext = await getChatSessionContextById(input.chatSessionId);

    if (!chatSessionContext) {
      return fallbackValues;
    }

    if (
      chatSessionContext.session.productId !== input.productId ||
      chatSessionContext.session.storeId !== storeId
    ) {
      return fallbackValues;
    }

    const history = await listChatMessagesBySessionId(input.chatSessionId, 24);

    if (history.length === 0) {
      return fallbackValues;
    }

    const leadInsights = await generateLeadInsights({
      activeProduct: chatSessionContext.product,
      history,
      storeId,
    });

    return {
      aiSummary: leadInsights.aiSummary ?? fallbackValues.aiSummary,
      inferredInterest:
        leadInsights.inferredInterest ?? fallbackValues.inferredInterest,
      nextBestProduct:
        leadInsights.nextBestProduct ?? fallbackValues.nextBestProduct,
    };
  } catch (error) {
    console.error("Failed to enrich lead from chat transcript.", error);

    return fallbackValues;
  }
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

  const leadInsightValues = await resolveLeadInsightValues(
    input,
    asProductScopeRow(product).store_id,
  );

  const insertPayload: LeadInsert = {
    ai_summary: leadInsightValues.aiSummary,
    customer_email: input.customerEmail,
    customer_name: input.customerName,
    customer_phone: input.customerPhone,
    inferred_interest: leadInsightValues.inferredInterest,
    next_best_product: leadInsightValues.nextBestProduct,
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
