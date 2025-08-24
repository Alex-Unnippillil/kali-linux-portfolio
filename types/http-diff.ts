export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface FetchMeta {
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  redirects: { url: string; status: number }[];
  altSvc?: string;
  http3: {
    supported: boolean;
    h1: number;
    h3?: number;
    delta?: number;
    error?: string;
  };
}

export interface ApiResult {
  url1: FetchMeta;
  url2: FetchMeta;
  bodyDiff: DiffPart[];
  headersDiff: DiffPart[];
}

export type HttpDiffResponse = ApiResult | { error: string };

