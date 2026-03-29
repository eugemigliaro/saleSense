import { describe, expect, it, vi } from "vitest";

import {
  buildFallbackLeadInsights,
  buildLeadInsightsPrompt,
  generateLeadInsights,
  type LeadInsights,
} from "@/lib/ai/leadInsights";
import type { ComparisonProduct } from "@/lib/products";
import type { ChatMessage, Product } from "@/types/domain";

const ACTIVE_PRODUCT: Product = {
  brand: "Apple",
  category: "Phone",
  comparisonSnippetMarkdown: "Compares well against larger alternatives.",
  createdAt: "2026-03-28T08:20:00.000Z",
  detailsMarkdown:
    "Great battery life, strong camera controls, and a bright display that is easy to try in-store.",
  id: "11111111-1111-4111-8111-111111111111",
  idleMediaUrl: "https://example.com/idle.mp4",
  name: "iPhone Demo",
  sourceUrls: [],
  storeId: "store-1",
  updatedAt: "2026-03-28T08:20:00.000Z",
};

const HISTORY: ChatMessage[] = [
  {
    content: "Hi, I'm the SaleSense guide.",
    createdAt: "2026-03-28T08:20:00.000Z",
    id: "m-1",
    role: "assistant",
  },
  {
    content: "I care about zoom, battery life, and whether it feels fast.",
    createdAt: "2026-03-28T08:21:00.000Z",
    id: "m-2",
    role: "user",
  },
];

const COMPARISON_PRODUCTS: ComparisonProduct[] = [
  {
    brand: "Samsung",
    category: "Phone",
    comparisonSnippetMarkdown:
      "Best when the customer prioritizes zoom and a larger display.",
    id: "22222222-2222-4222-8222-222222222222",
    name: "Galaxy Demo",
  },
  {
    brand: "Apple",
    category: "Tablet",
    comparisonSnippetMarkdown:
      "More relevant when the customer wants a larger canvas than a phone.",
    id: "33333333-3333-4333-8333-333333333333",
    name: "iPad Demo",
  },
];

describe("buildLeadInsightsPrompt", () => {
  it("keeps the active product primary and comparison snippets secondary", () => {
    const prompt = buildLeadInsightsPrompt({
      activeProduct: ACTIVE_PRODUCT,
      comparisonProducts: COMPARISON_PRODUCTS,
      history: HISTORY,
    });

    expect(prompt).toContain("Primary details markdown");
    expect(prompt).toContain(ACTIVE_PRODUCT.detailsMarkdown);
    expect(prompt).toContain("Other in-store comparison products");
    expect(prompt).toContain("Samsung Galaxy Demo");
  });
});

describe("buildFallbackLeadInsights", () => {
  it("builds a seller follow-up note from the transcript when AI is unavailable", () => {
    const insights = buildFallbackLeadInsights({
      activeProduct: ACTIVE_PRODUCT,
      comparisonProducts: COMPARISON_PRODUCTS,
      history: HISTORY,
    });

    expect(insights.aiSummary).toContain("iPhone Demo");
    expect(insights.inferredInterest).toContain("zoom");
    expect(insights.nextBestProduct).toBeNull();
  });
});

describe("generateLeadInsights", () => {
  it("falls back cleanly when the provider throws", async () => {
    const provider = vi
      .fn<(input: unknown) => Promise<LeadInsights>>()
      .mockRejectedValue(new Error("Gemini unavailable"));

    const insights = await generateLeadInsights(
      {
        activeProduct: ACTIVE_PRODUCT,
        history: HISTORY,
        storeId: "store-1",
      },
      {
        comparisonProducts: COMPARISON_PRODUCTS,
        provider,
      },
    );

    expect(insights.aiSummary).toContain("iPhone Demo");
    expect(insights.inferredInterest).toContain("zoom");
  });

  it("drops next-best products that are not in the same store comparison set", async () => {
    const provider = vi
      .fn<(input: unknown) => Promise<LeadInsights>>()
      .mockResolvedValue({
        aiSummary: "Customer mostly cared about zoom and speed.",
        inferredInterest: "zoom and speed",
        nextBestProduct: "Pixel Ultra",
      });

    const insights = await generateLeadInsights(
      {
        activeProduct: ACTIVE_PRODUCT,
        history: HISTORY,
        storeId: "store-1",
      },
      {
        comparisonProducts: COMPARISON_PRODUCTS,
        provider,
      },
    );

    expect(insights.nextBestProduct).toBeNull();
    expect(insights.aiSummary).toContain("iPhone Demo");
  });
});
