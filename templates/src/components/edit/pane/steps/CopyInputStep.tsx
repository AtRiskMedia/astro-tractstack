import BooleanToggle from '@/components/form/BooleanToggle';
import EnumSelect from '@/components/form/EnumSelect';

export type CopyMode = 'prompt' | 'raw' | 'original';

interface PromptOption {
  label: string;
  value: string;
}

interface CopyInputStepProps {
  layoutChoice: 'standard' | 'grid';
  copyMode: CopyMode;
  onCopyModeChange: (mode: CopyMode) => void;

  topic: string;
  onTopicChange: (value: string) => void;

  showAdvancedPrompts: boolean;
  onShowAdvancedPromptsChange: (value: boolean) => void;

  promptValue: string;
  onPromptValueChange: (value: string) => void;
  copyValue: string;
  onCopyValueChange: (value: string) => void;

  overallPrompt: string;
  onOverallPromptChange: (value: string) => void;
  promptValueCol1: string;
  onPromptValueCol1Change: (value: string) => void;
  promptValueCol2: string;
  onPromptValueCol2Change: (value: string) => void;
  col1Copy: string;
  onCol1CopyChange: (value: string) => void;
  col2Copy: string;
  onCol2CopyChange: (value: string) => void;

  hasRetainedContent?: boolean;
  promptOptions: PromptOption[];
  selectedPromptId: string;
  onSelectedPromptIdChange: (id: string) => void;
  isAiStyling: boolean;
  onIsAiStylingChange: (checked: boolean) => void;
  showStyleToggle?: boolean;
}

export const CopyInputStep = ({
  layoutChoice,
  copyMode,
  onCopyModeChange,
  topic,
  onTopicChange,
  showAdvancedPrompts,
  onShowAdvancedPromptsChange,
  promptValue,
  onPromptValueChange,
  copyValue,
  onCopyValueChange,
  overallPrompt,
  onOverallPromptChange,
  promptValueCol1,
  onPromptValueCol1Change,
  promptValueCol2,
  onPromptValueCol2Change,
  col1Copy,
  onCol1CopyChange,
  col2Copy,
  onCol2CopyChange,
  hasRetainedContent = false,
  promptOptions,
  selectedPromptId,
  onSelectedPromptIdChange,
  isAiStyling,
  onIsAiStylingChange,
  showStyleToggle = true,
}: CopyInputStepProps) => {
  const renderModeSelection = () => (
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
  );

  const renderPromptMode = () => (
    <>
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

      <div className="mb-4">
        <label className="mb-2 block text-sm font-bold text-gray-700">
          Topic / Context
        </label>
        <textarea
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder="e.g. a SaaS product for team collaboration"
          rows={2}
          className="sm:text-sm block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
        />
      </div>

      <div className="mb-4 flex items-center">
        <BooleanToggle
          label="Advanced: Edit Full Prompts"
          value={showAdvancedPrompts}
          onChange={onShowAdvancedPromptsChange}
          size="sm"
        />
      </div>

      {showAdvancedPrompts && (
        <div className="mt-4 space-y-4 rounded-md border border-gray-200 bg-white p-4">
          {layoutChoice === 'standard' ? (
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Full Prompt
              </label>
              <textarea
                value={promptValue}
                onChange={(e) => onPromptValueChange(e.target.value)}
                rows={4}
                className="sm:text-sm block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave [topic] as it will be replaced with your prompt.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  Overall Component Brief
                </label>
                <textarea
                  value={overallPrompt}
                  onChange={(e) => onOverallPromptChange(e.target.value)}
                  rows={3}
                  className="sm:text-sm block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                />
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Left Column Prompt
                  </label>
                  <textarea
                    value={promptValueCol1}
                    onChange={(e) => onPromptValueCol1Change(e.target.value)}
                    rows={4}
                    className="sm:text-sm block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Right Column Prompt
                  </label>
                  <textarea
                    value={promptValueCol2}
                    onChange={(e) => onPromptValueCol2Change(e.target.value)}
                    rows={4}
                    className="sm:text-sm block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );

  const renderRawMode = () => (
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

      {isAiStyling && (
        <div className="mb-4">
          <EnumSelect
            label="Section Type (for Styling)"
            value={selectedPromptId}
            onChange={onSelectedPromptIdChange}
            options={promptOptions}
            placeholder="Select a type..."
            className="w-full"
          />
        </div>
      )}

      {layoutChoice === 'standard' ? (
        <textarea
          id="raw-copy"
          value={copyValue}
          onChange={(e) => onCopyValueChange(e.target.value)}
          placeholder="## My Awesome Headline..."
          rows={6}
          className="block w-full rounded-md border-gray-300 p-2 font-mono text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">
              Left Column Markdown
            </label>
            <textarea
              value={col1Copy}
              onChange={(e) => onCol1CopyChange(e.target.value)}
              rows={8}
              className="block w-full rounded-md border-gray-300 p-2 font-mono text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">
              Right Column Markdown
            </label>
            <textarea
              value={col2Copy}
              onChange={(e) => onCol2CopyChange(e.target.value)}
              rows={8}
              className="block w-full rounded-md border-gray-300 p-2 font-mono text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <label className="block text-lg font-bold text-gray-800">
        Content Configuration
      </label>

      {renderModeSelection()}

      {copyMode === 'prompt' && renderPromptMode()}
      {copyMode === 'raw' && renderRawMode()}

      {copyMode === 'original' && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-700">
          <p className="text-sm">
            The original text saved with this design will be used.
          </p>
        </div>
      )}
    </>
  );
};
