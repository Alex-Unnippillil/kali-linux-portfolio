import { IconBase, type IconProps } from './IconBase';

export function InfoCircleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx={12} cy={12} r={8.25} />
      <path d="M12 10.75v4.5" />
      <path d="M12 7.25h.01" />
    </IconBase>
  );
}
