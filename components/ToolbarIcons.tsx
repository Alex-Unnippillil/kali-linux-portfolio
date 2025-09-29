import type { SVGProps } from 'react';

type ToolbarIconProps = SVGProps<SVGSVGElement> & {
  'aria-label'?: string;
};

type IconDefaults = {
  defaultSize: number;
  viewBox: string;
};

const applyIconDefaults = (
  props: ToolbarIconProps,
  { defaultSize, viewBox }: IconDefaults,
) => {
  const {
    'aria-label': ariaLabel,
    'aria-hidden': ariaHidden,
    role,
    focusable,
    width,
    height,
    viewBox: viewBoxProp,
    ...rest
  } = props;

  const finalProps: ToolbarIconProps = {
    ...rest,
    role: role ?? 'img',
    focusable: focusable ?? 'false',
    width: width ?? defaultSize,
    height: height ?? defaultSize,
    viewBox: viewBoxProp ?? viewBox,
  };

  if (ariaLabel) {
    finalProps['aria-label'] = ariaLabel;
  }

  const computedHidden =
    ariaHidden !== undefined ? ariaHidden : ariaLabel ? undefined : true;

  if (computedHidden !== undefined) {
    finalProps['aria-hidden'] = computedHidden;
  }

  return finalProps;
};

export function CloseIcon(props: ToolbarIconProps = {}) {
  return (
    <svg {...applyIconDefaults(props, { defaultSize: 16, viewBox: '0 0 16 16' })}>
      <path
        d="M4.795 3.912l-.883.883.147.146L7.117 8 4.06 11.059l-.147.146.883.883.146-.147L8 8.883l3.059 3.058.146.147.883-.883-.147-.146L8.883 8l3.058-3.059.147-.146-.883-.883-.146.147L8 7.117 4.941 4.06z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function MinimizeIcon(props: ToolbarIconProps = {}) {
  return (
    <svg {...applyIconDefaults(props, { defaultSize: 16, viewBox: '0 0 16 16' })}>
      <path d="M4 10v1h8v-1z" fill="currentColor" />
    </svg>
  );
}

export function MaximizeIcon(props: ToolbarIconProps = {}) {
  return (
    <svg {...applyIconDefaults(props, { defaultSize: 16, viewBox: '0 0 16 16' })}>
      <path d="M4 4v8h8V4zm1 1h6v6H5z" fill="currentColor" />
    </svg>
  );
}

export function RestoreIcon(props: ToolbarIconProps = {}) {
  return (
    <svg {...applyIconDefaults(props, { defaultSize: 16, viewBox: '0 0 16 16' })}>
      <path d="M4 6v6h6V6zm1 1h4v4H5z" fill="currentColor" />
      <path d="M6 4v1h5v5h1V4z" fill="currentColor" opacity={0.5} />
    </svg>
  );
}

export function PinIcon(props: ToolbarIconProps = {}) {
  return (
    <svg {...applyIconDefaults(props, { defaultSize: 16, viewBox: '0 0 24 24' })}>
      <path d="M16 9V4h-1V2H9v2H8v5L5 12v2h6v7l1 1 1-1v-7h6v-2l-3-3Z" fill="currentColor" />
    </svg>
  );
}
