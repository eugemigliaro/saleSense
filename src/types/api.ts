export interface FieldError {
  code?: string;
  field: string;
  message: string;
}

export interface PaginationMeta {
  page?: number;
  perPage?: number;
  total?: number;
  totalPages?: number;
}

export interface PaginationLinks {
  last?: string;
  next?: string;
  previous?: string;
  self?: string;
}

export interface ApiSuccessResponse<T> {
  data: T;
  links?: PaginationLinks;
  meta?: PaginationMeta;
}

export interface ApiErrorShape {
  code: string;
  details?: FieldError[];
  message: string;
}

export interface ApiErrorResponse {
  error: ApiErrorShape;
}

export type GroundingToolName = "google-search" | "url-context";

export interface GroundingSource {
  host: string;
  title: string;
  url: string;
}

export interface ChatMessageGrounding {
  searchEntryPointRenderedContent: string | null;
  sources: GroundingSource[];
  tools: GroundingToolName[];
}

export interface ProductImportDraft {
  brand: string;
  category: string;
  comparisonSnippetMarkdown: string;
  detailsMarkdown: string;
  idleMediaUrl: string | null;
  name: string;
  sourceUrls: string[];
}

export interface ProductImportDraftPayload {
  draft: ProductImportDraft;
  sources: Array<{
    status: string;
    url: string;
  }>;
  warnings: string[];
}
