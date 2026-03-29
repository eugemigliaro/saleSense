import { describe, expect, it } from "vitest";

import { mapConversationAnalyticsRow } from "@/lib/conversationAnalytics";
import type { Database } from "@/types/database";

type ConversationAnalyticsRow =
  Database["public"]["Tables"]["conversation_analytics"]["Row"];

describe("mapConversationAnalyticsRow", () => {
  it("maps a database conversation analytics row into the domain shape", () => {
    const row: ConversationAnalyticsRow = {
      buy_probability: 0.91,
      chat_session_id: "33333333-3333-4333-8333-333333333333",
      conversation_duration_seconds: 420,
      conversation_ended_at: "2026-03-28T10:07:00.000Z",
      conversation_started_at: "2026-03-28T10:00:00.000Z",
      created_at: "2026-03-28T10:07:00.000Z",
      faq_examples: ["How long does the battery last?"],
      faq_topics: ["Battery life"],
      feedback_score: 5,
      feedback_sentiment: "positive",
      manual_sale_confirmed: true,
      message_count: 12,
      product_id: "11111111-1111-4111-8111-111111111111",
      redirect_target_product_id: null,
      redirected_to_other_product: false,
      sale_outcome: "store_confirmed",
      store_id: "store-1",
      updated_at: "2026-03-28T10:07:00.000Z",
    };

    expect(mapConversationAnalyticsRow(row)).toEqual({
      buyProbability: 0.91,
      chatSessionId: "33333333-3333-4333-8333-333333333333",
      durationSeconds: 420,
      endedAt: "2026-03-28T10:07:00.000Z",
      faqExamples: ["How long does the battery last?"],
      faqTopics: ["Battery life"],
      feedbackScore: 5,
      feedbackSentiment: "positive",
      manualSaleConfirmed: true,
      messageCount: 12,
      productId: "11111111-1111-4111-8111-111111111111",
      redirectedToOtherProduct: false,
      redirectTargetProductId: null,
      saleOutcome: "store_confirmed",
      startedAt: "2026-03-28T10:00:00.000Z",
      storeId: "store-1",
    });
  });
});
