import "server-only";

import { z } from "zod";

import { generateGeminiJson } from "@/lib/ai/geminiClient";
import { selectRelevantComparisonProducts } from "@/lib/ai/alternativeProducts";
import {
  listComparisonProductsByStore,
  type ComparisonProduct,
} from "@/lib/products";
import type { ChatMessage, Product } from "@/types/domain";

const LEAD_SUMMARY_MAX_LENGTH = 4_000;
const LEAD_SHORT_TEXT_MAX_LENGTH = 200;
const TRANSCRIPT_MESSAGE_LIMIT = 20;
const COMPARISON_SNIPPET_MAX_LENGTH = 800;

const LEAD_INSIGHTS_RESPONSE_JSON_SCHEMA = {
  additionalProperties: false,
  properties: {
    aiSummary: {
      type: ["string", "null"],
    },
    inferredInterest: {
      type: ["string", "null"],
    },
    nextBestProduct: {
      type: ["string", "null"],
    },
  },
  required: ["aiSummary", "inferredInterest", "nextBestProduct"],
  type: "object",
} as const;

const leadInsightsSchema = z.object({
  aiSummary: z.string().trim().min(1).max(LEAD_SUMMARY_MAX_LENGTH).nullable(),
  inferredInterest: z
    .string()
    .trim()
    .min(1)
    .max(LEAD_SHORT_TEXT_MAX_LENGTH)
    .nullable(),
  nextBestProduct: z
    .string()
    .trim()
    .min(1)
    .max(LEAD_SHORT_TEXT_MAX_LENGTH)
    .nullable(),
});

export type LeadInsights = z.infer<typeof leadInsightsSchema>;

export interface GenerateLeadInsightsInput {
  activeProduct: Product;
  history: ChatMessage[];
  storeId: string;
}

interface GenerateLeadInsightsOptions {
  comparisonProducts?: ComparisonProduct[];
  provider?: (input: LeadInsightsPromptInput) => Promise<LeadInsights>;
}

interface LeadInsightsPromptInput {
  activeProduct: Product;
  comparisonProducts: ComparisonProduct[];
  history: ChatMessage[];
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}\n...`;
}

function getRecentHistory(history: ChatMessage[]) {
  return history.slice(-TRANSCRIPT_MESSAGE_LIMIT);
}

function getLatestUserMessage(history: ChatMessage[]) {
  const latestUserMessage = [...history]
    .reverse()
    .find((message) => message.role === "user");

  return latestUserMessage?.content ?? "";
}

function getRecentCustomerMessages(history: ChatMessage[]) {
  return history
    .filter((message) => message.role === "user")
    .slice(-3)
    .map((message) => message.content.trim())
    .filter(Boolean);
}

function formatTranscript(history: ChatMessage[]) {
  if (history.length === 0) {
    return "No transcript available.";
  }

  return history
    .map((message) =>
      `${message.role === "assistant" ? "Assistant" : "Customer"}: ${message.content}`,
    )
    .join("\n");
}

function formatComparisonProducts(products: ComparisonProduct[]) {
  if (products.length === 0) {
    return "- No other in-store products available for comparison.";
  }

  return products
    .map((product) => {
      const snippet = truncateText(
        product.comparisonSnippetMarkdown,
        COMPARISON_SNIPPET_MAX_LENGTH,
      );

      return [
        `- ${product.brand} ${product.name} (${product.category})`,
        `  Comparison snippet: ${snippet}`,
      ].join("\n");
    })
    .join("\n");
}

function normalizeProductLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function resolveAllowedNextBestProduct(
  value: string | null,
  comparisonProducts: ComparisonProduct[],
) {
  if (!value) {
    return null;
  }

  const normalizedValue = normalizeProductLabel(value);

  for (const product of comparisonProducts) {
    if (
      [product.name, `${product.brand} ${product.name}`].some(
        (candidateLabel) =>
          normalizeProductLabel(candidateLabel) === normalizedValue,
      )
    ) {
      return product.name;
    }
  }

  return null;
}

const LEAD_INSIGHTS_SYSTEM_INSTRUCTION = [
  "You create concise lead notes for SaleSense store staff after a kiosk conversation.",
  "Use only the active product details and transcript as your sources of truth.",
  "Use comparison products only to name a next-best in-store alternative when the transcript clearly suggests a better fit.",
  "Do not invent pricing, stock, policies, demographics, or personal details not stated in the transcript.",
  "Keep aiSummary practical for a seller follow-up.",
  "Set inferredInterest to the customer's clearest stated need or buying priority.",
  "Set nextBestProduct to null unless another in-store product is clearly a better fit.",
  "Return only valid JSON that matches the required schema.",
].join(" ");

export function buildLeadInsightsPrompt(input: LeadInsightsPromptInput) {
  const recentHistory = getRecentHistory(input.history);

  return [
    "Required JSON shape:",
    '{"aiSummary":"string|null","inferredInterest":"string|null","nextBestProduct":"string|null"}',
    "",
    "Active product:",
    `Name: ${input.activeProduct.name}`,
    `Brand: ${input.activeProduct.brand}`,
    `Category: ${input.activeProduct.category}`,
    "Primary details markdown:",
    truncateText(input.activeProduct.detailsMarkdown, 8_000),
    "",
    "Other in-store comparison products:",
    formatComparisonProducts(input.comparisonProducts),
    "",
    "Recent transcript:",
    formatTranscript(recentHistory),
    "",
    "Output instructions:",
    "- aiSummary should read like a short CRM note for a store manager.",
    "- inferredInterest should be a short phrase, not a full sentence.",
    "- nextBestProduct must be a product name only, or null.",
  ].join("\n");
}

export function buildFallbackLeadInsights(
  input: LeadInsightsPromptInput,
): LeadInsights {
  const customerMessages = getRecentCustomerMessages(input.history);
  const latestCustomerMessage = getLatestUserMessage(input.history);

  if (customerMessages.length === 0) {
    return {
      aiSummary: `Customer interacted with the ${input.activeProduct.brand} ${input.activeProduct.name} kiosk demo.`,
      inferredInterest: null,
      nextBestProduct: null,
    };
  }

  return {
    aiSummary: truncateText(
      `Customer engaged with the ${input.activeProduct.brand} ${input.activeProduct.name} kiosk and focused on: ${customerMessages.join(" ")}`,
      LEAD_SUMMARY_MAX_LENGTH,
    ),
    inferredInterest:
      latestCustomerMessage.slice(0, LEAD_SHORT_TEXT_MAX_LENGTH) || null,
    nextBestProduct: null,
  };
}

export async function generateLeadInsightsWithGemini(
  input: LeadInsightsPromptInput,
) {
  const prompt = buildLeadInsightsPrompt(input);
  const rawInsights = await generateGeminiJson<unknown>(
    prompt,
    {
      responseJsonSchema: LEAD_INSIGHTS_RESPONSE_JSON_SCHEMA,
      systemInstruction: LEAD_INSIGHTS_SYSTEM_INSTRUCTION,
    },
  );

  return leadInsightsSchema.parse(rawInsights);
}

export async function generateLeadInsights(
  input: GenerateLeadInsightsInput,
  options: GenerateLeadInsightsOptions = {},
) {
  const comparisonProducts =
    options.comparisonProducts ??
    (await listComparisonProductsByStore(input.storeId, input.activeProduct.id));
  const recentHistory = getRecentHistory(input.history);
  const latestCustomerMessage = getLatestUserMessage(recentHistory);
  const relevantComparisonProducts = selectRelevantComparisonProducts(
    comparisonProducts,
    latestCustomerMessage,
  );
  const leadInsightsInput: LeadInsightsPromptInput = {
    activeProduct: input.activeProduct,
    comparisonProducts: relevantComparisonProducts,
    history: recentHistory,
  };
  const provider = options.provider ?? generateLeadInsightsWithGemini;

  try {
    const draft = await provider(leadInsightsInput);
    const nextBestProduct = resolveAllowedNextBestProduct(
      draft.nextBestProduct,
      relevantComparisonProducts,
    );

    if (draft.nextBestProduct && !nextBestProduct) {
      return buildFallbackLeadInsights(leadInsightsInput);
    }

    return {
      ...draft,
      nextBestProduct,
    } satisfies LeadInsights;
  } catch (error) {
    console.error("Failed to generate Gemini lead insights. Falling back.", error);

    return buildFallbackLeadInsights(leadInsightsInput);
  }
}
