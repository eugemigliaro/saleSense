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
import { createDeviceSessionForStore } from "@/lib/device-sessions";
import { createDeviceSessionSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const sellerContext = await getSellerContext();

  if (!sellerContext) {
    return jsonUnauthorizedError();
  }

  try {
    const body = await readJsonBody(request);
    const validationResult = createDeviceSessionSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonValidationError(validationResult.error);
    }

    const deviceSession = await createDeviceSessionForStore(
      sellerContext.storeId,
      sellerContext.userId,
      validationResult.data.productId,
    );

    if (!deviceSession) {
      return jsonNotFoundError("Product not found.");
    }

    return jsonSuccess(deviceSession, {
      headers: {
        Location: `/api/v1/device-sessions/${deviceSession.id}`,
      },
      status: 201,
    });
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      return jsonInvalidJsonError();
    }

    console.error("Failed to create device session.", error);

    return jsonServerError("Failed to create device session.");
  }
}
