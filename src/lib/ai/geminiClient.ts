import "server-only";

import { GoogleGenAI } from "@google/genai";

import { getGeminiApiKey, getGeminiModel } from "@/lib/env";

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

let cachedClient: GoogleGenAI | null = null;

function getClient() {
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey: getGeminiApiKey(),
    });
  }

  return cachedClient;
}

function parseJsonText(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("Gemini returned an empty response.");
  }

  const normalized = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  return JSON.parse(normalized);
}

export async function generateGeminiJson(
  prompt: string,
  systemInstruction: string,
) {
  const client = getClient();
  const response = await client.models.generateContent({
    config: {
      responseJsonSchema: SALES_AGENT_RESPONSE_JSON_SCHEMA,
      responseMimeType: "application/json",
      systemInstruction,
    },
    contents: prompt,
    model: getGeminiModel(),
  });

  return parseJsonText(response.text ?? "");
}
