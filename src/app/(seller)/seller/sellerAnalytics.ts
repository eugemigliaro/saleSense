import type { Lead, Product } from "@/types/domain";

export interface LeadsOverTimePoint {
  count: number;
  dayLabel: string;
}

export interface DashboardBreakdownItem {
  count: number;
  label: string;
}

export interface SellerDashboardMetrics {
  inferredInterest: DashboardBreakdownItem[];
  leadsOverTime: LeadsOverTimePoint[];
  nextBestProducts: DashboardBreakdownItem[];
  productLeaderboard: DashboardBreakdownItem[];
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function startOfDay(date: Date) {
  const next = new Date(date);

  next.setHours(0, 0, 0, 0);

  return next;
}

function sortBreakdown(items: DashboardBreakdownItem[]) {
  return [...items].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.label.localeCompare(right.label);
  });
}

export function buildSellerDashboardMetrics(
  leads: Lead[],
  products: Product[],
): SellerDashboardMetrics {
  const productNameById = new Map(products.map((product) => [product.id, product.name]));
  const today = startOfDay(new Date());
  const timeBuckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);

    date.setDate(today.getDate() - (6 - index));

    return {
      count: 0,
      date,
      dayLabel: formatDayLabel(date),
      key: startOfDay(date).toISOString(),
    };
  });
  const leadsByDay = new Map(timeBuckets.map((bucket) => [bucket.key, 0]));
  const interestCounts = new Map<string, number>();
  const nextBestCounts = new Map<string, number>();
  const productCounts = new Map<string, number>();

  for (const lead of leads) {
    const createdAt = startOfDay(new Date(lead.createdAt)).toISOString();

    if (leadsByDay.has(createdAt)) {
      leadsByDay.set(createdAt, (leadsByDay.get(createdAt) ?? 0) + 1);
    }

    const productLabel = productNameById.get(lead.productId) ?? "Unknown product";
    productCounts.set(productLabel, (productCounts.get(productLabel) ?? 0) + 1);

    const inferredInterest = lead.inferredInterest?.trim() || "Interest pending";
    interestCounts.set(
      inferredInterest,
      (interestCounts.get(inferredInterest) ?? 0) + 1,
    );

    if (lead.nextBestProduct?.trim()) {
      nextBestCounts.set(
        lead.nextBestProduct,
        (nextBestCounts.get(lead.nextBestProduct) ?? 0) + 1,
      );
    }
  }

  return {
    inferredInterest: sortBreakdown(
      Array.from(interestCounts.entries()).map(([label, count]) => ({
        count,
        label,
      })),
    ).slice(0, 5),
    leadsOverTime: timeBuckets.map((bucket) => ({
      count: leadsByDay.get(bucket.key) ?? 0,
      dayLabel: bucket.dayLabel,
    })),
    nextBestProducts: sortBreakdown(
      Array.from(nextBestCounts.entries()).map(([label, count]) => ({
        count,
        label,
      })),
    ).slice(0, 5),
    productLeaderboard: sortBreakdown(
      Array.from(productCounts.entries()).map(([label, count]) => ({
        count,
        label,
      })),
    ).slice(0, 5),
  };
}
