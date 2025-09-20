export type ThemeMode = 'light' | 'dark';

export interface ThemeAttribution {
  author: string;
  url?: string;
  email?: string;
  source?: string;
  license?: string;
}

export interface ThemeMetadata {
  /** Unique identifier used for persistence */
  id: string;
  /** Human friendly name shown in the gallery */
  name: string;
  /** Short marketing style description */
  description?: string;
  /** Semver style version for compatibility checks */
  version: string;
  /** Indicates whether the palette is light or dark biased */
  mode: ThemeMode;
  /** Optional tags exposed in filters */
  tags?: string[];
  /** Attribution details surfaced in the UI */
  attribution: ThemeAttribution;
  /** Optional preview image or swatch reference */
  previewImage?: string;
  /** ISO8601 string used when sharing */
  createdAt?: string;
}

export interface ThemeColorTokens {
  background: string;
  surface: string;
  surfaceAlt: string;
  muted: string;
  text: string;
  textMuted: string;
  accent: string;
  accentMuted: string;
  accentContrast: string;
  border: string;
  borderStrong: string;
  focus: string;
  selection: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  terminal: string;
}

export interface ThemeTypographyTokens {
  fontFamily: string;
  headingFamily: string;
  monospaceFamily: string;
  baseFontSize: string;
  lineHeight: number;
  letterSpacing: string;
}

export interface ThemeDefinition {
  metadata: ThemeMetadata;
  colors: ThemeColorTokens;
  typography: ThemeTypographyTokens;
  notes?: string;
}
