import React, { forwardRef, useId } from 'react';

type SwitchProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  errorText?: React.ReactNode;
  containerClassName?: string;
};

const join = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(' ');

const Switch = forwardRef<HTMLInputElement, SwitchProps>((props, ref) => {
  const {
    label,
    helperText,
    errorText,
    containerClassName = '',
    className = '',
    id: providedId,
    disabled,
    ...rest
  } = props;

  const reactId = useId();
  const id = providedId ?? `switch-${reactId}`;
  const helperId = helperText ? `${id}-helper` : undefined;
  const errorId = errorText ? `${id}-error` : undefined;
  const describedByFromProps = (rest['aria-describedby'] || '') as string;
  const ariaInvalidFromProps = rest['aria-invalid'];
  const describedBy = [
    describedByFromProps,
    errorId,
    helperId,
  ]
    .filter(Boolean)
    .join(' ')
    .trim() || undefined;
  const ariaInvalid =
    ariaInvalidFromProps !== undefined
      ? ariaInvalidFromProps
      : errorText
        ? true
        : undefined;

  const containerClasses = join('flex flex-col gap-1 text-sm text-gray-200', containerClassName);
  const labelClasses = join(
    'flex items-center gap-3 cursor-pointer',
    disabled ? 'opacity-60 cursor-not-allowed' : undefined,
  );
  const inputClasses = join('peer sr-only', className);
  const trackClasses = 'h-5 w-10 rounded-full bg-gray-600 transition peer-checked:bg-blue-500 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-500 peer-disabled:bg-gray-500';
  const thumbClasses = 'pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5 peer-checked:bg-white peer-disabled:bg-gray-300';

  return (
    <div className={containerClasses}>
      <label htmlFor={id} className={labelClasses}>
        <span className="relative inline-flex items-center">
          <input
            {...rest}
            id={id}
            ref={ref}
            type="checkbox"
            role="switch"
            disabled={disabled}
            className={inputClasses}
            aria-describedby={describedBy}
            aria-invalid={ariaInvalid}
          />
          <span aria-hidden className={trackClasses} />
          <span aria-hidden className={thumbClasses} />
        </span>
        {label && <span className="text-sm">{label}</span>}
      </label>
      {errorText && (
        <p id={errorId} className="text-sm text-red-500">
          {errorText}
        </p>
      )}
      {helperText && (
        <p id={helperId} className="text-sm text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
});

Switch.displayName = 'Switch';

export default Switch;
