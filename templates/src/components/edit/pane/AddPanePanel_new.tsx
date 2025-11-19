/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useMemo, useEffect } from 'react';
import DocumentPlusIcon from '@heroicons/react/24/outline/DocumentPlusIcon';
import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import SwatchIcon from '@heroicons/react/24/outline/SwatchIcon';
import SquaresPlusIcon from '@heroicons/react/24/outline/SquaresPlusIcon';
import DocumentIcon from '@heroicons/react/24/outline/DocumentIcon';
import { NodesContext, getCtx } from '@/stores/nodes';
import { cloneDeep } from '@/utils/helpers';
import { hasAssemblyAIStore } from '@/stores/storykeep';
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
import BooleanToggle from '@/components/form/BooleanToggle';
import EnumSelect from '@/components/form/EnumSelect';
import type { StoryFragmentNode } from '@/types/compositorTypes';

type Step =
  | 'initial'
  | 'copyInput'
  | 'designLibrary'
  | 'layoutChoice'
  | 'aiDesign'
  | 'loading'
  | 'error'
  | 'directInject';

type InitialChoice = 'library' | 'ai' | 'blank';
type LayoutChoice = 'standard' | 'grid';
type ColumnPresetKey = 'left' | 'right';

interface GenerationResponse {
  success: boolean;
  data?: { response: string | object };
  error?: string;
}

const callAskLemurAPI = async (
  prompt: string,
  context: string,
  expectJson: boolean,
  isSandboxMode: boolean
): Promise<string> => {
  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
  const tenantId = import.meta.env.PUBLIC_TENANTID || 'default';
  const requestBody = {
    prompt,
    input_text: context,
    final_model: '',
    temperature: 0.5,
    max_tokens: 2000,
  };

  let response: Response;
  if (isSandboxMode) {
    response = await fetch(`/api/sandbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId },
      credentials: 'include',
      body: JSON.stringify({ action: 'askLemur', payload: requestBody }),
    });
  } else {
    response = await fetch(`${goBackend}/api/v1/aai/askLemur`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    let backendError = `API call failed: ${response.status} ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson?.error) backendError = errorJson.error;
    } catch (e) {
      /* ignore */
    }
    throw new Error(backendError);
  }

  const result = (await response.json()) as GenerationResponse;
  if (!result.success || !result.data?.response) {
    throw new Error(
      result.error || 'Generation failed to return valid response.'
    );
  }

  let rawResponseData = result.data.response;
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

  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [isAiStyling, setIsAiStyling] = useState(false);

  const [copyMode, setCopyMode] = useState<CopyMode>('prompt');
  const [promptValue, setPromptValue] = useState('');
  const [copyValue, setCopyValue] = useState('');

  const [overallPrompt, setOverallPrompt] = useState(
    prompts.aiPaneCopyPrompt_2cols.presets.heroDefault.default
  );
  const [promptValueCol1, setPromptValueCol1] = useState(
    prompts.aiPaneCopyPrompt_2cols.presets.heroDefault.left.prompt
  );
  const [promptValueCol2, setPromptValueCol2] = useState(
    prompts.aiPaneCopyPrompt_2cols.presets.heroDefault.right.prompt
  );
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

    if (layoutChoice === 'standard') {
      const newText = copyPromptGroup[variant] || '';
      setPromptValue(newText);
    } else if (layoutChoice === 'grid') {
      const preset = copyPromptGroup.presets?.[variant];
      if (preset) {
        setOverallPrompt(preset.default || '');
        setPromptValueCol1(preset.left?.prompt || '');
        setPromptValueCol2(preset.right?.prompt || '');
      }
    }
  }, [selectedPromptId, layoutChoice]);

  const handleInitialChoice = (choice: InitialChoice) => {
    setInitialChoice(choice);
    setError(null);

    if (choice === 'blank') {
      handleBlankSlate();
    } else if (choice === 'library') {
      setStep('designLibrary');
    } else if (choice === 'ai') {
      setStep('layoutChoice');
    }
  };

  const handleLayoutChoice = (choice: LayoutChoice) => {
    setLayoutChoice(choice);
    setStep('aiDesign');
  };

  const handleBack = () => {
    setError(null);
    if (step === 'copyInput') {
      if (initialChoice === 'library') {
        setStep('designLibrary');
      } else if (initialChoice === 'ai') {
        setStep('aiDesign');
      } else {
        setStep('initial');
      }
    } else if (step === 'aiDesign') {
      setStep('layoutChoice');
    } else if (step === 'directInject') {
      setStep('aiDesign');
    } else if (step === 'layoutChoice') {
      setStep('initial');
    } else if (step === 'designLibrary' || step === 'error') {
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

  const handleAiDesignContinue = () => {
    setStep('copyInput');
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

    setStep('copyInput');
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
      <h3 className="font-action mb-4 text-center text-xl font-bold text-gray-800">
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
    </div>
  );

  const renderLayoutChoiceStep = () => (
    <div className="p-4">
      <h3 className="font-action mb-4 text-center text-xl font-bold text-gray-800">
        Choose a Layout Structure
      </h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <button
          onClick={() => handleLayoutChoice('standard')}
          className="group flex flex-col items-center space-y-3 rounded-lg border bg-white p-6 text-center shadow-sm transition-all hover:border-cyan-600 hover:shadow-lg"
        >
          <DocumentIcon className="h-10 w-10 text-gray-500 transition-colors group-hover:text-cyan-600" />
          <h4 className="font-bold text-gray-800">Standard Layout</h4>
          <p className="text-sm text-gray-600">
            A single, continuous column of content.
          </p>
        </button>
        <button
          onClick={() => handleLayoutChoice('grid')}
          className="group flex flex-col items-center space-y-3 rounded-lg border bg-white p-6 text-center shadow-sm transition-all hover:border-cyan-600 hover:shadow-lg"
        >
          <SquaresPlusIcon className="h-10 w-10 text-gray-500 transition-colors group-hover:text-cyan-600" />
          <h4 className="font-bold text-gray-800">2-Column Grid</h4>
          <p className="text-sm text-gray-600">
            Side-by-side content that stacks on mobile.
          </p>
        </button>
      </div>
      <div className="mt-6 flex justify-center">
        <button
          onClick={handleBack}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          ← Back
        </button>
      </div>
    </div>
  );

  const renderContentStep = () => {
    if (layoutChoice === 'grid') {
      const isGenerateDisabled =
        copyMode === 'prompt'
          ? !overallPrompt.trim() ||
            !promptValueCol1.trim() ||
            !promptValueCol2.trim()
          : copyMode === 'raw'
            ? !col1Copy.trim() || !col2Copy.trim()
            : false;

      return (
        <div className="space-y-4 p-4">
          <label className="block text-lg font-bold text-gray-800">
            1. Provide Content
          </label>

          <div className="my-2 flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                checked={copyMode === 'prompt'}
                onChange={() => setCopyMode('prompt')}
                className="h-4 w-4 border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <label className="text-sm font-bold text-gray-700">Prompt</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                checked={copyMode === 'raw'}
                onChange={() => setCopyMode('raw')}
                className="h-4 w-4 border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <label className="text-sm font-bold text-gray-700">
                Manual Markdown
              </label>
            </div>
            {selectedLibraryEntry?.retain && (
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={copyMode === 'original'}
                  onChange={() => setCopyMode('original')}
                  className="h-4 w-4 border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <label className="text-sm font-bold text-gray-700">
                  Use Original
                </label>
              </div>
            )}
          </div>

          {copyMode === 'raw' && initialChoice === 'library' && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-2">
              <span className="text-sm text-gray-600">
                Style this content with AI?
              </span>
              <div className="flex items-center">
                <BooleanToggle
                  label="AI Styles"
                  value={isAiStyling}
                  onChange={setIsAiStyling}
                  size="sm"
                />
              </div>
            </div>
          )}

          {copyMode === 'prompt' && (
            <>
              <div className="mb-4">
                <EnumSelect
                  label="Section Type"
                  value={selectedPromptId}
                  onChange={setSelectedPromptId}
                  options={promptOptions}
                  placeholder="Select a section type..."
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  Overall Component Brief
                </label>
                <textarea
                  value={overallPrompt}
                  onChange={(e) => setOverallPrompt(e.target.value)}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This context is applied to both columns.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Left Column Prompt
                  </label>
                  <textarea
                    value={promptValueCol1}
                    onChange={(e) => setPromptValueCol1(e.target.value)}
                    rows={4}
                    className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Right Column Prompt
                  </label>
                  <textarea
                    value={promptValueCol2}
                    onChange={(e) => setPromptValueCol2(e.target.value)}
                    rows={4}
                    className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {copyMode === 'raw' && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  Left Column Markdown
                </label>
                <textarea
                  value={col1Copy}
                  onChange={(e) => setCol1Copy(e.target.value)}
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
                  onChange={(e) => setCol2Copy(e.target.value)}
                  rows={8}
                  className="block w-full rounded-md border-gray-300 p-2 font-mono text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                />
              </div>
            </div>
          )}

          {copyMode === 'original' && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-700">
              <p className="text-sm">
                The original text saved with this design will be used.
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={handleBack}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              ← Back
            </button>
            <button
              onClick={handleFinalGenerate}
              disabled={isGenerateDisabled}
              className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              ✨ Generate Pane
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 p-4">
        <CopyInputStep
          copyMode={copyMode}
          onCopyModeChange={setCopyMode}
          promptValue={promptValue}
          onPromptValueChange={setPromptValue}
          copyValue={copyValue}
          onCopyValueChange={setCopyValue}
          hasRetainedContent={selectedLibraryEntry?.retain}
          defaultPrompt={
            first
              ? prompts.aiPaneCopyPrompt.heroDefault
              : prompts.aiPaneCopyPrompt.contentDefault
          }
          promptOptions={promptOptions}
          selectedPromptId={selectedPromptId}
          onSelectedPromptIdChange={setSelectedPromptId}
          isAiStyling={isAiStyling}
          onIsAiStylingChange={setIsAiStyling}
          showStyleToggle={initialChoice === 'library'}
        />
        <div className="flex justify-between">
          <button
            onClick={handleBack}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            ← Back
          </button>
          <button
            onClick={handleFinalGenerate}
            disabled={
              copyMode === 'prompt'
                ? !promptValue.trim()
                : copyMode === 'raw'
                  ? !copyValue.trim()
                  : false
            }
            className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            ✨ Generate Pane
          </button>
        </div>
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

  const renderAiDesignStep = () => (
    <div className="space-y-4 p-4">
      <AiDesignStep
        designConfig={aiDesignConfig}
        onDesignConfigChange={setAiDesignConfig}
      />
      <div className="flex justify-between">
        <button
          onClick={handleBack}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          ← Back
        </button>
        <button
          onClick={handleAiDesignContinue}
          className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700"
        >
          Continue →
        </button>
      </div>
      {initialChoice === `ai` && !isSandboxMode && (
        <div className="mt-6 text-center text-sm text-gray-600">
          ADVANCED:{' '}
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

  const renderDirectInjectStep = () => (
    <DirectInjectStep
      onBack={handleBack}
      onCreatePane={handleApplyTemplate}
      layout={layoutChoice}
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
      case 'layoutChoice':
        return renderLayoutChoiceStep();
      case 'copyInput':
        return renderContentStep();
      case 'designLibrary':
        return renderDesignLibraryStep();
      case 'aiDesign':
        return renderAiDesignStep();
      case 'loading':
        return renderLoading();
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
        <div className="font-action ml-4 flex-none rounded px-2 py-2.5 text-sm font-bold text-cyan-700 shadow-sm">
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
