import { IconBase, type IconProps } from './IconBase';

export function XCircleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx={12} cy={12} r={8.25} />
      <path d="m9.25 9.25 5.5 5.5" />
      <path d="m14.75 9.25-5.5 5.5" />
    </IconBase>
  );
}
