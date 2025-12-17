import StringInput from '../StringInput';
import type { FormStateReturn } from '@/hooks/useFormState';
import type {
  AdvancedConfigState,
  AdvancedConfigStatus,
} from '@/types/tractstack';

interface APIConfigSectionProps {
  formState: FormStateReturn<AdvancedConfigState>;
  status: AdvancedConfigStatus | null;
}

export default function APIConfigSection({
  formState,
  status,
}: APIConfigSectionProps) {
  const { state, updateField, errors } = formState;

  const aaiConfigured = status?.aaiAPIKeySet;

  return (
    <div className="sm:rounded-lg bg-white shadow">
      <div className="sm:p-6 px-4 py-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold leading-6 text-gray-900">
            API Configuration
          </h3>
          <div className="flex items-center">
            {aaiConfigured ? (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800">
                ✓ Configured
              </span>
            ) : status !== null ? (
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-bold text-yellow-800">
                Optional
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-800">
                Loading...
              </span>
            )}
          </div>
        </div>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>Configure external API keys for enhanced functionality.</p>
        </div>
        <div className="mt-5">
          <StringInput
            label="AssemblyAI API Key"
            value={state.aaiApiKey}
            onChange={(value) => updateField('aaiApiKey', value)}
            type="password"
            placeholder={
              aaiConfigured ? '••••••••••••••••' : 'Enter AssemblyAI API key'
            }
            error={errors.aaiApiKey}
          />
        </div>
        <div className="mt-3 text-xs text-gray-500">
          <p>
            Used for audio transcription and analysis features. Optional but
            required for audio processing.
            {aaiConfigured && ' Leave blank to keep existing key.'}
          </p>
        </div>
      </div>
    </div>
  );
}
