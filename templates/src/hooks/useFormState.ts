import { useState, useCallback, useMemo, useEffect } from 'react';

// Form validation error types
export interface FieldErrors {
  [fieldName: string]: string | undefined;
}

// Unsaved changes options
export interface UnsavedChangesOptions {
  /**
   * Message to show in browser dialog when user tries to leave
   */
  browserWarningMessage?: string;

  /**
   * Whether to show browser warning dialog on page unload
   */
  enableBrowserWarning?: boolean;
}

// Generic form state configuration
export interface FormStateConfig<T> {
  initialData: T;
  validator?: (state: T) => FieldErrors;
  interceptor?: (newState: T, field: keyof T, value: any) => T;
  onSave: (data: T) => void;
  unsavedChanges?: UnsavedChangesOptions;
}

// Return type for the useFormState hook
export interface FormStateReturn<T> {
  state: T;
  originalState: T;
  updateField: (field: keyof T, value: any) => void;
  save: () => void;
  cancel: () => void;
  isDirty: boolean;
  isValid: boolean;
  errors: FieldErrors;
}

/**
 * useFormState - Reusable form state management building block
 *
 * Provides complete save/cancel/validation workflow with interceptor support
 * for complex state transformations (like theme preset overrides).
 *
 * @param config - Form configuration object
 * @returns Form state management object
 */
export function useFormState<T>(
  config: FormStateConfig<T>
): FormStateReturn<T> {
  const { initialData, validator, interceptor, onSave, unsavedChanges } =
    config;

  // Core state management
  const [state, setState] = useState<T>(initialData);
  const [originalState] = useState<T>(initialData);

  // Validation errors
  const errors = useMemo(() => {
    return validator ? validator(state) : {};
  }, [state, validator]);

  // Computed properties
  const isDirty = useMemo(() => {
    return JSON.stringify(state) !== JSON.stringify(originalState);
  }, [state, originalState]);

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Browser warning for unsaved changes
  useEffect(() => {
    if (!unsavedChanges?.enableBrowserWarning) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        const message =
          unsavedChanges.browserWarningMessage ||
          'You have unsaved changes. Are you sure you want to leave?';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    if (isDirty) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, unsavedChanges]);

  // Update field with optional interceptor
  const updateField = useCallback(
    (field: keyof T, value: any) => {
      setState((currentState) => {
        const newState = {
          ...currentState,
          [field]: value,
        };

        // Apply interceptor if provided
        if (interceptor) {
          return interceptor(newState, field, value);
        }

        return newState;
      });
    },
    [interceptor]
  );

  // Save function
  const save = useCallback(() => {
    if (isValid) {
      onSave(state);
    }
  }, [state, isValid, onSave]);

  // Cancel function - revert to original state
  const cancel = useCallback(() => {
    setState(originalState);
  }, [originalState]);

  return {
    state,
    originalState,
    updateField,
    save,
    cancel,
    isDirty,
    isValid,
    errors,
  };
}
