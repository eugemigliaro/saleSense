import {
  InvalidJsonBodyError,
  jsonConflictError,
  jsonInvalidJsonError,
  jsonNotFoundError,
  jsonServerError,
  jsonValidationError,
  readJsonBody,
} from "@/lib/api-request";
import { generateSalesAssistantReply } from "@/lib/ai/salesAgent";
import { jsonSuccess } from "@/lib/api-response";
import {
  appendChatMessage,
  getChatSessionContextById,
  listChatMessagesBySessionId,
  touchChatSession,
} from "@/lib/chat-sessions";
import { touchDeviceSession } from "@/lib/device-sessions";
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

    if (chatSessionContext.session.status !== "active") {
      return jsonConflictError("Chat session is no longer active.");
    }

    const input = normalizeSendChatMessageInput(validationResult.data);
    await appendChatMessage(paramsResult.data.id, "user", input.content);
    const history = await listChatMessagesBySessionId(paramsResult.data.id);
    const assistantDraft = await generateSalesAssistantReply({
      activeProduct: chatSessionContext.product,
      history,
      storeId: chatSessionContext.session.storeId,
    });
    const assistantMessage = await appendChatMessage(
      paramsResult.data.id,
      "assistant",
      assistantDraft.message,
    );
    const [updatedSession] = await Promise.all([
      touchChatSession(paramsResult.data.id),
      touchDeviceSession(chatSessionContext.session.deviceSessionId, "engaged"),
    ]);

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
