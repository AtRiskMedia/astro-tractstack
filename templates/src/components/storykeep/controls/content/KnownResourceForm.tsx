import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { useFormState } from '../../../../hooks/useFormState';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import StringInput from '../../form/StringInput';
import BooleanToggle from '../../form/BooleanToggle';
import NumberInput from '../../form/NumberInput';
import EnumSelect from '../../form/EnumSelect';
import UnsavedChangesBar from '../../form/UnsavedChangesBar';
import { saveBrandConfigWithStateUpdate } from '../../../../utils/api/brandConfig';
import { convertToLocalState } from '../../../../utils/brandHelpers';
import { brandConfigStore } from '../../../../stores/brand';
import type {
  FieldDefinition,
  FullContentMapItem,
  FieldErrors,
} from '../../../../types/tractstack';

interface KnownResourceFormProps {
  categorySlug: string;
  contentMap: FullContentMapItem[];
  onBack: () => void;
  onSaved: () => void;
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

const KnownResourceForm = ({
  categorySlug,
  contentMap,
  onBack,
  onSaved,
}: KnownResourceFormProps) => {
  const brandConfig = useStore(brandConfigStore);
  const [newFieldName, setNewFieldName] = useState('');
  const [showAddField, setShowAddField] = useState(false);

  const knownResources = brandConfig?.KNOWN_RESOURCES || {};
  const isCreate = categorySlug === 'new';
  const currentCategory = isCreate ? {} : knownResources[categorySlug] || {};

  const hasExistingResources =
    !isCreate && contentMap.some((item) => item.categorySlug === categorySlug);

  const initialState: KnownResourceState = {
    categorySlug: isCreate ? '' : categorySlug,
    fields: { ...currentCategory },
  };

  const validateKnownResource = (state: KnownResourceState): FieldErrors => {
    const errors: FieldErrors = {};

    if (!state.categorySlug?.trim()) {
      errors.categorySlug = 'Category name is required';
    } else if (!/^[a-z0-9-]+$/.test(state.categorySlug)) {
      errors.categorySlug =
        'Category name must contain only lowercase letters, numbers, and hyphens';
    } else if (isCreate && knownResources[state.categorySlug]) {
      errors.categorySlug = 'Category name already exists';
    }

    Object.keys(state.fields).forEach((fieldName) => {
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(fieldName)) {
        errors[`field_${fieldName}`] =
          'Field name must start with letter and contain only letters, numbers, underscore';
      }
    });

    return errors;
  };

  const formState = useFormState<KnownResourceState>({
    initialData: initialState,
    validator: validateKnownResource,
    onSave: async (data) => {
      if (!brandConfig) {
        throw new Error('Brand configuration not available');
      }

      const currentBrandState = convertToLocalState(brandConfig);
      const updatedKnownResources = { ...knownResources };

      if (isCreate || data.categorySlug !== categorySlug) {
        if (!isCreate && data.categorySlug !== categorySlug) {
          delete updatedKnownResources[categorySlug];
        }
        updatedKnownResources[data.categorySlug] = data.fields;
      } else {
        updatedKnownResources[categorySlug] = data.fields;
      }

      const updatedBrandState = {
        ...currentBrandState,
        knownResources: updatedKnownResources,
      };

      await saveBrandConfigWithStateUpdate(
        updatedBrandState,
        currentBrandState
      );
      onSaved();
      return data;
    },
    unsavedChanges: {
      enableBrowserWarning: true,
      browserWarningMessage: 'Your category changes will be lost!',
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

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          ← Back
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isCreate ? 'Create Resource Category' : `Edit ${categorySlug}`}
          </h2>
          {hasExistingResources && (
            <p className="mt-1 text-sm text-yellow-600">
              This category has existing resources. Existing fields cannot be
              modified.
            </p>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200 pb-6">
        <StringInput
          label="Category Name"
          value={formState.state.categorySlug}
          onChange={(value) => formState.updateField('categorySlug', value)}
          disabled={!isCreate}
          error={formState.errors.categorySlug}
          placeholder="e.g., people, vehicles, locations"
        />
        <p className="mt-1 text-sm text-gray-500">
          Must be lowercase with hyphens. Cannot be changed after creation.
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Field Definitions
          </h3>
          <button
            onClick={() => setShowAddField(true)}
            className="inline-flex items-center gap-x-2 rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500"
          >
            <PlusIcon className="h-4 w-4" />
            Add Field
          </button>
        </div>

        {showAddField && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <StringInput
                label="Field Name"
                value={newFieldName}
                onChange={setNewFieldName}
                placeholder="e.g., name, power, category"
                className="flex-1"
              />
              <div className="flex gap-2 pt-6">
                <button
                  onClick={addNewField}
                  disabled={!newFieldName.trim()}
                  className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 disabled:bg-gray-300"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddField(false);
                    setNewFieldName('');
                  }}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {Object.keys(formState.state.fields).length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-500">
                No fields defined yet. Add your first field above.
              </p>
            </div>
          ) : (
            Object.entries(formState.state.fields).map(
              ([fieldName, fieldDef]) => {
                const locked = isFieldLocked(fieldName);

                return (
                  <div
                    key={fieldName}
                    className={`rounded-lg border p-4 ${locked ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-4">
                          <h4 className="font-medium text-gray-900">
                            {fieldName}
                          </h4>
                          {locked && (
                            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                              Locked
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                            onChange={(value: boolean) =>
                              updateField(fieldName, { optional: value })
                            }
                            disabled={locked}
                          />

                          {fieldDef.type === 'string' && (
                            <EnumSelect
                              label="References Category"
                              value={fieldDef.belongsToCategory || ''}
                              onChange={(value) =>
                                updateField(fieldName, {
                                  belongsToCategory: value || undefined,
                                })
                              }
                              options={[
                                { value: '', label: 'None' },
                                ...availableCategories.map((cat) => ({
                                  value: cat,
                                  label: cat,
                                })),
                              ]}
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

                      {!locked && (
                        <button
                          onClick={() => removeField(fieldName)}
                          className="ml-4 text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
            )
          )}
        </div>
      </div>

      <UnsavedChangesBar formState={formState} />
    </div>
  );
};

export default KnownResourceForm;
