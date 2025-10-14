import { useState, useEffect } from 'react';
import { useFormState } from '@/hooks/useFormState';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import StringInput from '@/components/form/StringInput';
import BooleanToggle from '@/components/form/BooleanToggle';
import NumberInput from '@/components/form/NumberInput';
import EnumSelect from '@/components/form/EnumSelect';
import UnsavedChangesBar from '@/components/form/UnsavedChangesBar';
import {
  getBrandConfig,
  saveBrandConfigWithStateUpdate,
} from '@/utils/api/brandConfig';
import { convertToLocalState } from '@/utils/api/brandHelpers';
import type {
  FieldDefinition,
  FullContentMapItem,
  FieldErrors,
  BrandConfig,
} from '@/types/tractstack';

interface KnownResourceFormProps {
  categorySlug: string;
  contentMap: FullContentMapItem[];
  onClose?: (saved: boolean) => void;
}

interface KnownResourceState {
  categorySlug: string;
  fields: Record<string, FieldDefinition>;
}

const FIELD_TYPES = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'True/False' },
  { value: 'multi', label: 'Multiple Values' },
  { value: 'date', label: 'Date/Time' },
  { value: 'image', label: 'Image' },
];

const KnownResourceFormRenderer = ({
  categorySlug,
  contentMap,
  onClose,
  brandConfig,
}: KnownResourceFormProps & { brandConfig: BrandConfig }) => {
  const [newFieldName, setNewFieldName] = useState('');
  const [showAddField, setShowAddField] = useState(false);

  const isCreate = categorySlug === 'new';
  const knownResources = brandConfig.KNOWN_RESOURCES || {};
  const currentCategory = isCreate ? {} : knownResources[categorySlug];

  const hasExistingResources =
    !isCreate && contentMap.some((item) => item.categorySlug === categorySlug);

  const initialState: KnownResourceState = {
    categorySlug: isCreate ? '' : categorySlug,
    fields: currentCategory,
  };

  const validator = (state: KnownResourceState): FieldErrors => {
    const errors: FieldErrors = {};

    if (!state.categorySlug.trim()) {
      errors.categorySlug = 'Category name is required';
    } else if (!/^[a-z0-9-]+$/.test(state.categorySlug)) {
      errors.categorySlug = 'Category name must be lowercase with hyphens only';
    } else if (isCreate && knownResources[state.categorySlug]) {
      errors.categorySlug = 'Category name already exists';
    }

    return errors;
  };

  const formState = useFormState<KnownResourceState>({
    initialData: initialState,
    validator,
    onSave: async (data) => {
      try {
        const brandState = convertToLocalState(brandConfig);
        const updatedKnownResources = {
          ...brandState.knownResources,
          [data.categorySlug]: data.fields,
        };

        const updatedBrandState = {
          ...brandState,
          knownResources: updatedKnownResources,
        };

        await saveBrandConfigWithStateUpdate(
          window.TRACTSTACK_CONFIG?.tenantId || 'default',
          updatedBrandState
        );

        setTimeout(() => {
          onClose?.(true);
        }, 1000);

        return data;
      } catch (error) {
        console.error('Known resource save failed:', error);
        throw error;
      }
    },
    unsavedChanges: {
      enableBrowserWarning: true,
      browserWarningMessage: 'Your resource category changes will be lost!',
    },
  });

  const addNewField = () => {
    if (!newFieldName.trim()) return;

    const fieldName = newFieldName.trim();
    if (formState.state.fields[fieldName]) return;

    const newField: FieldDefinition = {
      type: 'string',
      optional: true,
    };

    formState.updateField('fields', {
      ...formState.state.fields,
      [fieldName]: newField,
    });

    setNewFieldName('');
    setShowAddField(false);
  };

  const removeField = (fieldName: string) => {
    const updatedFields = { ...formState.state.fields };
    delete updatedFields[fieldName];
    formState.updateField('fields', updatedFields);
  };

  const updateField = (
    fieldName: string,
    updates: Partial<FieldDefinition>
  ) => {
    const updatedFields = {
      ...formState.state.fields,
      [fieldName]: {
        ...formState.state.fields[fieldName],
        ...updates,
      },
    };
    formState.updateField('fields', updatedFields);
  };

  const isFieldLocked = (fieldName: string): boolean => {
    return hasExistingResources && currentCategory[fieldName] !== undefined;
  };

  const availableCategories = Object.keys(knownResources).filter(
    (cat) => cat !== categorySlug
  );

  const handleCancel = () => {
    onClose?.(false);
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          {isCreate ? 'Create Resource Category' : `Edit ${categorySlug}`}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {isCreate
            ? 'Create a new resource category with custom fields.'
            : 'Edit the resource category configuration.'}
        </p>
        {hasExistingResources && (
          <div className="mt-2 rounded-md bg-yellow-50 p-3">
            <p className="text-sm text-yellow-700">
              ⚠️ This category has existing resources. Existing fields cannot be
              modified.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <StringInput
          label="Category Name"
          value={formState.state.categorySlug}
          onChange={(value) => formState.updateField('categorySlug', value)}
          disabled={!isCreate}
          error={formState.errors.categorySlug}
          placeholder="e.g., people, vehicles, locations"
          required
        />
        <p className="text-sm text-gray-500">
          Must be lowercase with hyphens. Cannot be changed after creation.
        </p>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Fields</h3>
            <button
              type="button"
              onClick={() => setShowAddField(true)}
              className="inline-flex items-center rounded-md bg-cyan-600 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-500"
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Field
            </button>
          </div>

          {showAddField && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="mb-3 text-sm font-bold text-gray-900">
                Add New Field
              </h4>
              <div className="flex gap-3">
                <div className="flex-1">
                  <StringInput
                    value={newFieldName}
                    onChange={setNewFieldName}
                    placeholder="Field name (e.g., description, price)"
                  />
                </div>
                <button
                  type="button"
                  onClick={addNewField}
                  disabled={!newFieldName.trim()}
                  className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddField(false);
                    setNewFieldName('');
                  }}
                  className="rounded-md bg-gray-300 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {Object.keys(formState.state.fields).length === 0 ? (
            <div className="py-6 text-center text-gray-500">
              No fields defined yet. Click "Add Field" to create your first
              field.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(formState.state.fields).map(
                ([fieldName, fieldDef]) => {
                  const locked = isFieldLocked(fieldName);
                  return (
                    <div
                      key={fieldName}
                      className={`rounded-lg border p-4 ${
                        locked
                          ? 'border-gray-300 bg-gray-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h5 className="text-sm font-bold text-gray-900">
                          {fieldName}
                          {locked && (
                            <span className="ml-2 text-xs text-gray-500">
                              (locked)
                            </span>
                          )}
                        </h5>
                        {!locked && (
                          <button
                            type="button"
                            onClick={() => removeField(fieldName)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <EnumSelect
                          label="Type"
                          value={fieldDef.type}
                          onChange={(value) =>
                            updateField(fieldName, { type: value as any })
                          }
                          options={FIELD_TYPES}
                          disabled={locked}
                        />
                        <BooleanToggle
                          label="Optional"
                          value={fieldDef.optional || false}
                          onChange={(value) =>
                            updateField(fieldName, { optional: value })
                          }
                          disabled={locked}
                        />
                        {fieldDef.type === 'categoryReference' && (
                          <EnumSelect
                            label="Reference Category"
                            value={fieldDef.belongsToCategory || ''}
                            onChange={(value) =>
                              updateField(fieldName, {
                                belongsToCategory: value,
                              })
                            }
                            options={availableCategories.map((cat) => ({
                              value: cat,
                              label: cat,
                            }))}
                            disabled={locked}
                          />
                        )}
                        {fieldDef.type === 'number' && (
                          <>
                            <NumberInput
                              label="Min Value"
                              value={fieldDef.minNumber || 0}
                              onChange={(value) =>
                                updateField(fieldName, { minNumber: value })
                              }
                              disabled={locked}
                            />
                            <NumberInput
                              label="Max Value"
                              value={fieldDef.maxNumber || 100}
                              onChange={(value) =>
                                updateField(fieldName, { maxNumber: value })
                              }
                              disabled={locked}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>

      <UnsavedChangesBar
        formState={formState}
        message="You have unsaved resource category changes"
        saveLabel="Save Category"
        cancelLabel="Discard Changes"
      />

      <div className="flex justify-start">
        <button
          type="button"
          onClick={handleCancel}
          className="text-sm font-bold text-gray-600 hover:text-gray-800"
        >
          ← Back to Resource Categories
        </button>
      </div>
    </div>
  );
};

const KnownResourceForm = ({
  categorySlug,
  contentMap,
  onClose,
}: KnownResourceFormProps) => {
  const [brandConfig, setBrandConfig] = useState<BrandConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBrandConfig(window.TRACTSTACK_CONFIG?.tenantId || 'default')
      .then(setBrandConfig)
      .catch((err) => {
        console.error('Failed to load brand configuration:', err);
        setError(
          'Could not load resource category configuration. Please try again.'
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-500">
        Loading configuration...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-center text-red-700">
        {error}
      </div>
    );
  }

  const isCreate = categorySlug === 'new';
  if (!isCreate && !(brandConfig?.KNOWN_RESOURCES || {})[categorySlug]) {
    return (
      <div className="py-12 text-center text-gray-500">
        Resource category "{categorySlug}" not found.
      </div>
    );
  }

  return (
    <KnownResourceFormRenderer
      categorySlug={categorySlug}
      contentMap={contentMap}
      onClose={onClose}
      brandConfig={brandConfig!}
    />
  );
};

export default KnownResourceForm;
