"use client";

import React, { useId } from "react";
import classNames from "clsx";
import {
  EMPTY_STATE_FEATURE_CONFIG,
  EmptyStateActionConfig,
  EmptyStateDocsLinkConfig,
  EmptyStateFeatureConfig,
  EmptyStateVariantConfig,
  resolveEmptyStateConfig,
} from "./emptyStatePresets";

export type EmptyStateVariant = "no-permission" | "no-data" | "filtered-out";

export interface EmptyStateActionProps
  extends Partial<EmptyStateActionConfig> {
  onClick?: () => void;
}

export interface EmptyStateDocsLinkProps
  extends Partial<EmptyStateDocsLinkConfig> {}

export type EmptyStateIllustration =
  | {
      kind?: "image";
      src: string;
      alt?: string;
      className?: string;
    }
  | {
      kind: "node";
      element: React.ReactNode;
      ariaHidden?: boolean;
      className?: string;
    };

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  featureId?: keyof typeof EMPTY_STATE_FEATURE_CONFIG | string;
  title?: string;
  description?: string;
  illustration?: EmptyStateIllustration;
  primaryAction?: EmptyStateActionProps;
  secondaryAction?: EmptyStateActionProps;
  docsLink?: EmptyStateDocsLinkProps;
  className?: string;
}

const VARIANT_DEFAULTS: Record<EmptyStateVariant, Required<Pick<EmptyStateVariantConfig, "title" | "description">>> = {
  "no-permission": {
    title: "Permission required",
    description: "You do not currently have permission to view this area.",
  },
  "no-data": {
    title: "No data available",
    description: "There is nothing to show just yet. Activity will appear here once it is recorded.",
  },
  "filtered-out": {
    title: "No results found",
    description: "Nothing matches your filters. Try broadening the criteria to see content.",
  },
};

function mergeAction(
  base: EmptyStateActionConfig | undefined,
  override: EmptyStateActionProps | undefined,
): (EmptyStateActionConfig & { onClick?: () => void }) | undefined {
  if (!base && !override) return undefined;
  const label = override?.label ?? base?.label;
  const href = override?.href ?? base?.href;
  const ariaLabel = override?.ariaLabel ?? base?.ariaLabel;
  const target = override?.target ?? base?.target;
  const onClick = override?.onClick ?? undefined;
  if (!label) return undefined;
  if (!href && !onClick) return undefined;
  return { label, href, ariaLabel, target, onClick };
}

function mergeDocsLink(
  base: EmptyStateDocsLinkConfig | undefined,
  override: EmptyStateDocsLinkProps | undefined,
): EmptyStateDocsLinkConfig | undefined {
  if (!base && !override) return undefined;
  const href = override?.href ?? base?.href;
  const label = override?.label ?? base?.label;
  const ariaLabel = override?.ariaLabel ?? base?.ariaLabel;
  const target = override?.target ?? base?.target;
  if (!href || !label) return undefined;
  return { href, label, ariaLabel, target };
}

function resolveIllustration(illustration: EmptyStateIllustration | undefined) {
  if (!illustration) return null;
  if ("element" in illustration) {
    return (
      <div
        className={classNames("text-[var(--kali-blue)]", illustration.className)}
        aria-hidden={illustration.ariaHidden ?? true}
      >
        {illustration.element}
      </div>
    );
  }
  return (
    <img
      src={illustration.src}
      alt={illustration.alt ?? ""}
      className={classNames("h-16 w-16", illustration.className)}
    />
  );
}

export default function EmptyState({
  variant = "no-data",
  featureId,
  title,
  description,
  illustration,
  primaryAction,
  secondaryAction,
  docsLink,
  className,
}: EmptyStateProps) {
  const headingId = useId();
  const descriptionId = useId();

  const variantDefaults = VARIANT_DEFAULTS[variant];
  const featureConfig = resolveEmptyStateConfig(featureId, variant);

  const resolvedTitle = title ?? featureConfig?.title ?? variantDefaults.title;
  const resolvedDescription =
    description ?? featureConfig?.description ?? variantDefaults.description;

  const resolvedPrimaryAction = mergeAction(featureConfig?.primaryAction, primaryAction);
  const resolvedSecondaryAction = mergeAction(
    featureConfig?.secondaryAction,
    secondaryAction,
  );
  const resolvedDocsLink = mergeDocsLink(featureConfig?.docsLink, docsLink);

  const illustrationNode = resolveIllustration(illustration);

  const actionGroup =
    resolvedPrimaryAction || resolvedSecondaryAction || resolvedDocsLink ? (
      <div className="flex flex-wrap items-center justify-center gap-2">
        {resolvedPrimaryAction && (
          <ActionButton action={resolvedPrimaryAction} variant="primary" />
        )}
        {resolvedSecondaryAction && (
          <ActionButton action={resolvedSecondaryAction} variant="secondary" />
        )}
        {resolvedDocsLink && (
          <a
            className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white transition hover:border-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a]"
            href={resolvedDocsLink.href}
            target={resolvedDocsLink.target}
            rel={resolvedDocsLink.target === "_blank" ? "noopener noreferrer" : undefined}
            aria-label={
              resolvedDocsLink.ariaLabel ?? `Open documentation for ${resolvedTitle}`
            }
          >
            {resolvedDocsLink.label}
          </a>
        )}
      </div>
    ) : null;

  return (
    <section
      role="status"
      aria-live="polite"
      aria-labelledby={headingId}
      aria-describedby={resolvedDescription ? descriptionId : undefined}
      className={classNames(
        "flex flex-col items-center gap-3 rounded-md bg-black/20 px-4 py-6 text-center text-sm text-gray-200",
        className,
      )}
    >
      {illustrationNode}
      <h2 id={headingId} className="text-base font-semibold text-white">
        {resolvedTitle}
      </h2>
      {resolvedDescription && (
        <p id={descriptionId} className="max-w-md text-xs text-gray-300 sm:text-sm">
          {resolvedDescription}
        </p>
      )}
      {actionGroup}
    </section>
  );
}

interface ActionButtonProps {
  action: EmptyStateActionConfig & { onClick?: () => void };
  variant: "primary" | "secondary";
}

function ActionButton({ action, variant }: ActionButtonProps) {
  const { label, href, onClick, ariaLabel, target } = action;
  const baseClass = classNames(
    "inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a]",
    variant === "primary"
      ? "bg-[var(--kali-blue)] text-white hover:bg-[#53b9ff]"
      : "border border-white/20 text-white hover:border-white/40 hover:bg-white/10",
  );

  if (href) {
    return (
      <a
        className={baseClass}
        href={href}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        aria-label={ariaLabel ?? label}
        onClick={onClick}
      >
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={baseClass}
      onClick={onClick}
      aria-label={ariaLabel ?? label}
    >
      {label}
    </button>
  );
}

export {
  EMPTY_STATE_FEATURE_CONFIG,
  resolveEmptyStateConfig,
  type EmptyStateVariantConfig,
  type EmptyStateFeatureConfig,
};
