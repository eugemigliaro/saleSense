import "server-only";

import type {
  ChatMessageGrounding,
  GroundingSource,
  GroundingToolName,
} from "@/types/api";

function normalizeUrl(value: string) {
  try {
    return new URL(value).toString();
  } catch {
    return value;
  }
}

function getUrlHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function dedupeSources(sources: GroundingSource[]) {
  const uniqueSources = new Map<string, GroundingSource>();

  for (const source of sources) {
    uniqueSources.set(source.url, source);
  }

  return [...uniqueSources.values()];
}

function normalizeGoogleSearchSources(metadata: unknown) {
  const groundingChunks =
    metadata &&
    typeof metadata === "object" &&
    "groundingChunks" in metadata &&
    Array.isArray(metadata.groundingChunks)
      ? metadata.groundingChunks
      : [];

  const sources: GroundingSource[] = [];

  for (const chunk of groundingChunks) {
    const web =
      chunk &&
      typeof chunk === "object" &&
      "web" in chunk &&
      chunk.web &&
      typeof chunk.web === "object"
        ? chunk.web
        : null;

    if (!web) {
      continue;
    }

    const url =
      "uri" in web && typeof web.uri === "string" ? normalizeUrl(web.uri) : null;

    if (!url) {
      continue;
    }

    sources.push({
      host: getUrlHost(url),
      title:
        "title" in web && typeof web.title === "string" && web.title.trim().length > 0
          ? web.title.trim()
          : getUrlHost(url),
      url,
    });
  }

  return dedupeSources(sources);
}

function normalizeUrlContextSources(metadata: unknown) {
  const urlMetadata =
    metadata &&
    typeof metadata === "object" &&
    "urlMetadata" in metadata &&
    Array.isArray(metadata.urlMetadata)
      ? metadata.urlMetadata
      : [];

  const sources: GroundingSource[] = [];

  for (const entry of urlMetadata) {
    const url =
      entry &&
      typeof entry === "object" &&
      "retrievedUrl" in entry &&
      typeof entry.retrievedUrl === "string"
        ? normalizeUrl(entry.retrievedUrl)
        : null;

    if (!url) {
      continue;
    }

    sources.push({
      host: getUrlHost(url),
      title: getUrlHost(url),
      url,
    });
  }

  return dedupeSources(sources);
}

export function buildChatMessageGrounding(input: {
  groundingMetadata: unknown | null;
  requestedTools: GroundingToolName[];
  urlContextMetadata: unknown | null;
}): ChatMessageGrounding | null {
  const tools: GroundingToolName[] = [];
  const sources: GroundingSource[] = [];
  let searchEntryPointRenderedContent: string | null = null;

  if (input.requestedTools.includes("google-search") && input.groundingMetadata) {
    tools.push("google-search");
    sources.push(...normalizeGoogleSearchSources(input.groundingMetadata));

    if (
      typeof input.groundingMetadata === "object" &&
      input.groundingMetadata !== null &&
      "searchEntryPoint" in input.groundingMetadata &&
      input.groundingMetadata.searchEntryPoint &&
      typeof input.groundingMetadata.searchEntryPoint === "object" &&
      "renderedContent" in input.groundingMetadata.searchEntryPoint &&
      typeof input.groundingMetadata.searchEntryPoint.renderedContent === "string"
    ) {
      searchEntryPointRenderedContent =
        input.groundingMetadata.searchEntryPoint.renderedContent;
    }
  }

  if (input.requestedTools.includes("url-context") && input.urlContextMetadata) {
    tools.push("url-context");
    sources.push(...normalizeUrlContextSources(input.urlContextMetadata));
  }

  if (tools.length === 0 || sources.length === 0) {
    return null;
  }

  return {
    searchEntryPointRenderedContent,
    sources: dedupeSources(sources),
    tools,
  };
}
