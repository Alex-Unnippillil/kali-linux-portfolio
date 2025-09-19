import React, { forwardRef, useId } from 'react';

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  errorText?: React.ReactNode;
  containerClassName?: string;
};

const join = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(' ');

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>((props, ref) => {
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
  const id = providedId ?? `checkbox-${reactId}`;
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
    'flex items-start gap-3 cursor-pointer',
    disabled ? 'opacity-60 cursor-not-allowed' : undefined,
  );
  const inputClasses = join(
    'mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0',
    className,
  );

  return (
    <div className={containerClasses}>
      <label htmlFor={id} className={labelClasses}>
        <input
          {...rest}
          id={id}
          ref={ref}
          type="checkbox"
          disabled={disabled}
          className={inputClasses}
          aria-describedby={describedBy}
          aria-invalid={ariaInvalid}
        />
        {label && <span className="pt-[2px] text-sm">{label}</span>}
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

Checkbox.displayName = 'Checkbox';

export default Checkbox;
