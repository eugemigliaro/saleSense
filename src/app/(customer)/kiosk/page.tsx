import { getDeviceSessionDetailById } from "@/lib/device-sessions";

import KioskExperience from "./KioskExperience";

interface KioskPageProps {
  searchParams: Promise<{
    session?: string;
  }>;
}

const PREVIEW_DEVICE_SESSION_ID = "9d2f8f92-9e4f-4df5-8df1-5b1c3d0d0002";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FALLBACK_PRODUCT = {
  brandName: "Apple",
  category: "Smartphone",
  comparisonSnippet:
    "Apple flagship: best camera system, titanium build, A18 Pro, largest display at 6.9 inches.",
  deviceSessionId: null,
  detailsMarkdown: `# iPhone 16 Pro Max

- A18 Pro chip
- 48MP camera system
- Titanium design
- All-day battery life`,
  idleMediaUrl: null,
  productId: null,
  productName: "iPhone 16 Pro Max",
  sourceLabel: "Preview mode",
};

export default async function KioskPage({ searchParams }: KioskPageProps) {
  const { session } = await searchParams;
  const requestedSessionId =
    session && UUID_PATTERN.test(session) ? session : PREVIEW_DEVICE_SESSION_ID;
  const detail = await getDeviceSessionDetailById(requestedSessionId).catch(
    () => null,
  );

  if (!detail) {
    return <KioskExperience {...FALLBACK_PRODUCT} />;
  }

  return (
    <KioskExperience
      brandName={detail.product.brand}
      category={detail.product.category}
      comparisonSnippet={detail.product.comparisonSnippetMarkdown}
      deviceSessionId={detail.deviceSession.id}
      detailsMarkdown={detail.product.detailsMarkdown}
      idleMediaUrl={detail.product.idleMediaUrl}
      productId={detail.product.id}
      productName={detail.product.name}
      sourceLabel={
        requestedSessionId === PREVIEW_DEVICE_SESSION_ID
          ? "Preview demo session"
          : "Live device session"
      }
    />
  );
}
