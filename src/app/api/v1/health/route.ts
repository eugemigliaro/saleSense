import { jsonSuccess } from "@/lib/api-response";

export function GET() {
  return jsonSuccess({
    service: "salesense",
    status: "ok",
    version: "0.1.0",
  });
}
