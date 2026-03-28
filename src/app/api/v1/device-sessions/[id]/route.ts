import {
  jsonNotFoundError,
  jsonServerError,
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
  try {
    const paramsResult = deviceSessionIdParamsSchema.safeParse(
      await context.params,
    );

    if (!paramsResult.success) {
      return jsonValidationError(paramsResult.error);
    }

    const detail = await getDeviceSessionDetailById(paramsResult.data.id);

    if (!detail) {
      return jsonNotFoundError("Device session not found.");
    }

    return jsonSuccess(detail);
  } catch (error) {
    console.error("Failed to load device session.", error);

    return jsonServerError("Failed to load device session.");
  }
}
