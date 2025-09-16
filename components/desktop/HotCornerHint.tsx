'use client';

import {
  HOT_CORNER_HOLD_DURATION,
  HotCornerActionDefinition,
  HotCornerPosition,
} from '../../src/desktop/hotCorners';

interface HotCornerHintProps {
  corner: HotCornerPosition;
  action: HotCornerActionDefinition;
  visible: boolean;
  triggered?: boolean;
}

const POSITION_CLASSES: Record<HotCornerPosition, string> = {
  'top-left': 'top-0 left-0 items-start justify-start text-left',
  'top-right': 'top-0 right-0 items-start justify-end text-right',
  'bottom-left': 'bottom-0 left-0 items-end justify-start text-left',
  'bottom-right': 'bottom-0 right-0 items-end justify-end text-right',
};

const srCornerLabel = (corner: HotCornerPosition) => corner.replace('-', ' ');

const HotCornerHint = ({
  corner,
  action,
  visible,
  triggered = false,
}: HotCornerHintProps) => {
  const shouldShow = (visible || triggered) && action.id !== 'none';
  const srMessage = visible
    ? action.id === 'none'
      ? `No hot corner action assigned to the ${srCornerLabel(corner)} corner.`
      : triggered
        ? `${action.label} activated.`
        : `${action.label}. ${action.description} Hold for ${HOT_CORNER_HOLD_DURATION} milliseconds.`
    : triggered
      ? `${action.label} activated.`
      : '';
  const ariaHidden = !shouldShow && !srMessage;

  return (
    <div
      className={`pointer-events-none absolute flex px-3 py-3 transition-all duration-150 ${
        POSITION_CLASSES[corner]
      } ${shouldShow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
      aria-hidden={ariaHidden}
    >
      <span className="sr-only" aria-live={srMessage ? 'polite' : 'off'}>
        {srMessage}
      </span>
      {shouldShow ? (
        <div
          aria-hidden="true"
          className={`rounded-lg bg-gray-900/80 px-3 py-2 text-xs text-gray-100 shadow-lg backdrop-blur`}
        >
          <span className="block font-semibold uppercase tracking-wide text-[11px]">
            {action.label}
          </span>
          <span className="mt-1 block text-[10px] text-gray-200/80">
            {triggered ? 'Activated' : action.hint ?? `Hold for ${HOT_CORNER_HOLD_DURATION} ms`}
          </span>
        </div>
      ) : null}
    </div>
  );
};

export default HotCornerHint;
