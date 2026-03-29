import {
  InvalidJsonBodyError,
  jsonConflictError,
  jsonInvalidJsonError,
  jsonNotFoundError,
  jsonServerError,
  jsonUnauthorizedError,
  jsonValidationError,
  readJsonBody,
} from "@/lib/api-request";
import { jsonSuccess } from "@/lib/api-response";
import { getChatSessionContextById } from "@/lib/chat-sessions";
import {
  ChatSessionInactiveError,
  ChatSessionNotFoundError,
  resolveSalesTurn,
} from "@/lib/chatTurns";
import {
  KioskAccessError,
  requireKioskDeviceSessionAccess,
} from "@/lib/kiosk-auth";
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

    const chatSessionContext = await getChatSessionContextById(paramsResult.data.id);

    if (!chatSessionContext) {
      return jsonNotFoundError("Chat session not found.");
    }

    await requireKioskDeviceSessionAccess(chatSessionContext.session.deviceSessionId);

    const body = await readJsonBody(request);
    const validationResult = sendChatMessageSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonValidationError(validationResult.error);
    }

    const input = normalizeSendChatMessageInput(validationResult.data);
    const result = await resolveSalesTurn(
      paramsResult.data.id,
      input.content,
      input.leadCaptureState,
    );

    return jsonSuccess({
      assistantMessage: result.assistantMessage,
      grounding: result.grounding,
      leadCapture: result.leadCapture,
      session: result.session,
    });
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      return jsonInvalidJsonError();
    }

    if (error instanceof ChatSessionNotFoundError) {
      return jsonNotFoundError(error.message);
    }

    if (error instanceof ChatSessionInactiveError) {
      return jsonConflictError(error.message);
    }

    if (error instanceof KioskAccessError) {
      return jsonUnauthorizedError("Kiosk session is not authorized.");
    }

    console.error("Failed to send chat message.", error);

    return jsonServerError("Failed to send chat message.");
  }
}
