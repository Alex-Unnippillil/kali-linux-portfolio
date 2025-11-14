import type { EmptyStateVariant } from "./EmptyState";

export interface EmptyStateActionConfig {
  label: string;
  href?: string;
  ariaLabel?: string;
  target?: string;
}

export interface EmptyStateDocsLinkConfig {
  label: string;
  href: string;
  ariaLabel?: string;
  target?: string;
}

export interface EmptyStateVariantConfig {
  title?: string;
  description?: string;
  primaryAction?: EmptyStateActionConfig;
  secondaryAction?: EmptyStateActionConfig;
  docsLink?: EmptyStateDocsLinkConfig;
}

export interface EmptyStateFeatureConfig {
  default?: EmptyStateVariantConfig;
  variants?: Partial<Record<EmptyStateVariant, EmptyStateVariantConfig>>;
}

export type EmptyStateFeatureMap = Record<string, EmptyStateFeatureConfig>;

export const EMPTY_STATE_FEATURE_CONFIG: EmptyStateFeatureMap = {
  "launcher-search": {
    variants: {
      "filtered-out": {
        title: "No applications match your search",
        description: "Adjust your filters or browse the catalog to discover more tools.",
        primaryAction: {
          label: "Clear search",
          ariaLabel: "Clear the current search query",
        },
        docsLink: {
          label: "Browse app catalog",
          href: "https://unnippillil.com/apps",
          ariaLabel: "Open the portfolio app catalog",
          target: "_blank",
        },
      },
    },
  },
  "todoist-board": {
    variants: {
      "no-data": {
        title: "No tasks in this view",
        description: "Create a task to start tracking work or import a template project.",
        primaryAction: {
          label: "Add a task",
          ariaLabel: "Focus the quick add task input",
        },
        secondaryAction: {
          label: "View keyboard shortcuts",
          href: "https://github.com/Alex-Unnippillil/kali-linux-portfolio/blob/main/docs/TASKS_UI_POLISH.md",
          ariaLabel: "Open task management shortcuts documentation",
          target: "_blank",
        },
      },
    },
  },
  "network-share-logs": {
    variants: {
      "no-data": {
        title: "No share activity yet",
        description: "Generate a QR code or NFC share to populate the activity log.",
        docsLink: {
          label: "Share workflow reference",
          href: "https://github.com/Alex-Unnippillil/kali-linux-portfolio/blob/main/docs/captive-portal-service.md",
          ariaLabel: "Open network sharing workflow reference",
          target: "_blank",
        },
      },
    },
  },
  "network-permissions": {
    variants: {
      "no-permission": {
        title: "Network access is disabled",
        description: "Enable network features in Settings to allow simulated requests and sharing.",
        primaryAction: {
          label: "Open Settings",
          ariaLabel: "Open the Settings app to manage permissions",
        },
        docsLink: {
          label: "Privacy controls",
          href: "https://github.com/Alex-Unnippillil/kali-linux-portfolio/blob/main/docs/getting-started.md#privacy",
          ariaLabel: "Learn about privacy controls",
          target: "_blank",
        },
      },
    },
  },
};

export function resolveEmptyStateConfig(
  featureId: string | undefined,
  variant: EmptyStateVariant | undefined,
): EmptyStateVariantConfig | undefined {
  if (!featureId) return undefined;
  const featureConfig = EMPTY_STATE_FEATURE_CONFIG[featureId];
  if (!featureConfig) return undefined;
  const base = featureConfig.default ?? {};
  if (!variant) {
    return Object.keys(base).length > 0 ? base : undefined;
  }
  const variantConfig = featureConfig.variants?.[variant] ?? {};
  return { ...base, ...variantConfig };
}
