import { useFormState } from '@/hooks/useFormState';
import {
  convertToLocalState,
  validateMenuNode,
  menuStateIntercept,
  addMenuLink,
  removeMenuLink,
  updateMenuLink,
} from '@/utils/api/menuHelpers';
import { saveMenuWithStateUpdate } from '@/utils/api/menuConfig';
import StringInput from '@/components/storykeep/form/StringInput';
import EnumSelect from '@/components/storykeep/form/EnumSelect';
import ActionBuilderField from '@/components/storykeep/form/ActionBuilderField';
import UnsavedChangesBar from '@/components/storykeep/form/UnsavedChangesBar';
import type {
  MenuNode,
  MenuNodeState,
  FullContentMapItem,
} from '@/types/tractstack';

interface MenuFormProps {
  menu?: MenuNode;
  isCreate?: boolean;
  contentMap: FullContentMapItem[];
  onClose?: (saved: boolean) => void;
}

const THEME_OPTIONS = [{ value: 'default', label: 'Default' }];

export default function MenuForm({
  menu,
  isCreate = false,
  contentMap,
  onClose,
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

  const handleCancel = () => {
    onClose?.(false);
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

      {/* Basic Menu Information */}
      <div className="space-y-6">
        <StringInput
          label="Menu Title"
          value={formState.state.title}
          onChange={(value) => formState.updateField('title', value)}
          error={formState.errors.title}
          placeholder="Enter menu title"
          required
        />

        <EnumSelect
          label="Theme"
          value={formState.state.theme}
          onChange={(value) => formState.updateField('theme', value)}
          error={formState.errors.theme}
          options={THEME_OPTIONS}
          required
        />
      </div>

      {/* Menu Links Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Menu Links</h3>
          <button
            type="button"
            onClick={handleAddLink}
            className="inline-flex items-center rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
          >
            Add Link
          </button>
        </div>

        {formState.state.menuLinks.length === 0 ? (
          <div className="py-6 text-center text-gray-500">
            No menu links yet. Click "Add Link" to create your first link.
          </div>
        ) : (
          <div className="space-y-4">
            {formState.state.menuLinks.map((link, index) => (
              <div
                key={index}
                className="space-y-4 rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">
                    Link {index + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(index)}
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <StringInput
                    label="Link Name"
                    value={link.name}
                    onChange={(value) => handleUpdateLink(index, 'name', value)}
                    placeholder="Enter link text"
                    required
                  />

                  <StringInput
                    label="Description"
                    value={link.description}
                    onChange={(value) =>
                      handleUpdateLink(index, 'description', value)
                    }
                    placeholder="Brief description"
                  />
                </div>

                <ActionBuilderField
                  label="Link Action"
                  value={link.actionLisp}
                  onChange={(value) =>
                    handleUpdateLink(index, 'actionLisp', value)
                  }
                  contentMap={contentMap}
                  error={formState.errors[`menuLinks.${index}.actionLisp`]}
                />

                <div className="flex items-center">
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
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Featured link
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save/Cancel Bar */}
      <UnsavedChangesBar
        formState={formState}
        message="You have unsaved menu changes"
        saveLabel="Save Menu"
        cancelLabel="Discard Changes"
      />

      {/* Cancel Navigation Button */}
      <div className="flex justify-start">
        <button
          type="button"
          onClick={handleCancel}
          className="text-sm font-medium text-gray-600 hover:text-gray-800"
        >
          ← Back to Menu List
        </button>
      </div>
    </div>
  );
}
