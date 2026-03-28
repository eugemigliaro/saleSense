import {
  InvalidJsonBodyError,
  jsonInvalidJsonError,
  jsonNotFoundError,
  jsonServerError,
  jsonValidationError,
  readJsonBody,
} from "@/lib/api-request";
import { jsonSuccess } from "@/lib/api-response";
import { createChatSessionForDeviceSession } from "@/lib/chat-sessions";
import { buildChatGreeting } from "@/lib/mock-chat";
import { createChatSessionSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const validationResult = createChatSessionSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonValidationError(validationResult.error);
    }

    const context = await createChatSessionForDeviceSession(
      validationResult.data.deviceSessionId,
    );

    if (!context) {
      return jsonNotFoundError("Device session not found.");
    }

    return jsonSuccess(
      {
        initialMessage: buildChatGreeting(context.product),
        session: context.session,
      },
      {
        headers: {
          Location: `/api/v1/chat-sessions/${context.session.id}`,
        },
        status: 201,
      },
    );
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      return jsonInvalidJsonError();
    }

    console.error("Failed to create chat session.", error);

    return jsonServerError("Failed to create chat session.");
  }
}
