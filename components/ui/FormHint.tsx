import React from "react";
import clsx from "clsx";

export type FormHintPlacement = "bottom" | "right";

interface FormHintProps {
  id: string;
  visible: boolean;
  children: React.ReactNode;
  placement?: FormHintPlacement;
  className?: string;
  panelClassName?: string;
}

const basePanelClass =
  "rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-snug shadow-sm transition-all duration-150";

const hiddenPanelClass = "pointer-events-none opacity-0 scale-95";
const visiblePanelClass = "opacity-100 scale-100";

const FormHint: React.FC<FormHintProps> = ({
  id,
  visible,
  children,
  placement = "bottom",
  className,
  panelClassName,
}) => {
  if (placement === "right") {
    return (
      <div
        className={clsx(
          "relative mt-2 min-h-[1.5rem] md:mt-0 md:min-h-0",
          className,
        )}
      >
        <div
          id={id}
          role="note"
          aria-hidden={!visible}
          className={clsx(
            basePanelClass,
            "origin-top md:absolute md:left-full md:top-1/2 md:ml-3 md:w-64 md:-translate-y-1/2 md:origin-left",
            visible ? visiblePanelClass : hiddenPanelClass,
            panelClassName,
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("mt-2 min-h-[1.75rem]", className)}>
      <div
        id={id}
        role="note"
        aria-hidden={!visible}
        className={clsx(
          basePanelClass,
          "origin-top",
          visible ? visiblePanelClass : hiddenPanelClass,
          panelClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default FormHint;
