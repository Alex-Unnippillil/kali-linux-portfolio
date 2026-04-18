import React from 'react';

const AppToolbar = ({
  as: Component = 'div',
  className = '',
  children,
  ...rest
}) => {
  return (
    <Component
      className={`flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,rgba(15,148,210,0.14))] px-4 py-3 ${className}`.trim()}
      {...rest}
    >
      {children}
    </Component>
  );
};

export default AppToolbar;
