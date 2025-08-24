export interface RequestResponse {
  duration: number;
  status: number;
  statusText?: string;
  headers: Record<string, string>;
  body: string;
  error?: string;
}

