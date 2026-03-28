import {
  jsonConflictError,
  jsonNotFoundError,
  jsonServerError,
  jsonValidationError,
} from "@/lib/api-request";
import { createGeminiLiveToken } from "@/lib/ai/liveVoice";
import { jsonSuccess } from "@/lib/api-response";
import {
  getChatSessionContextById,
  getFirstChatMessageBySessionId,
} from "@/lib/chat-sessions";
import { chatSessionIdParamsSchema } from "@/lib/schemas";

interface ChatSessionLiveTokenRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  _request: Request,
  context: ChatSessionLiveTokenRouteContext,
) {
  try {
    const paramsResult = chatSessionIdParamsSchema.safeParse(
      await context.params,
    );

    if (!paramsResult.success) {
      return jsonValidationError(paramsResult.error);
    }

    const chatSessionContext = await getChatSessionContextById(
      paramsResult.data.id,
    );

    if (!chatSessionContext) {
      return jsonNotFoundError("Chat session not found.");
    }

    if (chatSessionContext.session.status !== "active") {
      return jsonConflictError("Chat session is no longer active.");
    }

    const firstMessage = await getFirstChatMessageBySessionId(paramsResult.data.id);

    if (!firstMessage || firstMessage.role !== "assistant") {
      return jsonConflictError("Chat session opener is unavailable.");
    }

    const token = await createGeminiLiveToken(firstMessage.content);

    return jsonSuccess(token, {
      status: 201,
    });
  } catch (error) {
    console.error("Failed to create live voice token.", error);

    return jsonServerError("Failed to create live voice token.");
  }
}
