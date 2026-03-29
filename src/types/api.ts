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

export interface GeminiLiveFunctionResponse {
  id: string;
  name: string;
  response: {
    assistantMessage: string;
  };
}

export interface GeminiLiveFunctionDeclaration {
  description: string;
  name: string;
  parameters: {
    additionalProperties: boolean;
    properties: Record<
      string,
      {
        description?: string;
        type: "STRING";
      }
    >;
    required: string[];
    type: "OBJECT";
  };
}

export interface GeminiLiveConfigPayload {
  generationConfig: {
    maxOutputTokens: number;
  };
  inputAudioTranscription: Record<string, never>;
  outputAudioTranscription: Record<string, never>;
  responseModalities: ["AUDIO"];
  systemInstruction: string;
  temperature: number;
  thinkingConfig: {
    thinkingLevel: "MINIMAL";
  };
  tools: Array<{
    functionDeclarations: GeminiLiveFunctionDeclaration[];
  }>;
}

export interface ChatSessionLiveTokenPayload {
  expiresAt: string;
  liveConfig: GeminiLiveConfigPayload;
  model: string;
  opener: string;
  token: string;
}

export interface ChatSessionLiveToolCallPayload {
  assistantMessage: {
    content: string;
    createdAt: string;
    id: string;
    role: "assistant";
  };
  functionResponse: GeminiLiveFunctionResponse;
  grounding: ChatMessageGrounding | null;
  session: {
    deviceSessionId: string;
    id: string;
    lastActivityAt: string;
    productId: string;
    startedAt: string;
    status: "active" | "completed";
    storeId: string;
  };
  userMessage: {
    content: string;
    createdAt: string;
    id: string;
    role: "user";
  };
}

export interface DeviceSessionLaunchPayload {
  deviceSession: {
    claimedAt: string | null;
    dismissedAt: string | null;
    id: string;
    lastActivityAt: string;
    lastPresenceAt: string | null;
    label: string | null;
    launchedByManagerId: string;
    productId: string;
    startedAt: string;
    state: "idle" | "engaged" | "collecting-lead" | "completed";
    storeId: string;
  };
  kioskUrl: string;
}

export interface DeviceSessionSummaryPayload {
  attentionState: "healthy" | "attention-needed";
  claimedAt: string | null;
  dismissedAt: string | null;
  id: string;
  lastActivityAt: string;
  lastPresenceAt: string | null;
  label: string | null;
  launchedByManagerId: string;
  productId: string;
  startedAt: string;
  state: "idle" | "engaged" | "collecting-lead" | "completed";
  storeId: string;
}
