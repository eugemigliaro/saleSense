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
import { buildGeminiLiveFunctionResponse } from "@/lib/ai/liveVoice";
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
  createLiveToolCallSchema,
  normalizeCreateLiveToolCallInput,
} from "@/lib/schemas";

interface ChatSessionLiveToolRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  request: Request,
  context: ChatSessionLiveToolRouteContext,
) {
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
    const validationResult = createLiveToolCallSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonValidationError(validationResult.error);
    }

    const input = normalizeCreateLiveToolCallInput(validationResult.data);
    const result = await resolveSalesTurn(
      paramsResult.data.id,
      input.customerTranscript,
      input.leadCaptureState,
    );

    return jsonSuccess({
      assistantMessage: result.assistantMessage,
      functionResponse: buildGeminiLiveFunctionResponse({
        assistantMessage: result.assistantMessage.content,
        callId: input.callId,
      }),
      grounding: result.grounding,
      leadCapture: result.leadCapture,
      session: result.session,
      userMessage: result.userMessage,
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

    console.error("Failed to resolve live voice tool call.", error);

    return jsonServerError("Failed to resolve live voice tool call.");
  }
}
