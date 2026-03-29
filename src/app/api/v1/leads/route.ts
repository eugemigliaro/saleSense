import { getSellerContext } from "@/lib/auth";
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
import { getChatSessionContextById } from "@/lib/chat-sessions";
import { getVerifiedKioskDeviceSessionRow } from "@/lib/kiosk-auth";
import {
  createLeadForProduct,
  listLeadsByStore,
} from "@/lib/leads";
import {
  createLeadSchema,
  normalizeCreateLeadInput,
} from "@/lib/schemas";

export async function GET() {
  const sellerContext = await getSellerContext();

  if (!sellerContext) {
    return jsonUnauthorizedError();
  }

  try {
    const leads = await listLeadsByStore(sellerContext.storeId);

    return jsonSuccess(leads);
  } catch (error) {
    console.error("Failed to list leads.", error);

    return jsonServerError("Failed to load leads.");
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const validationResult = createLeadSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonValidationError(validationResult.error);
    }

    const kioskDeviceSession = await getVerifiedKioskDeviceSessionRow();

    if (!kioskDeviceSession) {
      return jsonUnauthorizedError("Kiosk session is not authorized.");
    }

    const input = normalizeCreateLeadInput(validationResult.data);

    if (kioskDeviceSession.product_id !== input.productId) {
      return jsonUnauthorizedError("Kiosk session is not authorized.");
    }

    if (input.chatSessionId) {
      const chatSessionContext = await getChatSessionContextById(input.chatSessionId);

      if (
        !chatSessionContext ||
        chatSessionContext.session.deviceSessionId !== kioskDeviceSession.id
      ) {
        return jsonUnauthorizedError("Kiosk session is not authorized.");
      }
    }

    const lead = await createLeadForProduct(input);

    if (!lead) {
      return jsonNotFoundError("Product not found.");
    }

    return jsonSuccess(lead, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      return jsonInvalidJsonError();
    }

    console.error("Failed to create lead.", error);

    return jsonServerError("Failed to create lead.");
  }
}
