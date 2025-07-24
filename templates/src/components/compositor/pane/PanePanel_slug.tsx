import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import { getCtx } from '@/stores/nodes';
import { cloneDeep } from '@/utils/helpers';
import { PaneConfigMode, type PaneNode } from '@/types/compositorTypes';

interface PaneSlugPanelProps {
  nodeId: string;
  setMode: Dispatch<SetStateAction<PaneConfigMode>>;
}

const PaneSlugPanel = ({ nodeId, setMode }: PaneSlugPanelProps) => {
  const [slug, setSlug] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [warning, setWarning] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [canSave, setCanSave] = useState(false);

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const paneNode = allNodes.get(nodeId) as PaneNode;
  if (!paneNode) return null;

  useEffect(() => {
    setSlug(paneNode.slug);
    setCharCount(paneNode.slug.length);
    checkLiveValidity(paneNode.slug);
  }, [paneNode.slug]);

  // More permissive validation for typing
  const checkLiveValidity = (value: string) => {
    const length = value.length;
    setCharCount(length);

    // Basic format check for allowed characters
    if (!/^[a-z0-9-]*$/.test(value)) {
      setValidationError(
        'Only lowercase letters, numbers, and hyphens allowed'
      );
      setIsValid(false);
      setCanSave(false);
      return false;
    }

    // Length checks
    setIsValid(length >= 3 && length <= 40);
    setWarning(length > 40 && length <= 50);
    setValidationError(null);

    // Check if we can save
    if (length >= 3) {
      const saveValidation = checkSaveValidity(value);
      setCanSave(saveValidation.isValid);
      if (!saveValidation.isValid) {
        setValidationError(saveValidation.error || null);
      }
    } else {
      setCanSave(false);
    }

    return true;
  };

  // Strict validation for saving
  const checkSaveValidity = (
    value: string
  ): { isValid: boolean; error?: string } => {
    // Strict pattern that prevents leading/trailing hyphens and multiple consecutive hyphens
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
      return {
        isValid: false,
        error:
          'Slug must start and end with letters or numbers, and no consecutive hyphens',
      };
    }

    // Check duplicates and reserved slugs
    return ctx.isSlugValid(value, nodeId);
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSlug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');

    if (newSlug.length <= 50) {
      setSlug(newSlug);
      checkLiveValidity(newSlug);
    }
  };

  const handleSlugBlur = () => {
    if (canSave) {
      const ctx = getCtx();
      const updatedNode = { ...cloneDeep(paneNode), slug, isChanged: true };
      ctx.modifyNodes([updatedNode]);
    }
  };

  return (
    <div className="group mb-4 w-full rounded-b-md bg-white px-1.5 py-6 shadow-inner">
      <div className="px-3.5">
        <div className="mb-4 flex justify-between">
          <h3 className="text-lg font-bold">Pane Slug</h3>
          <button
            onClick={() => setMode(PaneConfigMode.DEFAULT)}
            className="text-myblue hover:text-black"
          >
            ← Go Back
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={slug}
            onChange={handleSlugChange}
            onBlur={handleSlugBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className={`w-full rounded-md border px-2 py-1 pr-16 ${
              validationError || charCount < 3
                ? 'border-red-500 bg-red-50'
                : isValid && canSave
                  ? 'border-green-500 bg-green-50'
                  : warning
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-300'
            }`}
            placeholder="Enter pane slug (3-40 characters recommended)"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
            {validationError || charCount < 3 ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            ) : isValid && canSave ? (
              <CheckIcon className="h-5 w-5 text-green-500" />
            ) : warning ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
            ) : null}
            <span
              className={`text-sm ${
                validationError || charCount < 3
                  ? 'text-red-500'
                  : isValid && canSave
                    ? 'text-green-500'
                    : warning
                      ? 'text-yellow-500'
                      : 'text-gray-500'
              }`}
            >
              {charCount}/50
            </span>
          </div>
        </div>
        {validationError && (
          <div className="mt-2 text-sm text-red-600">
            <ExclamationTriangleIcon className="mr-1 inline h-4 w-4" />
            {validationError}
          </div>
        )}
        <div className="mt-4 space-y-4 text-lg">
          <div className="text-gray-600">
            This is solely used for analytics!
            <ul className="ml-4 mt-1">
              <li>
                <CheckIcon className="inline h-4 w-4" /> Keep it concise and
                descriptive
              </li>
              <li>
                <CheckIcon className="inline h-4 w-4" /> Use lowercase letters
                and numbers
              </li>
              <li>
                <CheckIcon className="inline h-4 w-4" /> Use hyphens between
                words
              </li>
              <li>
                <CheckIcon className="inline h-4 w-4" /> Must start and end with
                a letter or number
              </li>
            </ul>
          </div>
          <div className="py-4">
            {charCount < 3 && (
              <span className="text-red-500">
                Slug must be at least 3 characters
              </span>
            )}
            {charCount >= 3 && charCount < 5 && !validationError && (
              <span className="text-gray-500">
                Consider adding more characters for better description
              </span>
            )}
            {warning && !validationError && (
              <span className="text-yellow-500">
                Slug is getting long - consider shortening it
              </span>
            )}
            {isValid && canSave && charCount >= 5 && !validationError && (
              <span className="text-green-500">
                Good slug length and format!
              </span>
            )}
            {isValid && !canSave && !validationError && (
              <span className="text-gray-500">
                Valid characters but needs proper formatting to save
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaneSlugPanel;
