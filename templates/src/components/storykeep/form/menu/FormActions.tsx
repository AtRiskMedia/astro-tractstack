import type { FormStateReturn } from '../../../../hooks/useFormState';
import type { MenuNodeState } from '../../../../types/tractstack';

interface MenuFormActionsProps {
  formState: FormStateReturn<MenuNodeState>;
  isCreate?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function MenuFormActions({
  formState,
  isCreate = false,
  onSuccess,
  onCancel,
}: MenuFormActionsProps) {
  const { isDirty, isValid, save, cancel } = formState;

  const handleSave = () => {
    save();
    onSuccess?.();
  };

  const handleCancel = () => {
    cancel();
    onCancel?.();
  };

  if (!isDirty) {
    return (
      <div className="flex justify-end gap-4 border-t border-gray-200 pt-6">
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
        >
          {isCreate ? 'Cancel' : 'Close'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-4 border-t border-gray-200 pt-6">
      <button
        type="button"
        onClick={handleCancel}
        disabled={!isDirty}
        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCreate ? 'Cancel' : 'Reset'}
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={!isDirty || !isValid}
        className="rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCreate ? 'Create Menu' : 'Save Changes'}
      </button>
    </div>
  );
}
