// Form component type definitions
// File: templates/src/types/formTypes.ts

// Base props interface for all atomic form components
export interface BaseFormComponentProps<T> {
  value: T;
  onChange: (value: T) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

// String input specific props
export interface StringInputProps extends BaseFormComponentProps<string> {
  type?: 'text' | 'email' | 'url' | 'password';
  maxLength?: number;
  autoComplete?: string;
}

// String array input props (for tags/chips)
export interface StringArrayInputProps
  extends BaseFormComponentProps<string[]> {
  maxItems?: number;
  allowDuplicates?: boolean;
  separator?: string; // For parsing pasted content
  suggestions?: string[];
}

// Boolean toggle props
export interface BooleanToggleProps extends BaseFormComponentProps<boolean> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'switch' | 'checkbox';
}

// Enum select props
export interface EnumSelectProps extends BaseFormComponentProps<string> {
  options: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
  clearable?: boolean;
  searchable?: boolean;
}

// Color picker props
export interface ColorPickerProps extends BaseFormComponentProps<string> {
  format?: 'hex' | 'rgb' | 'hsl';
  showAlpha?: boolean;
  presetColors?: string[];
}

// File upload props
export interface FileUploadProps extends BaseFormComponentProps<string> {
  accept?: string;
  maxSize?: number; // in bytes
  preview?: boolean;
  encoding?: 'base64' | 'url';
}

// Number input props
export interface NumberInputProps extends BaseFormComponentProps<number> {
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  allowFloat?: boolean;
}

// Form section props (for composed form sections)
export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

// Form actions props
export interface FormActionsProps {
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  saveDisabled?: boolean;
  cancelDisabled?: boolean;
  isLoading?: boolean;
  isDirty?: boolean;
}

// Brand-specific form section props
export interface BrandFormSectionProps<T> {
  formState: {
    state: T;
    updateField: (field: keyof T, value: any) => void;
    errors: Record<string, string | undefined>;
  };
}

// Social link entry type
export interface SocialLink {
  platform: string;
  url: string;
}

// File upload result type
export interface FileUploadResult {
  content: string; // base64 or URL
  name: string;
  size: number;
  type: string;
}

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

// Updated form component type definitions with enhanced image processing
// File: templates/src/types/formTypes.ts

import type { AllowedImageFormat, ImageDimensions } from '../utils/fileHelpers';

// Base props interface for all atomic form components
export interface BaseFormComponentProps<T> {
  value: T;
  onChange: (value: T) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

// String input specific props
export interface StringInputProps extends BaseFormComponentProps<string> {
  type?: 'text' | 'email' | 'url' | 'password';
  maxLength?: number;
  autoComplete?: string;
}

// String array input props (for tags/chips)
export interface StringArrayInputProps
  extends BaseFormComponentProps<string[]> {
  maxItems?: number;
  allowDuplicates?: boolean;
  separator?: string; // For parsing pasted content
  suggestions?: string[];
}

// Boolean toggle props
export interface BooleanToggleProps extends BaseFormComponentProps<boolean> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'switch' | 'checkbox';
}

// Enum select props
export interface EnumSelectProps extends BaseFormComponentProps<string> {
  options: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
  clearable?: boolean;
  searchable?: boolean;
}

// Color picker props
export interface ColorPickerProps extends BaseFormComponentProps<string> {
  format?: 'hex' | 'rgb' | 'hsl';
  showAlpha?: boolean;
  presetColors?: string[];
}

// Enhanced file upload props with advanced image processing
export interface FileUploadProps extends BaseFormComponentProps<string> {
  // Basic options
  accept?: string;
  maxSizeKB?: number;
  showPreview?: boolean;
  previewAlt?: string;

  // Enhanced validation options
  allowedFormats?: AllowedImageFormat[];
  requiredDimensions?: ImageDimensions;
  allowAnyImageWithWarning?: boolean;

  // Auto-processing options
  autoResize?: ImageDimensions;
  imageQuality?: number; // 0.1 to 1.0 for JPEG compression
}

// Number input props
export interface NumberInputProps extends BaseFormComponentProps<number> {
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  allowFloat?: boolean;
}

// Form section props (for composed form sections)
export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

// Form actions props
export interface FormActionsProps {
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  saveDisabled?: boolean;
  cancelDisabled?: boolean;
  isLoading?: boolean;
  isDirty?: boolean;
}

// Brand-specific form section props
export interface BrandFormSectionProps<T> {
  formState: {
    state: T;
    updateField: (field: keyof T, value: any) => void;
    errors: Record<string, string | undefined>;
  };
}

// Social link entry type
export interface SocialLink {
  platform: string;
  url: string;
}

// Enhanced file upload result type
export interface FileUploadResult {
  content: string; // base64 or URL
  name: string;
  size: number;
  type: string;
  originalDimensions?: ImageDimensions;
  finalDimensions?: ImageDimensions;
  warnings?: string[];
}

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

// Image processing result type
export interface ImageProcessingResult {
  processedFile: string; // base64
  warnings: string[];
  originalDimensions: ImageDimensions;
  finalDimensions: ImageDimensions;
}

// File validation options type
export interface FileValidationOptions {
  maxSizeKB?: number;
  allowedFormats?: AllowedImageFormat[];
  requiredDimensions?: ImageDimensions;
  allowAnyImageWithWarning?: boolean;
}
