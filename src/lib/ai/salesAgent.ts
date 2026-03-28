import "server-only";

import { z } from "zod";

import { generateGeminiJson } from "@/lib/ai/geminiClient";
import {
  listComparisonProductsByStore,
  type ComparisonProduct,
} from "@/lib/products";
import type { ChatMessage, Product } from "@/types/domain";

const ACTIVE_PRODUCT_MARKDOWN_MAX_LENGTH = 8_000;
const COMPARISON_PRODUCT_LIMIT = 4;
const COMPARISON_SNIPPET_MAX_LENGTH = 800;
const HISTORY_MESSAGE_LIMIT = 10;
const SALES_AGENT_MESSAGE_MAX_LENGTH = 1_500;

const salesAgentDraftSchema = z.object({
  confidence: z.enum(["high", "medium", "low"]),
  language: z.enum(["en", "es"]),
  message: z.string().trim().min(1).max(SALES_AGENT_MESSAGE_MAX_LENGTH),
  objective: z.enum(["qualify", "pitch", "compare", "redirect", "handoff"]),
  recommendedAlternativeProductName: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .nullable(),
  suggestedTryout: z.string().trim().min(1).max(240).nullable(),
});

export type SalesAgentDraft = z.infer<typeof salesAgentDraftSchema>;

export interface SalesAgentInput {
  activeProduct: Product;
  comparisonProducts: ComparisonProduct[];
  history: ChatMessage[];
}

export interface GenerateSalesAssistantReplyInput {
  activeProduct: Product;
  history: ChatMessage[];
  storeId: string;
}

interface GenerateSalesAssistantReplyOptions {
  comparisonProducts?: ComparisonProduct[];
  provider?: (input: SalesAgentInput) => Promise<SalesAgentDraft>;
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}\n...`;
}

function getRecentHistory(history: ChatMessage[]) {
  return history.slice(-HISTORY_MESSAGE_LIMIT);
}

function getLatestUserMessage(history: ChatMessage[]) {
  const latestUserMessage = [...history]
    .reverse()
    .find((message) => message.role === "user");

  return latestUserMessage?.content ?? "";
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function inferLanguageHint(value: string): "en" | "es" {
  const normalized = ` ${value.toLowerCase()} `;
  const spanishSignals = [
    " que ",
    " para ",
    " con ",
    " necesito ",
    " quiero ",
    " compar",
    " bateria",
    " pantalla",
    " camara",
    " precio",
    " hola ",
    " gracias ",
  ];

  return spanishSignals.some((signal) => normalized.includes(signal))
    ? "es"
    : "en";
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
      .slice(0, COMPARISON_PRODUCT_LIMIT)
      .map((entry) => entry.product);
  }

  return products.slice(0, Math.min(3, COMPARISON_PRODUCT_LIMIT));
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

function formatComparisonProducts(products: ComparisonProduct[]) {
  if (products.length === 0) {
    return "- No additional store products available for comparison.";
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

const SALES_AGENT_SYSTEM_INSTRUCTION = [
  "You are SaleSense, an expert in-store electronics salesperson.",
  "Your job is to help a walk-in customer decide whether the active demo product fits their needs.",
  "Mirror the customer's language. Default to English if unclear.",
  "Use the active product details markdown as the primary source of truth.",
  "Use other store products only as comparison context. Do not invent features, pricing, stock, or policies.",
  "Prefer selling the active product unless the customer's stated needs clearly mismatch it.",
  "If the customer's needs are unclear, ask one short qualifying question instead of dumping specs.",
  "When helpful, suggest one concrete thing the customer can try on the current device right now.",
  "If recommending another in-store product, keep it brief and explain why. Do not aggressively redirect.",
  "Keep the response concise, practical, and persuasive without being pushy.",
  "Return only valid JSON that matches the required schema.",
].join(" ");

export function buildSalesAgentPrompt(input: SalesAgentInput) {
  const recentHistory = getRecentHistory(input.history);
  const latestCustomerMessage = getLatestUserMessage(recentHistory);

  return [
    "Required JSON shape:",
    '{"message":"string","language":"en|es","objective":"qualify|pitch|compare|redirect|handoff","suggestedTryout":"string|null","recommendedAlternativeProductName":"string|null","confidence":"high|medium|low"}',
    "",
    "Sales policy:",
    "- Sell the active product first.",
    "- Compare when relevant.",
    "- Recommend an alternative only when the active product is clearly a weak fit for the customer.",
    "- If store pricing or availability is unknown, say so plainly.",
    "",
    "Active product:",
    `Name: ${input.activeProduct.name}`,
    `Brand: ${input.activeProduct.brand}`,
    `Category: ${input.activeProduct.category}`,
    "Primary details markdown:",
    truncateText(
      input.activeProduct.detailsMarkdown,
      ACTIVE_PRODUCT_MARKDOWN_MAX_LENGTH,
    ),
    "",
    "Comparison products:",
    formatComparisonProducts(input.comparisonProducts),
    "",
    "Recent transcript:",
    formatHistory(recentHistory),
    "",
    `Latest customer message: ${latestCustomerMessage || "No customer message available."}`,
  ].join("\n");
}

export function buildFallbackSalesAgentReply(
  input: SalesAgentInput,
): SalesAgentDraft {
  const recentHistory = getRecentHistory(input.history);
  const latestCustomerMessage = getLatestUserMessage(recentHistory);
  const language = inferLanguageHint(latestCustomerMessage);
  const comparisonProduct = input.comparisonProducts[0] ?? null;
  const activeProductLabel = `${input.activeProduct.brand} ${input.activeProduct.name}`;
  const tryoutSuggestion =
    language === "es"
      ? `Proba el ${activeProductLabel} directamente en esta pantalla y fijate si la experiencia te resulta fluida.`
      : `Try the ${activeProductLabel} on this screen right now and see whether the experience feels natural to you.`;

  const message =
    language === "es"
      ? comparisonProduct
        ? `El ${activeProductLabel} sigue siendo mi referencia principal para lo que me preguntas. Si queres, decime que te importa mas y te lo comparo con ${comparisonProduct.brand} ${comparisonProduct.name} sin salir de este equipo. ${tryoutSuggestion}`
        : `El ${activeProductLabel} sigue siendo mi referencia principal para lo que me preguntas. Decime que te importa mas y te digo si este demo encaja bien. ${tryoutSuggestion}`
      : comparisonProduct
        ? `The ${activeProductLabel} is still my main reference for what you asked. If you want, tell me what matters most and I can compare it with the ${comparisonProduct.brand} ${comparisonProduct.name} without leaving this demo. ${tryoutSuggestion}`
        : `The ${activeProductLabel} is still my main reference for what you asked. Tell me what matters most and I'll narrow down whether this demo is the right fit. ${tryoutSuggestion}`;

  return {
    confidence: "low",
    language,
    message,
    objective: "pitch",
    recommendedAlternativeProductName: null,
    suggestedTryout: tryoutSuggestion,
  };
}

export async function generateSalesAgentDraftWithGemini(input: SalesAgentInput) {
  const prompt = buildSalesAgentPrompt(input);
  const rawDraft = await generateGeminiJson(
    prompt,
    SALES_AGENT_SYSTEM_INSTRUCTION,
  );

  return salesAgentDraftSchema.parse(rawDraft);
}

export async function generateSalesAssistantReply(
  input: GenerateSalesAssistantReplyInput,
  options: GenerateSalesAssistantReplyOptions = {},
) {
  const comparisonProducts =
    options.comparisonProducts ??
    (await listComparisonProductsByStore(input.storeId, input.activeProduct.id));
  const trimmedHistory = getRecentHistory(input.history);
  const latestCustomerMessage = getLatestUserMessage(trimmedHistory);
  const relevantComparisonProducts = selectRelevantComparisonProducts(
    comparisonProducts,
    latestCustomerMessage,
  );
  const salesAgentInput: SalesAgentInput = {
    activeProduct: input.activeProduct,
    comparisonProducts: relevantComparisonProducts,
    history: trimmedHistory,
  };
  const provider = options.provider ?? generateSalesAgentDraftWithGemini;

  try {
    return await provider(salesAgentInput);
  } catch (error) {
    console.error("Failed to generate Gemini sales reply. Falling back.", error);

    return buildFallbackSalesAgentReply(salesAgentInput);
  }
}
