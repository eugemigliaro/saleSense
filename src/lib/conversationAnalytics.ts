import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import type {
  ConversationAnalytics,
  ConversationFeedbackSentiment,
  ConversationSaleOutcome,
} from "@/types/domain";

type ConversationAnalyticsRow =
  Database["public"]["Tables"]["conversation_analytics"]["Row"];

const CONVERSATION_ANALYTICS_COLUMNS = [
  "chat_session_id",
  "store_id",
  "product_id",
  "conversation_started_at",
  "conversation_ended_at",
  "conversation_duration_seconds",
  "message_count",
  "buy_probability",
  "sale_outcome",
  "feedback_sentiment",
  "feedback_score",
  "redirected_to_other_product",
  "redirect_target_product_id",
  "faq_topics",
  "faq_examples",
  "manual_sale_confirmed",
].join(", ");

function asConversationAnalyticsRows(value: unknown) {
  return value as ConversationAnalyticsRow[];
}

function isMissingConversationAnalyticsTable(error: {
  code?: string;
  message?: string;
}) {
  if (error.code === "PGRST205") {
    return true;
  }

  return error.message?.includes("conversation_analytics") ?? false;
}

export function mapConversationAnalyticsRow(
  row: ConversationAnalyticsRow,
): ConversationAnalytics {
  return {
    buyProbability: row.buy_probability,
    chatSessionId: row.chat_session_id,
    durationSeconds: row.conversation_duration_seconds,
    endedAt: row.conversation_ended_at,
    faqExamples: row.faq_examples,
    faqTopics: row.faq_topics,
    feedbackScore: row.feedback_score,
    feedbackSentiment:
      row.feedback_sentiment as ConversationFeedbackSentiment | null,
    manualSaleConfirmed: row.manual_sale_confirmed,
    messageCount: row.message_count,
    productId: row.product_id,
    redirectedToOtherProduct: row.redirected_to_other_product,
    redirectTargetProductId: row.redirect_target_product_id,
    saleOutcome: row.sale_outcome as ConversationSaleOutcome,
    startedAt: row.conversation_started_at,
    storeId: row.store_id,
  };
}

export async function listConversationAnalyticsByStore(storeId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("conversation_analytics")
    .select(CONVERSATION_ANALYTICS_COLUMNS)
    .eq("store_id", storeId)
    .order("conversation_started_at", { ascending: false });

  if (error) {
    if (isMissingConversationAnalyticsTable(error)) {
      return [];
    }

    throw new Error(`Failed to load conversation analytics: ${error.message}`);
  }

  return asConversationAnalyticsRows(data).map(mapConversationAnalyticsRow);
}

export async function updateManualSaleConfirmationByChatSessionId(
  chatSessionId: string,
  storeId: string,
  manualSaleConfirmed: boolean,
) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("conversation_analytics")
    .update({
      manual_sale_confirmed: manualSaleConfirmed,
    })
    .eq("chat_session_id", chatSessionId)
    .eq("store_id", storeId);

  if (error && !isMissingConversationAnalyticsTable(error)) {
    throw new Error(
      `Failed to update conversation analytics sale confirmation: ${error.message}`,
    );
  }
}
