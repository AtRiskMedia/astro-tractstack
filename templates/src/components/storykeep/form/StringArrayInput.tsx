// Accessible StringArrayInput component with proper form attributes
// File: templates/src/components/storykeep/form/StringArrayInput.tsx

import { useState, KeyboardEvent, useId } from 'react';
import { classNames } from '../../../utils/helpers';

interface StringArrayInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  maxItems?: number;
  className?: string;
  allowDuplicates?: boolean;
  id?: string; // Allow custom ID override
  name?: string; // Allow custom name override
}

const StringArrayInput = ({
  value = [],
  onChange,
  label,
  error,
  disabled = false,
  placeholder = 'Add item and press Enter',
  required = false,
  maxItems,
  className,
  allowDuplicates = false,
  id: customId,
  name: customName,
}: StringArrayInputProps) => {
  const [inputValue, setInputValue] = useState('');

  // Generate unique IDs for accessibility
  const defaultId = useId();
  const inputId = customId || defaultId;
  const errorId = `${inputId}-error`;
  const helpTextId = `${inputId}-help`;
  const inputName = customName || inputId;

  const addItem = (item: string) => {
    const trimmedItem = item.trim();
    if (!trimmedItem) return;

    // Check for duplicates if not allowed
    if (!allowDuplicates && value.includes(trimmedItem)) return;

    // Check max items limit
    if (maxItems && value.length >= maxItems) return;

    onChange([...value, trimmedItem]);
    setInputValue('');
  };

  const removeItem = (index: number) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(newValue);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last item when backspace is pressed on empty input
      removeItem(value.length - 1);
    }
  };

  const canAddMore = !maxItems || value.length < maxItems;

  return (
    <div className={classNames('space-y-2', className || '')}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-bold text-gray-700"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
          {maxItems && (
            <span className="ml-2 text-xs text-gray-500">
              ({value.length}/{maxItems})
            </span>
          )}
        </label>
      )}

      {/* Tags Display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-md border bg-gray-50 p-2">
          {value.map((item, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 rounded-md bg-cyan-100 px-2 py-1 text-sm text-cyan-800"
            >
              {item}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-cyan-600 hover:text-cyan-800 focus:outline-none"
                  aria-label={`Remove ${item}`}
                >
                  <svg
                    className="h-3 w-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Input Field */}
      {!disabled && canAddMore && (
        <input
          id={inputId}
          name={inputName}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={
            [error ? errorId : null, maxItems ? helpTextId : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          className={classNames(
            'block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset',
            error ? 'ring-red-300 focus:ring-red-500' : 'focus:ring-cyan-600',
            'sm:text-sm sm:leading-6'
          )}
        />
      )}

      {!canAddMore && (
        <p id={helpTextId} className="text-sm text-gray-500">
          Maximum of {maxItems} items reached
        </p>
      )}

      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default StringArrayInput;
