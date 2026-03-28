import "server-only";

import { z } from "zod";

import {
  selectAlternativeProductIds,
  selectRelevantComparisonProducts,
} from "@/lib/ai/alternativeProducts";
import {
  detectChatResearchIntent,
  gatherExternalResearch,
} from "@/lib/ai/chatResearch";
import { generateGeminiJson } from "@/lib/ai/geminiClient";
import {
  listComparisonProductsByStore,
  listProductsByIdsForStore,
  type ComparisonProduct,
} from "@/lib/products";
import type { ChatMessageGrounding } from "@/types/api";
import type { ChatMessage, Product } from "@/types/domain";

const ACTIVE_PRODUCT_MARKDOWN_MAX_LENGTH = 8_000;
const ALTERNATIVE_PRODUCT_MARKDOWN_MAX_LENGTH = 4_000;
const HISTORY_MESSAGE_LIMIT = 10;
const SALES_AGENT_MESSAGE_MAX_LENGTH = 1_500;
const SALES_AGENT_RESPONSE_JSON_SCHEMA = {
  additionalProperties: false,
  properties: {
    confidence: {
      enum: ["high", "medium", "low"],
      type: "string",
    },
    language: {
      enum: ["en", "es"],
      type: "string",
    },
    message: {
      type: "string",
    },
    objective: {
      enum: ["qualify", "pitch", "compare", "redirect", "handoff"],
      type: "string",
    },
    recommendedAlternativeProductName: {
      type: ["string", "null"],
    },
    suggestedTryout: {
      type: ["string", "null"],
    },
  },
  required: [
    "message",
    "language",
    "objective",
    "suggestedTryout",
    "recommendedAlternativeProductName",
    "confidence",
  ],
  type: "object",
} as const;

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
  alternativeProducts: Product[];
  externalResearchSummary: string | null;
  history: ChatMessage[];
}

export interface GenerateSalesAssistantReplyInput {
  activeProduct: Product;
  history: ChatMessage[];
  storeId: string;
}

export interface SalesAssistantReplyResult {
  draft: SalesAgentDraft;
  grounding: ChatMessageGrounding | null;
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

function formatAlternativeProducts(products: Product[]) {
  if (products.length === 0) {
    return "- No other in-store products are currently relevant.";
  }

  return products
    .map((product) =>
      [
        `- ${product.brand} ${product.name} (${product.category})`,
        "  Full product details:",
        truncateText(product.detailsMarkdown, ALTERNATIVE_PRODUCT_MARKDOWN_MAX_LENGTH)
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n"),
      ].join("\n"),
    )
    .join("\n");
}

const SALES_AGENT_SYSTEM_INSTRUCTION = [
  "You are SaleSense, an expert in-store retail salesperson for any product category.",
  "Act like a strong consultative salesperson, not a support bot and not a technical manual.",
  "Mirror the customer's language. Default to English if unclear.",
  "Use the active product details markdown as the primary source of truth.",
  "Only consider alternative in-store products that were explicitly supplied as relevant context.",
  "If alternative in-store products are present, you may compare them in depth because they have already been screened as worth considering.",
  "If the customer's needs are still unclear, ask one short qualifying question instead of listing specs.",
  "When helpful, suggest one concrete thing the customer can try on the current device right now.",
  "Prefer selling the active product unless the customer's stated needs clearly mismatch it.",
  "Use any external research summary only as supplemental evidence, never as a replacement for store-managed product data.",
  "Do not invent features, pricing, stock, policies, or claims not supported by the provided context.",
  "Keep the response concise, practical, and persuasive without sounding pushy or scripted.",
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
    "- Sell the active product first when it plausibly fits the customer.",
    "- Compare deeply only with the alternative in-store products already selected as relevant.",
    "- Redirect only if the active product is clearly a weaker fit.",
    "- Keep the answer short and directly usable in a live retail conversation.",
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
    "Relevant alternative in-store products:",
    formatAlternativeProducts(input.alternativeProducts),
    "",
    "Supplemental external research summary:",
    input.externalResearchSummary ?? "No external research used.",
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
  const alternativeProduct = input.alternativeProducts[0] ?? null;
  const activeProductLabel = `${input.activeProduct.brand} ${input.activeProduct.name}`;
  const tryoutSuggestion =
    language === "es"
      ? `Proba el ${activeProductLabel} directamente aca y fijate si la experiencia te resulta natural.`
      : `Try the ${activeProductLabel} right here and see whether it feels natural to use.`;

  const externalResearchLine =
    input.externalResearchSummary && input.externalResearchSummary.trim().length > 0
      ? language === "es"
        ? `Tambien tengo contexto reciente para ayudarte a comparar con mas precision.`
        : `I also have some fresh context to help compare it more accurately.`
      : null;

  const message =
    language === "es"
      ? alternativeProduct
        ? `El ${activeProductLabel} sigue siendo mi referencia principal para lo que me planteas. Si queres, te explico rapidamente en que se diferencia de ${alternativeProduct.brand} ${alternativeProduct.name} y que conviene probar primero. ${externalResearchLine ?? ""} ${tryoutSuggestion}`.trim()
        : `El ${activeProductLabel} sigue siendo mi referencia principal para lo que me planteas. Decime que te importa mas y te digo si este demo encaja bien. ${externalResearchLine ?? ""} ${tryoutSuggestion}`.trim()
      : alternativeProduct
        ? `The ${activeProductLabel} is still my main reference for what you need. If you want, I can quickly show how it differs from the ${alternativeProduct.brand} ${alternativeProduct.name} and what to try first. ${externalResearchLine ?? ""} ${tryoutSuggestion}`.trim()
        : `The ${activeProductLabel} is still my main reference for what you need. Tell me what matters most and I’ll narrow down whether this demo is the right fit. ${externalResearchLine ?? ""} ${tryoutSuggestion}`.trim();

  return {
    confidence: "low",
    language,
    message,
    objective: alternativeProduct ? "compare" : "qualify",
    recommendedAlternativeProductName: alternativeProduct?.name ?? null,
    suggestedTryout: tryoutSuggestion,
  };
}

export async function generateSalesAgentDraftWithGemini(input: SalesAgentInput) {
  const prompt = buildSalesAgentPrompt(input);
  const rawDraft = await generateGeminiJson<unknown>(
    prompt,
    {
      responseJsonSchema: SALES_AGENT_RESPONSE_JSON_SCHEMA,
      systemInstruction: SALES_AGENT_SYSTEM_INSTRUCTION,
    },
  );

  return salesAgentDraftSchema.parse(rawDraft);
}

async function selectAlternativeProducts(input: {
  activeProduct: Product;
  comparisonProducts: ComparisonProduct[];
  history: ChatMessage[];
  storeId: string;
}) {
  const selectedProductIds = await selectAlternativeProductIds({
    activeProduct: input.activeProduct,
    comparisonProducts: input.comparisonProducts,
    history: input.history,
  });

  return listProductsByIdsForStore(input.storeId, selectedProductIds);
}

export async function generateSalesAssistantReply(
  input: GenerateSalesAssistantReplyInput,
  options: GenerateSalesAssistantReplyOptions = {},
): Promise<SalesAssistantReplyResult> {
  const comparisonProducts =
    options.comparisonProducts ??
    (await listComparisonProductsByStore(input.storeId, input.activeProduct.id));
  const trimmedHistory = getRecentHistory(input.history);
  const researchDecision = await detectChatResearchIntent({
    activeProduct: input.activeProduct,
    history: trimmedHistory,
  });
  const [alternativeProducts, externalResearch] = await Promise.all([
    selectAlternativeProducts({
      activeProduct: input.activeProduct,
      comparisonProducts,
      history: trimmedHistory,
      storeId: input.storeId,
    }),
    researchDecision.shouldUseExternalResearch && researchDecision.researchBrief
      ? gatherExternalResearch({
          activeProduct: input.activeProduct,
          history: trimmedHistory,
          researchBrief: researchDecision.researchBrief,
          tools: researchDecision.tools,
        })
      : Promise.resolve(null),
  ]);
  const salesAgentInput: SalesAgentInput = {
    activeProduct: input.activeProduct,
    alternativeProducts,
    externalResearchSummary: externalResearch?.summary ?? null,
    history: trimmedHistory,
  };
  const provider = options.provider ?? generateSalesAgentDraftWithGemini;

  try {
    return {
      draft: await provider(salesAgentInput),
      grounding: externalResearch?.grounding ?? null,
    };
  } catch (error) {
    console.error("Failed to generate Gemini sales reply. Falling back.", error);

    return {
      draft: buildFallbackSalesAgentReply(salesAgentInput),
      grounding: externalResearch?.grounding ?? null,
    };
  }
}

export { selectRelevantComparisonProducts };
