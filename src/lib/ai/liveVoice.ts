import "server-only";

import {
  GoogleGenAI,
  Modality,
  ThinkingLevel,
  Type,
  type FunctionDeclaration,
  type LiveConnectConfig,
  type Tool,
} from "@google/genai";

import { getGeminiApiKey, getGeminiLiveModel } from "@/lib/env";
import type {
  ChatMessageGrounding,
  ChatSessionLiveTokenPayload,
  GeminiLiveConfigPayload,
  GeminiLiveFunctionResponse,
} from "@/types/api";

const LIVE_TOOL_NAME = "generate_sales_turn";
const LIVE_TOKEN_DURATION_MS = 30 * 60 * 1000;
const LIVE_NEW_SESSION_DURATION_MS = 60 * 1000;
const LIVE_OUTPUT_TOKEN_LIMIT = 1_024;

const LIVE_FUNCTION_PARAMETERS_SCHEMA = {
  additionalProperties: false,
  properties: {
    customerTranscript: {
      description:
        "The customer's final spoken or typed turn, transcribed verbatim in their language.",
      type: "STRING" as const,
    },
  },
  required: ["customerTranscript"],
  type: "OBJECT" as const,
};

const LIVE_SYSTEM_INSTRUCTION = [
  "You are the live voice transport for SaleSense.",
  "You never invent sales content from your own knowledge.",
  `For every real customer turn, call ${LIVE_TOOL_NAME} with the final customer transcript before replying.`,
  "After the tool returns, speak the tool response naturally and keep it aligned with the customer's language.",
  "Do not add extra claims, pricing, features, policies, or recommendations beyond what the tool response gives you.",
  "If the customer is still speaking, wait for the end of the turn instead of responding early.",
].join(" ");

let cachedLiveClient: GoogleGenAI | null = null;

function getLiveClient() {
  if (!cachedLiveClient) {
    cachedLiveClient = new GoogleGenAI({
      apiKey: getGeminiApiKey(),
      httpOptions: {
        apiVersion: "v1alpha",
      },
    });
  }

  return cachedLiveClient;
}

export function getGeminiLiveToolName() {
  return LIVE_TOOL_NAME;
}

export function buildGeminiLiveConfig(): GeminiLiveConfigPayload {
  return {
    generationConfig: {
      maxOutputTokens: LIVE_OUTPUT_TOKEN_LIMIT,
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    responseModalities: ["AUDIO"],
    systemInstruction: LIVE_SYSTEM_INSTRUCTION,
    temperature: 0.2,
    thinkingConfig: {
      thinkingLevel: "MINIMAL",
    },
    tools: [
      {
        functionDeclarations: [
          {
            description:
              "Resolve one grounded SaleSense sales turn using the backend sales engine.",
            name: LIVE_TOOL_NAME,
            parameters: LIVE_FUNCTION_PARAMETERS_SCHEMA,
          },
        ],
      },
    ],
  };
}

function buildGeminiLiveSdkConfig(): LiveConnectConfig {
  const functionDeclaration: FunctionDeclaration = {
    description:
      "Resolve one grounded SaleSense sales turn using the backend sales engine.",
    name: LIVE_TOOL_NAME,
    parameters: {
      properties: {
        customerTranscript: {
          description:
            "The customer's final spoken or typed turn, transcribed verbatim in their language.",
          type: Type.STRING,
        },
      },
      required: ["customerTranscript"],
      type: Type.OBJECT,
    },
  };
  const tools: Tool[] = [
    {
      functionDeclarations: [functionDeclaration],
    },
  ];

  return {
    inputAudioTranscription: {},
    maxOutputTokens: LIVE_OUTPUT_TOKEN_LIMIT,
    outputAudioTranscription: {},
    responseModalities: [Modality.AUDIO],
    systemInstruction: LIVE_SYSTEM_INSTRUCTION,
    temperature: 0.2,
    thinkingConfig: {
      thinkingLevel: ThinkingLevel.MINIMAL,
    },
    tools,
  };
}

export async function createGeminiLiveToken(
  opener: string,
): Promise<ChatSessionLiveTokenPayload> {
  const client = getLiveClient();
  const expiresAt = new Date(Date.now() + LIVE_TOKEN_DURATION_MS).toISOString();
  const newSessionExpiresAt = new Date(
    Date.now() + LIVE_NEW_SESSION_DURATION_MS,
  ).toISOString();
  const model = getGeminiLiveModel();
  const liveConfig = buildGeminiLiveConfig();
  const sdkLiveConfig = buildGeminiLiveSdkConfig();
  const token = await client.authTokens.create({
    config: {
      expireTime: expiresAt,
      httpOptions: {
        apiVersion: "v1alpha",
      },
      liveConnectConstraints: {
        config: sdkLiveConfig,
        model,
      },
      newSessionExpireTime: newSessionExpiresAt,
      uses: 1,
    },
  });

  if (!token.name) {
    throw new Error("Gemini did not return an ephemeral token.");
  }

  return {
    expiresAt,
    liveConfig,
    model,
    opener,
    token: token.name,
  };
}

export function buildGeminiLiveFunctionResponse(params: {
  assistantMessage: string;
  callId: string;
}): GeminiLiveFunctionResponse {
  return {
    id: params.callId,
    name: LIVE_TOOL_NAME,
    response: {
      assistantMessage: params.assistantMessage,
    },
  };
}

export function summarizeGroundingForLive(grounding: ChatMessageGrounding | null) {
  if (!grounding || grounding.sources.length === 0) {
    return null;
  }

  const firstSource = grounding.sources[0];

  return `${firstSource.title} (${firstSource.host})`;
}
