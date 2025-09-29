"use client";

import React from "react";
import clsx from "clsx";
import { useSettings } from "../../hooks/useSettings";

type LayoutProps = React.HTMLAttributes<HTMLDivElement>;

const Layout = React.forwardRef<HTMLDivElement, LayoutProps>(
  ({ className, children, ...props }, ref) => {
    const { density } = useSettings();
    const densityClass = density ? `density-${density}` : undefined;
    return (
      <div
        ref={ref}
        className={clsx(
          "desktop-shell relative h-screen w-screen overflow-hidden bg-transparent text-white antialiased",
          densityClass,
          className,
        )}
        data-density={density}
        {...props}
      >
        {children}
        <style jsx>{`
          .desktop-shell {
            --shell-taskbar-height: calc(2.5rem * var(--density-spacing-scale, 1));
            --shell-taskbar-padding-x: calc(0.75rem * var(--density-spacing-scale, 1));
            --shell-taskbar-gap: var(--space-2, 0.5rem);
            --shell-taskbar-font-size: calc(0.875rem * var(--density-font-scale, 1));
            --shell-taskbar-icon: calc(1.5rem * var(--density-spacing-scale, 1));
            --shell-hit-target: calc(2.5rem * var(--density-spacing-scale, 1));
            --desktop-icon-width: calc(6rem * var(--density-spacing-scale, 1));
            --desktop-icon-height: calc(5.5rem * var(--density-spacing-scale, 1));
            --desktop-icon-padding: var(--space-1, 0.25rem);
            --desktop-icon-gap: var(--space-2, 0.5rem);
            --desktop-icon-image: calc(2.5rem * var(--density-spacing-scale, 1));
            --desktop-icon-font-size: calc(0.75rem * var(--density-font-scale, 1));
            touch-action: manipulation;
            font-size: calc(
              clamp(0.95rem, 0.9rem + 0.2vw, 1rem) * var(--density-font-scale, 1)
            );
          }

          @media (min-width: 640px) {
            .desktop-shell {
              --shell-taskbar-height: calc(2.75rem * var(--density-spacing-scale, 1));
              --shell-taskbar-padding-x: calc(0.875rem * var(--density-spacing-scale, 1));
              --shell-taskbar-gap: var(--space-3, 0.75rem);
              --desktop-icon-width: calc(6.25rem * var(--density-spacing-scale, 1));
              --desktop-icon-height: calc(5.75rem * var(--density-spacing-scale, 1));
            }
          }

          @media (min-width: 768px) {
            .desktop-shell {
              --shell-taskbar-height: calc(3rem * var(--density-spacing-scale, 1));
              --shell-taskbar-padding-x: calc(1rem * var(--density-spacing-scale, 1));
              --shell-taskbar-gap: var(--space-3, 0.75rem);
              --shell-taskbar-font-size: calc(0.925rem * var(--density-font-scale, 1));
              --desktop-icon-width: calc(6.5rem * var(--density-spacing-scale, 1));
              --desktop-icon-height: calc(6rem * var(--density-spacing-scale, 1));
              --desktop-icon-image: calc(2.75rem * var(--density-spacing-scale, 1));
              --desktop-icon-font-size: calc(0.8rem * var(--density-font-scale, 1));
            }
          }

          @media (min-width: 1024px) {
            .desktop-shell {
              --shell-taskbar-height: calc(3.25rem * var(--density-spacing-scale, 1));
              --shell-taskbar-font-size: calc(0.95rem * var(--density-font-scale, 1));
              --desktop-icon-width: calc(6.75rem * var(--density-spacing-scale, 1));
              --desktop-icon-height: calc(6.25rem * var(--density-spacing-scale, 1));
            }
          }

          @media (min-width: 1280px) {
            .desktop-shell {
              --shell-taskbar-height: calc(3.5rem * var(--density-spacing-scale, 1));
              --shell-taskbar-font-size: calc(1rem * var(--density-font-scale, 1));
              --desktop-icon-width: calc(7rem * var(--density-spacing-scale, 1));
              --desktop-icon-height: calc(6.5rem * var(--density-spacing-scale, 1));
              --desktop-icon-image: calc(3rem * var(--density-spacing-scale, 1));
              --desktop-icon-font-size: calc(0.85rem * var(--density-font-scale, 1));
            }
          }

          @media (pointer: coarse) {
            .desktop-shell {
              --shell-taskbar-height: calc(3.5rem * var(--density-spacing-scale, 1));
              --shell-taskbar-padding-x: calc(1.1rem * var(--density-spacing-scale, 1));
              --shell-taskbar-gap: var(--space-3, 0.75rem);
              --shell-taskbar-font-size: calc(1rem * var(--density-font-scale, 1));
              --shell-taskbar-icon: calc(2rem * var(--density-spacing-scale, 1));
              --shell-hit-target: calc(3.5rem * var(--density-spacing-scale, 1));
              --desktop-icon-width: calc(7.25rem * var(--density-spacing-scale, 1));
              --desktop-icon-height: calc(6.75rem * var(--density-spacing-scale, 1));
              --desktop-icon-image: calc(3rem * var(--density-spacing-scale, 1));
              --desktop-icon-padding: var(--space-2, 0.5rem);
              --desktop-icon-gap: var(--space-2, 0.5rem);
              --desktop-icon-font-size: calc(0.85rem * var(--density-font-scale, 1));
            }
          }

          @media (pointer: coarse) and (min-width: 768px) {
            .desktop-shell {
              --shell-taskbar-height: calc(3.75rem * var(--density-spacing-scale, 1));
              --shell-taskbar-padding-x: calc(1.25rem * var(--density-spacing-scale, 1));
              --shell-hit-target: calc(3.75rem * var(--density-spacing-scale, 1));
              --desktop-icon-width: calc(7.5rem * var(--density-spacing-scale, 1));
              --desktop-icon-height: calc(7rem * var(--density-spacing-scale, 1));
              --desktop-icon-image: calc(3.25rem * var(--density-spacing-scale, 1));
              --desktop-icon-font-size: calc(0.9rem * var(--density-font-scale, 1));
            }
          }
        `}</style>
      </div>
    );
  },
);

Layout.displayName = "DesktopLayout";

export default Layout;
