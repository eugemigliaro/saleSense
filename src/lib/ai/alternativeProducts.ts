import "server-only";

import { z } from "zod";

import { generateGeminiJson } from "@/lib/ai/geminiClient";
import type { ComparisonProduct } from "@/lib/products";
import type { ChatMessage, Product } from "@/types/domain";

const HISTORY_MESSAGE_LIMIT = 10;
const MAX_SELECTED_ALTERNATIVES = 3;
const ALTERNATIVE_SELECTION_JSON_SCHEMA = {
  additionalProperties: false,
  properties: {
    rationale: {
      type: ["string", "null"],
    },
    selectedProductIds: {
      items: {
        type: "string",
      },
      type: "array",
    },
    shouldConsiderAlternatives: {
      type: "boolean",
    },
  },
  required: ["shouldConsiderAlternatives", "selectedProductIds", "rationale"],
  type: "object",
} as const;

const alternativeSelectionSchema = z.object({
  rationale: z.string().trim().min(1).max(400).nullable(),
  selectedProductIds: z.array(z.string().uuid()).max(MAX_SELECTED_ALTERNATIVES),
  shouldConsiderAlternatives: z.boolean(),
});

function normalizeAlternativeSelection(value: unknown) {
  if (!value || typeof value !== "object") {
    return value;
  }

  const rawSelection = value as Record<string, unknown>;

  return {
    ...rawSelection,
    rationale:
      typeof rawSelection.rationale === "string"
        ? rawSelection.rationale.slice(0, 400)
        : rawSelection.rationale,
  };
}

const ALTERNATIVE_SELECTION_SYSTEM_INSTRUCTION = [
  "You decide whether SaleSense should bring other in-store products into context for the next reply.",
  "Every product in the provided list belongs to the same store as the active product.",
  "Your job is to help keep the sale inside that store.",
  "Use only the comparison snippets, transcript, and active product basics for this decision.",
  "Select alternatives only when they are genuinely relevant to the customer's needs or comparison intent.",
  "If no same-store alternative gives the salesperson a stronger in-store path, return none and let the salesperson reframe the conversation instead.",
  "Do not select alternatives just because they are in the same category.",
  "Return only product ids from the provided list.",
  "Return only valid JSON that matches the required schema.",
].join(" ");

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}\n...`;
}

function getRecentHistory(history: ChatMessage[]) {
  return history.slice(-HISTORY_MESSAGE_LIMIT);
}

function formatHistory(history: ChatMessage[]) {
  if (history.length === 0) {
    return "No prior transcript.";
  }

  return history
    .map(
      (message) =>
        `${message.role === "assistant" ? "Assistant" : "Customer"}: ${message.content}`,
    )
    .join("\n");
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function scoreComparisonProduct(product: ComparisonProduct, tokens: string[]) {
  const haystack = [
    product.name,
    product.brand,
    product.category,
    product.comparisonSnippetMarkdown,
  ]
    .join(" ")
    .toLowerCase();

  return tokens.reduce((score, token) => {
    if (haystack.includes(token)) {
      return score + 1;
    }

    return score;
  }, 0);
}

export function selectRelevantComparisonProducts(
  products: ComparisonProduct[],
  latestCustomerMessage: string,
) {
  const tokens = tokenize(latestCustomerMessage);
  const scoredProducts = products.map((product) => ({
    product,
    score: scoreComparisonProduct(product, tokens),
  }));
  const matchingProducts = scoredProducts.filter((entry) => entry.score > 0);

  if (matchingProducts.length > 0) {
    return matchingProducts
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.product.name.localeCompare(right.product.name),
      )
      .slice(0, MAX_SELECTED_ALTERNATIVES)
      .map((entry) => entry.product);
  }

  return [];
}

function buildAlternativeSelectionPrompt(input: {
  activeProduct: Product;
  comparisonProducts: ComparisonProduct[];
  history: ChatMessage[];
}) {
  const recentHistory = getRecentHistory(input.history);

  return [
    "Active product:",
    `Name: ${input.activeProduct.name}`,
    `Brand: ${input.activeProduct.brand}`,
    `Category: ${input.activeProduct.category}`,
    "Primary details markdown excerpt:",
    truncateText(input.activeProduct.detailsMarkdown, 1_500),
    "",
    "Available comparison snippets:",
    ...input.comparisonProducts.map((product) =>
      JSON.stringify({
        brand: product.brand,
        category: product.category,
        id: product.id,
        name: product.name,
        snippet: product.comparisonSnippetMarkdown,
      }),
    ),
    "",
    "Recent transcript:",
    formatHistory(recentHistory),
  ].join("\n");
}

export async function selectAlternativeProductIds(input: {
  activeProduct: Product;
  comparisonProducts: ComparisonProduct[];
  history: ChatMessage[];
}) {
  if (input.comparisonProducts.length === 0) {
    return [];
  }

  try {
    const rawSelection = await generateGeminiJson<unknown>(
      buildAlternativeSelectionPrompt(input),
      {
        responseJsonSchema: ALTERNATIVE_SELECTION_JSON_SCHEMA,
        systemInstruction: ALTERNATIVE_SELECTION_SYSTEM_INSTRUCTION,
      },
    );
    const selection = alternativeSelectionSchema.parse(
      normalizeAlternativeSelection(rawSelection),
    );

    if (!selection.shouldConsiderAlternatives) {
      return [];
    }

    return selection.selectedProductIds;
  } catch (error) {
    console.error(
      "Failed to select alternative products. Falling back to lexical ranking.",
      error,
    );

    const latestCustomerMessage = getRecentHistory(input.history)
      .filter((message) => message.role === "user")
      .at(-1)?.content;

    if (!latestCustomerMessage) {
      return [];
    }

    return selectRelevantComparisonProducts(
      input.comparisonProducts,
      latestCustomerMessage,
    ).map((product) => product.id);
  }
}
