import { describe, expect, it, vi } from "vitest";

import {
  buildFallbackSalesAgentReply,
  buildSalesAgentPrompt,
  generateSalesAssistantReply,
  selectRelevantComparisonProducts,
  type SalesAgentDraft,
  type SalesAgentInput,
} from "@/lib/ai/salesAgent";
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
    content: "I care a lot about camera quality and battery life.",
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
      "This model is especially strong if the customer prioritizes zoom features and display size.",
    id: "22222222-2222-4222-8222-222222222222",
    name: "Galaxy Demo",
  },
  {
    brand: "Apple",
    category: "Tablet",
    comparisonSnippetMarkdown:
      "This is more relevant for customers who want a larger canvas than a phone.",
    id: "33333333-3333-4333-8333-333333333333",
    name: "iPad Demo",
  },
];

describe("buildSalesAgentPrompt", () => {
  it("includes the active product as primary context and comparison snippets separately", () => {
    const prompt = buildSalesAgentPrompt({
      activeProduct: ACTIVE_PRODUCT,
      comparisonProducts: COMPARISON_PRODUCTS,
      history: HISTORY,
    });

    expect(prompt).toContain("Primary details markdown");
    expect(prompt).toContain(ACTIVE_PRODUCT.detailsMarkdown);
    expect(prompt).toContain("Comparison products:");
    expect(prompt).toContain("Samsung Galaxy Demo");
  });
});

describe("selectRelevantComparisonProducts", () => {
  it("prioritizes products whose snippets match the customer message", () => {
    const selectedProducts = selectRelevantComparisonProducts(
      COMPARISON_PRODUCTS,
      "I mostly care about zoom and display size.",
    );

    expect(selectedProducts[0]?.name).toBe("Galaxy Demo");
  });
});

describe("buildFallbackSalesAgentReply", () => {
  it("mirrors Spanish when the latest customer message is in Spanish", () => {
    const reply = buildFallbackSalesAgentReply({
      activeProduct: ACTIVE_PRODUCT,
      comparisonProducts: COMPARISON_PRODUCTS,
      history: [
        {
          content: "Quiero comparar la bateria y la camara.",
          createdAt: "2026-03-28T08:21:00.000Z",
          id: "m-3",
          role: "user",
        },
      ],
    });

    expect(reply.language).toBe("es");
    expect(reply.message).toContain("comparo");
  });
});

describe("generateSalesAssistantReply", () => {
  it("falls back cleanly when the provider throws", async () => {
    const provider = vi
      .fn<(input: SalesAgentInput) => Promise<SalesAgentDraft>>()
      .mockRejectedValue(new Error("Gemini unavailable"));

    const reply = await generateSalesAssistantReply(
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

    expect(reply.confidence).toBe("low");
    expect(reply.message).toContain("iPhone Demo");
  });
});
