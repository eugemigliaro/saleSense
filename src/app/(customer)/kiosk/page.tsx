import { getClaimedKioskDeviceSessionDetailById } from "@/lib/device-sessions";

import KioskExperience from "./KioskExperience";
import { KioskUnavailableView } from "./KioskUnavailableView";

interface KioskPageProps {
  searchParams: Promise<{
    device?: string;
    session?: string;
  }>;
}

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
  const { device, session } = await searchParams;
  const requestedDeviceSessionId = device ?? session ?? null;

  if (!requestedDeviceSessionId) {
    return <KioskExperience {...FALLBACK_PRODUCT} />;
  }

  if (!UUID_PATTERN.test(requestedDeviceSessionId)) {
    return <KioskUnavailableView />;
  }

  const detail = await getClaimedKioskDeviceSessionDetailById(
    requestedDeviceSessionId,
  ).catch(() => null);

  if (!detail) {
    return <KioskUnavailableView />;
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
      sourceLabel="Claimed device session"
    />
  );
}
