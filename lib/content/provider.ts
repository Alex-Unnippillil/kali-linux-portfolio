export interface ContentItem {
  /** Stable identifier for the record. */
  id: string;
  /** URL safe slug for routing. */
  slug: string;
  /** Display title. */
  title: string;
  /** Optional short summary. */
  excerpt?: string | null;
  /** Optional rich body content. */
  body?: string | null;
  /** Optional tags applied to the record. */
  tags?: string[];
  /** Last updated ISO timestamp, if available. */
  updatedAt?: string | null;
  /** Container for provider specific metadata that consumers may opt into. */
  metadata?: Record<string, unknown>;
}

export interface ListContentOptions {
  /** Limit the number of items returned. */
  limit?: number;
  /** Filter items by a given tag. */
  tag?: string;
}

export interface ContentProvider {
  /**
   * Fetch a list of records, optionally filtered via `ListContentOptions`.
   */
  listContent(options?: ListContentOptions): Promise<ContentItem[]>;
  /**
   * Fetch a single record by slug. Returns `null` when the record is missing.
   */
  getContent(slug: string): Promise<ContentItem | null>;
}

export type ContentProviderName = 'local' | 'notion';

export const CONTENT_PROVIDER_ENV = 'CONTENT_PROVIDER';
export const PUBLIC_CONTENT_PROVIDER_ENV = 'NEXT_PUBLIC_CONTENT_PROVIDER';
