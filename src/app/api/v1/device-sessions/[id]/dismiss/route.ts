import { getSellerContext } from "@/lib/auth";
import {
  jsonNotFoundError,
  jsonServerError,
  jsonUnauthorizedError,
  jsonValidationError,
} from "@/lib/api-request";
import { jsonSuccess } from "@/lib/api-response";
import { completeChatSessionsForDeviceSession } from "@/lib/chat-sessions";
import { dismissDeviceSessionForStore } from "@/lib/device-sessions";
import { deviceSessionIdParamsSchema } from "@/lib/schemas";

interface DismissDeviceSessionRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  _request: Request,
  context: DismissDeviceSessionRouteContext,
) {
  const sellerContext = await getSellerContext();

  if (!sellerContext) {
    return jsonUnauthorizedError();
  }

  try {
    const paramsResult = deviceSessionIdParamsSchema.safeParse(
      await context.params,
    );

    if (!paramsResult.success) {
      return jsonValidationError(paramsResult.error);
    }

    const deviceSession = await dismissDeviceSessionForStore(
      paramsResult.data.id,
      sellerContext.storeId,
    );

    if (!deviceSession) {
      return jsonNotFoundError("Device session not found.");
    }

    await completeChatSessionsForDeviceSession(deviceSession.id);

    return jsonSuccess({
      session: deviceSession,
    });
  } catch (error) {
    console.error("Failed to dismiss device session.", error);

    return jsonServerError("Failed to dismiss device session.");
  }
}
