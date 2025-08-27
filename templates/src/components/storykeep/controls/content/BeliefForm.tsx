import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { useFormState } from '@/hooks/useFormState';
import {
  convertToLocalState,
  validateBeliefNode,
  beliefStateIntercept,
  addCustomValue,
  removeCustomValue,
  SCALE_OPTIONS,
  getScalePreview,
} from '@/utils/api/beliefHelpers';
import { saveBeliefWithStateUpdate } from '@/utils/api/beliefConfig';
import {
  orphanAnalysisStore,
  loadOrphanAnalysis,
} from '@/stores/orphanAnalysis';
import StringInput from '@/components/form/StringInput';
import EnumSelect from '@/components/form/EnumSelect';
import UnsavedChangesBar from '@/components/form/UnsavedChangesBar';
import {
  PlusIcon,
  XMarkIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import type { BeliefNode, BeliefNodeState } from '@/types/tractstack';

interface BeliefFormProps {
  belief?: BeliefNode;
  isCreate?: boolean;
  onClose?: (saved: boolean) => void;
}

export default function BeliefForm({
  belief,
  isCreate = false,
  onClose,
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
          window.TRACTSTACK_CONFIG?.tenantId || 'default',
          data
        );

        // Call success callback after save (original pattern)
        setTimeout(() => {
          onClose?.(true);
        }, 1000);

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

  const handleCancel = () => {
    onClose?.(false);
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
                item{usageCount !== 1 ? 's' : ''}. Some fields are locked to
                prevent breaking existing content.
              </p>
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
            ? 'Create a new belief to power adaptive content and magic paths.'
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
            </p>
          </div>

          {/* Add Custom Value */}
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="flex-1">
                <input
                  type="text"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter custom value"
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddCustomValue}
              disabled={!customValue.trim()}
              className="inline-flex items-center rounded-md bg-cyan-600 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Custom Values List */}
          {formState.state.customValues.length > 0 && (
            <div className="space-y-2">
              {formState.state.customValues.map((value, index) => {
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
                    <div className="flex items-center gap-2">
                      {beliefInUse && !isNewValue && (
                        <LockClosedIcon className="h-4 w-4 text-gray-400" />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomValue(index)}
                        disabled={!canRemove}
                        className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:text-gray-400"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {beliefInUse && (
            <div className="text-sm text-amber-700">
              <p>
                ⚠️ You can add new values, but cannot remove existing ones while
                this belief is in use.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Save/Cancel Bar */}
      <UnsavedChangesBar
        formState={formState}
        message="You have unsaved belief changes"
        saveLabel="Save Belief"
        cancelLabel="Discard Changes"
      />

      {/* Cancel Navigation Button */}
      <div className="flex justify-start">
        <button
          type="button"
          onClick={handleCancel}
          className="text-sm font-bold text-gray-600 hover:text-gray-800"
        >
          ← Back to Belief List
        </button>
      </div>
    </div>
  );
}
