import type { BrandConfigState } from '../../../../utils/brandHelpers';
import type { FormStateReturn } from '../../../../hooks/useFormState';

interface FormActionsProps {
  formState: FormStateReturn<BrandConfigState>;
}

export default function FormActions({ formState }: FormActionsProps) {
  const { save, cancel, isDirty, isValid } = formState;

  return (
    <div className="flex justify-end gap-4 border-t border-gray-200 pt-6">
      <button
        type="button"
        onClick={cancel}
        disabled={!isDirty}
        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={save}
        disabled={!isDirty || !isValid}
        className="rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Save Changes
      </button>
    </div>
  );
}
