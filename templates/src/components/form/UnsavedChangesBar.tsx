import { useEffect, useState } from 'react';
import type { FormStateReturn, SaveState } from '@/hooks/useFormState';

interface UnsavedChangesBarProps<T> {
  formState: FormStateReturn<T>;
  message?: string;
  saveLabel?: string;
  cancelLabel?: string;
  className?: string;
}

export default function UnsavedChangesBar<T>({
  formState,
  message = 'You have unsaved changes',
  saveLabel = 'Save',
  cancelLabel = 'Discard',
  className = '',
}: UnsavedChangesBarProps<T>) {
  const { isDirty, isValid, save, cancel, saveState, errorMessage } = formState;
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle visibility with smooth animations
  useEffect(() => {
    if (isDirty && !isVisible) {
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 10); // Trigger entrance animation
    } else if (!isDirty && isVisible && saveState !== 'saving') {
      setIsAnimating(false);
      setTimeout(() => setIsVisible(false), 1000); // 1 second delay before hiding
    }
  }, [isDirty, isVisible, saveState]);

  // Early return if not visible
  if (!isVisible) return null;

  // Determine bar styling based on save state
  const getBarStyling = (state: SaveState) => {
    switch (state) {
      case 'saving':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600',
          textColor: 'text-blue-800',
          icon: (
            <svg
              className="h-5 w-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ),
        };
      case 'success':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
          textColor: 'text-green-800',
          icon: (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          ),
        };
      case 'error':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
          textColor: 'text-red-800',
          icon: (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          ),
        };
      default: // 'idle' or unsaved changes
        return {
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          iconColor: 'text-amber-600',
          textColor: 'text-amber-800',
          icon: (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          ),
        };
    }
  };

  const styling = getBarStyling(saveState);

  // Get message based on save state
  const getMessage = () => {
    switch (saveState) {
      case 'saving':
        return 'Saving changes...';
      case 'success':
        return 'Changes saved successfully!';
      case 'error':
        return errorMessage || 'Failed to save changes';
      default:
        return message;
    }
  };

  // Handle save button click
  const handleSave = async () => {
    await save();
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transform pr-12 transition-all duration-300 ease-in-out ${
        isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      } ${className}`}
    >
      {/* Backdrop blur overlay */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" />

      {/* Main content bar */}
      <div className="relative mx-auto max-w-7xl px-4 py-4 md:px-6 xl:px-8">
        <div
          className={`flex items-center justify-between rounded-lg border px-4 py-3 shadow-lg ${styling.bgColor} ${styling.borderColor}`}
        >
          {/* Icon + message */}
          <div className="flex items-center space-x-3">
            <div className={`flex-shrink-0 ${styling.iconColor}`}>
              {styling.icon}
            </div>
            <div>
              <p className={`text-sm font-bold ${styling.textColor}`}>
                {getMessage()}
              </p>
              {saveState === 'error' && errorMessage && (
                <p className="mt-1 text-xs text-red-600">
                  Click save to try again
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-3">
            {/* Cancel/Discard button - only show when not saving or showing success */}
            {saveState !== 'saving' && saveState !== 'success' && (
              <button
                type="button"
                onClick={cancel}
                className={`rounded-md border px-3 py-2 text-sm font-bold shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  saveState === 'error'
                    ? 'border-red-300 bg-white text-red-800 hover:bg-red-50 focus:ring-red-500'
                    : 'border-amber-300 bg-white text-amber-800 hover:bg-amber-50 focus:ring-amber-500'
                }`}
              >
                {cancelLabel}
              </button>
            )}

            {/* Save button - only show when changes exist and not showing success */}
            {isDirty && saveState !== 'success' && (
              <button
                type="button"
                onClick={handleSave}
                disabled={!isValid || saveState === 'saving'}
                className={`rounded-md border border-transparent px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed ${
                  saveState === 'saving'
                    ? 'bg-blue-500 opacity-75'
                    : saveState === 'error'
                      ? isValid
                        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                        : 'bg-red-400 opacity-50'
                      : isValid
                        ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                        : 'bg-amber-400 opacity-50'
                }`}
              >
                {saveState === 'saving' ? 'Saving...' : saveLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Alternative minimal version for tighter spaces
export function UnsavedChangesBarMini<T>({
  formState,
  message = 'Unsaved changes',
}: Pick<UnsavedChangesBarProps<T>, 'formState' | 'message'>) {
  const { isDirty, isValid, save, cancel, saveState } = formState;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(isDirty);
  }, [isDirty]);

  if (!isVisible) return null;

  const handleSave = async () => {
    await save();
  };

  return (
    <div className="animate-in slide-in-from-bottom-2 fixed bottom-4 right-4 z-50 duration-300">
      <div
        className={`flex items-center space-x-2 rounded-lg border px-3 py-2 shadow-lg ${
          saveState === 'success'
            ? 'border-green-200 bg-green-50'
            : saveState === 'error'
              ? 'border-red-200 bg-red-50'
              : 'border-amber-200 bg-amber-50'
        }`}
      >
        <span
          className={`text-xs font-bold ${
            saveState === 'success'
              ? 'text-green-800'
              : saveState === 'error'
                ? 'text-red-800'
                : 'text-amber-800'
          }`}
        >
          {saveState === 'success'
            ? 'Saved!'
            : saveState === 'error'
              ? 'Error'
              : message}
        </span>

        {saveState !== 'success' && (
          <>
            <button
              onClick={cancel}
              className={`text-xs hover:font-bold ${
                saveState === 'error'
                  ? 'text-red-600 hover:text-red-800'
                  : 'text-amber-600 hover:text-amber-800'
              }`}
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid || saveState === 'saving'}
              className={`rounded px-2 py-1 text-xs text-white transition-colors disabled:cursor-not-allowed ${
                saveState === 'saving'
                  ? 'bg-blue-500 opacity-75'
                  : saveState === 'error'
                    ? isValid
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-red-400 opacity-50'
                    : isValid
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-amber-400 opacity-50'
              }`}
            >
              {saveState === 'saving' ? 'Saving...' : 'Save'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
