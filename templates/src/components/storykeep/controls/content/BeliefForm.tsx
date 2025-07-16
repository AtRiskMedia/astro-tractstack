import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { useFormState } from '../../../../hooks/useFormState';
import {
  convertToLocalState,
  validateBeliefNode,
  beliefStateIntercept,
  addCustomValue,
  removeCustomValue,
  SCALE_OPTIONS,
  getScalePreview,
} from '../../../../utils/beliefHelpers';
import { saveBeliefWithStateUpdate } from '../../../../utils/api/beliefConfig';
import {
  orphanAnalysisStore,
  loadOrphanAnalysis,
} from '../../../../stores/orphanAnalysis';
import StringInput from '../../form/StringInput';
import EnumSelect from '../../form/EnumSelect';
import UnsavedChangesBar from '../../form/UnsavedChangesBar';
import {
  PlusIcon,
  XMarkIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import type { BeliefNode, BeliefNodeState } from '../../../../types/tractstack';

interface BeliefFormProps {
  belief?: BeliefNode;
  isCreate?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function BeliefForm({
  belief,
  isCreate = false,
  onSuccess,
  onCancel,
}: BeliefFormProps) {
  const [customValue, setCustomValue] = useState('');

  // Subscribe to orphan analysis store
  const orphanState = useStore(orphanAnalysisStore);

  // Load orphan analysis on component mount
  useEffect(() => {
    loadOrphanAnalysis();
  }, []);

  // Get usage information for this belief
  const getBeliefUsage = (): string[] => {
    if (!belief?.id || !orphanState.data || !orphanState.data.beliefs) {
      return [];
    }
    return orphanState.data.beliefs[belief.id] || [];
  };

  // Check if belief is in use
  const isBeliefInUse = (): boolean => {
    if (isCreate || !belief?.id) return false;
    return getBeliefUsage().length > 0;
  };

  const beliefInUse = isBeliefInUse();
  const usageCount = getBeliefUsage().length;

  // Initialize form state
  const initialState: BeliefNodeState = belief
    ? convertToLocalState(belief)
    : {
        id: '',
        title: '',
        slug: '',
        scale: '',
        customValues: [],
      };

  const formState = useFormState({
    initialData: initialState,
    interceptor: beliefStateIntercept,
    validator: validateBeliefNode,
    onSave: async (data) => {
      try {
        const updatedState = await saveBeliefWithStateUpdate(
          data,
          formState.originalState
        );
        return updatedState;
      } catch (error) {
        console.error('Belief save failed:', error);
        throw error;
      }
    },
    unsavedChanges: {
      enableBrowserWarning: true,
      browserWarningMessage: 'Your belief changes will be lost!',
    },
  });

  const handleAddCustomValue = () => {
    if (!customValue.trim()) return;

    const newState = addCustomValue(formState.state, customValue);
    formState.updateField('customValues', newState.customValues);
    setCustomValue('');
  };

  const handleRemoveCustomValue = (index: number) => {
    // Check if this is a newly added value (not saved yet)
    const currentValue = formState.state.customValues[index];
    const originalValues = formState.originalState.customValues || [];
    const isNewValue = !originalValues.includes(currentValue);

    // Allow removal if:
    // 1. Belief is not in use, OR
    // 2. This is a new value that hasn't been saved yet
    if (!beliefInUse || isNewValue) {
      const newState = removeCustomValue(formState.state, index);
      formState.updateField('customValues', newState.customValues);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomValue();
    }
  };

  const renderScalePreview = () => {
    if (!formState.state.scale || formState.state.scale === 'custom')
      return null;

    const preview = getScalePreview(formState.state.scale);
    if (!preview) return null;

    return (
      <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4">
        <h4 className="mb-2 text-sm font-bold text-gray-700">Scale Preview:</h4>
        <div className="flex flex-wrap gap-2">
          {preview.map((option) => (
            <div
              key={option.id}
              className={`rounded-full px-3 py-1 text-sm font-bold text-gray-800 ${option.color}`}
            >
              {option.name}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderUsageWarning = () => {
    if (!beliefInUse) return null;

    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <LockClosedIcon className="h-5 w-5 text-amber-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-bold text-amber-800">
              Belief In Use - Limited Editing
            </h3>
            <div className="mt-2 text-sm text-amber-700">
              <p>
                This belief is currently used by <strong>{usageCount}</strong>{' '}
                item{usageCount !== 1 ? 's' : ''} and has restricted editing:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>
                  <strong>Slug</strong> and <strong>Scale</strong> cannot be
                  changed
                </li>
                <li>
                  Existing <strong>Custom Values</strong> cannot be removed (new
                  unsaved values can still be removed)
                </li>
                <li>
                  You can still change the <strong>Title</strong> and add new{' '}
                  <strong>Custom Values</strong>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          {isCreate ? 'Create Belief' : 'Edit Belief'}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {isCreate
            ? 'Create a new belief for adaptive content and magic paths.'
            : 'Edit the belief configuration and scale options.'}
        </p>
      </div>

      {/* Usage Warning */}
      {renderUsageWarning()}

      {/* Info Box */}
      <div className="rounded-md bg-blue-50 p-4">
        <div className="text-sm text-blue-700">
          <p className="font-bold">What are Beliefs?</p>
          <p className="mt-1">
            Beliefs power "magic paths" and adaptive content. They track visitor
            preferences and enable personalized experiences based on user
            interactions.
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              Use <strong>Custom Values</strong> for "Identify As" widgets (one
              value per persona)
            </li>
            <li>
              Use <strong>Yes/No</strong> scale for "Toggle Belief" widgets
            </li>
            <li>Link pane visibility to belief states for adaptive content</li>
          </ul>
        </div>
      </div>

      {/* Basic Fields */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <StringInput
          value={formState.state.title}
          onChange={(value) => formState.updateField('title', value)}
          label="Title"
          placeholder="Enter belief title"
          error={formState.errors.title}
          required
        />

        <div className="relative">
          <StringInput
            value={formState.state.slug}
            onChange={(value) => formState.updateField('slug', value)}
            label="Slug"
            placeholder="Enter belief slug"
            error={formState.errors.slug}
            disabled={beliefInUse}
            required
          />
          {beliefInUse && (
            <div className="absolute right-2 top-8 flex items-center">
              <LockClosedIcon className="h-4 w-4 text-gray-400" />
            </div>
          )}
        </div>
      </div>

      {/* Scale Selection */}
      <div className="space-y-4">
        <div className="relative">
          <EnumSelect
            value={formState.state.scale}
            onChange={(value) => formState.updateField('scale', value)}
            label="Scale Type"
            options={SCALE_OPTIONS}
            error={formState.errors.scale}
            disabled={beliefInUse}
            required
          />
          {beliefInUse && (
            <div className="absolute right-8 top-8 flex items-center">
              <LockClosedIcon className="h-4 w-4 text-gray-400" />
            </div>
          )}
        </div>

        {renderScalePreview()}
      </div>

      {/* Custom Values Section */}
      {formState.state.scale === 'custom' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Custom Values</h3>
            <p className="text-sm text-gray-600">
              Define custom options for this belief scale.
              {beliefInUse && (
                <span className="ml-1 font-medium text-amber-600">
                  Saved values cannot be removed while belief is in use, but new
                  unsaved values can be removed.
                </span>
              )}
            </p>
          </div>

          {/* Add Custom Value */}
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-bold text-gray-700">
                Add Value
              </label>
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter a custom value..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <button
              type="button"
              onClick={handleAddCustomValue}
              disabled={!customValue.trim()}
              className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>

          {formState.errors.customValues && (
            <p className="text-sm text-red-600">
              {formState.errors.customValues}
            </p>
          )}

          {/* Custom Values List */}
          {formState.state.customValues.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                Current Values
              </label>
              <div className="space-y-2">
                {formState.state.customValues.map((value, index) => {
                  // Check if this value existed in the original state (saved) or is new
                  const originalValues =
                    formState.originalState.customValues || [];
                  const isNewValue = !originalValues.includes(value);
                  const canRemove = !beliefInUse || isNewValue;

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                    >
                      <span className="text-sm text-gray-900">{value}</span>
                      <div className="flex items-center space-x-2">
                        {beliefInUse && !isNewValue && (
                          <LockClosedIcon className="h-4 w-4 text-gray-400" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomValue(index)}
                          disabled={!canRemove}
                          className={`focus:outline-none ${
                            canRemove
                              ? 'text-red-600 hover:text-red-800'
                              : 'cursor-not-allowed text-gray-300'
                          }`}
                          title={
                            canRemove
                              ? 'Remove value'
                              : 'Cannot remove saved values while belief is in use'
                          }
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unsaved Changes Bar */}
      <UnsavedChangesBar
        formState={formState}
        message="You have unsaved belief changes"
        saveLabel="Save Belief"
        cancelLabel="Discard Changes"
      />
    </div>
  );
}
