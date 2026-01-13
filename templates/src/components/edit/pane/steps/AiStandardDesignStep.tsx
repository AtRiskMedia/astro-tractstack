import { useState, useCallback, useMemo, useEffect } from 'react';
import prompts from '@/constants/prompts.json';
import {
  parseAiPane,
  createDefaultShell,
} from '@/utils/compositor/aiPaneParser';
import { callAskLemurAPI } from '@/utils/compositor/aiGeneration';
import { markdownToHtml } from '@/utils/compositor/htmlAst';
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

  // Prompts State
  const [masterShellSystem, setMasterShellSystem] = useState('');
  const [masterShellUser, setMasterShellUser] = useState('');
  const [masterCopySystem, setMasterCopySystem] = useState('');
  const [masterCopyUser, setMasterCopyUser] = useState('');
  const [masterStyleSystem, setMasterStyleSystem] = useState('');
  const [masterStyleUser, setMasterStyleUser] = useState('');

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

  // Load Prompt Templates
  useEffect(() => {
    if (!selectedPromptId) return;

    const activeConfig = prompts.aiPromptsIndex.find(
      (p) => p.id === selectedPromptId
    );
    if (!activeConfig) return;

    const promptKey = activeConfig.prompts.copy;
    const shellKey = activeConfig.prompts.shell;
    const styleKey = activeConfig.prompts.style; // New: Load style prompt key

    const copyPromptGroup = (prompts as any)[promptKey];
    const shellPromptGroup = (prompts as any)[shellKey];
    const stylePromptGroup = (prompts as any)[styleKey];

    if (shellPromptGroup) {
      setMasterShellSystem(shellPromptGroup.system || '');
      setMasterShellUser(shellPromptGroup.user_template || '');
    }
    if (copyPromptGroup) {
      setMasterCopySystem(copyPromptGroup.system || '');
      setMasterCopyUser(copyPromptGroup.user_template || '');
    }
    if (stylePromptGroup) {
      setMasterStyleSystem(stylePromptGroup.system || '');
      setMasterStyleUser(stylePromptGroup.user_template || '');
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

      const layoutType = 'Text Only';
      const promptMap = prompts as any;

      // --- 1. Shell Generation ---
      let shellResult = '';

      if (isAiStyling) {
        // AI Path: Generate Shell via AskLemur
        let designInput = `Generate a design using a **${aiDesignConfig.harmony.toLowerCase()}** color scheme with a **${aiDesignConfig.theme.toLowerCase()}** theme.`;
        if (aiDesignConfig.baseColor)
          designInput += ` Base the colors around **${aiDesignConfig.baseColor}**.`;
        if (aiDesignConfig.accentColor)
          designInput += ` Use **${aiDesignConfig.accentColor}** as an accent color.`;
        if (additionalNotes)
          designInput += ` Refine with these notes: "${additionalNotes}"`;

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

        shellResult = await callAskLemurAPI({
          prompt: formattedShellPrompt,
          context: masterShellSystem,
          expectJson: true,
          isSandboxMode,
        });
      } else {
        // No AI Path: Use Default Shell
        shellResult = JSON.stringify(createDefaultShell(layoutChoice));
      }

      const designInputForCopy = isAiStyling
        ? `Using a **${aiDesignConfig.harmony.toLowerCase()}** color scheme.`
        : 'Use the provided default classes.';

      // --- 2. Content Generation ---
      if (layoutChoice === 'standard') {
        let finalHtml = '';

        if (copyMode === 'prompt') {
          // A. Prompt Mode: AI writes copy
          const injectTopic = (text: string) =>
            text.replace('{{TOPIC}}', topic.trim());
          const copyInputContent = injectTopic(promptValue);

          const formattedCopyPrompt = masterCopyUser
            .replace('{{COPY_INPUT}}', copyInputContent)
            .replace('{{DESIGN_INPUT}}', designInputForCopy)
            .replace('{{LAYOUT_TYPE}}', layoutType)
            .replace('{{SHELL_JSON}}', shellResult);

          finalHtml = await callAskLemurAPI({
            prompt: formattedCopyPrompt,
            context: masterCopySystem,
            expectJson: false,
            isSandboxMode,
          });
        } else {
          // B. Raw Mode: User provided markdown
          if (isAiStyling) {
            // Style with AI: Use the 'style' prompt to format markdown
            const formattedStylePrompt = masterStyleUser
              .replace('{{SHELL_JSON}}', shellResult)
              .replace('{{COPY_INPUT}}', copyValue);

            finalHtml = await callAskLemurAPI({
              prompt: formattedStylePrompt,
              context: masterStyleSystem,
              expectJson: false,
              isSandboxMode,
            });
          } else {
            // No AI: Local conversion
            finalHtml = markdownToHtml(copyValue);
          }
        }

        const finalPane = parseAiPane(shellResult, finalHtml, layoutType);
        onCreatePane(finalPane);
      } else if (layoutChoice === 'grid') {
        // --- Grid Layout Path ---
        if (copyMode === 'raw') {
          // B. Raw Mode (Grid)
          const rawContents = [col1Copy, col2Copy];
          let finalContents: string[] = [];

          if (isAiStyling) {
            // Style with AI: Loop through columns and style each
            for (const content of rawContents) {
              const formattedStylePrompt = masterStyleUser
                .replace('{{SHELL_JSON}}', shellResult)
                .replace('{{COPY_INPUT}}', content);

              const styledHtml = await callAskLemurAPI({
                prompt: formattedStylePrompt,
                context: masterStyleSystem,
                expectJson: false,
                isSandboxMode,
              });
              finalContents.push(styledHtml);
            }
          } else {
            // No AI: Local conversion
            finalContents = rawContents.map(markdownToHtml);
          }

          const finalPane = parseAiPane(shellResult, finalContents, layoutType);
          onCreatePane(finalPane);
        } else {
          // A. Prompt Mode (Grid): AI writes copy
          const copyPromptKey = activeConfig.prompts.copy;
          const copyPromptDetails = promptMap[copyPromptKey];
          const preset =
            copyPromptDetails.presets?.[activeConfig.variants[0]] ||
            copyPromptDetails.presets?.heroDefault;
          const copyResults: string[] = [];

          const injectTopic = (text: string) =>
            text.replace('{{TOPIC}}', topic.trim());

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
              .replace('{{DESIGN_INPUT}}', designInputForCopy)
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
    masterStyleUser,
    masterStyleSystem,
    topic,
    isAiStyling, // Added dependency
  ]);

  if (isGenerating) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center space-y-4 p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-600"></div>
        <p className="text-sm text-gray-600">
          {isAiStyling
            ? 'Generating Design & Content...'
            : 'Processing Content...'}
        </p>
        <p className="text-xs text-gray-500">
          {isAiStyling
            ? 'Creating a unique layout from scratch.'
            : 'Applying standard formatting.'}
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
        {/* Style config is only relevant if AI Styling is ON */}
        {isAiStyling && (
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
        )}
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
          {isAiStyling ? '✨ Generate Pane' : 'Create Pane'}
        </button>
      </div>
    </div>
  );
};
