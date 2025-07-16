import { useState } from 'react';
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
import StringInput from '../../form/StringInput';
import EnumSelect from '../../form/EnumSelect';
import BeliefFormActions from '../../form/belief/FormActions';
import UnsavedChangesBar from '../../form/UnsavedChangesBar';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [customValue, setCustomValue] = useState('');

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
        await saveBeliefWithStateUpdate(data, formState.originalState);
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          onSuccess?.();
        }, 2000);
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
    const newState = removeCustomValue(formState.state, index);
    formState.updateField('customValues', newState.customValues);
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

  return (
    <div className="space-y-8">
      {/* Success Alert */}
      {saveSuccess && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-bold text-green-800">
                Belief saved successfully!
              </p>
            </div>
          </div>
        </div>
      )}

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

        <StringInput
          value={formState.state.slug}
          onChange={(value) => formState.updateField('slug', value)}
          label="Slug"
          placeholder="Enter belief slug"
          error={formState.errors.slug}
          required
        />
      </div>

      {/* Scale Selection */}
      <div className="space-y-4">
        <EnumSelect
          value={formState.state.scale}
          onChange={(value) => formState.updateField('scale', value)}
          label="Scale Type"
          options={SCALE_OPTIONS}
          error={formState.errors.scale}
          required
        />

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
                {formState.state.customValues.map((value, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <span className="text-sm text-gray-900">{value}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomValue(index)}
                      className="text-red-600 hover:text-red-800 focus:outline-none"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Actions */}
      <BeliefFormActions
        formState={formState}
        isCreate={isCreate}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />

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
