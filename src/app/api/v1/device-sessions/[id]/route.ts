import { assertStoreScope, getSellerContext } from "@/lib/auth";
import {
  jsonNotFoundError,
  jsonServerError,
  jsonUnauthorizedError,
  jsonValidationError,
} from "@/lib/api-request";
import { jsonSuccess } from "@/lib/api-response";
import { getDeviceSessionDetailById } from "@/lib/device-sessions";
import { deviceSessionIdParamsSchema } from "@/lib/schemas";

interface DeviceSessionRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_: Request, context: DeviceSessionRouteContext) {
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

    const detail = await getDeviceSessionDetailById(paramsResult.data.id);

    if (!detail || !assertStoreScope(detail.deviceSession.storeId, sellerContext)) {
      return jsonNotFoundError("Device session not found.");
    }

    return jsonSuccess(detail);
  } catch (error) {
    console.error("Failed to load device session.", error);

    return jsonServerError("Failed to load device session.");
  }
}
