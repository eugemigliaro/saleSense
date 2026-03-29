import type { ApiErrorResponse, ApiSuccessResponse } from "@/types/api";

import type {
  ChatSessionCreatePayload,
  ChatSessionMessagePayload,
  CreateLeadPayload,
  KioskLeadCaptureState,
  KioskLiveTokenResult,
  KioskLiveToolCallResult,
  LiveChatMessageResult,
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

export async function sendDeviceSessionHeartbeat(deviceSessionId: string) {
  const response = await fetch(
    `/api/v1/device-sessions/${deviceSessionId}/heartbeats`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const errorPayload = await readJsonResponse<ApiErrorResponse>(response);
    throw new Error(
      errorPayload.error.message || "Failed to update device visibility.",
    );
  }

  return readJsonResponse<ApiSuccessResponse<{ acknowledged: true }>>(response);
}

export async function sendKioskChatMessage(
  chatSessionId: string,
  content: string,
  leadCaptureState: KioskLeadCaptureState,
) {
  const response = await fetch(`/api/v1/chat-sessions/${chatSessionId}/messages`, {
    body: JSON.stringify({
      content,
      leadCaptureState,
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

  return {
    assistantMessage: payload.data.assistantMessage,
    grounding: payload.data.grounding,
    leadCapture: payload.data.leadCapture,
  } satisfies LiveChatMessageResult;
}

export async function createKioskLiveToken(chatSessionId: string) {
  const response = await fetch(`/api/v1/chat-sessions/${chatSessionId}/live-token`, {
    method: "POST",
  });

  if (!response.ok) {
    const errorPayload = await readJsonResponse<ApiErrorResponse>(response);
    throw new Error(
      errorPayload.error.message || "Failed to start voice session.",
    );
  }

  const payload =
    await readJsonResponse<ApiSuccessResponse<KioskLiveTokenResult>>(response);

  return payload.data satisfies KioskLiveTokenResult;
}

export async function completeKioskChatSession(
  chatSessionId: string,
  feedbackScore?: number,
) {
  const response = await fetch(`/api/v1/chat-sessions/${chatSessionId}/complete`, {
    body: JSON.stringify(
      feedbackScore == null ? {} : { feedbackScore },
    ),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorPayload = await readJsonResponse<ApiErrorResponse>(response);
    throw new Error(
      errorPayload.error.message || "Failed to complete chat session.",
    );
  }

  await readJsonResponse<ApiSuccessResponse<{ session: { id: string } }>>(response);
}

export async function sendKioskLiveToolCall(
  chatSessionId: string,
  input: {
    callId: string;
    customerTranscript: string;
    leadCaptureState: KioskLeadCaptureState;
  },
) {
  const response = await fetch(
    `/api/v1/chat-sessions/${chatSessionId}/live-tool-calls`,
    {
      body: JSON.stringify(input),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    const errorPayload = await readJsonResponse<ApiErrorResponse>(response);
    throw new Error(
      errorPayload.error.message || "Failed to resolve voice turn.",
    );
  }

  const payload =
    await readJsonResponse<ApiSuccessResponse<KioskLiveToolCallResult>>(response);

  return payload.data satisfies KioskLiveToolCallResult;
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
