import React from 'react';
import NextImage from 'next/image';
import useDocPiP from '../../hooks/useDocPiP';

interface AppHeaderProps {
  title: string;
  minimize: () => void;
  maximize: () => void;
  isMaximised: boolean;
  close: () => void;
  allowMaximize?: boolean;
  pip?: () => void;
  onHelp?: () => void;
  onFeedback?: () => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  onBlur?: React.FocusEventHandler<HTMLDivElement>;
  grabbed?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  minimize,
  maximize,
  isMaximised,
  close,
  allowMaximize = true,
  pip,
  onHelp,
  onFeedback,
  onKeyDown,
  onBlur,
  grabbed,
}) => {
  const { togglePin } = useDocPiP(pip || (() => null));
  const pipSupported =
    typeof window !== 'undefined' && !!(window as any).documentPictureInPicture;
  return (
    <div
      className="relative bg-ub-window-title border-t-2 border-white border-opacity-5 py-1.5 px-3 text-white w-full select-none rounded-b-none"
      tabIndex={0}
      role="button"
      aria-grabbed={grabbed}
      aria-label={title}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <div className="flex justify-center text-sm font-bold">{title}</div>
      <div className="absolute left-0 top-0 mt-1 ml-1 flex items-center">
        {onHelp && (
          <button
            type="button"
            aria-label="Help"
            className="mx-1.5 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-6 w-6 text-sm"
            onClick={onHelp}
          >
            ?
          </button>
        )}
        {onFeedback && (
          <button
            type="button"
            aria-label="Feedback"
            className="mx-1.5 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-6 w-6 text-sm"
            onClick={onFeedback}
          >
            💬
          </button>
        )}
      </div>
      <div className="absolute right-0 top-0 mt-1 mr-1 flex justify-center items-center">
        {pipSupported && pip && (
          <button
            type="button"
            aria-label="Window pin"
            className="mx-1.5 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-11 w-11"
            onClick={togglePin}
          >
            <NextImage
              src="/themes/Yaru/window/window-pin-symbolic.svg"
              alt="Kali window pin"
              className="h-5 w-5 inline"
              width={20}
              height={20}
              sizes="20px"
            />
          </button>
        )}
        <button
          type="button"
          aria-label="Window minimize"
          className="mx-1.5 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-11 w-11"
          onClick={minimize}
        >
          <NextImage
            src="/themes/Yaru/window/window-minimize-symbolic.svg"
            alt="Kali window minimize"
            className="h-5 w-5 inline"
            width={20}
            height={20}
            sizes="20px"
          />
        </button>
        {allowMaximize &&
          (isMaximised ? (
            <button
              type="button"
              aria-label="Window restore"
              className="mx-2 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-11 w-11"
              onClick={maximize}
            >
              <NextImage
                src="/themes/Yaru/window/window-restore-symbolic.svg"
                alt="Kali window restore"
                className="h-5 w-5 inline"
                width={20}
                height={20}
                sizes="20px"
              />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Window maximize"
              className="mx-2 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-11 w-11"
              onClick={maximize}
            >
              <NextImage
                src="/themes/Yaru/window/window-maximize-symbolic.svg"
                alt="Kali window maximize"
                className="h-5 w-5 inline"
                width={20}
                height={20}
                sizes="20px"
              />
            </button>
          ))}
        <button
          type="button"
          aria-label="Window close"
          className="mx-1.5 bg-white bg-opacity-0 hover:bg-ub-red rounded-full flex justify-center items-center h-11 w-11"
          onClick={close}
        >
          <NextImage
            src="/themes/Yaru/window/window-close-symbolic.svg"
            alt="Kali window close"
            className="h-5 w-5 inline"
            width={20}
            height={20}
            sizes="20px"
          />
        </button>
      </div>
    </div>
  );
};

export default AppHeader;
