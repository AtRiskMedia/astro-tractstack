import { forwardRef, useId } from 'react';
import { classNames } from '../../../utils/helpers';

interface StringInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  type?: 'text' | 'email' | 'url' | 'password';
  maxLength?: number;
  className?: string;
  id?: string; // Allow custom ID override
  name?: string; // Allow custom name override
}

const StringInput = forwardRef<HTMLInputElement, StringInputProps>(
  (
    {
      value,
      onChange,
      label,
      error,
      disabled = false,
      placeholder,
      required = false,
      type = 'text',
      maxLength,
      className,
      id: customId,
      name: customName,
    },
    ref
  ) => {
    // Generate unique IDs for accessibility
    const defaultId = useId();
    const inputId = customId || defaultId;
    const errorId = `${inputId}-error`;
    const inputName = customName || inputId;

    return (
      <div className={classNames('space-y-1', className || '')}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-bold text-gray-700"
          >
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          name={inputName}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={classNames(
            'block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset',
            error ? 'ring-red-300 focus:ring-red-500' : 'focus:ring-cyan-600',
            disabled
              ? 'cursor-not-allowed bg-gray-50 text-gray-500'
              : 'bg-white',
            'sm:text-sm sm:leading-6'
          )}
        />
        {error && (
          <p id={errorId} className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

StringInput.displayName = 'StringInput';

export default StringInput;
