export type CspPresetId = 'strict' | 'balanced' | 'relaxed';

export interface CspDirectiveDefinition {
  /**
   * CSP directive key such as `default-src` or `img-src`.
   */
  name: string;
  /**
   * Space separated list of sources for the directive.
   */
  value: string;
  /**
   * Human readable description that explains the intent of the directive.
   */
  description: string;
}

export interface CspPreset {
  id: CspPresetId;
  /** Display name for the preset in the UI. */
  title: string;
  /** Short blurb that summarises the focus of the profile. */
  summary: string;
  /** Full list of directives that should be applied when the preset is selected. */
  directives: CspDirectiveDefinition[];
  /** Supplemental guidance that is surfaced beside the preset diff summary. */
  notes: string[];
}

const strictPreset: CspPreset = {
  id: 'strict',
  title: 'Strict lockdown',
  summary:
    'Locks every resource to the application origin and disables inline execution for a hardened baseline.',
  directives: [
    {
      name: 'default-src',
      value: "'self'",
      description: 'Fallback for any directive not explicitly set. Only same-origin resources are permitted.',
    },
    {
      name: 'script-src',
      value: "'self'",
      description: 'Blocks third-party scripts and inline execution to reduce the risk of XSS gadgets.',
    },
    {
      name: 'style-src',
      value: "'self'",
      description: 'Prevents inline styles and remote stylesheets that could inject unreviewed CSS.',
    },
    {
      name: 'img-src',
      value: "'self' data:",
      description: 'Allows same-origin images or embedded data URIs so UI icons still render.',
    },
    {
      name: 'font-src',
      value: "'self'",
      description: 'Fonts must be served from the app to avoid tracking via third-party CDNs.',
    },
    {
      name: 'connect-src',
      value: "'self'",
      description: 'Restricts fetch/XHR/WebSocket connections to the primary origin.',
    },
    {
      name: 'frame-ancestors',
      value: "'self'",
      description: 'Prevents the site from being embedded in other origins, mitigating clickjacking.',
    },
    {
      name: 'form-action',
      value: "'self'",
      description: 'Ensures form submissions only target same-origin endpoints.',
    },
    {
      name: 'object-src',
      value: "'none'",
      description: 'Blocks legacy plug-in content such as Flash or PDF object embeds.',
    },
    {
      name: 'base-uri',
      value: "'self'",
      description: 'Stops attackers from tampering with the document base URL to hijack relative links.',
    },
  ],
  notes: [
    'Best starting point for new apps that have full control over their resources.',
    'Expect to add granular exceptions for analytics, fonts, or integrations as requirements grow.',
    'Inline scripts and styles are blocked so legacy snippets may require refactoring before rollout.',
  ],
};

const balancedPreset: CspPreset = {
  id: 'balanced',
  title: 'Balanced production',
  summary:
    'Keeps a same-origin default but whitelists the most common SaaS integrations used by dashboards.',
  directives: [
    {
      name: 'default-src',
      value: "'self'",
      description: 'Same-origin fallback keeps the policy easy to reason about.',
    },
    {
      name: 'script-src',
      value: "'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
      description: 'Allows analytics tag loaders while keeping third-party script hosts explicit.',
    },
    {
      name: 'style-src',
      value: "'self' 'unsafe-inline' https://fonts.googleapis.com",
      description: 'Inline styles remain for component libraries while permitting Google Fonts CSS.',
    },
    {
      name: 'img-src',
      value: "'self' data: https:",
      description: 'Supports CDN-hosted avatars, screenshots, and data URIs for UI sprites.',
    },
    {
      name: 'font-src',
      value: "'self' https://fonts.gstatic.com",
      description: 'Fonts may load from Google Fonts in addition to the primary origin.',
    },
    {
      name: 'connect-src',
      value: "'self' https://api.example.com https://www.google-analytics.com",
      description: 'Permits API calls to the backend and analytics beacons for instrumentation.',
    },
    {
      name: 'frame-src',
      value: "'self' https://www.youtube.com https://player.vimeo.com",
      description: 'Whitelists trusted media providers for embedded walkthrough videos.',
    },
    {
      name: 'frame-ancestors',
      value: "'self'",
      description: 'Still prevents third-party framing of the main app surface.',
    },
    {
      name: 'form-action',
      value: "'self'",
      description: 'Forms continue to post back to the application to avoid credential phishing.',
    },
    {
      name: 'object-src',
      value: "'none'",
      description: 'Legacy plug-ins remain disabled for broad compatibility.',
    },
    {
      name: 'base-uri',
      value: "'self'",
      description: 'Protects relative links from being rewritten by injected scripts.',
    },
  ],
  notes: [
    'Intended for production dashboards that embed analytics and hosted media players.',
    'Inline scripts are still enabled to accommodate legacy widgets—migrate to non-inline scripts when possible.',
    'Review the allowlists regularly and tighten hosts that are no longer required.',
  ],
};

const relaxedPreset: CspPreset = {
  id: 'relaxed',
  title: 'Relaxed staging',
  summary:
    'Opens additional sources that make it easier to prototype integrations while still avoiding obvious anti-patterns.',
  directives: [
    {
      name: 'default-src',
      value: "'self' https:",
      description: 'Permits loading most content over HTTPS which is common during discovery work.',
    },
    {
      name: 'script-src',
      value: "'self' 'unsafe-inline' 'unsafe-eval' https:",
      description: 'Allows inline scripts and eval for debugging frameworks, but still forces HTTPS.',
    },
    {
      name: 'style-src',
      value: "'self' 'unsafe-inline' https:",
      description: 'Developers can iterate with remote style frameworks without constant CSP edits.',
    },
    {
      name: 'img-src',
      value: "'self' data: blob: https:",
      description: 'Supports screenshots and files from a wide range of HTTPS origins during testing.',
    },
    {
      name: 'font-src',
      value: "'self' data: https:",
      description: 'Allows hosted icon fonts and data URIs generated during rapid prototyping.',
    },
    {
      name: 'connect-src',
      value: "'self' https: wss:",
      description: 'Permits WebSocket experimentation and calls to remote APIs over HTTPS.',
    },
    {
      name: 'media-src',
      value: "'self' https:",
      description: 'Enables streaming audio or video content from remote providers.',
    },
    {
      name: 'frame-src',
      value: '* data:',
      description: 'Allows embedding arbitrary HTTPS tools or sandboxes while iterating on integrations.',
    },
    {
      name: 'frame-ancestors',
      value: "'self' https://trusted.example.com",
      description: 'Keeps clickjacking protections but permits a known partner to frame the app.',
    },
    {
      name: 'form-action',
      value: "'self' https:",
      description: 'Forms may submit to partner HTTPS endpoints commonly used in staging tests.',
    },
    {
      name: 'object-src',
      value: "'none'",
      description: 'Even in relaxed mode, legacy plug-ins remain blocked.',
    },
  ],
  notes: [
    'Use for staging or demo environments where developer velocity is prioritised over a locked-down CSP.',
    'Continuously audit remote hosts that creep into the policy and prune before promoting to production.',
    'Because eval and inline execution are enabled, never deploy this profile to untrusted environments.',
  ],
};

export const CSP_PRESETS: Record<CspPresetId, CspPreset> = {
  strict: strictPreset,
  balanced: balancedPreset,
  relaxed: relaxedPreset,
};

export const PRESET_LIST = Object.values(CSP_PRESETS);
