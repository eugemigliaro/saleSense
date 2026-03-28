import {
  InvalidJsonBodyError,
  jsonInvalidJsonError,
  jsonNotFoundError,
  jsonServerError,
  jsonValidationError,
  readJsonBody,
} from "@/lib/api-request";
import { jsonSuccess } from "@/lib/api-response";
import {
  getChatSessionContextById,
  touchChatSession,
} from "@/lib/chat-sessions";
import { touchDeviceSession } from "@/lib/device-sessions";
import { buildMockAssistantReply } from "@/lib/mock-chat";
import {
  chatSessionIdParamsSchema,
  normalizeSendChatMessageInput,
  sendChatMessageSchema,
} from "@/lib/schemas";

interface ChatMessageRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: Request, context: ChatMessageRouteContext) {
  try {
    const paramsResult = chatSessionIdParamsSchema.safeParse(
      await context.params,
    );

    if (!paramsResult.success) {
      return jsonValidationError(paramsResult.error);
    }

    const body = await readJsonBody(request);
    const validationResult = sendChatMessageSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonValidationError(validationResult.error);
    }

    const chatSessionContext = await getChatSessionContextById(
      paramsResult.data.id,
    );

    if (!chatSessionContext) {
      return jsonNotFoundError("Chat session not found.");
    }

    const input = normalizeSendChatMessageInput(validationResult.data);
    const assistantMessage = buildMockAssistantReply({
      customerMessage: input.content,
      history: input.history,
      product: chatSessionContext.product,
    });
    const updatedSession = await touchChatSession(paramsResult.data.id);

    await touchDeviceSession(chatSessionContext.session.deviceSessionId, "engaged");

    if (!updatedSession) {
      return jsonNotFoundError("Chat session not found.");
    }

    return jsonSuccess({
      assistantMessage,
      session: updatedSession,
    });
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      return jsonInvalidJsonError();
    }

    console.error("Failed to send chat message.", error);

    return jsonServerError("Failed to send chat message.");
  }
}
