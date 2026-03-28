import "server-only";

import { z } from "zod";

import { buildChatMessageGrounding } from "@/lib/ai/grounding";
import {
  generateGeminiJson,
  generateGeminiText,
  type GeminiToolDefinition,
} from "@/lib/ai/geminiClient";
import type { ChatMessageGrounding, GroundingToolName } from "@/types/api";
import type { ChatMessage, Product } from "@/types/domain";

const HISTORY_MESSAGE_LIMIT = 10;
const RESEARCH_BRIEF_MAX_LENGTH = 300;
const EXTERNAL_RESEARCH_SUMMARY_MAX_LENGTH = 2_000;
const CHAT_RESEARCH_DECISION_JSON_SCHEMA = {
  additionalProperties: false,
  properties: {
    rationale: {
      type: ["string", "null"],
    },
    researchBrief: {
      type: ["string", "null"],
    },
    shouldUseExternalResearch: {
      type: "boolean",
    },
    tools: {
      items: {
        enum: ["google-search", "url-context"],
        type: "string",
      },
      type: "array",
    },
  },
  required: [
    "shouldUseExternalResearch",
    "tools",
    "researchBrief",
    "rationale",
  ],
  type: "object",
} as const;

const chatResearchDecisionSchema = z.object({
  rationale: z.string().trim().min(1).max(300).nullable(),
  researchBrief: z
    .string()
    .trim()
    .min(1)
    .max(RESEARCH_BRIEF_MAX_LENGTH)
    .nullable(),
  shouldUseExternalResearch: z.boolean(),
  tools: z
    .array(z.enum(["google-search", "url-context"]))
    .max(2)
    .transform((value) => Array.from(new Set(value))),
});

const CHAT_RESEARCH_DECISION_SYSTEM_INSTRUCTION = [
  "You decide whether a SaleSense chat reply needs external web research.",
  "Do not rely on hard-coded keywords.",
  "Use the customer's intent, the transcript, and the active product context.",
  "Return no research for generic fit discovery, feature explanation, or tryout guidance when store-managed product data is enough.",
  "Use url-context when public source URLs for the active product would materially improve the answer.",
  "Use google-search when the customer intent requires public web discovery, such as competitor research, current owned-product comparisons, or freshness-sensitive facts.",
  "You may return both tools when the answer would benefit from both active-product URLs and public web discovery.",
  "Return only valid JSON that matches the required schema.",
].join(" ");

const CHAT_RESEARCH_SYSTEM_INSTRUCTION = [
  "You gather external facts for a SaleSense salesperson.",
  "Focus only on the customer's latest intent.",
  "Summarize the most relevant facts that would help answer the customer and sell or compare the product accurately.",
  "Do not write a final customer-facing reply.",
  "Keep the summary concise and factual.",
  "If information is uncertain or missing, say so plainly.",
].join(" ");

export interface ChatResearchDecision {
  rationale: string | null;
  researchBrief: string | null;
  shouldUseExternalResearch: boolean;
  tools: GroundingToolName[];
}

export interface ExternalResearchResult {
  grounding: ChatMessageGrounding | null;
  summary: string;
}

interface DetectChatResearchIntentInput {
  activeProduct: Product;
  history: ChatMessage[];
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

function buildChatResearchDecisionPrompt(input: DetectChatResearchIntentInput) {
  const recentHistory = getRecentHistory(input.history);

  return [
    "Active product:",
    `Name: ${input.activeProduct.name}`,
    `Brand: ${input.activeProduct.brand}`,
    `Category: ${input.activeProduct.category}`,
    `Has source URLs: ${input.activeProduct.sourceUrls.length > 0 ? "yes" : "no"}`,
    "Recent transcript:",
    formatHistory(recentHistory),
    "",
    "Decide whether external research would materially improve the next reply.",
  ].join("\n");
}

export async function detectChatResearchIntent(
  input: DetectChatResearchIntentInput,
) {
  try {
    const rawDecision = await generateGeminiJson<unknown>(
      buildChatResearchDecisionPrompt(input),
      {
        responseJsonSchema: CHAT_RESEARCH_DECISION_JSON_SCHEMA,
        systemInstruction: CHAT_RESEARCH_DECISION_SYSTEM_INSTRUCTION,
      },
    );

    return chatResearchDecisionSchema.parse(rawDecision);
  } catch (error) {
    console.error("Failed to detect research intent. Falling back.", error);

    return {
      rationale: null,
      researchBrief: null,
      shouldUseExternalResearch: false,
      tools: [],
    } satisfies ChatResearchDecision;
  }
}

function buildToolConfig(tools: GroundingToolName[]): GeminiToolDefinition[] {
  return tools.map((tool) =>
    tool === "google-search" ? { googleSearch: {} } : { urlContext: {} },
  );
}

function buildChatResearchPrompt(input: {
  activeProduct: Product;
  history: ChatMessage[];
  researchBrief: string;
  tools: GroundingToolName[];
}) {
  const recentHistory = getRecentHistory(input.history);
  const urlSection =
    input.tools.includes("url-context") && input.activeProduct.sourceUrls.length > 0
      ? [
          "Active product source URLs:",
          ...input.activeProduct.sourceUrls.map((url) => `- ${url}`),
          "",
        ]
      : [];

  return [
    "Research objective:",
    input.researchBrief,
    "",
    "Active product:",
    `Name: ${input.activeProduct.name}`,
    `Brand: ${input.activeProduct.brand}`,
    `Category: ${input.activeProduct.category}`,
    "Product details markdown:",
    truncateText(input.activeProduct.detailsMarkdown, 4_000),
    "",
    ...urlSection,
    "Recent transcript:",
    formatHistory(recentHistory),
    "",
    "Return a concise factual research note for the salesperson in at most 8 lines.",
  ].join("\n");
}

export async function gatherExternalResearch(input: {
  activeProduct: Product;
  history: ChatMessage[];
  researchBrief: string;
  tools: GroundingToolName[];
}) {
  if (input.tools.length === 0) {
    return null;
  }

  if (
    input.tools.includes("url-context") &&
    input.activeProduct.sourceUrls.length === 0 &&
    input.tools.length === 1
  ) {
    return null;
  }

  try {
    const result = await generateGeminiText(
      buildChatResearchPrompt(input),
      {
        systemInstruction: CHAT_RESEARCH_SYSTEM_INSTRUCTION,
        tools: buildToolConfig(input.tools),
      },
    );

    return {
      grounding: buildChatMessageGrounding({
        groundingMetadata: result.groundingMetadata,
        requestedTools: input.tools,
        urlContextMetadata: result.urlContextMetadata,
      }),
      summary: truncateText(result.text.trim(), EXTERNAL_RESEARCH_SUMMARY_MAX_LENGTH),
    } satisfies ExternalResearchResult;
  } catch (error) {
    console.error("Failed to gather external research. Continuing without it.", error);

    return null;
  }
}
