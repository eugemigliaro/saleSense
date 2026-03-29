import {
  jsonNotFoundError,
  jsonServerError,
  jsonUnauthorizedError,
  jsonValidationError,
} from "@/lib/api-request";
import { jsonSuccess } from "@/lib/api-response";
import { recordDeviceSessionPresence } from "@/lib/device-sessions";
import {
  KioskAccessError,
  requireKioskDeviceSessionAccess,
} from "@/lib/kiosk-auth";
import { deviceSessionIdParamsSchema } from "@/lib/schemas";

interface DeviceSessionHeartbeatRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  _request: Request,
  context: DeviceSessionHeartbeatRouteContext,
) {
  try {
    const paramsResult = deviceSessionIdParamsSchema.safeParse(
      await context.params,
    );

    if (!paramsResult.success) {
      return jsonValidationError(paramsResult.error);
    }

    await requireKioskDeviceSessionAccess(paramsResult.data.id);

    const deviceSession = await recordDeviceSessionPresence(paramsResult.data.id);

    if (!deviceSession) {
      return jsonNotFoundError("Device session not found.");
    }

    return jsonSuccess({
      acknowledged: true,
      session: deviceSession,
    });
  } catch (error) {
    if (error instanceof KioskAccessError) {
      return jsonUnauthorizedError("Kiosk session is not authorized.");
    }

    console.error("Failed to record device session heartbeat.", error);

    return jsonServerError("Failed to record device session heartbeat.");
  }
}
