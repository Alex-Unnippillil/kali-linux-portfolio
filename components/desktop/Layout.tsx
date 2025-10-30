import React from "react";
import clsx from "clsx";
import { DesktopZIndexProvider } from "./zIndexManager";

type LayoutProps = React.HTMLAttributes<HTMLDivElement>;

const Layout = React.forwardRef<HTMLDivElement, LayoutProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <DesktopZIndexProvider>
        <div
          ref={ref}
          className={clsx(
            "desktop-shell isolate relative min-h-screen w-full overflow-hidden bg-transparent text-white antialiased",
            className,
          )}
          {...props}
        >
          {children}
          <style jsx>{`
          :global(:root) {
            --safe-area-top: env(safe-area-inset-top, 0px);
            --safe-area-right: env(safe-area-inset-right, 0px);
            --safe-area-bottom: env(safe-area-inset-bottom, 0px);
            --safe-area-left: env(safe-area-inset-left, 0px);
          }

          .desktop-shell {
            --shell-ui-scale: var(--ui-scale, 1);
            --shell-taskbar-height: calc(2.5rem * var(--shell-ui-scale));
            --shell-taskbar-padding-x: calc(0.75rem * var(--shell-ui-scale));
            --shell-taskbar-gap: calc(0.5rem * var(--shell-ui-scale));
            --shell-taskbar-font-size: calc(0.875rem * var(--shell-ui-scale));
            --shell-taskbar-icon: calc(1.5rem * var(--shell-ui-scale));
            --shell-hit-target: calc(2.5rem * var(--shell-ui-scale));
            --desktop-icon-width: calc(6rem * var(--shell-ui-scale));
            --desktop-icon-height: calc(5.5rem * var(--shell-ui-scale));
            --desktop-icon-padding: calc(0.25rem * var(--shell-ui-scale));
            --desktop-icon-gap: calc(0.375rem * var(--shell-ui-scale));
            --desktop-icon-image: calc(2.5rem * var(--shell-ui-scale));
            --desktop-icon-font-size: calc(0.75rem * var(--shell-ui-scale));
            touch-action: manipulation;
            font-size: calc(clamp(0.95rem, 0.9rem + 0.2vw, 1rem) * var(--shell-ui-scale));
            min-height: 100vh;
          }

          @supports (min-height: 100svh) {
            .desktop-shell {
              min-height: 100svh;
            }
          }

          @supports (min-height: 100dvh) {
            .desktop-shell {
              min-height: 100dvh;
            }
          }

          @media (min-width: 640px) {
            .desktop-shell {
              --shell-taskbar-height: calc(2.75rem * var(--shell-ui-scale));
              --shell-taskbar-padding-x: calc(0.875rem * var(--shell-ui-scale));
              --shell-taskbar-gap: calc(0.6rem * var(--shell-ui-scale));
              --desktop-icon-width: calc(6.25rem * var(--shell-ui-scale));
              --desktop-icon-height: calc(5.75rem * var(--shell-ui-scale));
            }
          }

          @media (min-width: 768px) {
            .desktop-shell {
              --shell-taskbar-height: calc(3rem * var(--shell-ui-scale));
              --shell-taskbar-padding-x: calc(1rem * var(--shell-ui-scale));
              --shell-taskbar-gap: calc(0.75rem * var(--shell-ui-scale));
              --shell-taskbar-font-size: calc(0.925rem * var(--shell-ui-scale));
              --desktop-icon-width: calc(6.5rem * var(--shell-ui-scale));
              --desktop-icon-height: calc(6rem * var(--shell-ui-scale));
              --desktop-icon-image: calc(2.75rem * var(--shell-ui-scale));
              --desktop-icon-font-size: calc(0.8rem * var(--shell-ui-scale));
            }
          }

          @media (min-width: 1024px) {
            .desktop-shell {
              --shell-taskbar-height: calc(3.25rem * var(--shell-ui-scale));
              --shell-taskbar-font-size: calc(0.95rem * var(--shell-ui-scale));
              --desktop-icon-width: calc(6.75rem * var(--shell-ui-scale));
              --desktop-icon-height: calc(6.25rem * var(--shell-ui-scale));
            }
          }

          @media (min-width: 1280px) {
            .desktop-shell {
              --shell-taskbar-height: calc(3.5rem * var(--shell-ui-scale));
              --shell-taskbar-font-size: calc(1rem * var(--shell-ui-scale));
              --desktop-icon-width: calc(7rem * var(--shell-ui-scale));
              --desktop-icon-height: calc(6.5rem * var(--shell-ui-scale));
              --desktop-icon-image: calc(3rem * var(--shell-ui-scale));
              --desktop-icon-font-size: calc(0.85rem * var(--shell-ui-scale));
            }
          }

          @media (pointer: coarse) {
            .desktop-shell {
              --shell-taskbar-height: calc(3.5rem * var(--shell-ui-scale));
              --shell-taskbar-padding-x: calc(1.1rem * var(--shell-ui-scale));
              --shell-taskbar-gap: calc(0.85rem * var(--shell-ui-scale));
              --shell-taskbar-font-size: calc(1rem * var(--shell-ui-scale));
              --shell-taskbar-icon: calc(2rem * var(--shell-ui-scale));
              --shell-hit-target: calc(3.5rem * var(--shell-ui-scale));
              --desktop-icon-width: calc(7.25rem * var(--shell-ui-scale));
              --desktop-icon-height: calc(6.75rem * var(--shell-ui-scale));
              --desktop-icon-image: calc(3rem * var(--shell-ui-scale));
              --desktop-icon-padding: calc(0.45rem * var(--shell-ui-scale));
              --desktop-icon-gap: calc(0.5rem * var(--shell-ui-scale));
              --desktop-icon-font-size: calc(0.85rem * var(--shell-ui-scale));
            }
          }

          @media (pointer: coarse) and (min-width: 768px) {
            .desktop-shell {
              --shell-taskbar-height: calc(3.75rem * var(--shell-ui-scale));
              --shell-taskbar-padding-x: calc(1.25rem * var(--shell-ui-scale));
              --shell-hit-target: calc(3.75rem * var(--shell-ui-scale));
              --desktop-icon-width: calc(7.5rem * var(--shell-ui-scale));
              --desktop-icon-height: calc(7rem * var(--shell-ui-scale));
              --desktop-icon-image: calc(3.25rem * var(--shell-ui-scale));
              --desktop-icon-font-size: calc(0.9rem * var(--shell-ui-scale));
            }
          }
          `}</style>
        </div>
      </DesktopZIndexProvider>
    );
  },
);

Layout.displayName = "DesktopLayout";

export default Layout;
