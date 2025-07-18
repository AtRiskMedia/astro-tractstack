import { useFormState } from '@/hooks/useFormState';
import {
  convertToLocalState,
  validateResource,
} from '@/utils/api/resourceHelpers';
import { saveResourceWithStateUpdate } from '@/utils/api/resourceConfig';
import UnsavedChangesBar from '@/components/storykeep/form/UnsavedChangesBar';
import StringInput from '@/components/storykeep/form/StringInput';
import StringArrayInput from '@/components/storykeep/form/StringArrayInput';
import NumberInput from '@/components/storykeep/form/NumberInput';
import BooleanToggle from '@/components/storykeep/form/BooleanToggle';
import DateTimeInput from '@/components/storykeep/form/DateTimeInput';
import FileUpload from '@/components/storykeep/form/FileUpload';
import EnumSelect from '@/components/storykeep/form/EnumSelect';
import type {
  ResourceConfig,
  ResourceState,
  FieldDefinition,
} from '@/types/tractstack';

interface ResourceFormProps {
  resourceData?: ResourceConfig;
  categorySlug: string;
  categorySchema: Record<string, FieldDefinition>;
  contentMap?: Array<{ slug: string; title: string; categorySlug: string }>;
  isCreate?: boolean;
  onClose?: (saved: boolean) => void;
}

export default function ResourceForm({
  resourceData,
  categorySlug,
  categorySchema,
  contentMap = [],
  isCreate = false,
  onClose,
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

        // Call success callback after save (original pattern)
        setTimeout(() => {
          onClose?.(true);
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

  const handleCancel = () => {
    onClose?.(false);
  };

  // Render dynamic field based on field definition
  const renderDynamicField = (fieldName: string, fieldDef: FieldDefinition) => {
    const fieldValue = state.optionsPayload[fieldName];
    const fieldError = errors?.[`optionsPayload.${fieldName}`];

    switch (fieldDef.type) {
      case 'string':
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

      case 'categoryReference':
        if (!fieldDef.belongsToCategory) {
          return (
            <div key={fieldName} className="text-sm text-red-600">
              {fieldName} - Missing belongsToCategory configuration
            </div>
          );
        }
        return (
          <EnumSelect
            key={fieldName}
            label={fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
            value={fieldValue || ''}
            onChange={(value) => updateOptionsField(fieldName, value)}
            options={getCategoryReferenceOptions(fieldDef.belongsToCategory)}
            error={fieldError}
            required={!fieldDef.optional}
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
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          {isCreate ? 'Create' : 'Edit'}{' '}
          {categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)}{' '}
          Resource
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {isCreate
            ? `Create a new ${categorySlug} resource.`
            : `Edit the ${categorySlug} resource configuration.`}
        </p>
      </div>

      <div className="space-y-6">
        {/* Core resource fields */}
        <StringInput
          label="Title"
          value={state.title}
          onChange={(value: string) => updateField('title', value)}
          error={errors?.title}
          placeholder="Enter resource title"
          required
        />

        <StringInput
          label="Slug"
          value={state.slug}
          onChange={(value: string) => updateField('slug', value)}
          error={errors?.slug}
          placeholder="Enter unique slug"
          required
        />

        <StringInput
          label="One-liner"
          value={state.oneliner}
          onChange={(value: string) => updateField('oneliner', value)}
          error={errors?.oneliner}
          placeholder="Brief description"
        />

        {/* Dynamic fields based on category schema */}
        {Object.entries(categorySchema).length > 0 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">
              {categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)}{' '}
              Fields
            </h3>
            {Object.entries(categorySchema).map(([fieldName, fieldDef]) =>
              renderDynamicField(fieldName, fieldDef)
            )}
          </div>
        )}
      </div>

      {/* Save/Cancel Bar */}
      <UnsavedChangesBar
        formState={formState}
        message="You have unsaved resource changes"
        saveLabel="Save Resource"
        cancelLabel="Discard Changes"
      />

      {/* Cancel Navigation Button */}
      <div className="flex justify-start">
        <button
          type="button"
          onClick={handleCancel}
          className="text-sm font-medium text-gray-600 hover:text-gray-800"
        >
          ← Back to Resource List
        </button>
      </div>
    </div>
  );
}
