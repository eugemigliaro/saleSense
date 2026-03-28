"use client";

import { Globe, Sparkles } from "lucide-react";
import { useState } from "react";

import type { ProductFormState } from "./sellerWorkspaceUtils";

interface ProductAiAutocompleteProps {
  onApply: (nextState: ProductFormState) => void;
}

function slugToTitle(value: string) {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildGenericProductName(url: URL) {
  const pathSegments = url.pathname.split("/").filter(Boolean);
  const lastSegment = pathSegments.at(-1);

  if (lastSegment) {
    const normalized = slugToTitle(lastSegment);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return `${slugToTitle(url.hostname.split(".")[0] ?? "Flagship")} Product`;
}

function buildAutocompleteDraft(sourceUrl: string): ProductFormState {
  const url = new URL(sourceUrl);
  const normalized = `${url.hostname}${url.pathname}`.toLowerCase();
  const genericProductName = buildGenericProductName(url);

  if (normalized.includes("iphone")) {
    return {
      brand: "Apple",
      category: "Smartphones",
      comparisonSnippetMarkdown:
        "Premium iPhone positioning with strong camera, performance, and ecosystem advantages for quick in-store comparison.",
      detailsMarkdown: `# iPhone 16 Pro Max

Apple's premium flagship for customers who want the best iPhone camera system, large display, and polished ecosystem experience.

- 6.9-inch Super Retina XDR display with ProMotion
- Titanium build with premium in-hand feel
- High-end camera system for photo and video demos
- Strong performance and day-long battery positioning`,
      idleMediaUrl: sourceUrl,
      name: "iPhone 16 Pro Max",
    };
  }

  if (normalized.includes("galaxy") || normalized.includes("samsung")) {
    return {
      brand: "Samsung",
      category: "Smartphones",
      comparisonSnippetMarkdown:
        "Flagship Galaxy positioning with premium display, camera, and productivity-oriented Android experience.",
      detailsMarkdown: `# Samsung Galaxy S25 Ultra

Samsung's top-tier Galaxy device for customers who want a large display, standout camera specs, and premium Android flexibility.

- Large high-resolution AMOLED display
- Premium camera setup for zoom and detail demos
- Fast flagship chipset performance
- Productivity-oriented premium Android positioning`,
      idleMediaUrl: sourceUrl,
      name: "Samsung Galaxy S25 Ultra",
    };
  }

  if (normalized.includes("pixel") || normalized.includes("google")) {
    return {
      brand: "Google",
      category: "Smartphones",
      comparisonSnippetMarkdown:
        "Camera-first Android flagship with Gemini, clean software, and premium day-to-day usability.",
      detailsMarkdown: `# Google Pixel 9 Pro

Google's premium phone for customers who want a clean Android experience, strong photography, and Gemini-native assistance.

- Bright high-end display with smooth scrolling
- Strong photo quality for in-store camera demos
- Gemini and Google AI positioning built into the experience
- Premium build with polished software feel`,
      idleMediaUrl: sourceUrl,
      name: "Google Pixel 9 Pro",
    };
  }

  return {
    brand: slugToTitle(url.hostname.split(".")[0] ?? "Brand"),
    category: "Consumer electronics",
    comparisonSnippetMarkdown:
      "Frontend-only AI autocomplete preview. Replace this with backend scraping and AI extraction when the API is ready.",
    detailsMarkdown: `# ${genericProductName}

Autocompleted from ${url.hostname} in frontend preview mode.

- Primary product details should be scraped from the source page
- Key selling points should be condensed for in-store conversations
- Comparison positioning should stay grounded in seller-provided data
- Idle media should later be chosen from the product page assets`,
    idleMediaUrl: sourceUrl,
    name: genericProductName,
  };
}

export function ProductAiAutocomplete({
  onApply,
}: ProductAiAutocompleteProps) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isAutocompleting, setIsAutocompleting] = useState(false);

  async function handleAutocomplete() {
    setFeedbackMessage(null);

    try {
      const normalizedUrl = sourceUrl.trim();

      if (!normalizedUrl) {
        throw new Error("Paste a product page URL first.");
      }

      new URL(normalizedUrl);
      setIsAutocompleting(true);

      await new Promise((resolve) => {
        window.setTimeout(resolve, 1100);
      });

      onApply(buildAutocompleteDraft(normalizedUrl));
      setFeedbackMessage(
        "Frontend preview filled the form. Backend scraping and AI extraction can replace this later.",
      );
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Could not autocomplete the product form.",
      );
    } finally {
      setIsAutocompleting(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-border/80 bg-primary/[0.04] p-5 shadow-[0_20px_55px_-35px_rgba(37,99,235,0.55)]">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/12 p-3 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Autocomplete with AI
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Paste the product page URL from the brand or seller site and use
              frontend preview mode to prefill the form.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Globe className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://brand.com/products/device-name"
              className="w-full rounded-xl border border-input bg-background px-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <button
            type="button"
            onClick={() => void handleAutocomplete()}
            disabled={isAutocompleting}
            className="inline-flex min-w-40 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isAutocompleting ? "Autocompleting..." : "Autocomplete"}
          </button>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          This is frontend-only for now. It simulates scraped AI output so the
          product form flow can be designed before backend ingestion exists.
        </p>

        {feedbackMessage ? (
          <div className="rounded-xl border border-border bg-background/75 px-4 py-3 text-sm text-muted-foreground">
            {feedbackMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}
