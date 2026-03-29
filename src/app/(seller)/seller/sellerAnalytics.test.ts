import { describe, expect, it } from "vitest";

import type { ConversationAnalytics, Product } from "@/types/domain";

import { buildSellerDashboardMetrics } from "./sellerAnalytics";

describe("buildSellerDashboardMetrics", () => {
  it("aggregates FAQ topics, star feedback, and manual sales from conversation analytics", () => {
    const products: Product[] = [
      {
        brand: "Apple",
        category: "Phone",
        comparisonSnippetMarkdown: "Flagship alternative",
        createdAt: "2026-03-28T07:00:00.000Z",
        detailsMarkdown: "Detailed markdown",
        id: "11111111-1111-4111-8111-111111111111",
        idleMediaUrl: "https://example.com/iphone.jpg",
        name: "iPhone Demo",
        sourceUrls: [],
        storeId: "store-1",
        updatedAt: "2026-03-28T07:00:00.000Z",
      },
      {
        brand: "Google",
        category: "Phone",
        comparisonSnippetMarkdown: "Camera-first alternative",
        createdAt: "2026-03-28T07:00:00.000Z",
        detailsMarkdown: "Detailed markdown",
        id: "22222222-2222-4222-8222-222222222222",
        idleMediaUrl: "https://example.com/pixel.jpg",
        name: "Pixel Demo",
        sourceUrls: [],
        storeId: "store-1",
        updatedAt: "2026-03-28T07:00:00.000Z",
      },
    ];
    const analytics: ConversationAnalytics[] = [
      {
        buyProbability: 0.92,
        chatSessionId: "chat-1",
        durationSeconds: 360,
        endedAt: "2026-03-28T08:06:00.000Z",
        faqExamples: ["How long does the battery last?"],
        faqTopics: ["Battery life"],
        feedbackScore: 5,
        feedbackSentiment: "positive",
        manualSaleConfirmed: false,
        messageCount: 11,
        productId: products[0].id,
        redirectedToOtherProduct: true,
        redirectTargetProductId: products[1].id,
        saleOutcome: "store_confirmed",
        startedAt: "2026-03-28T08:00:00.000Z",
        storeId: "store-1",
      },
      {
        buyProbability: 0.84,
        chatSessionId: "chat-2",
        durationSeconds: 480,
        endedAt: "2026-03-28T09:08:00.000Z",
        faqExamples: ["How long does the battery last on 5G?"],
        faqTopics: ["Battery life"],
        feedbackScore: 3,
        feedbackSentiment: "neutral",
        manualSaleConfirmed: true,
        messageCount: 13,
        productId: products[0].id,
        redirectedToOtherProduct: false,
        redirectTargetProductId: null,
        saleOutcome: "ai_inferred",
        startedAt: "2026-03-28T09:00:00.000Z",
        storeId: "store-1",
      },
      {
        buyProbability: 0.51,
        chatSessionId: "chat-3",
        durationSeconds: 300,
        endedAt: "2026-03-28T10:05:00.000Z",
        faqExamples: ["Is the camera good in low light?"],
        faqTopics: ["Camera quality"],
        feedbackScore: 2,
        feedbackSentiment: "negative",
        manualSaleConfirmed: false,
        messageCount: 8,
        productId: products[1].id,
        redirectedToOtherProduct: false,
        redirectTargetProductId: null,
        saleOutcome: "none",
        startedAt: "2026-03-28T10:00:00.000Z",
        storeId: "store-1",
      },
    ];

    expect(buildSellerDashboardMetrics(analytics, products)).toEqual({
      averageConversationDurationSeconds: 380,
      clientFeedback: [
        { count: 1, label: "5 stars" },
        { count: 0, label: "4 stars" },
        { count: 1, label: "3 stars" },
        { count: 1, label: "2 stars" },
        { count: 0, label: "1 star" },
      ],
      confirmedSalesCount: 1,
      confirmedSalesRate: 1 / 3,
      confirmedSalesRemainingCount: 2,
      contactChannelCaptureCount: 0,
      contactChannelCaptureRate: 0,
      contactChannelMissingCount: 3,
      faqTopics: [
        {
          count: 2,
          example: "How long does the battery last?",
          label: "Battery life",
        },
        {
          count: 1,
          example: "Is the camera good in low light?",
          label: "Camera quality",
        },
      ],
      redirectedConversationCount: 1,
      redirectedConversationRate: 1 / 3,
      totalConversations: 3,
      topRedirectTargets: [{ count: 1, label: "Pixel Demo" }],
    });
  });

  it("includes contact channel capture rate when captured-contact count is provided", () => {
    const products: Product[] = [
      {
        brand: "Apple",
        category: "Phone",
        comparisonSnippetMarkdown: "Flagship alternative",
        createdAt: "2026-03-28T07:00:00.000Z",
        detailsMarkdown: "Detailed markdown",
        id: "11111111-1111-4111-8111-111111111111",
        idleMediaUrl: "https://example.com/iphone.jpg",
        name: "iPhone Demo",
        sourceUrls: [],
        storeId: "store-1",
        updatedAt: "2026-03-28T07:00:00.000Z",
      },
    ];
    const analytics: ConversationAnalytics[] = [
      {
        buyProbability: 0.9,
        chatSessionId: "chat-1",
        durationSeconds: 300,
        endedAt: "2026-03-28T08:05:00.000Z",
        faqExamples: [],
        faqTopics: [],
        feedbackScore: null,
        feedbackSentiment: null,
        manualSaleConfirmed: true,
        messageCount: 8,
        productId: products[0].id,
        redirectedToOtherProduct: false,
        redirectTargetProductId: null,
        saleOutcome: "store_confirmed",
        startedAt: "2026-03-28T08:00:00.000Z",
        storeId: "store-1",
      },
      {
        buyProbability: 0.4,
        chatSessionId: "chat-2",
        durationSeconds: 200,
        endedAt: "2026-03-28T09:03:20.000Z",
        faqExamples: [],
        faqTopics: [],
        feedbackScore: null,
        feedbackSentiment: null,
        manualSaleConfirmed: false,
        messageCount: 6,
        productId: products[0].id,
        redirectedToOtherProduct: false,
        redirectTargetProductId: null,
        saleOutcome: "none",
        startedAt: "2026-03-28T09:00:00.000Z",
        storeId: "store-1",
      },
    ];

    expect(
      buildSellerDashboardMetrics(analytics, products, {
        capturedContactCount: 1,
      }),
    ).toMatchObject({
      confirmedSalesCount: 1,
      confirmedSalesRate: 0.5,
      confirmedSalesRemainingCount: 1,
      contactChannelCaptureCount: 1,
      contactChannelCaptureRate: 0.5,
      contactChannelMissingCount: 1,
      totalConversations: 2,
    });
  });
});
