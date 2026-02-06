import Image from 'next/image';
import { ReactNode } from 'react';

interface WindowFrameProps {
  title: string;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  children: ReactNode;
}

export default function WindowFrame({
  title,
  onMinimize,
  onMaximize,
  onClose,
  children,
}: WindowFrameProps) {
  return (
    <div className="border border-ub-warm-grey bg-ub-cool-grey flex flex-col">
      <div className="flex items-center justify-between h-8 px-2 select-none">
        <span className="text-sm flex-1 truncate">{title}</span>
        <div className="flex items-center space-x-1">
          {onMinimize && (
            <button
              type="button"
              aria-label="Minimize"
              onClick={onMinimize}
              className="w-8 h-8 flex items-center justify-center hover:bg-[var(--color-control-accent)] active:bg-[var(--color-accent)]"
            >
              <Image
                src="/themes/Yaru/window/window-minimize-symbolic.svg"
                alt=""
                width={16}
                height={16}
              />
            </button>
          )}
          {onMaximize && (
            <button
              type="button"
              aria-label="Maximize"
              onClick={onMaximize}
              className="w-8 h-8 flex items-center justify-center hover:bg-[var(--color-control-accent)] active:bg-[var(--color-accent)]"
            >
              <Image
                src="/themes/Yaru/window/window-maximize-symbolic.svg"
                alt=""
                width={16}
                height={16}
              />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center hover:bg-[var(--color-control-accent)] active:bg-[var(--color-accent)]"
            >
              <Image
                src="/themes/Yaru/window/window-close-symbolic.svg"
                alt=""
                width={16}
                height={16}
              />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

