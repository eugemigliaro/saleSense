import { getDeviceSessionDetailById } from "@/lib/device-sessions";

import KioskExperience from "./KioskExperience";

interface KioskPageProps {
  searchParams: Promise<{
    session?: string;
  }>;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FALLBACK_PRODUCT = {
  brandName: "SaleSense",
  category: "Interactive retail demo",
  productName: "Flagship product preview",
  sourceLabel: "Preview mode",
};

export default async function KioskPage({ searchParams }: KioskPageProps) {
  const { session } = await searchParams;

  if (!session || !UUID_PATTERN.test(session)) {
    return <KioskExperience {...FALLBACK_PRODUCT} />;
  }

  const detail = await getDeviceSessionDetailById(session).catch(() => null);

  if (!detail) {
    return <KioskExperience {...FALLBACK_PRODUCT} />;
  }

  return (
    <KioskExperience
      brandName={detail.product.brand}
      category={detail.product.category}
      productName={detail.product.name}
      sourceLabel="Live device session"
    />
  );
}
