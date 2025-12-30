import { type ReactNode } from 'react';
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
  onShowAdvancedPromptsChange?: (value: boolean) => void;

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
  onDirectInject?: () => void;

  masterShellSystem?: string;
  setMasterShellSystem?: (val: string) => void;
  masterShellUser?: string;
  setMasterShellUser?: (val: string) => void;
  masterCopySystem?: string;
  setMasterCopySystem?: (val: string) => void;
  masterCopyUser?: string;
  setMasterCopyUser?: (val: string) => void;

  children?: ReactNode;
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
  onDirectInject,
  masterShellSystem,
  setMasterShellSystem,
  masterShellUser,
  setMasterShellUser,
  masterCopySystem,
  setMasterCopySystem,
  masterCopyUser,
  setMasterCopyUser,
  children,
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

  const renderAdvancedEditors = () => {
    if (
      masterShellSystem !== undefined &&
      masterShellUser !== undefined &&
      masterCopySystem !== undefined &&
      masterCopyUser !== undefined &&
      setMasterShellSystem &&
      setMasterShellUser &&
      setMasterCopySystem &&
      setMasterCopyUser
    ) {
      return (
        <div className="mt-4 space-y-6 rounded-md border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 text-xl">⚡</div>
            <div>
              <p className="font-bold text-gray-900">Master Template Mode</p>
              <p className="text-xs text-gray-600">
                You are editing the raw source prompts. Variables like{' '}
                <code className="bg-gray-100 px-1 font-mono font-bold">{`{{DESIGN_INPUT}}`}</code>{' '}
                will be replaced by your settings unless you remove them.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-800">
              Shell System Prompt
            </label>
            <textarea
              value={masterShellSystem}
              onChange={(e) => setMasterShellSystem(e.target.value)}
              rows={4}
              className="block w-full rounded-md border-gray-300 p-2 font-mono text-xs shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-800">
              Shell User Template
            </label>
            <textarea
              value={masterShellUser}
              onChange={(e) => setMasterShellUser(e.target.value)}
              rows={10}
              className="block w-full rounded-md border-gray-300 p-2 font-mono text-xs shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-800">
              Copy System Prompt
            </label>
            <textarea
              value={masterCopySystem}
              onChange={(e) => setMasterCopySystem(e.target.value)}
              rows={4}
              className="block w-full rounded-md border-gray-300 p-2 font-mono text-xs shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-800">
              Copy User Template
            </label>
            <textarea
              value={masterCopyUser}
              onChange={(e) => setMasterCopyUser(e.target.value)}
              rows={10}
              className="block w-full rounded-md border-gray-300 p-2 font-mono text-xs shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-4 rounded-md border border-gray-200 bg-white p-4">
        <p className="mb-3 text-xs text-gray-600">
          Edit the raw prompts sent to the AI. Variables like{' '}
          <code className="bg-gray-100 px-1 font-mono font-bold">
            {`{{TOPIC}}`}
          </code>{' '}
          will still be replaced.
        </p>
        {layoutChoice === 'standard' ? (
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">
              Full Prompt
            </label>
            <textarea
              value={promptValue}
              onChange={(e) => onPromptValueChange(e.target.value)}
              rows={12}
              className="block w-full rounded-md border-gray-300 p-2 font-mono text-xs shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
            />
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
                className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 md:text-sm"
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
                  rows={8}
                  className="block w-full rounded-md border-gray-300 p-2 font-mono text-xs shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  Right Column Prompt
                </label>
                <textarea
                  value={promptValueCol2}
                  onChange={(e) => onPromptValueCol2Change(e.target.value)}
                  rows={8}
                  className="block w-full rounded-md border-gray-300 p-2 font-mono text-xs shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                />
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderPromptMode = () => (
    <>
      {!showAdvancedPrompts && (
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
              className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 md:text-sm"
            />
          </div>

          {children}
        </>
      )}

      {onShowAdvancedPromptsChange && (
        <div className="mt-4 flex items-center border-t border-gray-100 pt-4">
          <BooleanToggle
            label="Advanced: Edit Full Prompts"
            value={showAdvancedPrompts}
            onChange={onShowAdvancedPromptsChange}
            size="sm"
          />
        </div>
      )}

      {showAdvancedPrompts && renderAdvancedEditors()}
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

      {onDirectInject && (
        <div className="mt-4 text-center">
          <button
            onClick={onDirectInject}
            className="text-xs text-gray-400 underline hover:text-gray-600"
          >
            Direct Inject HTML+CSS
          </button>
        </div>
      )}
    </>
  );
};
