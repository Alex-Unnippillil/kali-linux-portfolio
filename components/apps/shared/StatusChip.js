import React from 'react';

const statusStyles = {
  neutral:
    'border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] text-[color:var(--kali-terminal-text)]',
  info:
    'border border-[color:color-mix(in_srgb,var(--kali-blue)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_86%,rgba(15,148,210,0.2))] text-[color:var(--kali-terminal-text)]',
  success:
    'border border-emerald-500/60 bg-emerald-900/50 text-emerald-100',
  warning:
    'border border-amber-500/40 bg-amber-500/10 text-amber-100',
};

const StatusChip = ({
  as: Component = 'span',
  tone = 'neutral',
  className = '',
  children,
  ...rest
}) => {
  const toneClass = statusStyles[tone] || statusStyles.neutral;

  return (
    <Component
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${toneClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </Component>
  );
};

export default StatusChip;
