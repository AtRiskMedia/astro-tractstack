import { useState, useCallback, useMemo, useEffect } from 'react';
import prompts from '@/constants/prompts.json';
import { parseAiPane } from '@/utils/compositor/aiPaneParser';
import { callAskLemurAPI } from '@/utils/compositor/aiGeneration';
import { CopyInputStep, type CopyMode } from './CopyInputStep';
import { AiDesignStep, type AiDesignConfig } from './AiDesignStep';
import BooleanToggle from '@/components/form/BooleanToggle';
import type { TemplatePane } from '@/types/compositorTypes';

type LayoutChoice = 'standard' | 'grid';
type ColumnPresetKey = 'left' | 'right';

interface AiStandardDesignStepProps {
  layoutChoice: LayoutChoice;
  onBack: () => void;
  onCreatePane: (template: TemplatePane) => void;
  isSandboxMode?: boolean;
  onDirectInject: () => void;
}

export const AiStandardDesignStep = ({
  layoutChoice,
  onBack,
  onCreatePane,
  isSandboxMode = false,
  onDirectInject,
}: AiStandardDesignStepProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showColors, setShowColors] = useState(false);

  const [copyMode, setCopyMode] = useState<CopyMode>('prompt');
  const [topic, setTopic] = useState('');
  const [showAdvancedPrompts, setShowAdvancedPrompts] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');

  const [promptValue, setPromptValue] = useState('');
  const [copyValue, setCopyValue] = useState('');

  const [overallPrompt, setOverallPrompt] = useState('');
  const [promptValueCol1, setPromptValueCol1] = useState('');
  const [promptValueCol2, setPromptValueCol2] = useState('');
  const [col1Copy, setCol1Copy] = useState('');
  const [col2Copy, setCol2Copy] = useState('');

  const [masterShellSystem, setMasterShellSystem] = useState('');
  const [masterShellUser, setMasterShellUser] = useState('');
  const [masterCopySystem, setMasterCopySystem] = useState('');
  const [masterCopyUser, setMasterCopyUser] = useState('');

  const [aiDesignConfig, setAiDesignConfig] = useState<AiDesignConfig>({
    harmony: 'Analogous',
    baseColor: '',
    accentColor: '',
    theme: 'Light',
  });

  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [isAiStyling, setIsAiStyling] = useState(false);

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
    const shellKey = activeConfig.prompts.shell;
    const copyPromptGroup = (prompts as any)[promptKey];
    const shellPromptGroup = (prompts as any)[shellKey];

    if (shellPromptGroup) {
      setMasterShellSystem(shellPromptGroup.system || '');
      setMasterShellUser(shellPromptGroup.user_template || '');
    }
    if (copyPromptGroup) {
      setMasterCopySystem(copyPromptGroup.system || '');
      setMasterCopyUser(copyPromptGroup.user_template || '');
    }

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

  const handleGenerate = useCallback(async () => {
    setError(null);
    setIsGenerating(true);

    try {
      const activeConfig = prompts.aiPromptsIndex.find(
        (p) => p.id === selectedPromptId
      );
      if (!activeConfig) throw new Error('Selected prompt type not found.');

      let designInput = `Generate a design using a **${aiDesignConfig.harmony.toLowerCase()}** color scheme with a **${aiDesignConfig.theme.toLowerCase()}** theme.`;
      if (aiDesignConfig.baseColor)
        designInput += ` Base the colors around **${aiDesignConfig.baseColor}**.`;
      if (aiDesignConfig.accentColor)
        designInput += ` Use **${aiDesignConfig.accentColor}** as an accent color.`;
      if (additionalNotes)
        designInput += ` Refine with these notes: "${additionalNotes}"`;

      const layoutType = 'Text Only';
      const promptMap = prompts as any;

      const injectTopic = (text: string) => {
        return text.replace('{{TOPIC}}', topic.trim());
      };

      let formattedShellPrompt = masterShellUser
        .replace('{{DESIGN_INPUT}}', designInput)
        .replace('{{LAYOUT_TYPE}}', layoutType);

      if (layoutChoice === 'grid') {
        const finalOverallPrompt = injectTopic(overallPrompt);
        formattedShellPrompt = formattedShellPrompt.replace(
          '{{COPY_INPUT}}',
          finalOverallPrompt
        );
      }

      const shellResult = await callAskLemurAPI({
        prompt: formattedShellPrompt,
        context: masterShellSystem,
        expectJson: true,
        isSandboxMode,
      });

      if (layoutChoice === 'standard') {
        const copyInputContent =
          copyMode === 'prompt' ? injectTopic(promptValue) : copyValue;

        const formattedCopyPrompt = masterCopyUser
          .replace('{{COPY_INPUT}}', copyInputContent)
          .replace('{{DESIGN_INPUT}}', designInput)
          .replace('{{LAYOUT_TYPE}}', layoutType)
          .replace('{{SHELL_JSON}}', shellResult);

        const copyResult = await callAskLemurAPI({
          prompt: formattedCopyPrompt,
          context: masterCopySystem,
          expectJson: false,
          isSandboxMode,
        });

        const finalPane = parseAiPane(shellResult, copyResult, layoutType);
        onCreatePane(finalPane);
      } else if (layoutChoice === 'grid') {
        if (copyMode === 'raw') {
          const rawContents = [col1Copy, col2Copy];
          const finalPane = parseAiPane(shellResult, rawContents, layoutType);
          onCreatePane(finalPane);
        } else {
          const copyPromptKey = activeConfig.prompts.copy;
          const copyPromptDetails = promptMap[copyPromptKey];
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

            const formattedCopyPrompt = masterCopyUser
              .replace('{{SHELL_JSON}}', shellResult)
              .replace('{{COPY_INPUT}}', injectTopic(overallPrompt))
              .replace('{{COLUMN_PROMPT}}', item.prompt)
              .replace('{{DESIGN_INPUT}}', designInput)
              .replace('{{LAYOUT_TYPE}}', layoutType)
              .replace('{{COLUMN_EXAMPLE}}', columnPreset.example);

            const copyResult = await callAskLemurAPI({
              prompt: formattedCopyPrompt,
              context: masterCopySystem,
              expectJson: false,
              isSandboxMode,
            });
            copyResults.push(copyResult);
          }
          const finalPane = parseAiPane(shellResult, copyResults, layoutType);
          onCreatePane(finalPane);
        }
      }
    } catch (err: any) {
      console.error('AI Generation Error:', err);
      setError(err.message || 'Failed to generate AI pane.');
    } finally {
      setIsGenerating(false);
    }
  }, [
    aiDesignConfig,
    additionalNotes,
    copyMode,
    promptValue,
    copyValue,
    col1Copy,
    col2Copy,
    overallPrompt,
    promptValueCol1,
    promptValueCol2,
    isSandboxMode,
    layoutChoice,
    selectedPromptId,
    onCreatePane,
    masterShellUser,
    masterShellSystem,
    masterCopyUser,
    masterCopySystem,
    topic,
  ]);

  if (isGenerating) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center space-y-4 p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-600"></div>
        <p className="text-sm text-gray-600">Generating Design & Content...</p>
        <p className="text-xs text-gray-500">
          Creating a unique layout from scratch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
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
        hasRetainedContent={false}
        promptOptions={promptOptions}
        selectedPromptId={selectedPromptId}
        onSelectedPromptIdChange={setSelectedPromptId}
        isAiStyling={isAiStyling}
        onIsAiStylingChange={setIsAiStyling}
        showStyleToggle={true}
        onDirectInject={onDirectInject}
        masterShellSystem={masterShellSystem}
        setMasterShellSystem={setMasterShellSystem}
        masterShellUser={masterShellUser}
        setMasterShellUser={setMasterShellUser}
        masterCopySystem={masterCopySystem}
        setMasterCopySystem={setMasterCopySystem}
        masterCopyUser={masterCopyUser}
        setMasterCopyUser={setMasterCopyUser}
      >
        <div className="border-t pt-4">
          <div>
            <label
              htmlFor="dashboard-notes"
              className="block text-sm font-bold text-gray-700"
            >
              Design Notes
            </label>
            <textarea
              id="dashboard-notes"
              rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
              placeholder="e.g. Clean, minimal, high contrast..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
            />
          </div>

          <div className="my-4 flex items-center">
            <BooleanToggle
              label="Customize Colors"
              value={showColors}
              onChange={setShowColors}
              size="sm"
            />
          </div>

          {showColors && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <AiDesignStep
                designConfig={aiDesignConfig}
                onDesignConfigChange={setAiDesignConfig}
              />
            </div>
          )}
        </div>
      </CopyInputStep>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-between border-t pt-4">
        <button
          onClick={onBack}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleGenerate}
          disabled={
            copyMode === 'prompt'
              ? !promptValue.trim() && !overallPrompt.trim()
              : copyMode === 'raw'
                ? !copyValue.trim() && (!col1Copy.trim() || !col2Copy.trim())
                : false
          }
          className="rounded-md bg-cyan-600 px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          ✨ Generate Pane
        </button>
      </div>
    </div>
  );
};
