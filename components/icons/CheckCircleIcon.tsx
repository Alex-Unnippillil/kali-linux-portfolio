import { IconBase, type IconProps } from './IconBase';

export function CheckCircleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx={12} cy={12} r={8.25} />
      <path d="M8.25 12.5 11 15.25 15.75 9.5" />
    </IconBase>
  );
}
