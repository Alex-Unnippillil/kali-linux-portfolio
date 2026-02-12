import { IconBase, type IconProps } from './IconBase';

export function SwitchCameraIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M22.75 4.25v5.5h-5.5" />
      <path d="M1.25 19.75v-5.5h5.5" />
      <path d="M3.75 9.25a8.75 8.75 0 0 1 13.34-3.08L22.75 10.25" />
      <path d="M20.25 14.75a8.75 8.75 0 0 1-13.34 3.08L1.25 13.75" />
    </IconBase>
  );
}
