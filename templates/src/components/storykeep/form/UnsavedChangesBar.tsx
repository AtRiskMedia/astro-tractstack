import { useEffect, useState } from 'react';
import type { FormStateReturn } from '../../../hooks/useFormState';

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
  const { isDirty, isValid, save, cancel } = formState;
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle visibility with smooth animations
  useEffect(() => {
    if (isDirty && !isVisible) {
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 10); // Trigger entrance animation
    } else if (!isDirty && isVisible) {
      setIsAnimating(false);
      setTimeout(() => setIsVisible(false), 300); // Wait for exit animation
    }
  }, [isDirty, isVisible]);

  // Early return if not visible
  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transform transition-all duration-300 ease-in-out ${
        isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      } ${className}`}
    >
      {/* Backdrop blur overlay */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" />

      {/* Main content bar */}
      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg">
          {/* Warning icon + message */}
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-amber-600"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">{message}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={cancel}
              className="rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-amber-800 shadow-sm transition-colors duration-150 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!isValid}
              className="rounded-md border border-transparent bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors duration-150 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-amber-400 disabled:hover:bg-amber-400"
            >
              {saveLabel}
            </button>
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
  const { isDirty, isValid, save, cancel } = formState;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(isDirty);
  }, [isDirty]);

  if (!isVisible) return null;

  return (
    <div className="animate-in slide-in-from-bottom-2 fixed bottom-4 right-4 z-50 duration-300">
      <div className="flex items-center space-x-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 shadow-lg">
        <span className="text-xs font-bold text-amber-800">{message}</span>
        <button
          onClick={cancel}
          className="text-xs text-amber-600 hover:text-amber-800"
        >
          Discard
        </button>
        <button
          onClick={save}
          disabled={!isValid}
          className="rounded bg-amber-600 px-2 py-1 text-xs text-white hover:bg-amber-700 disabled:bg-amber-400"
        >
          Save
        </button>
      </div>
    </div>
  );
}
