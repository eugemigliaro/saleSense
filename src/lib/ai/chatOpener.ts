import "server-only";

import { z } from "zod";

import { generateGeminiJson } from "@/lib/ai/geminiClient";
import type { Product } from "@/types/domain";

const CHAT_OPENER_MESSAGE_MAX_LENGTH = 160;
const CHAT_OPENER_RESPONSE_JSON_SCHEMA = {
  additionalProperties: false,
  properties: {
    language: {
      enum: ["en", "es"],
      type: "string",
    },
    message: {
      type: "string",
    },
  },
  required: ["message", "language"],
  type: "object",
} as const;

const chatOpenerSchema = z.object({
  language: z.enum(["en", "es"]),
  message: z
    .string()
    .trim()
    .min(1)
    .max(CHAT_OPENER_MESSAGE_MAX_LENGTH),
});

const CHAT_OPENER_SYSTEM_INSTRUCTION = [
  "You write the first line spoken by a SaleSense in-store sales agent.",
  "The agent must sound like a strong retail salesperson for any product category.",
  "Write one short qualifying question tailored to the active product.",
  "Do not introduce yourself or explain what you can do.",
  "Do not mention being an AI, assistant, kiosk, or virtual salesperson.",
  "Keep the line concise, natural, and easy to answer in-store.",
  "Prefer 8 to 16 words.",
  "Return only valid JSON that matches the schema.",
].join(" ");

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}\n...`;
}

function normalizeCategoryLabel(category: string) {
  const trimmed = category.trim();

  if (!trimmed) {
    return "setup";
  }

  return trimmed.toLowerCase();
}

export function buildFallbackChatOpener(product: Product) {
  const categoryLabel = normalizeCategoryLabel(product.category);

  return `Hi, what matters most to you in a ${categoryLabel} right now?`;
}

function buildChatOpenerPrompt(product: Product) {
  return [
    "Active product:",
    `Name: ${product.name}`,
    `Brand: ${product.brand}`,
    `Category: ${product.category}`,
    "Details markdown:",
    truncateText(product.detailsMarkdown, 2_500),
    "",
    "Write the best opening qualifying question for an in-store conversation.",
  ].join("\n");
}

export async function generateChatOpener(product: Product) {
  try {
    const rawOpener = await generateGeminiJson<unknown>(
      buildChatOpenerPrompt(product),
      {
        responseJsonSchema: CHAT_OPENER_RESPONSE_JSON_SCHEMA,
        systemInstruction: CHAT_OPENER_SYSTEM_INSTRUCTION,
        thinkingLevel: "minimal",
      },
    );

    return chatOpenerSchema.parse(rawOpener).message;
  } catch (error) {
    console.error("Failed to generate Gemini chat opener. Falling back.", error);

    return buildFallbackChatOpener(product);
  }
}
