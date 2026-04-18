import React from 'react';

/**
 * Shared app chrome note:
 * - Use AppPanel/AppToolbar/StatusChip for visual wrappers only.
 * - Keep each app's behavior and layout logic unchanged; pass className for app-specific spacing.
 * - Prefer existing Kali CSS variables to preserve global theming across apps.
 */
const panelToneClasses = {
  default:
    'border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] text-[color:var(--kali-terminal-text)]',
  muted:
    'border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,rgba(4,24,36,0.32))] text-[color:var(--kali-terminal-text)]',
  subtle:
    'border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_96%,rgba(4,12,20,0.35))] text-[color:var(--kali-terminal-text)]',
  terminal:
    'border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,rgba(2,20,14,0.35))] text-[color:var(--kali-terminal-text)]',
  warning:
    'border border-amber-500/40 bg-amber-500/10 text-amber-100',
};

const AppPanel = ({
  as: Component = 'div',
  tone = 'default',
  className = '',
  children,
  ...rest
}) => {
  const toneClass = panelToneClasses[tone] || panelToneClasses.default;

  return (
    <Component className={`rounded-xl ${toneClass} ${className}`.trim()} {...rest}>
      {children}
    </Component>
  );
};

export default AppPanel;
