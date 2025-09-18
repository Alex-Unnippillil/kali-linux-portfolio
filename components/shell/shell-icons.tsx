import { svgA11yProps } from './icon-utils';
import type { IconProps } from './icon-utils';

export function CloseIcon({
  title,
  role,
  'aria-hidden': ariaHidden,
  width = 16,
  height = 16,
  ...props
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      {...svgA11yProps(title, role, ariaHidden)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path
        fill="#fff"
        fillRule="evenodd"
        d="M4.795 3.912l-.883.883.147.146L7.117 8 4.06 11.059l-.147.146.883.883.146-.147L8 8.883l3.059 3.058.146.147.883-.883-.147-.146L8.883 8l3.058-3.059.147-.146-.883-.883-.146.147L8 7.117 4.941 4.06z"
      />
    </svg>
  );
}

export function MinimizeIcon({
  title,
  role,
  'aria-hidden': ariaHidden,
  width = 16,
  height = 16,
  ...props
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      {...svgA11yProps(title, role, ariaHidden)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path fill="#fff" d="M4 10v1h8v-1z" />
    </svg>
  );
}

export function MaximizeIcon({
  title,
  role,
  'aria-hidden': ariaHidden,
  width = 16,
  height = 16,
  ...props
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      {...svgA11yProps(title, role, ariaHidden)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path fill="#fff" d="M4 4v8h8V4zm1 1h6v6H5z" />
    </svg>
  );
}

export function RestoreIcon({
  title,
  role,
  'aria-hidden': ariaHidden,
  width = 16,
  height = 16,
  ...props
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      {...svgA11yProps(title, role, ariaHidden)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <g fill="#fff">
        <path d="M4 6v6h6V6zm1 1h4v4H5z" />
        <path d="M6 4v1h5v5h1V4z" opacity=".5" />
      </g>
    </svg>
  );
}

export function PinIcon({
  title,
  role,
  'aria-hidden': ariaHidden,
  width = 24,
  height = 24,
  ...props
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...svgA11yProps(title, role, ariaHidden)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path d="M16 9V4h-1V2H9v2H8v5L5 12v2h6v7l1 1 1-1v-7h6v-2l-3-3Z" />
    </svg>
  );
}

export function NetworkSignalGoodIcon({
  title,
  role,
  'aria-hidden': ariaHidden,
  width = 16,
  height = 16,
  ...props
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      {...svgA11yProps(title, role, ariaHidden)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <g fill="none" fillRule="evenodd">
        <path
          fill="gray"
          d="M8.003 2c-2.61 0-5.22.838-7.4 2.518l-.266.205.205.263L8 14.658l7.668-9.931-.264-.206A12.105 12.105 0 0 0 8.003 2zm0 1c2.181 0 4.344.672 6.227 1.951L8 13.02l-6.226-8.074C3.657 3.668 5.821 2.998 8.002 3z"
        />
        <path
          fill="#fff"
          d="M2.427 6.897a9.129 9.125 0 0 1 11.15.003L8 14.125z"
        />
      </g>
    </svg>
  );
}

export function NetworkSignalNoneIcon({
  title,
  role,
  'aria-hidden': ariaHidden,
  width = 16,
  height = 16,
  ...props
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      {...svgA11yProps(title, role, ariaHidden)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path
        fill="gray"
        d="M8.003 2c-2.61 0-5.22.838-7.4 2.518l-.266.205.205.263L8 14.658l7.668-9.931-.264-.206A12.105 12.105 0 0 0 8.003 2zm0 1c2.181 0 4.344.672 6.227 1.951L8 13.02l-6.226-8.074C3.657 3.668 5.821 2.998 8.002 3z"
      />
    </svg>
  );
}

export function VolumeMediumIcon({
  title,
  role,
  'aria-hidden': ariaHidden,
  width = 16,
  height = 16,
  ...props
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      {...svgA11yProps(title, role, ariaHidden)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <g fill="#fff">
        <path d="M8 1.333 4.5 5H1.87S1 5.893 1 8.001C1 10.11 1.87 11 1.87 11H4.5L8 14.667z" />
        <path
          d="m10.524 4.926-.707.707.354.354a2.999 2.999 0 0 1 0 4.242l-.354.353.707.707.354-.353a4 4 0 0 0 0-5.656z"
        />
        <path
          d="m12.645 2.805-.707.707.354.353a5.999 5.999 0 0 1 0 8.485l-.354.353.707.707.354-.353a7 7 0 0 0 0-9.899z"
          opacity=".5"
        />
      </g>
    </svg>
  );
}

export function BatteryGoodIcon({
  title,
  role,
  'aria-hidden': ariaHidden,
  width = 16,
  height = 16,
  ...props
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      {...svgA11yProps(title, role, ariaHidden)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <g fill="#fff">
        <path d="M5 13V6h6v7z" />
        <path d="M3 12.338c.01.839-.015 1.451.262 1.953.138.251.374.45.666.56.292.11.64.149 1.078.149H11c.439 0 .786-.039 1.078-.148.293-.11.526-.31.664-.56.277-.503.249-1.115.258-1.954V3.631c-.01-.839.02-1.453-.258-1.955a1.25 1.25 0 0 0-.664-.559C11.786 1.007 11.438 1 11 1h-1V0H6v1h-.994c-.438 0-.786.007-1.078.117-.292.11-.528.308-.666.559-.277.502-.252 1.116-.262 1.955v8.705zm1-.014V3.633c.01-.853.04-1.298.137-1.475.016-.028.057-.073.143-.105.06-.023.298-.053.726-.053H11c.428 0 .664.03.727.053.086.032.125.077.14.105.095.173.123.618.133 1.475v8.705c-.01.854-.038 1.298-.133 1.47-.016.03-.055.074-.14.106-.123.046-.349.086-.727.086H5.006c-.378 0-.604-.04-.726-.086-.086-.032-.127-.077-.143-.105-.098-.178-.126-.62-.137-1.485z" />
      </g>
    </svg>
  );
}

export function ApplicationsIcon({
  title,
  role,
  'aria-hidden': ariaHidden,
  width = 16,
  height = 16,
  strokeWidth = 1,
  ...props
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      {...svgA11yProps(title, role, ariaHidden)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <rect x="1" y="3" width="4" height="10" />
      <path d="M6 8h8" />
      <path d="M11 5l3 3-3 3" />
    </svg>
  );
}

export function AppGridIcon({
  title,
  role,
  'aria-hidden': ariaHidden,
  width = 16,
  height = 16,
  ...props
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      {...svgA11yProps(title, role, ariaHidden)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path
        fill="#fff"
        d="M3.805 3C3.268 3 3 3 3 3.625v.75C3 5 3.268 5 3.805 5h.39C4.732 5 5 5 5 4.375v-.75C5 3.022 4.732 3 4.195 3zm4 0C7.268 3 7 3 7 3.625v.75C7 5 7.268 5 7.805 5h.39C8.732 5 9 5 9 4.375v-.75C9 3.022 8.732 3 8.195 3zm4 0C11.268 3 11 3 11 3.625v.75c0 .625.268.625.805.625h.39C12.732 5 13 5 13 4.375v-.75c0-.603-.268-.625-.805-.625zm-8 4C3.268 7 3 7 3 7.625v.75C3 9 3.268 9 3.805 9h.39C4.732 9 5 9 5 8.375v-.75C5 7.022 4.732 7 4.195 7zm4 0C7.268 7 7 7 7 7.625v.75C7 9 7.268 9 7.805 9h.39C8.732 9 9 9 9 8.375v-.75C9 7.022 8.732 7 8.195 7zm4 0C11.268 7 11 7 11 7.625v.75c0 .625.268.625.805.625h.39C12.732 9 13 9 13 8.375v-.75c0-.603-.268-.625-.805-.625zm-8 4C3.268 11 3 11 3 11.625v.75c0 .625.268.625.805.625h.39C4.732 13 5 13 5 12.375v-.75c0-.603-.268-.625-.805-.625zm4 0C7.268 11 7 11 7 11.625v.75c0 .625.268.625.805.625h.39C8.732 13 9 13 9 12.375v-.75c0-.603-.268-.625-.805-.625zm4 0c-.537 0-.805 0-.805.625v.75c0 .625.268.625.805.625h.39c.537 0 .805 0 .805-.625v-.75c0-.603-.268-.625-.805-.625z"
      />
    </svg>
  );
}
