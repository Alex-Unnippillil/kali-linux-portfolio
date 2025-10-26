import { IconBase, type IconProps } from './IconBase';

export function CopyIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.75" y="3.75" width="10.5" height="10.5" rx="2.25" />
      <rect x="8.75" y="8.75" width="10.5" height="10.5" rx="2.25" />
    </IconBase>
  );
}
