import { useState } from 'react';
import { useFormState } from '../../../../hooks/useFormState';
import {
  convertToLocalState,
  convertToBackendFormat,
  validateResource,
} from '../../../../utils/resourceHelpers';
import { saveResourceWithStateUpdate } from '../../../../utils/api/resourceConfig';
import UnsavedChangesBar from '../../form/UnsavedChangesBar';
import StringInput from '../../form/StringInput';
import StringArrayInput from '../../form/StringArrayInput';
import NumberInput from '../../form/NumberInput';
import BooleanToggle from '../../form/BooleanToggle';
import DateTimeInput from '../../form/DateTimeInput';
import FileUpload from '../../form/FileUpload';
import EnumSelect from '../../form/EnumSelect';
import type {
  ResourceConfig,
  ResourceState,
  FieldDefinition,
} from '../../../../types/tractstack';

interface ResourceFormProps {
  resourceData?: ResourceConfig;
  categorySlug: string;
  categorySchema: Record<string, FieldDefinition>;
  contentMap?: Array<{ slug: string; title: string; categorySlug: string }>;
  isCreate?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ResourceForm({
  resourceData,
  categorySlug,
  categorySchema,
  contentMap = [],
  isCreate = false,
  onSuccess,
  onCancel,
}: ResourceFormProps) {
  const initialData = resourceData
    ? convertToLocalState(resourceData)
    : {
        id: '',
        title: '',
        slug: '',
        categorySlug,
        oneliner: '',
        optionsPayload: {},
      };

  const formState = useFormState<ResourceState>({
    initialData,
    validator: (state) => validateResource(state),
    onSave: async (data) => {
      try {
        const updatedState = await saveResourceWithStateUpdate(
          data,
          formState.originalState
        );

        setTimeout(() => {
          onSuccess?.();
        }, 1000);

        return updatedState;
      } catch (error) {
        console.error('Resource save failed:', error);
        throw error;
      }
    },
  });

  const { state, updateField, errors } = formState;

  // Helper to get category reference options for a field
  const getCategoryReferenceOptions = (belongsToCategory: string) => {
    return contentMap
      .filter((item) => item.categorySlug === belongsToCategory)
      .map((item) => ({
        value: item.slug,
        label: item.title,
      }));
  };

  // Helper to update optionsPayload field
  const updateOptionsField = (fieldName: string, value: any) => {
    updateField('optionsPayload', {
      ...state.optionsPayload,
      [fieldName]: value,
    });
  };

  // Render dynamic field based on field definition
  const renderDynamicField = (fieldName: string, fieldDef: FieldDefinition) => {
    const fieldValue = state.optionsPayload[fieldName];
    const fieldError = errors?.[`optionsPayload.${fieldName}`];

    switch (fieldDef.type) {
      case 'string':
        if (fieldDef.belongsToCategory) {
          // Category reference field
          return (
            <EnumSelect
              key={fieldName}
              label={fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
              value={fieldValue || ''}
              onChange={(value) => updateOptionsField(fieldName, value)}
              options={getCategoryReferenceOptions(fieldDef.belongsToCategory)}
              error={fieldError}
              required={!fieldDef.optional}
              allowEmpty={fieldDef.optional}
            />
          );
        } else {
          // Regular string field
          return (
            <StringInput
              key={fieldName}
              label={fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
              value={fieldValue || ''}
              onChange={(value) => updateOptionsField(fieldName, value)}
              error={fieldError}
              required={!fieldDef.optional}
            />
          );
        }

      case 'multi':
        return (
          <StringArrayInput
            key={fieldName}
            label={fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
            value={fieldValue || []}
            onChange={(value) => updateOptionsField(fieldName, value)}
            error={fieldError}
            required={!fieldDef.optional}
          />
        );

      case 'number':
        return (
          <NumberInput
            key={fieldName}
            label={fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
            value={fieldValue || 0}
            onChange={(value) => updateOptionsField(fieldName, value)}
            min={fieldDef.minNumber}
            max={fieldDef.maxNumber}
            error={fieldError}
            required={!fieldDef.optional}
          />
        );

      case 'boolean':
        return (
          <BooleanToggle
            key={fieldName}
            label={fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
            value={fieldValue || false}
            onChange={(value) => updateOptionsField(fieldName, value)}
            error={fieldError}
          />
        );

      case 'date':
        return (
          <DateTimeInput
            key={fieldName}
            label={fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
            value={fieldValue || 0}
            onChange={(value) => updateOptionsField(fieldName, value)}
            error={fieldError}
            required={!fieldDef.optional}
          />
        );

      case 'image':
        return (
          <FileUpload
            key={fieldName}
            label={fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
            value={fieldValue || ''}
            onChange={(value) => updateOptionsField(fieldName, value)}
            accept="image/*"
            showPreview={true}
            error={fieldError}
            required={!fieldDef.optional}
          />
        );

      default:
        return (
          <div key={fieldName} className="text-sm text-gray-600">
            {fieldName} ({fieldDef.type}) - Unsupported field type
          </div>
        );
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          {isCreate ? 'Create' : 'Edit'}{' '}
          {categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)}{' '}
          Resource
        </h2>
      </div>

      <div className="space-y-6">
        {/* Core resource fields */}
        <StringInput
          label="Title"
          value={state.title}
          onChange={(value: string) => updateField('title', value)}
          error={errors?.title}
          required
        />

        <StringInput
          label="Slug"
          value={state.slug}
          onChange={(value: string) => updateField('slug', value)}
          error={errors?.slug}
          required
        />

        <StringInput
          label="One-liner"
          value={state.oneliner}
          onChange={(value: string) => updateField('oneliner', value)}
          error={errors?.oneliner}
        />

        {/* Dynamic fields based on category schema */}
        {Object.entries(categorySchema).map(([fieldName, fieldDef]) =>
          renderDynamicField(fieldName, fieldDef)
        )}
      </div>

      <UnsavedChangesBar
        formState={formState}
        message="You have unsaved resource changes"
        saveLabel="Save Resource"
        cancelLabel="Discard Changes"
      />

      {onCancel && (
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
