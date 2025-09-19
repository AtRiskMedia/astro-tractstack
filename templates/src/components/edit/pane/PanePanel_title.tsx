import {
  useState,
  useEffect,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
} from 'react';
import { useStore } from '@nanostores/react';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import { fullContentMapStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { cloneDeep, findUniqueSlug, titleToSlug } from '@/utils/helpers';
import { PaneConfigMode, type PaneNode } from '@/types/compositorTypes';

interface PaneTitlePanelProps {
  nodeId: string;
  setMode: Dispatch<SetStateAction<PaneConfigMode>>;
}

const PaneTitlePanel = ({ nodeId, setMode }: PaneTitlePanelProps) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isValidTitle, setIsValidTitle] = useState(false);
  const [isValidSlug, setIsValidSlug] = useState(false);
  const [warningTitle, setWarningTitle] = useState(false);
  const [warningSlug, setWarningSlug] = useState(false);
  const [titleCharCount, setTitleCharCount] = useState(0);
  const [slugCharCount, setSlugCharCount] = useState(0);
  const [slugValidationError, setSlugValidationError] = useState<string | null>(
    null
  );
  const [canSaveSlug, setCanSaveSlug] = useState(false);

  const $contentMap = useStore(fullContentMapStore);
  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const paneNode = allNodes.get(nodeId) as PaneNode;
  if (!paneNode) return null;

  const existingSlugs = $contentMap
    .filter(
      (item) =>
        ['Pane', 'StoryFragment'].includes(item.type) && item.id !== nodeId
    )
    .map((item) => item.slug);

  useEffect(() => {
    setTitle(paneNode.title);
    setSlug(paneNode.slug);
    setTitleCharCount(paneNode.title.length);
    setSlugCharCount(paneNode.slug.length);
    checkSlugLiveValidity(paneNode.slug);
  }, [paneNode.title, paneNode.slug]);

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    if (newTitle.length <= 50) {
      setTitle(newTitle);
      setTitleCharCount(newTitle.length);
      setIsValidTitle(newTitle.length >= 5 && newTitle.length <= 35);
      setWarningTitle(newTitle.length > 35 && newTitle.length <= 50);
    }
  };

  const handleSlugChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newSlug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');

    if (newSlug.length <= 50) {
      setSlug(newSlug);
      checkSlugLiveValidity(newSlug);
    }
  };

  const checkSlugLiveValidity = (value: string) => {
    const length = value.length;
    setSlugCharCount(length);

    // Basic format check for allowed characters
    if (!/^[a-z0-9-]*$/.test(value)) {
      setSlugValidationError(
        'Only lowercase letters, numbers, and hyphens allowed'
      );
      setIsValidSlug(false);
      setCanSaveSlug(false);
      return false;
    }

    // Length checks
    setIsValidSlug(length >= 3 && length <= 40);
    setWarningSlug(length > 40 && length <= 50);
    setSlugValidationError(null);

    // Check if we can save
    if (length >= 3) {
      const saveValidation = checkSlugSaveValidity(value);
      setCanSaveSlug(saveValidation.isValid);
      if (!saveValidation.isValid) {
        setSlugValidationError(saveValidation.error || null);
      }
    } else {
      setCanSaveSlug(false);
    }

    return true;
  };

  const checkSlugSaveValidity = (
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

    // Check duplicates
    if (existingSlugs.includes(value)) {
      return {
        isValid: false,
        error: 'This slug is already in use',
      };
    }

    return { isValid: true };
  };

  const handleTitleBlur = () => {
    if (title.length >= 5) {
      // Auto-generate slug if slug is empty or still system-generated
      let updatedSlug = slug;
      if (!slug || slug === paneNode.slug) {
        const generatedSlug = titleToSlug(title);
        const uniqueSlug = findUniqueSlug(generatedSlug, existingSlugs);
        updatedSlug = uniqueSlug;
        setSlug(uniqueSlug);
        checkSlugLiveValidity(uniqueSlug);
      }

      const ctx = getCtx();
      const updatedNode = {
        ...cloneDeep(paneNode),
        title,
        slug: updatedSlug,
        isChanged: true,
      };
      ctx.modifyNodes([updatedNode]);
    }
  };

  const handleSlugBlur = () => {
    if (canSaveSlug) {
      const ctx = getCtx();
      const updatedNode = { ...cloneDeep(paneNode), slug, isChanged: true };
      ctx.modifyNodes([updatedNode]);
    }
  };

  return (
    <div className="group mb-4 w-full rounded-b-md bg-white px-1.5 py-6 shadow-inner">
      <div className="px-3.5">
        <div className="mb-4 flex justify-between">
          <h3 className="text-lg font-bold">Pane Title & Slug</h3>
          <button
            onClick={() => setMode(PaneConfigMode.DEFAULT)}
            className="text-myblue hover:text-black"
          >
            ← Go Back
          </button>
        </div>

        {/* Title Input */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-bold text-gray-700">
            Title
          </label>
          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              className={`w-full rounded-md border px-2 py-1 pr-16 ${
                titleCharCount < 5
                  ? 'border-red-500 bg-red-50'
                  : isValidTitle
                    ? 'border-green-500 bg-green-50'
                    : warningTitle
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-300'
              }`}
              placeholder="Enter pane title (5-35 characters recommended)"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
              {titleCharCount < 5 ? (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              ) : isValidTitle ? (
                <CheckIcon className="h-5 w-5 text-green-500" />
              ) : warningTitle ? (
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
              ) : null}
              <span
                className={`text-sm ${
                  titleCharCount < 5
                    ? 'text-red-500'
                    : isValidTitle
                      ? 'text-green-500'
                      : warningTitle
                        ? 'text-yellow-500'
                        : 'text-gray-500'
                }`}
              >
                {titleCharCount}/50
              </span>
            </div>
          </div>
        </div>

        {/* Slug Input */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold text-gray-700">
            Slug (URL)
          </label>
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
                slugValidationError || slugCharCount < 3
                  ? 'border-red-500 bg-red-50'
                  : isValidSlug && canSaveSlug
                    ? 'border-green-500 bg-green-50'
                    : warningSlug
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-300'
              }`}
              placeholder="Enter pane slug (3-40 characters recommended)"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
              {slugValidationError || slugCharCount < 3 ? (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              ) : isValidSlug && canSaveSlug ? (
                <CheckIcon className="h-5 w-5 text-green-500" />
              ) : warningSlug ? (
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
              ) : null}
              <span
                className={`text-sm ${
                  slugValidationError || slugCharCount < 3
                    ? 'text-red-500'
                    : isValidSlug && canSaveSlug
                      ? 'text-green-500'
                      : warningSlug
                        ? 'text-yellow-500'
                        : 'text-gray-500'
                }`}
              >
                {slugCharCount}/50
              </span>
            </div>
          </div>
          {slugValidationError && (
            <div className="mt-2 text-sm text-red-600">
              <ExclamationTriangleIcon className="mr-1 inline h-4 w-4" />
              {slugValidationError}
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <h4 className="font-semibold">Title Guidelines:</h4>
            <ul className="ml-4 mt-1 list-disc">
              <li>5-35 characters recommended for optimal display</li>
              <li>Clear, descriptive title for the pane content</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold">Slug Guidelines:</h4>
            <ul className="ml-4 mt-1 list-disc">
              <li>Used for analytics tracking</li>
              <li>Only lowercase letters, numbers, and hyphens</li>
              <li>Must start and end with letter or number</li>
              <li>No consecutive hyphens</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaneTitlePanel;
