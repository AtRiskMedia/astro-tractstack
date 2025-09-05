import { useId } from 'react';
import { classNames } from '@/utils/helpers';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';

interface ParagraphArrayInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
  minRows?: number;
  maxRows?: number;
  placeholder?: string;
}

const ParagraphArrayInput = ({
  value = [],
  onChange,
  label,
  error,
  disabled = false,
  required = false,
  className,
  id: customId,
  name: customName,
  minRows = 3,
  maxRows = 10,
  placeholder = 'Enter paragraph text...',
}: ParagraphArrayInputProps) => {
  const defaultId = useId();
  const inputId = customId || defaultId;
  const errorId = `${inputId}-error`;
  const inputName = customName || inputId;

  const updateParagraph = (index: number, newValue: string) => {
    const newParagraphs = [...value];
    newParagraphs[index] = newValue;
    onChange(newParagraphs);
  };

  const addParagraph = () => {
    onChange([...value, '']);
  };

  const removeParagraph = (index: number) => {
    const newParagraphs = value.filter((_, i) => i !== index);
    onChange(newParagraphs);
  };

  const moveParagraph = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= value.length) return;

    const newParagraphs = [...value];
    const [movedItem] = newParagraphs.splice(fromIndex, 1);
    newParagraphs.splice(toIndex, 0, movedItem);
    onChange(newParagraphs);
  };

  // Calculate dynamic rows based on content
  const calculateRows = (text: string): number => {
    const lines = text.split('\n').length;
    const estimatedLines = Math.max(lines, Math.ceil(text.length / 80));
    return Math.min(Math.max(estimatedLines, minRows), maxRows);
  };

  return (
    <div className={classNames('space-y-3', className || '')}>
      {label && (
        <label className="block text-sm font-bold text-gray-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
          <span className="ml-2 text-xs text-gray-500">
            ({value.length} paragraph{value.length !== 1 ? 's' : ''})
          </span>
        </label>
      )}

      <div className="space-y-3">
        {value.map((paragraph, index) => (
          <div key={index} className="group relative">
            <div className="flex items-start gap-2">
              {/* Paragraph number */}
              <div className="mt-2 flex-shrink-0">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                  {index + 1}
                </span>
              </div>

              {/* Textarea */}
              <div className="flex-1">
                <textarea
                  id={`${inputId}-${index}`}
                  name={`${inputName}-${index}`}
                  value={paragraph}
                  onChange={(e) => updateParagraph(index, e.target.value)}
                  disabled={disabled}
                  placeholder={placeholder}
                  rows={calculateRows(paragraph)}
                  aria-invalid={!!error}
                  aria-describedby={error ? errorId : undefined}
                  className={classNames(
                    'block w-full resize-y rounded-md border-0 px-4 py-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset',
                    error
                      ? 'ring-red-300 focus:ring-red-500'
                      : 'focus:ring-cyan-600',
                    disabled
                      ? 'cursor-not-allowed bg-gray-50 text-gray-500'
                      : 'bg-white',
                    'text-lg leading-relaxed'
                  )}
                />
              </div>

              {/* Action buttons */}
              {!disabled && (
                <div className="mt-1 flex flex-shrink-0 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {/* Move up */}
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => moveParagraph(index, index - 1)}
                      className="p-1 text-gray-400 hover:text-gray-600 focus:text-gray-600 focus:outline-none"
                      aria-label={`Move paragraph ${index + 1} up`}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}

                  {/* Move down */}
                  {index < value.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moveParagraph(index, index + 1)}
                      className="p-1 text-gray-400 hover:text-gray-600 focus:text-gray-600 focus:outline-none"
                      aria-label={`Move paragraph ${index + 1} down`}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}

                  {/* Delete */}
                  {value.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParagraph(index)}
                      className="p-1 text-red-400 hover:text-red-600 focus:text-red-600 focus:outline-none"
                      aria-label={`Delete paragraph ${index + 1}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add paragraph button */}
        {!disabled && (
          <div className="pt-2">
            <button
              type="button"
              onClick={addParagraph}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add Paragraph
            </button>
          </div>
        )}
      </div>

      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default ParagraphArrayInput;
