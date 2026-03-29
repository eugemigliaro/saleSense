import {
  jsonNotFoundError,
  jsonServerError,
  jsonUnauthorizedError,
  jsonValidationError,
} from "@/lib/api-request";
import { jsonSuccess } from "@/lib/api-response";
import {
  completeChatSession,
  getChatSessionContextById,
} from "@/lib/chat-sessions";
import {
  KioskAccessError,
  requireKioskDeviceSessionAccess,
} from "@/lib/kiosk-auth";
import { chatSessionIdParamsSchema } from "@/lib/schemas";

interface CompleteChatSessionRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  _request: Request,
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

    await requireKioskDeviceSessionAccess(chatSessionContext.session.deviceSessionId);

    const session = await completeChatSession(paramsResult.data.id);

    if (!session) {
      return jsonNotFoundError("Chat session not found.");
    }

    return jsonSuccess({
      session,
    });
  } catch (error) {
    if (error instanceof KioskAccessError) {
      return jsonUnauthorizedError("Kiosk session is not authorized.");
    }

    console.error("Failed to complete chat session.", error);

    return jsonServerError("Failed to complete chat session.");
  }
}
