import {
  InvalidJsonBodyError,
  jsonInvalidJsonError,
  jsonNotFoundError,
  jsonServerError,
  jsonUnauthorizedError,
  jsonValidationError,
  readJsonBody,
} from "@/lib/api-request";
import { jsonSuccess } from "@/lib/api-response";
import {
  completeChatSession,
  getChatSessionContextById,
} from "@/lib/chat-sessions";
import { upsertCompletedConversationAnalytics } from "@/lib/conversationAnalytics";
import {
  KioskAccessError,
  requireKioskDeviceSessionAccess,
} from "@/lib/kiosk-auth";
import {
  chatSessionIdParamsSchema,
  completeChatSessionSchema,
  normalizeCompleteChatSessionInput,
} from "@/lib/schemas";

interface CompleteChatSessionRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  request: Request,
  context: CompleteChatSessionRouteContext,
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

    const body = await readJsonBody(request);
    const validationResult = completeChatSessionSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonValidationError(validationResult.error);
    }

    const input = normalizeCompleteChatSessionInput(validationResult.data);

    await requireKioskDeviceSessionAccess(chatSessionContext.session.deviceSessionId);
    await upsertCompletedConversationAnalytics({
      chatSessionId: chatSessionContext.session.id,
      feedbackScore: input.feedbackScore,
      productId: chatSessionContext.session.productId,
      startedAt: chatSessionContext.session.startedAt,
      storeId: chatSessionContext.session.storeId,
    });

    const session = await completeChatSession(paramsResult.data.id);

    if (!session) {
      return jsonNotFoundError("Chat session not found.");
    }

    return jsonSuccess({
      session,
    });
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      return jsonInvalidJsonError();
    }

    if (error instanceof KioskAccessError) {
      return jsonUnauthorizedError("Kiosk session is not authorized.");
    }

    console.error("Failed to complete chat session.", error);

    return jsonServerError("Failed to complete chat session.");
  }
}
