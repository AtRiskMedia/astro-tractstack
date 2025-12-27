/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useMemo, useEffect } from 'react';
import DocumentPlusIcon from '@heroicons/react/24/outline/DocumentPlusIcon';
import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import SwatchIcon from '@heroicons/react/24/outline/SwatchIcon';
import SquaresPlusIcon from '@heroicons/react/24/outline/SquaresPlusIcon';
import DocumentIcon from '@heroicons/react/24/outline/DocumentIcon';
import { NodesContext, getCtx } from '@/stores/nodes';
import { cloneDeep } from '@/utils/helpers';
import { hasAssemblyAIStore, sandboxTokenStore } from '@/stores/storykeep';
import prompts from '@/constants/prompts.json';
import type { DesignLibraryEntry } from '@/types/tractstack';
import { PaneAddMode, type TemplatePane } from '@/types/compositorTypes';
import { useStore } from '@nanostores/react';
import { CopyInputStep, type CopyMode } from './steps/CopyInputStep';
import { DesignLibraryStep } from './steps/DesignLibraryStep';
import { AiDesignStep, type AiDesignConfig } from './steps/AiDesignStep';
import { parseAiPane, parseAiCopyHtml } from '@/utils/compositor/aiPaneParser';
import {
  convertStorageToLiveTemplate,
  convertTemplateToAIShell,
} from '@/utils/compositor/designLibraryHelper';
import { DirectInjectStep } from './steps/DirectInjectStep';
import { CreativeInjectStep } from './steps/CreativeInjectStep';
import BooleanToggle from '@/components/form/BooleanToggle';
import type { StoryFragmentNode } from '@/types/compositorTypes';
import { TractStackAPI } from '@/utils/api';

type Step =
  | 'initial'
  | 'dashboard'
  | 'designLibrary'
  | 'loading'
  | 'error'
  | 'creativeInject'
  | 'directInject';

type InitialChoice = 'library' | 'ai' | 'blank';
type LayoutChoice = 'standard' | 'grid';
type ColumnPresetKey = 'left' | 'right';

const callAskLemurAPI = async (
  prompt: string,
  context: string,
  expectJson: boolean,
  isSandboxMode: boolean
): Promise<string> => {
  const tenantId =
    window.TRACTSTACK_CONFIG?.tenantId ||
    import.meta.env.PUBLIC_TENANTID ||
    'default';
  const api = new TractStackAPI(tenantId);

  const requestBody = {
    prompt,
    input_text: context,
    final_model: '',
    temperature: 0.5,
    max_tokens: 2000,
  };

  let resultData: any;

  if (isSandboxMode) {
    const token = sandboxTokenStore.get();
    const response = await fetch(`/api/sandbox`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-Sandbox-Token': token || '',
      },
      credentials: 'include',
      body: JSON.stringify({ action: 'askLemur', payload: requestBody }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sandbox API failed: ${response.status} ${errorText}`);
    }

    const json = await response.json();
    if (!json.success) {
      throw new Error(json.error || 'Sandbox generation failed');
    }
    resultData = json.data;
  } else {
    const response = await api.post('/api/v1/aai/askLemur', requestBody);

    if (!response.success) {
      throw new Error(
        response.error || 'Generation failed to return valid response.'
      );
    }
    resultData = response.data;
  }

  if (!resultData?.response) {
    throw new Error('Generation failed to return a response object.');
  }

  let rawResponseData = resultData.response;

  if (expectJson && typeof rawResponseData === 'object') {
    return JSON.stringify(rawResponseData);
  }
  if (typeof rawResponseData === 'string') {
    let responseString = rawResponseData;
    if (responseString.startsWith('```json')) {
      responseString = responseString.slice(7, -3).trim();
    } else if (responseString.startsWith('```html')) {
      responseString = responseString.slice(7, -3).trim();
    }
    return responseString;
  }
  throw new Error('Unexpected response format received from API.');
};

interface AddPaneNewPanelProps {
  nodeId: string;
  first: boolean;
  setMode: (mode: PaneAddMode, reset: boolean) => void;
  ctx?: NodesContext;
  isStoryFragment?: boolean;
  isContextPane?: boolean;
  isSandboxMode?: boolean;
}

const AddPaneNewPanel = ({
  nodeId,
  first,
  setMode: setParentMode,
  ctx: providedCtx,
  isStoryFragment = false,
  isContextPane = false,
  isSandboxMode = false,
}: AddPaneNewPanelProps) => {
  const ctx = providedCtx || getCtx();
  const hasAssemblyAI = useStore(hasAssemblyAIStore);

  const [step, setStep] = useState<Step>('initial');
  const [initialChoice, setInitialChoice] = useState<InitialChoice | null>(
    null
  );
  const [layoutChoice, setLayoutChoice] = useState<LayoutChoice>('standard');
  const [error, setError] = useState<string | null>(null);

  const [topic, setTopic] = useState('');
  const [showAdvancedPrompts, setShowAdvancedPrompts] = useState(false);
  const [showStyles, setShowStyles] = useState(false);

  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [isAiStyling, setIsAiStyling] = useState(false);

  const [copyMode, setCopyMode] = useState<CopyMode>('prompt');
  const [promptValue, setPromptValue] = useState('');
  const [copyValue, setCopyValue] = useState('');

  const [overallPrompt, setOverallPrompt] = useState('');
  const [promptValueCol1, setPromptValueCol1] = useState('');
  const [promptValueCol2, setPromptValueCol2] = useState('');
  const [col1Copy, setCol1Copy] = useState('');
  const [col2Copy, setCol2Copy] = useState('');

  const [selectedLibraryEntry, setSelectedLibraryEntry] =
    useState<DesignLibraryEntry | null>(null);
  const [aiDesignConfig, setAiDesignConfig] = useState<AiDesignConfig>({
    harmony: 'Analogous',
    baseColor: '',
    accentColor: '',
    theme: 'Light',
    additionalNotes: '',
  });

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

    const injectTopic = (template: string) => {
      if (!template) return '';
      return template.replace('[topic]', topic.trim() || '[topic]');
    };

    if (layoutChoice === 'standard') {
      const baseText = copyPromptGroup[variant] || '';
      setPromptValue(injectTopic(baseText));
    } else if (layoutChoice === 'grid') {
      const preset = copyPromptGroup.presets?.[variant];
      if (preset) {
        setOverallPrompt(injectTopic(preset.default || ''));
        setPromptValueCol1(preset.left?.prompt || '');
        setPromptValueCol2(preset.right?.prompt || '');
      }
    }
  }, [selectedPromptId, layoutChoice, topic]);

  const handleInitialChoice = (choice: InitialChoice) => {
    setInitialChoice(choice);
    setError(null);

    if (choice === 'blank') {
      handleBlankSlate();
    } else if (choice === 'library') {
      setStep('designLibrary');
    } else if (choice === 'ai') {
      setStep('dashboard');
    }
  };

  const handleBack = () => {
    setError(null);
    if (step === 'dashboard') {
      setStep('initial');
      setTopic('');
      setShowAdvancedPrompts(false);
      setShowStyles(false);
    } else if (
      step === 'designLibrary' ||
      step === 'error' ||
      step === 'directInject' ||
      step === 'creativeInject'
    ) {
      setStep('initial');
    }
  };

  const handleBlankSlate = () => {
    const blankTemplate: TemplatePane = {
      id: '',
      nodeType: 'Pane',
      parentId: '',
      title: '',
      slug: '',
      isDecorative: false,
      markdown: {
        id: '',
        nodeType: 'Markdown',
        parentId: '',
        type: 'markdown',
        markdownId: '',
        defaultClasses: {},
        parentClasses: [],
        nodes: [],
      },
    };
    handleApplyTemplate(blankTemplate);
  };

  const handleApplyTemplate = async (template: any) => {
    if (!ctx) return;
    try {
      const insertTemplate = cloneDeep(template);
      const ownerId =
        isStoryFragment || isContextPane
          ? nodeId
          : ctx.getClosestNodeTypeFromId(nodeId, 'StoryFragment');
      insertTemplate.title = '';
      insertTemplate.slug = '';

      if (isContextPane) {
        insertTemplate.isContextPane = true;
        await ctx.applyAtomicUpdate(async (tmpCtx) => {
          tmpCtx.addContextTemplatePane(ownerId, insertTemplate);
        });
      } else {
        await ctx.applyAtomicUpdate(async (tmpCtx) => {
          tmpCtx.addTemplatePane(
            ownerId,
            insertTemplate,
            nodeId,
            first ? 'before' : 'after'
          );
        });
        const storyFragment = cloneDeep(
          ctx.allNodes.get().get(ownerId)
        ) as StoryFragmentNode;
        ctx.modifyNodes([{ ...storyFragment, isChanged: true }]);
      }
      ctx.notifyNode(`root`);
      setParentMode(PaneAddMode.DEFAULT, false);
    } catch (err) {
      console.error('Error inserting template:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while adding the pane.'
      );
      setStep('error');
    }
  };

  const handleDesignLibrarySelect = (entry: DesignLibraryEntry) => {
    setSelectedLibraryEntry(entry);

    if (entry.template.gridLayout) {
      setLayoutChoice('grid');
    } else {
      setLayoutChoice('standard');
    }

    if (entry.locked) {
      const liveTemplate = convertStorageToLiveTemplate(entry.template);
      handleApplyTemplate(liveTemplate);
      return;
    }

    if (entry.retain) {
      setCopyMode('original');
    } else {
      setCopyMode('prompt');
    }
    setStep('dashboard');
  };

  const handleFinalGenerate = useCallback(async () => {
    setError(null);
    setStep('loading');

    try {
      if (initialChoice === 'library') {
        if (!selectedLibraryEntry) {
          throw new Error('No design library item was selected.');
        }

        const liveTemplate = convertStorageToLiveTemplate(
          selectedLibraryEntry.template
        );

        if (copyMode === 'original') {
          handleApplyTemplate(liveTemplate);
          return;
        }

        const shellResult = convertTemplateToAIShell(liveTemplate);
        const layout = 'Text Only';

        if (layoutChoice === 'grid' && liveTemplate.gridLayout) {
          if (copyMode === 'raw' && isAiStyling) {
            const activeConfig =
              prompts.aiPromptsIndex.find((p) => p.id === selectedPromptId) ||
              prompts.aiPromptsIndex.find((p) => p.layout === 'grid') ||
              prompts.aiPromptsIndex[0];

            const stylePromptKey = activeConfig.prompts.style;
            const stylePromptDetails = (prompts as any)[stylePromptKey];

            const copyResults: string[] = [];
            const rawContents = [col1Copy, col2Copy];

            for (const rawContent of rawContents) {
              const formattedStylePrompt = stylePromptDetails.user_template
                .replace('{{SHELL_JSON}}', shellResult)
                .replace('{{COPY_INPUT}}', rawContent);

              const styledResult = await callAskLemurAPI(
                formattedStylePrompt,
                stylePromptDetails.system || '',
                false,
                isSandboxMode
              );
              copyResults.push(styledResult);
            }
            const finalPane = parseAiPane(shellResult, copyResults, layout);
            handleApplyTemplate(finalPane);
            return;
          }

          if (copyMode === 'raw') {
            const nodes = liveTemplate.gridLayout.nodes;
            if (nodes && nodes[0]) nodes[0].markdownBody = col1Copy;
            if (nodes && nodes[1]) nodes[1].markdownBody = col2Copy;
            handleApplyTemplate(liveTemplate);
            return;
          }

          const copyPromptDetails = prompts.aiPaneCopyPrompt_2cols;
          const preset = copyPromptDetails.presets.heroDefault;
          const copyResults: string[] = [];
          const promptsToRun = [
            { prompt: promptValueCol1, presetKey: 'left' as ColumnPresetKey },
            { prompt: promptValueCol2, presetKey: 'right' as ColumnPresetKey },
          ];

          for (const item of promptsToRun) {
            const columnPreset = preset[item.presetKey];
            const formattedCopyPrompt = copyPromptDetails.user_template
              .replace('{{SHELL_JSON}}', shellResult)
              .replace('{{COPY_INPUT}}', overallPrompt)
              .replace('{{COLUMN_PROMPT}}', item.prompt)
              .replace(
                '{{DESIGN_INPUT}}',
                "N/A - Use the provided Shell JSON's design."
              )
              .replace('{{LAYOUT_TYPE}}', layout)
              .replace('{{COLUMN_EXAMPLE}}', columnPreset.example);

            const copyResult = await callAskLemurAPI(
              formattedCopyPrompt,
              copyPromptDetails.system || '',
              false,
              isSandboxMode
            );
            copyResults.push(copyResult);
          }
          const finalPane = parseAiPane(shellResult, copyResults, layout);
          handleApplyTemplate(finalPane);
        } else if (layoutChoice === 'standard' && liveTemplate.markdown) {
          if (copyMode === 'raw' && isAiStyling) {
            const activeConfig =
              prompts.aiPromptsIndex.find((p) => p.id === selectedPromptId) ||
              prompts.aiPromptsIndex[0];
            const stylePromptKey = activeConfig.prompts.style;
            const stylePromptDetails = (prompts as any)[stylePromptKey];

            const formattedStylePrompt = stylePromptDetails.user_template
              .replace('{{SHELL_JSON}}', shellResult)
              .replace('{{COPY_INPUT}}', copyValue);

            const styledResult = await callAskLemurAPI(
              formattedStylePrompt,
              stylePromptDetails.system || '',
              false,
              isSandboxMode
            );
            const finalPane = parseAiPane(shellResult, styledResult, layout);
            handleApplyTemplate(finalPane);
            return;
          }

          if (copyMode === 'raw') {
            liveTemplate.markdown.markdownBody = copyValue;
            handleApplyTemplate(liveTemplate);
            return;
          }
          if (copyMode === 'prompt') {
            if (!shellResult || shellResult === '{}') {
              throw new Error(
                'Could not generate a valid AI shell from this design.'
              );
            }

            const copyPromptDetails = prompts.aiPaneCopyPrompt;
            const formattedCopyPrompt = copyPromptDetails.user_template
              .replace('{{COPY_INPUT}}', promptValue)
              .replace(
                '{{DESIGN_INPUT}}',
                "N/A - Use the provided Shell JSON's design."
              )
              .replace('{{LAYOUT_TYPE}}', layout)
              .replace('{{SHELL_JSON}}', shellResult);

            const copyResult = await callAskLemurAPI(
              formattedCopyPrompt,
              copyPromptDetails.system || '',
              false,
              isSandboxMode
            );

            const newNodes = parseAiCopyHtml(
              copyResult,
              liveTemplate.markdown.id
            );
            const finalPane = cloneDeep(liveTemplate);
            finalPane.markdown!.nodes = newNodes;
            handleApplyTemplate(finalPane);
          }
        } else {
          throw new Error(
            'Template and layout mismatch. Please go back and try again.'
          );
        }
      } else if (initialChoice === 'ai') {
        const activeConfig = prompts.aiPromptsIndex.find(
          (p) => p.id === selectedPromptId
        );
        if (!activeConfig) throw new Error('Selected prompt type not found.');

        let designInput = `Generate a design using a **${aiDesignConfig.harmony.toLowerCase()}** color scheme with a **${aiDesignConfig.theme.toLowerCase()}** theme.`;
        if (aiDesignConfig.baseColor)
          designInput += ` Base the colors around **${aiDesignConfig.baseColor}**.`;
        if (aiDesignConfig.accentColor)
          designInput += ` Use **${aiDesignConfig.accentColor}** as an accent color.`;
        if (aiDesignConfig.additionalNotes)
          designInput += ` Refine with these notes: "${aiDesignConfig.additionalNotes}"`;

        const layout = 'Text Only';
        const promptMap = prompts as any;

        if (layoutChoice === 'standard') {
          const shellPromptKey = activeConfig.prompts.shell;
          const shellPromptDetails = promptMap[shellPromptKey];
          const formattedShellPrompt = shellPromptDetails.user_template
            .replace('{{DESIGN_INPUT}}', designInput)
            .replace('{{LAYOUT_TYPE}}', layout);

          const shellResult = await callAskLemurAPI(
            formattedShellPrompt,
            shellPromptDetails.system || '',
            true,
            isSandboxMode
          );

          const copyPromptKey = activeConfig.prompts.copy;
          const copyPromptDetails = promptMap[copyPromptKey];
          const copyInputContent =
            copyMode === 'prompt' ? promptValue : copyValue;
          const formattedCopyPrompt = copyPromptDetails.user_template
            .replace('{{COPY_INPUT}}', copyInputContent)
            .replace('{{DESIGN_INPUT}}', designInput)
            .replace('{{LAYOUT_TYPE}}', layout)
            .replace('{{SHELL_JSON}}', shellResult);

          const copyResult = await callAskLemurAPI(
            formattedCopyPrompt,
            copyPromptDetails.system || '',
            false,
            isSandboxMode
          );
          const finalPane = parseAiPane(shellResult, copyResult, layout);
          handleApplyTemplate(finalPane);
        } else if (layoutChoice === 'grid') {
          const shellPromptKey = activeConfig.prompts.shell;
          const shellPromptDetails = promptMap[shellPromptKey];
          const formattedShellPrompt = shellPromptDetails.user_template
            .replace('{{COPY_INPUT}}', overallPrompt)
            .replace('{{DESIGN_INPUT}}', designInput);

          const shellResult = await callAskLemurAPI(
            formattedShellPrompt,
            shellPromptDetails.system || '',
            true,
            isSandboxMode
          );

          if (copyMode === 'raw') {
            const rawContents = [col1Copy, col2Copy];
            const finalPane = parseAiPane(shellResult, rawContents, layout);
            handleApplyTemplate(finalPane);
          } else {
            const copyPromptKey = activeConfig.prompts.copy;
            const copyPromptDetails = promptMap[copyPromptKey];
            const preset =
              copyPromptDetails.presets?.[activeConfig.variants[0]] ||
              copyPromptDetails.presets?.heroDefault;
            const copyResults: string[] = [];

            const promptsToRun = [
              { prompt: promptValueCol1, presetKey: 'left' as ColumnPresetKey },
              {
                prompt: promptValueCol2,
                presetKey: 'right' as ColumnPresetKey,
              },
            ];

            for (const item of promptsToRun) {
              const columnPreset = preset[item.presetKey];
              const formattedCopyPrompt = copyPromptDetails.user_template
                .replace('{{SHELL_JSON}}', shellResult)
                .replace('{{COPY_INPUT}}', overallPrompt)
                .replace('{{COLUMN_PROMPT}}', item.prompt)
                .replace('{{DESIGN_INPUT}}', designInput)
                .replace('{{LAYOUT_TYPE}}', layout)
                .replace('{{COLUMN_EXAMPLE}}', columnPreset.example);

              const copyResult = await callAskLemurAPI(
                formattedCopyPrompt,
                copyPromptDetails.system || '',
                false,
                isSandboxMode
              );
              copyResults.push(copyResult);
            }
            const finalPane = parseAiPane(shellResult, copyResults, layout);
            handleApplyTemplate(finalPane);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI pane.');
      setStep('error');
    }
  }, [
    aiDesignConfig,
    copyMode,
    promptValue,
    copyValue,
    col1Copy,
    col2Copy,
    overallPrompt,
    promptValueCol1,
    promptValueCol2,
    isSandboxMode,
    initialChoice,
    layoutChoice,
    selectedLibraryEntry,
    handleApplyTemplate,
    selectedPromptId,
    isAiStyling,
  ]);

  const renderInitialStep = () => (
    <div className="p-4">
      <h3 className="mb-4 text-center font-action text-xl font-bold text-gray-800">
        How would you like to design your new pane?
      </h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <button
          onClick={() => handleInitialChoice('library')}
          className="group flex flex-col items-center space-y-3 rounded-lg border bg-white p-6 text-center shadow-sm transition-all hover:border-cyan-600 hover:shadow-lg"
        >
          <SwatchIcon className="h-10 w-10 text-gray-500 transition-colors group-hover:text-cyan-600" />
          <h4 className="font-bold text-gray-800">Use Design Library</h4>
          <p className="text-sm text-gray-600">
            Start with a pre-made design and add your own content.
          </p>
        </button>
        {hasAssemblyAI && (
          <button
            onClick={() => handleInitialChoice('ai')}
            className="group flex flex-col items-center space-y-3 rounded-lg border bg-white p-6 text-center shadow-sm transition-all hover:border-cyan-600 hover:shadow-lg"
          >
            <SparklesIcon className="h-10 w-10 text-gray-500 transition-colors group-hover:text-cyan-600" />
            <h4 className="font-bold text-gray-800">Design with AI</h4>
            <p className="text-sm text-gray-600">
              Let AI generate a complete design and copy from your prompt.
            </p>
          </button>
        )}
        <button
          onClick={() => handleInitialChoice('blank')}
          className="group flex flex-col items-center space-y-3 rounded-lg border bg-white p-6 text-center shadow-sm transition-all hover:border-cyan-600 hover:shadow-lg"
        >
          <DocumentPlusIcon className="h-10 w-10 text-gray-500 transition-colors group-hover:text-cyan-600" />
          <h4 className="font-bold text-gray-800">Blank Slate</h4>
          <p className="text-sm text-gray-600">
            Add a simple, empty pane to build from scratch.
          </p>
        </button>
      </div>
      <div className="mt-8 flex justify-center">
        <button
          onClick={() => setStep('creativeInject')}
          className="text-xs font-bold text-gray-400 hover:text-cyan-700 hover:underline"
        >
          Direct Inject HTML+CSS
        </button>
      </div>
    </div>
  );

  const renderDashboard = () => {
    return (
      <div className="space-y-6 p-4">
        {/* Layout Selection */}
        {initialChoice === 'ai' && (
          <div className="flex justify-center border-b pb-4">
            <div className="inline-flex rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setLayoutChoice('standard')}
                className={`flex items-center space-x-2 rounded-md px-4 py-2 text-sm font-bold transition-all ${
                  layoutChoice === 'standard'
                    ? 'bg-white text-cyan-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <DocumentIcon className="h-5 w-5" />
                <span>Standard Layout</span>
              </button>
              <button
                onClick={() => setLayoutChoice('grid')}
                className={`flex items-center space-x-2 rounded-md px-4 py-2 text-sm font-bold transition-all ${
                  layoutChoice === 'grid'
                    ? 'bg-white text-cyan-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <SquaresPlusIcon className="h-5 w-5" />
                <span>2-Column Grid</span>
              </button>
            </div>
          </div>
        )}

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
          hasRetainedContent={selectedLibraryEntry?.retain}
          promptOptions={promptOptions}
          selectedPromptId={selectedPromptId}
          onSelectedPromptIdChange={setSelectedPromptId}
          isAiStyling={isAiStyling}
          onIsAiStylingChange={setIsAiStyling}
          showStyleToggle={initialChoice === 'library'}
        />

        {initialChoice === 'ai' && (
          <>
            <div className="my-4 flex items-center">
              <BooleanToggle
                label="Customize Styles"
                value={showStyles}
                onChange={setShowStyles}
                size="sm"
              />
            </div>

            {showStyles && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <AiDesignStep
                  designConfig={aiDesignConfig}
                  onDesignConfigChange={setAiDesignConfig}
                />
              </div>
            )}
          </>
        )}

        <div className="flex justify-between pt-4">
          <button
            onClick={handleBack}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleFinalGenerate}
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

        {initialChoice === 'ai' && !isSandboxMode && (
          <div className="text-center text-sm text-gray-600">
            <button
              onClick={() => setStep('directInject')}
              className="font-bold text-cyan-700 underline hover:text-cyan-900 focus:outline-none"
            >
              Direct Inject
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderDesignLibraryStep = () => (
    <div className="space-y-4 p-4">
      <div className="flex justify-start">
        <button
          onClick={handleBack}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          ← Back to Choice
        </button>
      </div>
      <DesignLibraryStep onSelect={handleDesignLibrarySelect} />
    </div>
  );

  const renderDirectInjectStep = () => (
    <DirectInjectStep
      onBack={handleBack}
      onCreatePane={handleApplyTemplate}
      layout={layoutChoice}
    />
  );

  const renderCreativeInjectStep = () => (
    <CreativeInjectStep
      onBack={handleBack}
      onCreatePane={handleApplyTemplate}
    />
  );

  const renderLoading = () => (
    <div className="flex min-h-80 flex-col items-center justify-center space-y-4 p-6">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-600"></div>
      <p className="text-sm text-gray-600">Generating AI Pane...</p>
      <p className="text-xs text-gray-500">This may take a moment.</p>
    </div>
  );

  const renderError = () => (
    <div className="space-y-4 rounded-lg bg-red-50 p-6 text-center">
      <h4 className="text-lg font-bold text-red-800">Generation Failed</h4>
      <p className="text-sm text-red-700">{error}</p>
      <button
        onClick={handleBack}
        className="mt-2 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-800 shadow-sm hover:bg-red-50"
      >
        ← Try Again
      </button>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 'initial':
        return renderInitialStep();
      case 'dashboard':
        return renderDashboard();
      case 'designLibrary':
        return renderDesignLibraryStep();
      case 'loading':
        return renderLoading();
      case 'creativeInject':
        return renderCreativeInjectStep();
      case 'directInject':
        return renderDirectInjectStep();
      case 'error':
        return renderError();
      default:
        return renderInitialStep();
    }
  };

  return (
    <div className="bg-white p-2 shadow-inner">
      <div className="group mb-2 flex w-full items-center gap-1 rounded-md bg-white p-1.5">
        <button
          onClick={() => setParentMode(PaneAddMode.DEFAULT, first)}
          className="w-fit rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-200"
        >
          ← Go Back
        </button>
        <div className="ml-4 flex-none rounded px-2 py-2.5 font-action text-sm font-bold text-cyan-700 shadow-sm">
          + Design New Pane
        </div>
      </div>
      <div className="min-h-96 rounded-md border bg-gray-50">
        {renderStep()}
      </div>
    </div>
  );
};

export default AddPaneNewPanel;
