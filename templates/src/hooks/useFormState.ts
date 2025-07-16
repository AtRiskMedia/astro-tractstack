import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

// Form validation error types
export interface FieldErrors {
  [fieldName: string]: string | undefined;
}

// Save operation states
export type SaveState = 'idle' | 'saving' | 'success' | 'error';

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
  onSave: (data: T) => Promise<T | void> | T | void; // Now supports returning updated state or void
  unsavedChanges?: UnsavedChangesOptions;
}

// Return type for the useFormState hook
export interface FormStateReturn<T> {
  state: T;
  originalState: T;
  updateField: (field: keyof T, value: any) => void;
  save: () => Promise<void>;
  cancel: () => void;
  resetToState: (newState: T) => void; // NEW: Reset form to new baseline state
  isDirty: boolean;
  isValid: boolean;
  errors: FieldErrors;
  saveState: SaveState; // NEW: Track save operation state
  errorMessage: string | null; // NEW: Save error message
}

/**
 * useFormState - Enhanced form state management with proper save state synchronization
 *
 * Provides complete save/cancel/validation workflow with interceptor support
 * and the ability to reset to a new baseline state after successful saves.
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
  const [originalState, setOriginalState] = useState<T>(initialData);

  // Save operation state tracking
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ref to track if we're currently saving to prevent double-saves
  const isSaving = useRef(false);

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
      if (isDirty && saveState !== 'saving') {
        const message =
          unsavedChanges.browserWarningMessage ||
          'You have unsaved changes. Are you sure you want to leave?';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    if (isDirty && saveState !== 'saving') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, saveState, unsavedChanges]);

  // Update field with optional interceptor
  const updateField = useCallback(
    (field: keyof T, value: any) => {
      // Clear any previous save state when user makes changes
      if (saveState !== 'idle') {
        setSaveState('idle');
        setErrorMessage(null);
      }

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
    [interceptor, saveState]
  );

  // Enhanced save function with state management
  const save = useCallback(async () => {
    // Prevent double-saves
    if (!isValid || isSaving.current || saveState === 'saving') {
      return;
    }

    isSaving.current = true;
    setSaveState('saving');
    setErrorMessage(null);

    try {
      // Call the save function
      const result = await onSave(state);

      // If onSave returns updated state, use it; otherwise use current state
      const updatedState = result && result !== undefined ? result : state;

      // Set success state briefly
      setSaveState('success');

      // Reset to idle after success feedback period
      setTimeout(() => {
        // Reset form to the new baseline state
        setOriginalState(updatedState);
        setState(updatedState);
        setSaveState('idle');
      }, 2000);
    } catch (error) {
      setSaveState('error');
      const message = error instanceof Error ? error.message : 'Save failed';
      setErrorMessage(message);
      console.error('Save failed:', error);
    } finally {
      isSaving.current = false;
    }
  }, [state, isValid, onSave, saveState]);

  // Cancel function - revert to original state
  const cancel = useCallback(() => {
    setState(originalState);
    setSaveState('idle');
    setErrorMessage(null);
  }, [originalState]);

  // NEW: Reset to new state (for external state updates)
  const resetToState = useCallback((newState: T) => {
    setOriginalState(newState);
    setState(newState);
    setSaveState('idle');
    setErrorMessage(null);
  }, []);

  return {
    state,
    originalState,
    updateField,
    save,
    cancel,
    resetToState,
    isDirty,
    isValid,
    errors,
    saveState,
    errorMessage,
  };
}
