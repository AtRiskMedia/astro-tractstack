import type { FormStateReturn } from '../../../../hooks/useFormState';
import type { BeliefNodeState } from '../../../../types/tractstack';

interface BeliefFormActionsProps {
  formState: FormStateReturn<BeliefNodeState>;
  isCreate?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function BeliefFormActions({
  formState,
  isCreate = false,
  onSuccess,
  onCancel,
}: BeliefFormActionsProps) {
  const { isDirty, isValid, save, cancel } = formState;

  const handleSave = () => {
    save();
    onSuccess?.();
  };

  const handleCancel = () => {
    cancel();
    onCancel?.();
  };

  // If no changes, show simpler actions
  if (!isDirty) {
    return (
      <div className="flex justify-end gap-4 border-t border-gray-200 pt-6">
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCreate ? 'Cancel' : 'Reset'}
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={!isDirty || !isValid}
        className="rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCreate ? 'Create Belief' : 'Save Changes'}
      </button>
    </div>
  );
}
