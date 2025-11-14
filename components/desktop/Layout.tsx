import React from "react";
import clsx from "clsx";
import { DesktopZIndexProvider } from "./zIndexManager";
import { DesktopModeProvider, useDesktopMode } from "./DesktopModeContext";

type LayoutProps = React.HTMLAttributes<HTMLDivElement>;

const DesktopShell = React.forwardRef<HTMLDivElement, LayoutProps>(
  ({ className, children, ...props }, ref) => {
    const { isCompact } = useDesktopMode();

    return (
      <div
        ref={ref}
        data-compact-mode={isCompact ? "true" : "false"}
        className={clsx(
          "desktop-shell isolate relative flex min-h-screen w-full flex-col overflow-y-auto bg-transparent text-white antialiased md:block md:overflow-hidden",
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
            --shell-taskbar-height: 2.5rem;
            --shell-taskbar-padding-x: 0.75rem;
            --shell-taskbar-gap: 0.5rem;
            --shell-taskbar-font-size: 0.875rem;
            --shell-taskbar-icon: 1.5rem;
            --shell-hit-target: 2.5rem;
            --desktop-icon-width: 6rem;
            --desktop-icon-height: 5.5rem;
            --desktop-icon-padding: 0.25rem;
            --desktop-icon-gap: 0.375rem;
            --desktop-icon-image: 2.5rem;
            --desktop-icon-font-size: 0.75rem;
            --shell-grid-columns: 12;
            --shell-grid-gutter: clamp(0.75rem, 2.4vw, 1.25rem);
            --shell-grid-column: calc((100cqw - (var(--shell-grid-gutter) * 11)) / var(--shell-grid-columns));
            touch-action: manipulation;
            font-size: clamp(0.95rem, 0.9rem + 0.2vw, 1rem);
            min-height: 100vh;
            container-type: inline-size;
            container-name: desktop-shell;
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

          @container desktop-shell (max-width: 720px) {
            .desktop-shell {
              --shell-taskbar-height: clamp(2.4rem, calc(var(--shell-grid-column) * 2.2), 2.85rem);
              --shell-taskbar-padding-x: clamp(0.55rem, calc(var(--shell-grid-column) * 0.6), 0.85rem);
              --shell-taskbar-gap: clamp(0.4rem, calc(var(--shell-grid-column) * 0.5), 0.65rem);
              --shell-taskbar-font-size: clamp(0.8rem, calc(var(--shell-grid-column) * 0.28), 0.875rem);
              --shell-taskbar-icon: clamp(1.65rem, calc(var(--shell-grid-column) * 1.15), 2.1rem);
              --shell-hit-target: clamp(2.75rem, calc(var(--shell-grid-column) * 1.6), 3.25rem);
              --desktop-icon-width: clamp(4.5rem, calc(var(--shell-grid-column) * 3), 5.75rem);
              --desktop-icon-height: clamp(4.25rem, calc(var(--shell-grid-column) * 3.4), 5.5rem);
              --desktop-icon-padding: clamp(0.3rem, calc(var(--shell-grid-column) * 0.2), 0.5rem);
              --desktop-icon-gap: clamp(0.3rem, calc(var(--shell-grid-column) * 0.24), 0.45rem);
              --desktop-icon-image: clamp(2.25rem, calc(var(--shell-grid-column) * 1.8), 2.75rem);
              --desktop-icon-font-size: clamp(0.7rem, calc(var(--shell-grid-column) * 0.26), 0.8rem);
            }
          }

          @media (min-width: 640px) {
            .desktop-shell {
              --shell-taskbar-height: 2.75rem;
              --shell-taskbar-padding-x: 0.875rem;
              --shell-taskbar-gap: 0.6rem;
              --desktop-icon-width: 6.25rem;
              --desktop-icon-height: 5.75rem;
            }
          }

          @media (min-width: 768px) {
            .desktop-shell {
              --shell-taskbar-height: 3rem;
              --shell-taskbar-padding-x: 1rem;
              --shell-taskbar-gap: 0.75rem;
              --shell-taskbar-font-size: 0.925rem;
              --desktop-icon-width: 6.5rem;
              --desktop-icon-height: 6rem;
              --desktop-icon-image: 2.75rem;
              --desktop-icon-font-size: 0.8rem;
            }
          }

          @media (min-width: 1024px) {
            .desktop-shell {
              --shell-taskbar-height: 3.25rem;
              --shell-taskbar-font-size: 0.95rem;
              --desktop-icon-width: 6.75rem;
              --desktop-icon-height: 6.25rem;
            }
          }

          @media (min-width: 1280px) {
            .desktop-shell {
              --shell-taskbar-height: 3.5rem;
              --shell-taskbar-font-size: 1rem;
              --desktop-icon-width: 7rem;
              --desktop-icon-height: 6.5rem;
              --desktop-icon-image: 3rem;
              --desktop-icon-font-size: 0.85rem;
            }
          }

          @media (pointer: coarse) {
            .desktop-shell {
              --shell-taskbar-height: 3.5rem;
              --shell-taskbar-padding-x: 1.1rem;
              --shell-taskbar-gap: 0.85rem;
              --shell-taskbar-font-size: 1rem;
              --shell-taskbar-icon: 2rem;
              --shell-hit-target: 3.5rem;
              --desktop-icon-width: 7.25rem;
              --desktop-icon-height: 6.75rem;
              --desktop-icon-image: 3rem;
              --desktop-icon-padding: 0.45rem;
              --desktop-icon-gap: 0.5rem;
              --desktop-icon-font-size: 0.85rem;
            }
          }

          @media (pointer: coarse) and (min-width: 768px) {
            .desktop-shell {
              --shell-taskbar-height: 3.75rem;
              --shell-taskbar-padding-x: 1.25rem;
              --shell-hit-target: 3.75rem;
              --desktop-icon-width: 7.5rem;
              --desktop-icon-height: 7rem;
              --desktop-icon-image: 3.25rem;
              --desktop-icon-font-size: 0.9rem;
            }
          }
          `}</style>
      </div>
    );
  },
);

DesktopShell.displayName = "DesktopShell";

const Layout = React.forwardRef<HTMLDivElement, LayoutProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <DesktopModeProvider>
        <DesktopZIndexProvider>
          <DesktopShell ref={ref} className={className} {...props}>
            {children}
          </DesktopShell>
        </DesktopZIndexProvider>
      </DesktopModeProvider>
    );
  },
);

Layout.displayName = "DesktopLayout";

export default Layout;
