import { useEffect } from 'react';
import BooleanToggle from '@/components/form/BooleanToggle';
import EnumSelect from '@/components/form/EnumSelect';

export type CopyMode = 'prompt' | 'raw' | 'original';

interface PromptOption {
  label: string;
  value: string;
}

interface CopyInputStepProps {
  copyMode: CopyMode;
  onCopyModeChange: (mode: CopyMode) => void;
  promptValue: string;
  onPromptValueChange: (value: string) => void;
  copyValue: string;
  onCopyValueChange: (value: string) => void;
  defaultPrompt?: string;
  hasRetainedContent?: boolean;
  promptOptions: PromptOption[];
  selectedPromptId: string;
  onSelectedPromptIdChange: (id: string) => void;
  isAiStyling: boolean;
  onIsAiStylingChange: (checked: boolean) => void;
  showStyleToggle?: boolean;
}

export const CopyInputStep = ({
  copyMode,
  onCopyModeChange,
  promptValue,
  onPromptValueChange,
  copyValue,
  onCopyValueChange,
  defaultPrompt,
  hasRetainedContent = false,
  promptOptions,
  selectedPromptId,
  onSelectedPromptIdChange,
  isAiStyling,
  onIsAiStylingChange,
  showStyleToggle = true,
}: CopyInputStepProps) => {
  useEffect(() => {
    if (defaultPrompt && !promptValue) {
      onPromptValueChange(defaultPrompt);
    }
  }, [defaultPrompt, promptValue, onPromptValueChange]);

  return (
    <div className="space-y-4 rounded-lg bg-gray-50 p-4 shadow-inner">
      <label className="block text-lg font-bold text-gray-800">
        1. Provide Content
      </label>
      <div className="my-2 flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <input
            type="radio"
            id="copy-prompt-mode"
            name="copyModeOptions"
            value="prompt"
            checked={copyMode === 'prompt'}
            onChange={(e) => onCopyModeChange(e.target.value as CopyMode)}
            className="h-4 w-4 border-gray-300 text-cyan-600 focus:ring-cyan-500"
          />
          <label
            htmlFor="copy-prompt-mode"
            className="text-sm font-bold text-gray-700"
          >
            Write a prompt
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="radio"
            id="copy-raw-mode"
            name="copyModeOptions"
            value="raw"
            checked={copyMode === 'raw'}
            onChange={(e) => onCopyModeChange(e.target.value as CopyMode)}
            className="h-4 w-4 border-gray-300 text-cyan-600 focus:ring-cyan-500"
          />
          <label
            htmlFor="copy-raw-mode"
            className="text-sm font-bold text-gray-700"
          >
            Provide Copy (Markdown)
          </label>
        </div>
        {hasRetainedContent && (
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="copy-original-mode"
              name="copyModeOptions"
              value="original"
              checked={copyMode === 'original'}
              onChange={(e) => onCopyModeChange(e.target.value as CopyMode)}
              className="h-4 w-4 border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
            <label
              htmlFor="copy-original-mode"
              className="text-sm font-bold text-gray-700"
            >
              Use Original
            </label>
          </div>
        )}
      </div>

      {(copyMode === 'prompt' || (copyMode === 'raw' && isAiStyling)) && (
        <div className="mb-4">
          <EnumSelect
            label="Section Type"
            value={selectedPromptId}
            onChange={onSelectedPromptIdChange}
            options={promptOptions}
            placeholder="Select a type..."
            className="w-full"
          />
        </div>
      )}

      {copyMode === 'prompt' && (
        <>
          <p className="mb-2 text-sm text-gray-500">
            Let the AI write the copy based on your prompt.
          </p>
          <textarea
            id="copy-prompt"
            value={promptValue}
            onChange={(e) => onPromptValueChange(e.target.value)}
            placeholder="e.g., A hero section for a SaaS product that helps teams collaborate..."
            rows={4}
            className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
          />
        </>
      )}

      {copyMode === 'raw' && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Provide your raw copy here. Use Markdown.
            </p>
            {showStyleToggle && (
              <div className="flex items-center">
                <BooleanToggle
                  label="Style with AI"
                  value={isAiStyling}
                  onChange={onIsAiStylingChange}
                  size="sm"
                />
              </div>
            )}
          </div>
          <textarea
            id="raw-copy"
            value={copyValue}
            onChange={(e) => onCopyValueChange(e.target.value)}
            placeholder="## My Awesome Headline..."
            rows={6}
            className="block w-full rounded-md border-gray-300 p-2 font-mono text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
          />
        </>
      )}

      {copyMode === 'original' && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-700">
          <p className="text-sm">
            The original text saved with this design will be used.
          </p>
        </div>
      )}
    </div>
  );
};
