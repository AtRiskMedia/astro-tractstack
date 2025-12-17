import { useState, useMemo, useEffect } from 'react';
import { CheckIcon } from '@heroicons/react/20/solid';
import { savePaneToLibrary } from '@/utils/compositor/designLibraryHelper';
import { convertToBackendFormat } from '@/utils/api/brandHelpers';
import StringInput from '@/components/form/StringInput';
import { brandConfigStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import type { FlatNode } from '@/types/compositorTypes';

interface SaveToLibraryModalProps {
  paneId: string;
  onClose: () => void;
}

type CopyMode = 'retain' | 'lorem' | 'blank';
type SaveState = 'idle' | 'saving' | 'saved';

const copyOptions: { id: CopyMode; title: string; description: string }[] = [
  {
    id: 'retain',
    title: 'Retain Copy',
    description: 'Save the design with all current text and content.',
  },
  {
    id: 'lorem',
    title: 'Lorem Ipsum',
    description:
      'Save the design structure, replacing text with placeholders and removing overrides.',
  },
  {
    id: 'blank',
    title: 'Blank',
    description: 'Save the design structure with no content nodes.',
  },
];

const OTHER_CATEGORY = 'other';

export function SaveToLibraryModal({
  paneId,
  onClose,
}: SaveToLibraryModalProps) {
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(OTHER_CATEGORY);
  const [customCategory, setCustomCategory] = useState('');
  const [copyMode, setCopyMode] = useState<CopyMode>('retain');
  const [locked, setLocked] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState('');

  const designLibrary = brandConfigStore.get()?.DESIGN_LIBRARY || [];
  const categories = useMemo(() => {
    const cats =
      designLibrary
        .map((item) => item.category)
        .filter((v, i, a) => a.indexOf(v) === i) || [];
    return [...cats, OTHER_CATEGORY];
  }, [designLibrary]);

  useEffect(() => {
    const ctx = getCtx();
    const childIds = ctx.getChildNodeIDs(paneId);

    const hasWidget = (ids: string[]): boolean => {
      for (const id of ids) {
        const node = ctx.allNodes.get().get(id) as FlatNode;
        if (!node) continue;

        // Strict check for widget based on tagName being 'code'
        if (node.tagName === 'code') {
          return true;
        }

        const children = ctx.getChildNodeIDs(id);
        if (children.length > 0 && hasWidget(children)) {
          return true;
        }
      }
      return false;
    };

    if (hasWidget(childIds)) {
      setLocked(true);
      setCopyMode('retain');
    }
  }, [paneId]);

  useEffect(() => {
    if (saveState === 'saved') {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [saveState, onClose]);

  const handleSave = async () => {
    const finalCategory =
      selectedCategory === OTHER_CATEGORY ? customCategory : selectedCategory;
    if (!title || !finalCategory) {
      setError('Title and category are required.');
      return;
    }
    setError('');
    setSaveState('saving');

    const formData = {
      title: title,
      category: finalCategory,
      copyMode: copyMode,
      locked: locked,
    };
    const brandConfig = brandConfigStore.get();

    if (brandConfig) {
      const newBrandConfig = await savePaneToLibrary(
        paneId,
        brandConfig.TENANT_ID,
        brandConfig,
        formData
      );
      if (newBrandConfig) {
        const backendDTO = convertToBackendFormat(newBrandConfig);
        brandConfigStore.set({
          ...backendDTO,
          TENANT_ID: brandConfig.TENANT_ID,
        });
        setSaveState('saved');
      } else {
        setSaveState('idle');
        setError('Failed to save template. Please try again.');
      }
    } else {
      setSaveState('idle');
      setError('Failed to save template. Brand Config not found.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-105 flex items-center justify-center bg-black bg-opacity-75"
      onClick={saveState === 'idle' ? onClose : undefined}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            Save Pane to Library
          </h2>
        </div>

        <div className="mt-4 space-y-4">
          <StringInput label="Title" value={title} onChange={setTitle} />

          <div>
            <label
              htmlFor="category-select"
              className="block text-sm font-bold text-gray-700"
            >
              Category
            </label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="sm:text-sm mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-cyan-500 focus:outline-none focus:ring-cyan-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === OTHER_CATEGORY ? 'New Category...' : cat}
                </option>
              ))}
            </select>
            {selectedCategory === OTHER_CATEGORY && (
              <StringInput
                label="New Category Name"
                value={customCategory}
                onChange={setCustomCategory}
                className="mt-2"
              />
            )}
          </div>

          {!locked && (
            <div>
              <label className="block text-sm font-bold text-gray-700">
                Content Mode
              </label>
              <fieldset className="mt-2">
                <legend className="sr-only">Copy Mode</legend>
                <div className="space-y-2">
                  {copyOptions.map((option) => (
                    <div key={option.id} className="flex items-center">
                      <input
                        id={option.id}
                        name="copy-mode"
                        type="radio"
                        value={option.id}
                        checked={copyMode === option.id}
                        onChange={() => setCopyMode(option.id)}
                        className="h-4 w-4 border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <label
                        htmlFor={option.id}
                        className="ml-3 block text-sm font-bold text-gray-700"
                      >
                        {option.title}
                        <p className="text-xs text-gray-500">
                          {option.description}
                        </p>
                      </label>
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            disabled={saveState !== 'idle'}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saveState !== 'idle'}
            className="flex min-w-36 items-center justify-center rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSave}
          >
            {saveState === 'idle' && 'Save to Library'}
            {saveState === 'saving' && 'Saving...'}
            {saveState === 'saved' && (
              <>
                <CheckIcon className="mr-2 h-5 w-5" />
                Saved
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
