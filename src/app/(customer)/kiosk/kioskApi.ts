import type { ApiErrorResponse, ApiSuccessResponse } from "@/types/api";

import type {
  ChatSessionCreatePayload,
  ChatSessionMessagePayload,
  CreateLeadPayload,
  LiveChatSessionResult,
} from "./kioskTypes";

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T;
  return payload;
}

export async function createKioskChatSession(deviceSessionId: string) {
  const response = await fetch("/api/v1/chat-sessions", {
    body: JSON.stringify({
      deviceSessionId,
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorPayload = await readJsonResponse<ApiErrorResponse>(response);
    throw new Error(
      errorPayload.error.message || "Failed to create a live chat session.",
    );
  }

  const payload =
    await readJsonResponse<ApiSuccessResponse<ChatSessionCreatePayload>>(response);

  return {
    initialMessage: payload.data.initialMessage,
    sessionId: payload.data.session.id,
  } satisfies LiveChatSessionResult;
}

export async function sendKioskChatMessage(
  chatSessionId: string,
  content: string,
) {
  const response = await fetch(`/api/v1/chat-sessions/${chatSessionId}/messages`, {
    body: JSON.stringify({
      content,
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorPayload = await readJsonResponse<ApiErrorResponse>(response);
    throw new Error(errorPayload.error.message || "Failed to send message.");
  }

  const payload =
    await readJsonResponse<ApiSuccessResponse<ChatSessionMessagePayload>>(response);

  return payload.data.assistantMessage;
}

export async function createKioskLead(payload: CreateLeadPayload) {
  const response = await fetch("/api/v1/leads", {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorPayload = await readJsonResponse<ApiErrorResponse>(response);
    throw new Error(errorPayload.error.message || "Failed to submit lead.");
  }

  return readJsonResponse<ApiSuccessResponse<unknown>>(response);
}
