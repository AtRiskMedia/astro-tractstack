import { useFormState } from '@/hooks/useFormState';
import { convertToLocalState } from '@/utils/api/resourceHelpers';
import { saveResourceWithStateUpdate } from '@/utils/api/resourceConfig';
import UnsavedChangesBar from '@/components/form/UnsavedChangesBar';
import StringInput from '@/components/form/StringInput';
import ParagraphArrayInput from '@/components/form/ParagraphArrayInput';
import NumberInput from '@/components/form/NumberInput';
import BooleanToggle from '@/components/form/BooleanToggle';
import DateTimeInput from '@/components/form/DateTimeInput';
import FileUpload from '@/components/form/FileUpload';
import EnumSelect from '@/components/form/EnumSelect';
import type {
  ResourceConfig,
  ResourceState,
  FieldDefinition,
  FullContentMapItem,
  FieldErrors,
} from '@/types/tractstack';

interface ResourceFormProps {
  resourceData?: ResourceConfig;
  fullContentMap: FullContentMapItem[];
  categorySlug: string;
  categorySchema: Record<string, FieldDefinition>;
  isCreate?: boolean;
  onClose?: (saved: boolean) => void;
}

export default function ResourceForm({
  resourceData,
  fullContentMap,
  categorySlug,
  categorySchema,
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
        actionLisp: '',
      };

  // Initialize optionsPayload with default values for all schema fields
  if (!resourceData) {
    // Only for new resources
    const defaultOptionsPayload: Record<string, any> = {};

    Object.entries(categorySchema).forEach(([fieldName, fieldDef]) => {
      switch (fieldDef.type) {
        case 'number':
          defaultOptionsPayload[fieldName] = fieldDef.defaultValue ?? 0;
          break;
        case 'boolean':
          defaultOptionsPayload[fieldName] = fieldDef.defaultValue ?? false;
          break;
        case 'string':
          defaultOptionsPayload[fieldName] = fieldDef.defaultValue ?? '';
          break;
        case 'multi':
          defaultOptionsPayload[fieldName] = fieldDef.defaultValue ?? [];
          break;
        case 'date':
          defaultOptionsPayload[fieldName] = fieldDef.defaultValue ?? 0;
          break;
        case 'image':
          defaultOptionsPayload[fieldName] = fieldDef.defaultValue ?? '';
          break;
        default:
          defaultOptionsPayload[fieldName] = fieldDef.defaultValue ?? '';
      }
    });

    initialData.optionsPayload = defaultOptionsPayload;
  }

  const validator = (state: ResourceState): FieldErrors => {
    const errors: FieldErrors = {};

    if (!state.title?.trim()) {
      errors.title = 'Title is required';
    }

    if (!state.slug?.trim()) {
      errors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(state.slug)) {
      errors.slug =
        'Slug must contain only lowercase letters, numbers, and hyphens';
    } else {
      // Check for duplicate slugs in existing content (excluding current resource)
      const existingItem = fullContentMap.find(
        (existing) =>
          existing.slug === state.slug && existing.id !== resourceData?.id
      );
      if (existingItem) {
        errors.slug = `Slug "${state.slug}" already exists (${existingItem.type})`;
      }
    }

    if (!state.categorySlug?.trim()) {
      errors.categorySlug = 'Category is required';
    }

    return errors;
  };

  const formState = useFormState<ResourceState>({
    initialData,
    validator,
    onSave: async (data) => {
      try {
        const updatedState = await saveResourceWithStateUpdate(
          window.TRACTSTACK_CONFIG?.tenantId || 'default',
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
    return fullContentMap
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
        // Check if this string field references another category
        if (fieldDef.belongsToCategory) {
          const options = getCategoryReferenceOptions(
            fieldDef.belongsToCategory
          );
          return (
            <EnumSelect
              key={fieldName}
              label={fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
              value={fieldValue || ''}
              onChange={(value) => updateOptionsField(fieldName, value)}
              options={options}
              error={fieldError}
              required={!fieldDef.optional}
            />
          );
        }

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
          <ParagraphArrayInput
            key={fieldName}
            label={fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
            value={fieldValue || []}
            onChange={(value) => updateOptionsField(fieldName, value)}
            error={fieldError}
            required={!fieldDef.optional}
            placeholder={`Enter ${fieldName} paragraph...`}
            minRows={2}
            maxRows={8}
          />
        );

      case 'number':
        return (
          <NumberInput
            key={fieldName}
            label={fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
            value={
              fieldValue !== undefined && fieldValue !== null
                ? fieldValue
                : (fieldDef.defaultValue ?? 0)
            }
            onChange={(value) => updateOptionsField(fieldName, value)}
            error={fieldError}
            required={!fieldDef.optional}
            min={fieldDef.minNumber}
            max={fieldDef.maxNumber}
          />
        );

      case 'boolean':
        return (
          <BooleanToggle
            key={fieldName}
            label={fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
            value={
              fieldValue !== undefined && fieldValue !== null
                ? fieldValue
                : (fieldDef.defaultValue ?? false)
            }
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
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          {isCreate ? 'Create' : 'Edit'}{' '}
          {categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {isCreate
            ? `Create a new ${categorySlug}.`
            : `Edit the ${categorySlug} configuration.`}
        </p>
      </div>

      <div className="space-y-6">
        {/* Core resource fields */}
        <StringInput
          label="Title"
          value={state.title}
          onChange={(value: string) => updateField('title', value)}
          error={errors?.title}
          placeholder="Enter title"
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
            <h3 className="text-lg font-bold text-gray-900">
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
          className="text-sm font-bold text-gray-600 hover:text-gray-800"
        >
          ← Back to Resource List
        </button>
      </div>
    </div>
  );
}
