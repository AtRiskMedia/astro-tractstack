import { useEffect } from 'react';

type CopyMode = 'prompt' | 'raw';

interface CopyInputStepProps {
  copyMode: CopyMode;
  onCopyModeChange: (mode: CopyMode) => void;
  promptValue: string;
  onPromptValueChange: (value: string) => void;
  copyValue: string;
  onCopyValueChange: (value: string) => void;
  defaultPrompt?: string;
}

export const CopyInputStep = ({
  copyMode,
  onCopyModeChange,
  promptValue,
  onPromptValueChange,
  copyValue,
  onCopyValueChange,
  defaultPrompt,
}: CopyInputStepProps) => {
  useEffect(() => {
    // Pre-populate the prompt field if a default is provided and the field is empty
    if (defaultPrompt && !promptValue) {
      onPromptValueChange(defaultPrompt);
    }
  }, [defaultPrompt, promptValue, onPromptValueChange]);

  return (
    <div className="space-y-4 rounded-lg bg-gray-50 p-4 shadow-inner">
      <label className="block text-lg font-semibold text-gray-800">
        1. Provide Content
      </label>
      <div className="my-2 flex space-x-4">
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
            className="text-sm font-medium text-gray-700"
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
            className="text-sm font-medium text-gray-700"
          >
            Provide Copy (Markdown)
          </label>
        </div>
      </div>

      {copyMode === 'prompt' ? (
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
      ) : (
        <>
          <p className="mb-2 text-sm text-gray-500">
            Provide your raw copy here. Use Markdown for formatting (e.g., ##
            Headline, **bold**).
          </p>
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
    </div>
  );
};
