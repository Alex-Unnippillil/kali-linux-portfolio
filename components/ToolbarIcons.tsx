import type { SVGProps } from 'react';

import CloseSvg from '@/public/themes/Yaru/window/window-close-symbolic.svg';
import MaximizeSvg from '@/public/themes/Yaru/window/window-maximize-symbolic.svg';
import MinimizeSvg from '@/public/themes/Yaru/window/window-minimize-symbolic.svg';
import PinSvg from '@/public/themes/Yaru/window/window-pin-symbolic.svg';
import RestoreSvg from '@/public/themes/Yaru/window/window-restore-symbolic.svg';

const iconProps: SVGProps<SVGSVGElement> = {
  width: 16,
  height: 16,
  focusable: false,
  'aria-hidden': true,
};

export function CloseIcon() {
  return (
    <CloseSvg {...iconProps} title="Close" />
  );
}

export function MinimizeIcon() {
  return (
    <MinimizeSvg {...iconProps} title="Minimize" />
  );
}

export function MaximizeIcon() {
  return (
    <MaximizeSvg {...iconProps} title="Maximize" />
  );
}

export function RestoreIcon() {
  return (
    <RestoreSvg {...iconProps} title="Restore" />
  );
}

export function PinIcon() {
  return (
    <PinSvg {...iconProps} title="Pin" />
  );
}
