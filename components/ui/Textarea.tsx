import React, { forwardRef, useId } from 'react';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  errorText?: React.ReactNode;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  containerClassName?: string;
  fieldClassName?: string;
};

const join = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(' ');

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>((props, ref) => {
  const {
    label,
    helperText,
    errorText,
    startAdornment,
    endAdornment,
    containerClassName = '',
    fieldClassName = '',
    className = '',
    id: providedId,
    disabled,
    ...rest
  } = props;

  const reactId = useId();
  const id = providedId ?? `textarea-${reactId}`;
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

  const containerClasses = join('flex flex-col gap-1 text-sm', containerClassName);
  const fieldClasses = join(
    'relative flex items-start gap-2 rounded border border-gray-700 bg-gray-800 px-3 py-2 transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/60',
    disabled ? 'opacity-60 cursor-not-allowed' : undefined,
    fieldClassName,
  );
  const adornmentClasses = 'flex items-start text-gray-400 pt-1';
  const textareaClasses = join(
    'min-h-[3rem] flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed',
    className,
  );

  return (
    <div className={containerClasses}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-200">
          {label}
        </label>
      )}
      <div className={fieldClasses}>
        {startAdornment && <span className={adornmentClasses}>{startAdornment}</span>}
        <textarea
          {...rest}
          id={id}
          ref={ref}
          disabled={disabled}
          className={textareaClasses}
          aria-describedby={describedBy}
          aria-invalid={ariaInvalid}
        />
        {endAdornment && <span className={adornmentClasses}>{endAdornment}</span>}
      </div>
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

Textarea.displayName = 'Textarea';

export default Textarea;
