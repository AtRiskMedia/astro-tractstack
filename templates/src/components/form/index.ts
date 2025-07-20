// Atomic Form Components
export { default as StringInput } from './StringInput';
export { default as StringArrayInput } from './StringArrayInput';
export { default as BooleanToggle } from './BooleanToggle';
export { default as EnumSelect } from './EnumSelect';
export { default as ColorPicker } from './ColorPicker';
export { default as FileUpload } from './FileUpload';
export { default as NumberInput } from './NumberInput';

// Base types for form components
export interface BaseFormComponentProps<T> {
  value: T;
  onChange: (value: T) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

// Enum option type for select components
export interface EnumOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// Form validation types
export interface FieldErrors {
  [fieldName: string]: string | undefined;
}

export type FormValidator<T> = (state: T) => FieldErrors;
