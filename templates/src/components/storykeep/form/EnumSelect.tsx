import { Fragment } from 'react';
import { classNames } from '../../../utils/helpers';

interface EnumOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface EnumSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: EnumOption[];
  label?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  className?: string;
  allowEmpty?: boolean;
  id?: string; // Add id prop for accessibility
}

const EnumSelect = ({
  value,
  onChange,
  options,
  label,
  error,
  disabled = false,
  placeholder = 'Select an option',
  required = false,
  className,
  allowEmpty = false,
  id = 'enum-select', // Default id if not provided
}: EnumSelectProps) => {
  return (
    <div className={classNames('space-y-1', className || '')}>
      {label && (
        <label
          htmlFor={id} // Associate label with select
          className="block text-sm font-bold text-gray-700"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <select
        id={id} // Add id to select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        aria-required={required ? 'true' : undefined} // Explicitly indicate required state
        className={classNames(
          'block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset',
          error ? 'ring-red-300 focus:ring-red-500' : 'focus:ring-cyan-600',
          disabled ? 'cursor-not-allowed bg-gray-50 text-gray-500' : 'bg-white',
          'sm:text-sm sm:leading-6'
        )}
      >
        {(allowEmpty || !value) && (
          <option value="" disabled={!allowEmpty}>
            {placeholder}
          </option>
        )}

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p className="text-sm text-red-600" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default EnumSelect;
