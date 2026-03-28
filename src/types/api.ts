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
