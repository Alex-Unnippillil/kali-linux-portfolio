import { IconBase, type IconProps } from './IconBase';

export function WarningTriangleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4.25 4.5 19.25h15Z" />
      <path d="M12 10.5v3.75" />
      <path d="M12 16.25h.01" />
    </IconBase>
  );
}
