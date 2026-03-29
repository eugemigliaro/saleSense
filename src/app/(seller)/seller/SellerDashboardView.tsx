"use client";

import {
  ArrowRightLeft,
  BadgePercent,
  Clock3,
  CircleCheckBig,
  MessageSquareQuote,
  MessagesSquare,
  PieChart,
  SmilePlus,
} from "lucide-react";

import type { ConversationAnalytics, Product } from "@/types/domain";

import { buildSellerDashboardMetrics } from "./sellerAnalytics";

interface SellerDashboardViewProps {
  analytics: ConversationAnalytics[];
  capturedContactCount: number;
  confirmedSaleCount: number;
  products: Product[];
}

function formatDuration(seconds: number) {
  if (seconds <= 0) {
    return "0m";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

function formatPercentage(value: number) {
  return `${Math.round(value * 100)}%`;
}

function BreakdownBars({
  items,
}: {
  items: Array<{ count: number; label: string }>;
}) {
  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 ui-text-small">
            <span className="truncate text-foreground">{item.label}</span>
            <span className="font-medium text-muted-foreground">{item.count}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max((item.count / maxCount) * 100, 8)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function PieDonutChart({
  centerLabel,
  label,
  segments,
}: {
  centerLabel: string;
  label: string;
  segments: Array<{ color: string; label: string; value: number }>;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-40 w-40 items-center justify-center rounded-full border border-border bg-muted/40 ui-text-small text-muted-foreground">
        No data
      </div>
    );
  }

  const stops = segments.reduce<string[]>((accumulator, segment) => {
    const previousAngle = accumulator.length
      ? accumulator.reduce((angle, stop) => {
          const match = stop.match(/(\d+(?:\.\d+)?)deg$/);
          return match ? Number(match[1]) : angle;
        }, 0)
      : 0;
    const nextAngle = previousAngle + (segment.value / total) * 360;

    accumulator.push(
      `${segment.color} ${previousAngle}deg ${nextAngle}deg`,
    );

    return accumulator;
  }, []);

  return (
    <div
      aria-label={label}
      className="relative h-40 w-40 rounded-full"
      role="img"
      style={{
        backgroundImage: `conic-gradient(${stops.join(", ")})`,
      }}
    >
      <div className="absolute inset-[22%] flex items-center justify-center rounded-full border border-border bg-card">
        <div className="text-center">
          <p className="font-display ui-text-large font-semibold text-foreground">
            {Math.round(((segments[0]?.value ?? 0) / total) * 100)}%
          </p>
          <p className="ui-text-small text-muted-foreground">{centerLabel}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  body,
  icon: Icon,
  title,
  value,
}: {
  body: string;
  icon: typeof MessagesSquare;
  title: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <p className="ui-text-small font-medium text-muted-foreground">{title}</p>
      </div>
      <p className="font-display ui-text-large font-semibold text-foreground">
        {value}
      </p>
      <p className="mt-2 ui-text-small leading-6 text-muted-foreground">{body}</p>
    </article>
  );
}

export function SellerDashboardView({
  analytics,
  capturedContactCount,
  confirmedSaleCount,
  products,
}: SellerDashboardViewProps) {
  const metrics = buildSellerDashboardMetrics(analytics, products, {
    capturedContactCount,
    confirmedSaleCount,
  });
  const highIntentSalesBreakdown = [
    {
      count: metrics.highIntentStoreConfirmedSales,
      label: "Store-confirmed sales",
    },
    {
      count: metrics.highIntentAiInferredSales,
      label: "AI-inferred sales",
    },
  ];
  const contactChannelBreakdown = [
    {
      color: "rgb(37 99 235)",
      label: "Left a contact channel",
      value: metrics.contactChannelCaptureCount,
    },
    {
      color: "rgb(203 213 225)",
      label: "Did not leave contact details",
      value: metrics.contactChannelMissingCount,
    },
  ];
  const confirmedSalesBreakdown = [
    {
      color: "rgb(37 99 235)",
      label: "Confirmed by seller",
      value: metrics.confirmedSalesCount,
    },
    {
      color: "rgb(203 213 225)",
      label: "Not confirmed",
      value: metrics.confirmedSalesRemainingCount,
    },
  ];

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-display ui-text-large font-semibold">Dashboard</h2>
        <p className="mt-1 ui-text-small text-muted-foreground">
          Prototype conversation analytics layout using temporary per-session data
          until live ingestion lands.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <SummaryCard
          icon={MessagesSquare}
          title="Amount of conversations"
          value={`${metrics.totalConversations}`}
          body="Current conversation count represented in the analytics dataset."
        />
        <SummaryCard
          icon={Clock3}
          title="Average conversation length"
          value={formatDuration(metrics.averageConversationDurationSeconds)}
          body="Average elapsed time from conversation start to end."
        />
        <SummaryCard
          icon={CircleCheckBig}
          title="Confirmed sales"
          value={formatPercentage(metrics.confirmedSalesRate)}
          body={`${metrics.confirmedSalesCount} of ${metrics.totalConversations} conversations have been confirmed by a seller.`}
        />
        <SummaryCard
          icon={PieChart}
          title="Contact channel capture"
          value={formatPercentage(metrics.contactChannelCaptureRate)}
          body={`${metrics.contactChannelCaptureCount} of ${metrics.totalConversations} conversations ended with contact details.`}
        />
        <SummaryCard
          icon={ArrowRightLeft}
          title="Redirected to other products"
          value={formatPercentage(metrics.redirectedConversationRate)}
          body={
            metrics.topRedirectTargets.length > 0
              ? `Most redirected-to: ${metrics.topRedirectTargets
                  .map((item) => item.label)
                  .join(", ")}.`
              : "No redirect target trends available yet."
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <CircleCheckBig className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">
                Confirmed sales after conversation
              </h3>
              <p className="ui-text-small text-muted-foreground">
                Percentage of conversations manually marked as closed sales.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <PieDonutChart
              centerLabel="confirmed"
              label="Confirmed sales breakdown"
              segments={confirmedSalesBreakdown}
            />
            <div className="flex-1 space-y-3">
              {confirmedSalesBreakdown.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="ui-text-small text-foreground">
                      {item.label}
                    </span>
                  </div>
                  <span className="ui-text-small font-medium text-muted-foreground">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <PieChart className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">
                Contact channel left after conversation
              </h3>
              <p className="ui-text-small text-muted-foreground">
                Percentage of conversations that end with a captured contact path.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <PieDonutChart
              centerLabel="captured"
              label="Contact channel capture breakdown"
              segments={contactChannelBreakdown}
            />
            <div className="flex-1 space-y-3">
              {contactChannelBreakdown.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="ui-text-small text-foreground">
                      {item.label}
                    </span>
                  </div>
                  <span className="ui-text-small font-medium text-muted-foreground">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <BadgePercent className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">
                High probability of customer buying
              </h3>
              <p className="ui-text-small text-muted-foreground">
                Conversations with a modeled buy probability above 80%.
              </p>
            </div>
          </div>

          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="font-display ui-text-large font-semibold text-foreground">
                {metrics.highIntentConversationCount}
              </p>
              <p className="ui-text-small text-muted-foreground">
                {formatPercentage(metrics.highIntentConversationRate)} of all
                conversations
              </p>
            </div>
            <p className="ui-text-small text-muted-foreground">
              Includes both AI-inferred and store-confirmed outcomes.
            </p>
          </div>

          <BreakdownBars items={highIntentSalesBreakdown} />
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <SmilePlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Client feedback</h3>
              <p className="ui-text-small text-muted-foreground">
                Feedback sentiment breakdown captured after conversations.
              </p>
            </div>
          </div>

          <BreakdownBars items={metrics.clientFeedback} />
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm xl:col-span-2">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <MessageSquareQuote className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">
                Frequently asked questions
              </h3>
              <p className="ui-text-small text-muted-foreground">
                Topic-first FAQ ranking with representative question examples.
              </p>
            </div>
          </div>

          {metrics.faqTopics.length === 0 ? (
            <p className="ui-text-small text-muted-foreground">
              FAQ topics will appear once conversation analytics are available.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {metrics.faqTopics.map((topic) => (
                <div
                  key={topic.label}
                  className="rounded-xl border border-border bg-muted/40 px-4 py-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{topic.label}</p>
                      {topic.example ? (
                        <p className="mt-1 ui-text-small leading-6 text-muted-foreground">
                          {topic.example}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 ui-text-small font-medium text-primary">
                      {topic.count}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.max(
                          (topic.count / Math.max(metrics.faqTopics[0]?.count ?? 1, 1)) *
                            100,
                          12,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
