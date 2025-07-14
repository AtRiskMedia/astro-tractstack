// Accessible NumberInput component with proper form attributes
// File: templates/src/components/storykeep/form/NumberInput.tsx

import { forwardRef, useId } from 'react';
import { classNames } from '../../../utils/helpers';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  id?: string; // Allow custom ID override
  name?: string; // Allow custom name override
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onChange,
      label,
      error,
      disabled = false,
      placeholder,
      required = false,
      min,
      max,
      step = 1,
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      if (!isNaN(newValue)) {
        onChange(newValue);
      } else if (e.target.value === '') {
        onChange(0);
      }
    };

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
          type="number"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          step={step}
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

NumberInput.displayName = 'NumberInput';

export default NumberInput;
