/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
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
import { CopyInputStep } from './steps/CopyInputStep';
import { DesignLibraryStep } from './steps/DesignLibraryStep';
import { AiDesignStep, type AiDesignConfig } from './steps/AiDesignStep';
import { parseAiPane, parseAiCopyHtml } from '@/utils/compositor/aiPaneParser';
import {
  convertStorageToLiveTemplate,
  convertTemplateToAIShell,
} from '@/utils/compositor/designLibraryHelper';
import { DirectInjectStep } from './steps/DirectInjectStep';

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
type CopyMode = 'prompt' | 'raw';
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

  // Standard / Single Column State
  const [copyMode, setCopyMode] = useState<CopyMode>('prompt');
  const [promptValue, setPromptValue] = useState('');
  const [copyValue, setCopyValue] = useState('');

  // Grid / 2-Column State (Strictly Prompt-Only)
  const [overallPrompt, setOverallPrompt] = useState(
    prompts.aiPaneCopyPrompt_2cols.presets.heroDefault.default
  );
  const [promptValueCol1, setPromptValueCol1] = useState(
    prompts.aiPaneCopyPrompt_2cols.presets.heroDefault.left.prompt
  );
  const [promptValueCol2, setPromptValueCol2] = useState(
    prompts.aiPaneCopyPrompt_2cols.presets.heroDefault.right.prompt
  );

  const [selectedLibraryEntry, setSelectedLibraryEntry] =
    useState<DesignLibraryEntry | null>(null);
  const [aiDesignConfig, setAiDesignConfig] = useState<AiDesignConfig>({
    harmony: 'Analogous',
    baseColor: '',
    accentColor: '',
    theme: 'Light',
    additionalNotes: '',
  });

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
        ctx.notifyNode(`root`);
      }
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
        const shellResult = convertTemplateToAIShell(liveTemplate);
        const layout = 'Text Only';

        if (layoutChoice === 'grid' && liveTemplate.gridLayout) {
          const copyPromptDetails = prompts.aiPaneCopyPrompt_2cols;
          const preset = copyPromptDetails.presets.heroDefault;
          const copyResults: string[] = [];

          // Only prompt mode supported for grid now
          const promptsToRun: {
            prompt: string;
            presetKey: ColumnPresetKey;
          }[] = [
            {
              prompt: promptValueCol1,
              presetKey: 'left',
            },
            {
              prompt: promptValueCol2,
              presetKey: 'right',
            },
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
        let designInput = `Generate a design using a **${aiDesignConfig.harmony.toLowerCase()}** color scheme with a **${aiDesignConfig.theme.toLowerCase()}** theme.`;
        if (aiDesignConfig.baseColor)
          designInput += ` Base the colors around **${aiDesignConfig.baseColor}**.`;
        if (aiDesignConfig.accentColor)
          designInput += ` Use **${aiDesignConfig.accentColor}** as an accent color.`;
        if (aiDesignConfig.additionalNotes)
          designInput += ` Refine with these notes: "${aiDesignConfig.additionalNotes}"`;

        const layout = 'Text Only';

        if (layoutChoice === 'standard') {
          const shellPromptDetails = prompts.aiPaneShellPrompt;
          const formattedShellPrompt = shellPromptDetails.user_template
            .replace('{{DESIGN_INPUT}}', designInput)
            .replace('{{LAYOUT_TYPE}}', layout);

          const shellResult = await callAskLemurAPI(
            formattedShellPrompt,
            shellPromptDetails.system || '',
            true,
            isSandboxMode
          );

          const copyPromptDetails = prompts.aiPaneCopyPrompt;
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
          const shellPromptDetails = prompts.aiPaneShellPrompt_2cols;
          const formattedShellPrompt = shellPromptDetails.user_template
            .replace('{{COPY_INPUT}}', overallPrompt)
            .replace('{{DESIGN_INPUT}}', designInput);

          const shellResult = await callAskLemurAPI(
            formattedShellPrompt,
            shellPromptDetails.system || '',
            true,
            isSandboxMode
          );

          const copyPromptDetails = prompts.aiPaneCopyPrompt_2cols;
          const preset = copyPromptDetails.presets.heroDefault;
          const copyResults: string[] = [];

          // Grid is strictly prompt-based
          const promptsToRun: {
            prompt: string;
            presetKey: ColumnPresetKey;
          }[] = [
            {
              prompt: promptValueCol1,
              presetKey: 'left',
            },
            {
              prompt: promptValueCol2,
              presetKey: 'right',
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
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI pane.');
      setStep('error');
    }
  }, [
    aiDesignConfig,
    copyMode,
    promptValue,
    copyValue,
    overallPrompt,
    promptValueCol1,
    promptValueCol2,
    isSandboxMode,
    initialChoice,
    layoutChoice,
    selectedLibraryEntry,
    handleApplyTemplate,
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
        !overallPrompt.trim() ||
        !promptValueCol1.trim() ||
        !promptValueCol2.trim();

      return (
        <div className="space-y-4 p-4">
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
          defaultPrompt={
            first
              ? prompts.aiPaneCopyPrompt.heroDefault
              : prompts.aiPaneCopyPrompt.contentDefault
          }
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
              copyMode === 'prompt' ? !promptValue.trim() : !copyValue.trim()
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
    <DirectInjectStep onBack={handleBack} onCreatePane={handleApplyTemplate} />
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
