import { useState, useEffect } from 'react';
import { classNames } from '@/utils/helpers';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  allowTransparent?: boolean;
  id?: string; // Added for accessibility
}

const ColorPicker = ({
  value,
  onChange,
  label,
  error,
  disabled = false,
  required = false,
  className,
  allowTransparent = false,
  id = 'color-picker', // Default id
}: ColorPickerProps) => {
  const [hexInput, setHexInput] = useState(value);
  const [isValidHex, setIsValidHex] = useState(true);

  // Validate hex color format
  const validateHex = (hex: string): boolean => {
    if (!hex) return !required;
    if (allowTransparent && hex.toLowerCase() === 'transparent') return true;

    const cleanHex = hex.replace('#', '');
    const hexRegex = /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/;
    return hexRegex.test(cleanHex);
  };

  // Normalize hex value
  const normalizeHex = (hex: string): string => {
    if (!hex) return '';
    if (allowTransparent && hex.toLowerCase() === 'transparent')
      return 'transparent';

    const cleanHex = hex.replace('#', '');
    if (validateHex(cleanHex)) {
      return `#${cleanHex}`;
    }
    return hex;
  };

  // Update hex input when value prop changes
  useEffect(() => {
    setHexInput(value);
    setIsValidHex(validateHex(value));
  }, [value, required, allowTransparent]);

  const handleHexInputChange = (newHex: string) => {
    setHexInput(newHex);
    const isValid = validateHex(newHex);
    setIsValidHex(isValid);

    if (isValid) {
      onChange(normalizeHex(newHex));
    }
  };

  const handleColorInputChange = (newColor: string) => {
    const normalizedColor = normalizeHex(newColor);
    setHexInput(normalizedColor);
    setIsValidHex(true);
    onChange(normalizedColor);
  };

  const displayColor = isValidHex && value ? normalizeHex(value) : '#000000';
  const isTransparent = allowTransparent && value === 'transparent';

  return (
    <div className={classNames('space-y-2', className || '')}>
      {label && (
        <label
          htmlFor={`${id}-color`} // Associate with color input
          className="block text-sm font-bold text-gray-700"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <div className="flex items-center gap-3">
        {/* Color Picker Input (Native) */}
        {!isTransparent && (
          <input
            type="color"
            id={`${id}-color`} // Unique id for color input
            value={displayColor}
            onChange={(e) => handleColorInputChange(e.target.value)}
            disabled={disabled}
            aria-required={required ? 'true' : undefined}
            aria-describedby={error || !isValidHex ? `${id}-error` : undefined}
            className={classNames(
              'h-10 w-12 cursor-pointer rounded-md border border-gray-300',
              disabled ? 'cursor-not-allowed opacity-50' : ''
            )}
          />
        )}

        {/* Hex Input */}
        <div className="flex-1">
          <input
            type="text"
            id={`${id}-hex`} // Unique id for hex input
            value={hexInput}
            onChange={(e) => handleHexInputChange(e.target.value)}
            disabled={disabled}
            placeholder={
              allowTransparent ? '#000000 or transparent' : '#000000'
            }
            aria-required={required ? 'true' : undefined}
            aria-describedby={error || !isValidHex ? `${id}-error` : undefined}
            className={classNames(
              'block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset',
              error || !isValidHex
                ? 'ring-red-300 focus:ring-red-500'
                : 'focus:ring-cyan-600',
              disabled
                ? 'cursor-not-allowed bg-gray-50 text-gray-500'
                : 'bg-white',
              'md:text-sm md:leading-6'
            )}
          />
        </div>
      </div>

      {/* Validation Message */}
      {!isValidHex && (
        <p className="text-sm text-red-600" id={`${id}-error`} role="alert">
          Please enter a valid hex color (e.g., #FF0000 or #F00)
          {allowTransparent && ' or "transparent"'}
        </p>
      )}

      {error && isValidHex && (
        <p className="text-sm text-red-600" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default ColorPicker;
