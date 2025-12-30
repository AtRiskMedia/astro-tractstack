import { useState, useMemo, useEffect } from 'react';
import { cloneDeep } from '@/utils/helpers';
import prompts from '@/constants/prompts.json';
import {
  convertStorageToLiveTemplate,
  convertTemplateToAIShell,
} from '@/utils/compositor/designLibraryHelper';
import { parseAiPane, parseAiCopyHtml } from '@/utils/compositor/aiPaneParser';
import { callAskLemurAPI } from '@/utils/compositor/aiGeneration';
import { CopyInputStep, type CopyMode } from './CopyInputStep';
import type { DesignLibraryEntry } from '@/types/tractstack';
import type { TemplatePane } from '@/types/compositorTypes';

interface AiLibraryCopyStepProps {
  entry: DesignLibraryEntry;
  onBack: () => void;
  onCreatePane: (template: TemplatePane) => void;
  isSandboxMode?: boolean;
}

type ColumnPresetKey = 'left' | 'right';

export const AiLibraryCopyStep = ({
  entry,
  onBack,
  onCreatePane,
  isSandboxMode = false,
}: AiLibraryCopyStepProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [copyMode, setCopyMode] = useState<CopyMode>(
    entry.retain ? 'original' : 'prompt'
  );

  const [topic, setTopic] = useState('');
  const [promptValue, setPromptValue] = useState('');
  const [copyValue, setCopyValue] = useState('');

  const [overallPrompt, setOverallPrompt] = useState('');
  const [promptValueCol1, setPromptValueCol1] = useState('');
  const [promptValueCol2, setPromptValueCol2] = useState('');
  const [col1Copy, setCol1Copy] = useState('');
  const [col2Copy, setCol2Copy] = useState('');

  const [showAdvancedPrompts, setShowAdvancedPrompts] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [isAiStyling, setIsAiStyling] = useState(false);

  const liveTemplate = useMemo(() => {
    return convertStorageToLiveTemplate(entry.template);
  }, [entry]);

  const isGrid = !!liveTemplate.gridLayout;
  const layoutChoice = isGrid ? 'grid' : 'standard';

  const promptOptions = useMemo(() => {
    return prompts.aiPromptsIndex
      .filter((p) => p.layout === layoutChoice)
      .map((p) => ({ label: p.label, value: p.id }));
  }, [layoutChoice]);

  useEffect(() => {
    if (promptOptions.length > 0) {
      const currentValid = promptOptions.find(
        (p) => p.value === selectedPromptId
      );
      if (!currentValid) {
        setSelectedPromptId(promptOptions[0].value);
      }
    }
  }, [promptOptions, selectedPromptId]);

  useEffect(() => {
    if (!selectedPromptId) return;

    const activeConfig = prompts.aiPromptsIndex.find(
      (p) => p.id === selectedPromptId
    );
    if (!activeConfig) return;

    const promptKey = activeConfig.prompts.copy;
    const copyPromptGroup = (prompts as any)[promptKey];
    if (!copyPromptGroup) return;

    const variant = activeConfig.variants
      ? activeConfig.variants[0]
      : 'default';

    if (layoutChoice === 'standard') {
      const baseText = copyPromptGroup[variant] || '';
      setPromptValue(baseText);
    } else if (layoutChoice === 'grid') {
      const preset = copyPromptGroup.presets?.[variant];
      if (preset) {
        setOverallPrompt(preset.default || '');
        setPromptValueCol1(preset.left?.prompt || '');
        setPromptValueCol2(preset.right?.prompt || '');
      }
    }
  }, [selectedPromptId, layoutChoice]);

  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);

    try {
      if (copyMode === 'original') {
        onCreatePane(liveTemplate);
        return;
      }

      const shellResult = convertTemplateToAIShell(liveTemplate);
      const layoutType = 'Text Only';

      const activeConfig = prompts.aiPromptsIndex.find(
        (p) => p.id === selectedPromptId
      );
      if (!activeConfig) throw new Error('Selected prompt type not found.');

      const injectTopic = (text: string) => {
        return text.replace('{{TOPIC}}', topic.trim());
      };

      if (isGrid && liveTemplate.gridLayout) {
        if (copyMode === 'raw') {
          const nodes = liveTemplate.gridLayout.nodes;
          if (nodes && nodes[0]) nodes[0].markdownBody = col1Copy;
          if (nodes && nodes[1]) nodes[1].markdownBody = col2Copy;
          onCreatePane(liveTemplate);
          return;
        }

        if (copyMode === 'prompt') {
          const copyPromptKey = activeConfig.prompts.copy;
          const copyPromptDetails = (prompts as any)[copyPromptKey];

          const preset =
            copyPromptDetails.presets?.[activeConfig.variants[0]] ||
            copyPromptDetails.presets?.heroDefault;

          const copyResults: string[] = [];

          const promptsToRun = [
            { prompt: promptValueCol1, presetKey: 'left' as ColumnPresetKey },
            { prompt: promptValueCol2, presetKey: 'right' as ColumnPresetKey },
          ];

          for (const item of promptsToRun) {
            const columnPreset = preset[item.presetKey];
            const formattedCopyPrompt = copyPromptDetails.user_template
              .replace('{{SHELL_JSON}}', shellResult)
              .replace('{{COPY_INPUT}}', injectTopic(overallPrompt))
              .replace('{{COLUMN_PROMPT}}', item.prompt)
              .replace(
                '{{DESIGN_INPUT}}',
                "N/A - Use the provided Shell JSON's design."
              )
              .replace('{{LAYOUT_TYPE}}', layoutType)
              .replace('{{COLUMN_EXAMPLE}}', columnPreset.example);

            const copyResult = await callAskLemurAPI({
              prompt: formattedCopyPrompt,
              context: copyPromptDetails.system || '',
              expectJson: false,
              isSandboxMode,
              maxTokens: 2000,
            });
            copyResults.push(copyResult);
          }

          const finalPane = parseAiPane(shellResult, copyResults, layoutType);
          onCreatePane(finalPane);
          return;
        }
      }

      if (!isGrid && liveTemplate.markdown) {
        if (copyMode === 'raw') {
          liveTemplate.markdown.markdownBody = copyValue;
          onCreatePane(liveTemplate);
          return;
        }

        if (copyMode === 'prompt') {
          if (!shellResult || shellResult === '{}') {
            throw new Error(
              'Could not generate a valid AI shell from this design.'
            );
          }

          const copyPromptKey = activeConfig.prompts.copy;
          const copyPromptDetails = (prompts as any)[copyPromptKey];

          const formattedCopyPrompt = copyPromptDetails.user_template
            .replace('{{COPY_INPUT}}', injectTopic(promptValue))
            .replace(
              '{{DESIGN_INPUT}}',
              "N/A - Use the provided Shell JSON's design."
            )
            .replace('{{LAYOUT_TYPE}}', layoutType)
            .replace('{{SHELL_JSON}}', shellResult);

          const copyResult = await callAskLemurAPI({
            prompt: formattedCopyPrompt,
            context: copyPromptDetails.system || '',
            expectJson: false,
            isSandboxMode,
            maxTokens: 2000,
          });

          const newNodes = parseAiCopyHtml(
            copyResult,
            liveTemplate.markdown.id
          );
          const finalPane = cloneDeep(liveTemplate);
          if (finalPane.markdown) {
            finalPane.markdown.nodes = newNodes;
          }
          onCreatePane(finalPane);
          return;
        }
      }

      throw new Error(
        'Template configuration mismatch. Please try a different design.'
      );
    } catch (err: any) {
      console.error('Library Generation Error:', err);
      setError(err.message || 'Failed to generate content for this design.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center space-y-4 p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-600"></div>
        <p className="text-sm text-gray-600">Writing Content...</p>
        <p className="text-xs text-gray-500">
          Adapting the design to your text.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="font-bold text-gray-800">Customize Design</h3>
          <p className="text-xs text-gray-500">
            Selected: <span className="font-semibold">{entry.title}</span>
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          Change Design
        </button>
      </div>

      <CopyInputStep
        layoutChoice={layoutChoice}
        copyMode={copyMode}
        onCopyModeChange={setCopyMode}
        topic={topic}
        onTopicChange={setTopic}
        showAdvancedPrompts={showAdvancedPrompts}
        onShowAdvancedPromptsChange={setShowAdvancedPrompts}
        promptValue={promptValue}
        onPromptValueChange={setPromptValue}
        copyValue={copyValue}
        onCopyValueChange={setCopyValue}
        overallPrompt={overallPrompt}
        onOverallPromptChange={setOverallPrompt}
        promptValueCol1={promptValueCol1}
        onPromptValueCol1Change={setPromptValueCol1}
        promptValueCol2={promptValueCol2}
        onPromptValueCol2Change={setPromptValueCol2}
        col1Copy={col1Copy}
        onCol1CopyChange={setCol1Copy}
        col2Copy={col2Copy}
        onCol2CopyChange={setCol2Copy}
        hasRetainedContent={entry.retain}
        showStyleToggle={false}
        promptOptions={promptOptions}
        selectedPromptId={selectedPromptId}
        onSelectedPromptIdChange={setSelectedPromptId}
        isAiStyling={isAiStyling}
        onIsAiStylingChange={setIsAiStyling}
      />

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 flex justify-end border-t pt-4">
        <button
          onClick={handleGenerate}
          disabled={
            copyMode === 'prompt'
              ? isGrid
                ? !promptValueCol1.trim() &&
                  !promptValueCol2.trim() &&
                  !overallPrompt.trim()
                : !promptValue.trim()
              : copyMode === 'raw'
                ? isGrid
                  ? !col1Copy.trim() || !col2Copy.trim()
                  : !copyValue.trim()
                : false
          }
          className="rounded-md bg-cyan-600 px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {copyMode === 'original'
            ? 'Use Original Content'
            : '✨ Generate Pane'}
        </button>
      </div>
    </div>
  );
};
