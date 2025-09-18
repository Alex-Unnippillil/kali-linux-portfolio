import type { ReactNode } from 'react';

export type EmptyStateAction =
  | {
      label: string;
      icon?: ReactNode;
      href: string;
      onClick?: never;
    }
  | {
      label: string;
      icon?: ReactNode;
      onClick: () => void;
      href?: never;
    }
  | {
      label: string;
      icon?: ReactNode;
      href: string;
      onClick: () => void;
    };

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  primaryAction: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  extraActions?: EmptyStateAction[];
  className?: string;
}

function ActionButton({
  action,
  variant,
}: {
  action: EmptyStateAction;
  variant: 'primary' | 'secondary';
}) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40';
  const className =
    variant === 'primary'
      ? `${baseClasses} px-4 py-2 bg-blue-600 text-white hover:bg-blue-500`
      : `${baseClasses} px-2 py-1 text-sm text-blue-300 hover:text-blue-200 underline decoration-dotted`;

  if ('href' in action && action.href) {
    return (
      <a
        href={action.href}
        className={className}
        target="_blank"
        rel="noreferrer"
      >
        {action.icon}
        <span>{action.label}</span>
      </a>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.icon}
      <span>{action.label}</span>
    </button>
  );
}

export default function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  extraActions,
  className,
}: EmptyStateProps) {
  const containerClasses = `flex flex-col items-center justify-center gap-3 rounded border border-dashed border-white/20 bg-white/5 p-6 text-center text-white shadow-inner${
    className ? ` ${className}` : ''
  }`;
  const secondaryActions = [
    secondaryAction,
    ...(extraActions ?? []),
  ].filter(Boolean) as EmptyStateAction[];

  return (
    <div className={containerClasses}>
      <div className="text-4xl" aria-hidden="true">
        {icon}
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-white/80">{description}</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ActionButton action={primaryAction} variant="primary" />
        {secondaryActions.map((action, index) => (
          <ActionButton key={index} action={action} variant="secondary" />
        ))}
      </div>
    </div>
  );
}
