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
            "desktop-shell isolate relative h-screen w-full overflow-hidden bg-transparent text-white antialiased",
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
            touch-action: manipulation;
            font-size: clamp(0.95rem, 0.9rem + 0.2vw, 1rem);
            height: 100vh;
          }

          @supports (height: 100svh) {
            .desktop-shell {
              height: 100svh;
            }
          }

          @supports (height: 100dvh) {
            .desktop-shell {
              height: 100dvh;
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
      </DesktopZIndexProvider>
    );
  },
);

Layout.displayName = "DesktopLayout";

export default Layout;
