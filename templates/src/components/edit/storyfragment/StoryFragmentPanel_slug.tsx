import { useState, useEffect, type ChangeEvent } from 'react';
import { useStore } from '@nanostores/react';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import LockClosedIcon from '@heroicons/react/24/outline/LockClosedIcon';
import { Switch } from '@ark-ui/react/switch';
import { getCtx } from '@/stores/nodes';
import { pendingHomePageSlugStore } from '@/stores/storykeep';
import { cloneDeep } from '@/utils/helpers';
import type { BrandConfig } from '@/types/tractstack';
import {
  StoryFragmentMode,
  type StoryFragmentNode,
} from '@/types/compositorTypes';

interface StoryFragmentSlugPanelProps {
  nodeId: string;
  setMode: (mode: StoryFragmentMode) => void;
  config: BrandConfig;
}

const StoryFragmentSlugPanel = ({
  nodeId,
  setMode,
  config,
}: StoryFragmentSlugPanelProps) => {
  const [slug, setSlug] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [warning, setWarning] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [canSave, setCanSave] = useState(false);
  const isHomeSlug = slug === config.HOME_SLUG;
  const pendingHomePageSlug = useStore(pendingHomePageSlugStore);
  const isSetAsHomePage = pendingHomePageSlug === slug;

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const storyfragmentNode = allNodes.get(nodeId) as StoryFragmentNode;
  if (!storyfragmentNode) return null;

  useEffect(() => {
    setSlug(storyfragmentNode.slug);
    setCharCount(storyfragmentNode.slug.length);
    checkLiveValidity(storyfragmentNode.slug);
  }, [storyfragmentNode.slug]);

  // More permissive validation for typing
  const checkLiveValidity = (value: string) => {
    const length = value.length;
    setCharCount(length);

    // If it's the home slug, consider it valid but locked
    if (value === config.HOME_SLUG) {
      setIsValid(true);
      setCanSave(false);
      setValidationError(null);
      return true;
    }

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
    setIsValid(length >= 3 && length <= 60);
    setWarning(length > 60 && length <= 75);
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
    // Don't allow saving if it's the home slug
    if (value === config.HOME_SLUG) {
      return {
        isValid: false,
        error: 'Cannot modify the home page slug',
      };
    }

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

  const handleSlugChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (isHomeSlug) return; // Prevent changes if it's the home slug

    const newSlug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (newSlug.length <= 75) {
      setSlug(newSlug);
      checkLiveValidity(newSlug);
    }
  };

  const handleSlugBlur = () => {
    if (canSave && !isHomeSlug) {
      const ctx = getCtx();
      const updatedNode = cloneDeep({
        ...storyfragmentNode,
        slug,
        isChanged: true,
      });
      ctx.modifyNodes([updatedNode]);
    }
  };

  const handleSetAsHomePageChange = (details: { checked: boolean }) => {
    if (details.checked) {
      pendingHomePageSlugStore.set(slug);
    } else {
      pendingHomePageSlugStore.set(null);
    }
  };

  return (
    <div className="group mb-4 w-full rounded-b-md bg-white px-1.5 py-6">
      <div className="px-3.5">
        <div className="mb-4 flex justify-between">
          <h3 className="text-lg font-bold">Slug (url)</h3>
          <button
            onClick={() => setMode(StoryFragmentMode.DEFAULT)}
            className="text-myblue hover:text-black"
          >
            ← Close Panel
          </button>
        </div>

        <div className="relative max-w-96">
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
            readOnly={isHomeSlug}
            className={`w-full rounded-md border px-2 py-1 pr-16 ${
              isHomeSlug
                ? 'cursor-not-allowed border-gray-300 bg-gray-100'
                : validationError || charCount < 3
                  ? 'border-red-500 bg-red-50'
                  : isValid && canSave
                    ? 'border-green-500 bg-green-50'
                    : warning
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-300'
            }`}
            placeholder="Enter URL slug (3-60 characters recommended)"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
            {isHomeSlug ? (
              <LockClosedIcon className="h-5 w-5 text-gray-500" />
            ) : validationError || charCount < 3 ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            ) : isValid && canSave ? (
              <CheckIcon className="h-5 w-5 text-green-500" />
            ) : warning ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
            ) : null}
            <span
              className={`text-sm ${
                isHomeSlug
                  ? 'text-gray-500'
                  : validationError || charCount < 3
                    ? 'text-red-500'
                    : isValid && canSave
                      ? 'text-green-500'
                      : warning
                        ? 'text-yellow-500'
                        : 'text-gray-500'
              }`}
            >
              {charCount}/75
            </span>
          </div>
        </div>

        {validationError && (
          <div className="mt-2 text-sm text-red-600">
            <ExclamationTriangleIcon className="mr-1 inline h-4 w-4" />
            {validationError}
          </div>
        )}

        {isHomeSlug && (
          <div className="mt-4">
            <div className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1.5 text-sm font-bold text-blue-800">
              <LockClosedIcon className="mr-1.5 h-4 w-4" />
              Home Page
            </div>
            <div className="mt-2 text-sm text-gray-600">
              This is your current home page
            </div>
          </div>
        )}

        {!isHomeSlug && isValid && canSave && (
          <div className="mt-4">
            <div className="flex items-center space-x-3">
              <Switch.Root
                checked={isSetAsHomePage}
                onCheckedChange={handleSetAsHomePageChange}
                className="flex items-center"
              >
                <Switch.Control
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isSetAsHomePage ? 'bg-cyan-600' : 'bg-gray-200'
                  }`}
                >
                  <Switch.Thumb
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isSetAsHomePage ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </Switch.Control>
                <Switch.HiddenInput />
              </Switch.Root>
              <span className="text-sm text-gray-700">Set as Home Page</span>
            </div>
            {isSetAsHomePage && (
              <div className="mt-2 text-sm text-cyan-600">
                ✓ Will be set as home page when saved
              </div>
            )}
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600">
          Create a clean, descriptive URL slug that helps users and search
          engines understand the page content.
        </div>
      </div>
    </div>
  );
};

export default StoryFragmentSlugPanel;
