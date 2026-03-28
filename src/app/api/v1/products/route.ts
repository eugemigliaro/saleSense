import { getSellerContext } from "@/lib/auth";
import {
  InvalidJsonBodyError,
  jsonInvalidJsonError,
  jsonServerError,
  jsonUnauthorizedError,
  jsonValidationError,
  readJsonBody,
} from "@/lib/api-request";
import { jsonSuccess } from "@/lib/api-response";
import {
  createProductForStore,
  listProductsByStore,
} from "@/lib/products";
import { createProductSchema } from "@/lib/schemas";

export async function GET() {
  const sellerContext = await getSellerContext();

  if (!sellerContext) {
    return jsonUnauthorizedError();
  }

  try {
    const products = await listProductsByStore(sellerContext.storeId);

    return jsonSuccess(products);
  } catch (error) {
    console.error("Failed to list products.", error);

    return jsonServerError("Failed to load products.");
  }
}

export async function POST(request: Request) {
  const sellerContext = await getSellerContext();

  if (!sellerContext) {
    return jsonUnauthorizedError();
  }

  try {
    const body = await readJsonBody(request);
    const validationResult = createProductSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonValidationError(validationResult.error);
    }

    const product = await createProductForStore(
      sellerContext.storeId,
      validationResult.data,
    );

    return jsonSuccess(product, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      return jsonInvalidJsonError();
    }

    console.error("Failed to create product.", error);

    return jsonServerError("Failed to create product.");
  }
}
