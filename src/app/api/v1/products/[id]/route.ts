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
import { updateProductForStore } from "@/lib/products";
import {
  productIdParamsSchema,
  updateProductSchema,
} from "@/lib/schemas";

interface ProductRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: Request, context: ProductRouteContext) {
  const sellerContext = await getSellerContext();

  if (!sellerContext) {
    return jsonUnauthorizedError();
  }

  try {
    const paramsResult = productIdParamsSchema.safeParse(await context.params);

    if (!paramsResult.success) {
      return jsonValidationError(paramsResult.error);
    }

    const body = await readJsonBody(request);
    const validationResult = updateProductSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonValidationError(validationResult.error);
    }

    const product = await updateProductForStore(
      paramsResult.data.id,
      sellerContext.storeId,
      validationResult.data,
    );

    if (!product) {
      return jsonNotFoundError("Product not found.");
    }

    return jsonSuccess(product);
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      return jsonInvalidJsonError();
    }

    console.error("Failed to update product.", error);

    return jsonServerError("Failed to update product.");
  }
}
