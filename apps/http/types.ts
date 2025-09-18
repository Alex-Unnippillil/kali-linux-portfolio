export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type BodyMode = 'none' | 'json' | 'form';

export interface HttpRequestPayload {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  bodyMode: BodyMode;
  bodyText?: string;
  formData?: Record<string, string>;
}

export interface HttpResponsePayload {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
  transport: 'mock' | 'network';
  error?: string;
}
