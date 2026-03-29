import "server-only";

import { GoogleGenAI, ThinkingLevel } from "@google/genai";

import { getGeminiApiKey, getGeminiModel } from "@/lib/env";

let cachedClient: GoogleGenAI | null = null;

export interface GeminiToolDefinition {
  googleSearch?: Record<string, never>;
  urlContext?: Record<string, never>;
}

interface GenerateGeminiBaseOptions {
  model?: string;
  systemInstruction?: string;
  thinkingLevel?: GeminiThinkingLevel;
  tools?: GeminiToolDefinition[];
}

interface GenerateGeminiJsonOptions extends GenerateGeminiBaseOptions {
  responseJsonSchema: unknown;
}

export interface GeminiGenerateTextResult {
  groundingMetadata: unknown | null;
  text: string;
  urlContextMetadata: unknown | null;
}

export interface GeminiGenerateJsonResult<T> extends GeminiGenerateTextResult {
  data: T;
}

export type GeminiThinkingLevel = "minimal" | "low" | "medium" | "high";

function getClient() {
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey: getGeminiApiKey(),
    });
  }

  return cachedClient;
}

function getModel(model?: string) {
  return model ?? getGeminiModel();
}

function resolveThinkingLevel(thinkingLevel?: GeminiThinkingLevel) {
  switch (thinkingLevel) {
    case "minimal":
      return ThinkingLevel.MINIMAL;
    case "low":
      return ThinkingLevel.LOW;
    case "medium":
      return ThinkingLevel.MEDIUM;
    case "high":
      return ThinkingLevel.HIGH;
    default:
      return undefined;
  }
}

function buildThinkingConfig(thinkingLevel?: GeminiThinkingLevel) {
  const resolvedThinkingLevel = resolveThinkingLevel(thinkingLevel);

  if (!resolvedThinkingLevel) {
    return {};
  }

  return {
    thinkingConfig: {
      thinkingLevel: resolvedThinkingLevel,
    },
  };
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

function buildToolCompatibleJsonSystemInstruction(
  systemInstruction: string | undefined,
  responseJsonSchema: unknown,
) {
  const schemaText = JSON.stringify(responseJsonSchema, null, 2);

  return [
    systemInstruction?.trim(),
    "Return only a valid JSON object.",
    "Do not wrap the JSON in markdown fences.",
    "The JSON must match this schema exactly:",
    schemaText,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function isStructuredOutputWithToolsUnsupported(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("Tool use with a response mime type")
  );
}

export async function generateGeminiJson<T>(
  prompt: string,
  {
    model,
    responseJsonSchema,
    systemInstruction,
    thinkingLevel,
    tools,
  }: GenerateGeminiJsonOptions,
) {
  const client = getClient();
  try {
    const response = await client.models.generateContent({
      config: {
        ...(systemInstruction ? { systemInstruction } : {}),
        ...buildThinkingConfig(thinkingLevel),
        ...(tools ? { tools } : {}),
        responseJsonSchema,
        responseMimeType: "application/json",
      },
      contents: prompt,
      model: getModel(model),
    });

    return parseJsonText(response.text ?? "") as T;
  } catch (error) {
    if (!tools || !isStructuredOutputWithToolsUnsupported(error)) {
      throw error;
    }

    const fallbackResponse = await client.models.generateContent({
      config: {
        systemInstruction: buildToolCompatibleJsonSystemInstruction(
          systemInstruction,
          responseJsonSchema,
        ),
        ...buildThinkingConfig(thinkingLevel),
        tools,
      },
      contents: prompt,
      model: getModel(model),
    });

    return parseJsonText(fallbackResponse.text ?? "") as T;
  }
}

export async function generateGeminiJsonWithMetadata<T>(
  prompt: string,
  {
    model,
    responseJsonSchema,
    systemInstruction,
    thinkingLevel,
    tools,
  }: GenerateGeminiJsonOptions,
): Promise<GeminiGenerateJsonResult<T>> {
  const client = getClient();
  try {
    const response = await client.models.generateContent({
      config: {
        ...(systemInstruction ? { systemInstruction } : {}),
        ...buildThinkingConfig(thinkingLevel),
        ...(tools ? { tools } : {}),
        responseJsonSchema,
        responseMimeType: "application/json",
      },
      contents: prompt,
      model: getModel(model),
    });
    const candidate = response.candidates?.[0];

    return {
      data: parseJsonText(response.text ?? "") as T,
      groundingMetadata: candidate?.groundingMetadata ?? null,
      text: response.text ?? "",
      urlContextMetadata: candidate?.urlContextMetadata ?? null,
    };
  } catch (error) {
    if (!tools || !isStructuredOutputWithToolsUnsupported(error)) {
      throw error;
    }

    const fallbackResponse = await client.models.generateContent({
      config: {
        systemInstruction: buildToolCompatibleJsonSystemInstruction(
          systemInstruction,
          responseJsonSchema,
        ),
        ...buildThinkingConfig(thinkingLevel),
        tools,
      },
      contents: prompt,
      model: getModel(model),
    });
    const candidate = fallbackResponse.candidates?.[0];

    return {
      data: parseJsonText(fallbackResponse.text ?? "") as T,
      groundingMetadata: candidate?.groundingMetadata ?? null,
      text: fallbackResponse.text ?? "",
      urlContextMetadata: candidate?.urlContextMetadata ?? null,
    };
  }
}

export async function generateGeminiText(
  prompt: string,
  { model, systemInstruction, thinkingLevel, tools }: GenerateGeminiBaseOptions = {},
): Promise<GeminiGenerateTextResult> {
  const client = getClient();
  const response = await client.models.generateContent({
    config: {
      ...(systemInstruction ? { systemInstruction } : {}),
      ...buildThinkingConfig(thinkingLevel),
      ...(tools ? { tools } : {}),
    },
    contents: prompt,
    model: getModel(model),
  });
  const candidate = response.candidates?.[0];

  if (!response.text?.trim()) {
    throw new Error("Gemini returned an empty text response.");
  }

  return {
    groundingMetadata: candidate?.groundingMetadata ?? null,
    text: response.text,
    urlContextMetadata: candidate?.urlContextMetadata ?? null,
  };
}
