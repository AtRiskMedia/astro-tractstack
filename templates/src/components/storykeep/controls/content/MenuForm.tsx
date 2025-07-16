import { useState } from 'react';
import { useFormState } from '../../../../hooks/useFormState';
import {
  convertToLocalState,
  validateMenuNode,
  menuStateIntercept,
  addMenuLink,
  removeMenuLink,
  updateMenuLink,
} from '../../../../utils/menuHelpers';
import { saveMenuWithStateUpdate } from '../../../../utils/api/menuConfig';
import StringInput from '../../form/StringInput';
import EnumSelect from '../../form/EnumSelect';
import ActionBuilderField from '../../form/ActionBuilderField';
import UnsavedChangesBar from '../../form/UnsavedChangesBar';
import type {
  MenuNode,
  MenuNodeState,
  FullContentMapItem,
} from '../../../../types/tractstack';

interface MenuFormProps {
  menu?: MenuNode;
  isCreate?: boolean;
  contentMap: FullContentMapItem[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

const THEME_OPTIONS = [{ value: 'default', label: 'Default' }];

export default function MenuForm({
  menu,
  isCreate = false,
  contentMap,
  onSuccess,
  onCancel,
}: MenuFormProps) {
  // Initialize form state
  const initialState: MenuNodeState = menu
    ? convertToLocalState(menu)
    : {
        id: '',
        title: '',
        theme: 'default',
        menuLinks: [],
      };

  const formState = useFormState({
    initialData: initialState,
    interceptor: menuStateIntercept,
    validator: validateMenuNode,
    onSave: async (data) => {
      try {
        const updatedState = await saveMenuWithStateUpdate(
          data,
          formState.originalState
        );
        return updatedState;
      } catch (error) {
        console.error('Menu save failed:', error);
        throw error;
      }
    },
    unsavedChanges: {
      enableBrowserWarning: true,
      browserWarningMessage: 'Your menu changes will be lost!',
    },
  });

  const handleAddLink = () => {
    const newState = addMenuLink(formState.state);
    formState.updateField('menuLinks', newState.menuLinks);
  };

  const handleRemoveLink = (index: number) => {
    const newState = removeMenuLink(formState.state, index);
    formState.updateField('menuLinks', newState.menuLinks);
  };

  const handleUpdateLink = (index: number, field: string, value: any) => {
    const newState = updateMenuLink(formState.state, index, field, value);
    formState.updateField('menuLinks', newState.menuLinks);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          {isCreate ? 'Create Menu' : 'Edit Menu'}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {isCreate
            ? 'Create a new navigation menu for your site.'
            : 'Edit the menu configuration and links.'}
        </p>
      </div>

      {/* Basic Fields */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <StringInput
          value={formState.state.title}
          onChange={(value) => formState.updateField('title', value)}
          label="Menu Title"
          placeholder="Enter menu title"
          error={formState.errors.title}
          required
        />

        <EnumSelect
          value={formState.state.theme}
          onChange={(value) => formState.updateField('theme', value)}
          label="Theme"
          options={THEME_OPTIONS}
          error={formState.errors.theme}
          required
        />
      </div>

      {/* Menu Links Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Menu Links</h3>
          <button
            type="button"
            onClick={handleAddLink}
            className="flex items-center rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Link
          </button>
        </div>

        {formState.errors.menuLinks && (
          <p className="text-sm text-red-600">{formState.errors.menuLinks}</p>
        )}

        {formState.state.menuLinks.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 py-8 text-center">
            <p className="text-gray-500">
              No menu links yet. Click "Add Link" to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {formState.state.menuLinks.map((link, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 bg-gray-50 p-6"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-md font-bold text-gray-800">
                    Link {index + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(index)}
                    className="p-1 text-red-500 hover:text-red-700"
                    title="Remove link"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <StringInput
                    value={link.name}
                    onChange={(value) => handleUpdateLink(index, 'name', value)}
                    label="Link Name"
                    placeholder="Enter link name"
                    error={formState.errors[`menuLinks.${index}.name`]}
                    required
                  />

                  <StringInput
                    value={link.description}
                    onChange={(value) =>
                      handleUpdateLink(index, 'description', value)
                    }
                    label="Description"
                    placeholder="Enter link description"
                    error={formState.errors[`menuLinks.${index}.description`]}
                  />
                </div>

                <div className="mt-4">
                  <ActionBuilderField
                    value={link.actionLisp}
                    onChange={(value) =>
                      handleUpdateLink(index, 'actionLisp', value)
                    }
                    contentMap={contentMap}
                    label="Navigation Action"
                    error={formState.errors[`menuLinks.${index}.actionLisp`]}
                  />
                </div>

                <div className="mt-4 flex items-center">
                  <input
                    type="checkbox"
                    id={`featured-${index}`}
                    checked={link.featured}
                    onChange={(e) =>
                      handleUpdateLink(index, 'featured', e.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <label
                    htmlFor={`featured-${index}`}
                    className="ml-2 text-sm text-gray-700"
                  >
                    Featured Link
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unsaved Changes Bar */}
      <UnsavedChangesBar
        formState={formState}
        message="You have unsaved menu changes"
        saveLabel="Save Menu"
        cancelLabel="Discard Changes"
      />
    </div>
  );
}
