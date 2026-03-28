import "server-only";

import { GoogleGenAI } from "@google/genai";

import { getGeminiApiKey, getGeminiModel } from "@/lib/env";

let cachedClient: GoogleGenAI | null = null;

type ResponseJsonSchema = Record<string, unknown>;

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

export async function generateGeminiJson<T>(
  prompt: string,
  systemInstruction: string,
  responseJsonSchema: ResponseJsonSchema,
) {
  const client = getClient();
  const response = await client.models.generateContent({
    config: {
      responseJsonSchema,
      responseMimeType: "application/json",
      systemInstruction,
    },
    contents: prompt,
    model: getGeminiModel(),
  });

  return parseJsonText(response.text ?? "") as T;
}
