/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import DocumentPlusIcon from '@heroicons/react/24/outline/DocumentPlusIcon';
import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import SwatchIcon from '@heroicons/react/24/outline/SwatchIcon';
import { NodesContext, getCtx } from '@/stores/nodes';
import { cloneDeep } from '@/utils/helpers';
import { hasAssemblyAIStore } from '@/stores/storykeep';
import prompts from '@/constants/prompts.json';
import type { BrandConfig, DesignLibraryEntry } from '@/types/tractstack';
import { PaneAddMode, type TemplatePane } from '@/types/compositorTypes';
import { useStore } from '@nanostores/react';

import { CopyInputStep } from './steps/CopyInputStep';
import { DesignLibraryStep } from './steps/DesignLibraryStep';
import { AiDesignStep, type AiDesignConfig } from './steps/AiDesignStep';
import { parseAiPane } from '@/utils/compositor/aiPaneParser';
import {
  convertStorageToLiveTemplate,
  mergeCopyIntoTemplate,
  convertTemplateToAIShell,
} from '@/utils/compositor/designLibraryHelper';

// --- Types for Workflow State ---
type Step =
  | 'initial'
  | 'copyInput'
  | 'designLibrary'
  | 'aiDesign'
  | 'loading'
  | 'error';

type InitialChoice = 'library' | 'ai' | 'blank';
type CopyMode = 'prompt' | 'raw';

// --- API Call Helper ---
interface GenerationResponse {
  success: boolean;
  data?: { response: string | object };
  error?: string;
}

const callAskLemurAPI = async (
  prompt: string,
  context: string,
  expectJson: boolean
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

  const response = await fetch(`${goBackend}/api/v1/aai/askLemur`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId },
    credentials: 'include',
    body: JSON.stringify(requestBody),
  });

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

// --- Main Component ---
interface AddPaneNewPanelProps {
  nodeId: string;
  first: boolean;
  setMode: (mode: PaneAddMode, reset: boolean) => void;
  ctx?: NodesContext;
  isStoryFragment?: boolean;
  isContextPane?: boolean;
  config?: BrandConfig;
}

const AddPaneNewPanel = ({
  nodeId,
  first,
  setMode: setParentMode,
  ctx: providedCtx,
  isStoryFragment = false,
  isContextPane = false,
  config,
}: AddPaneNewPanelProps) => {
  const ctx = providedCtx || getCtx();
  const hasAssemblyAI = useStore(hasAssemblyAIStore);

  // --- State Machine and Data Stores ---
  const [step, setStep] = useState<Step>('initial');
  const [initialChoice, setInitialChoice] = useState<InitialChoice | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // State for CopyInputStep
  const [copyMode, setCopyMode] = useState<CopyMode>('raw');
  const [promptValue, setPromptValue] = useState('');
  const [copyValue, setCopyValue] = useState('');

  // State for AiDesignStep
  const [aiDesignConfig, setAiDesignConfig] = useState<AiDesignConfig>({
    harmony: 'Analogous',
    baseColor: '',
    accentColor: '',
    theme: 'Light',
    additionalNotes: '',
  });

  // --- Handlers & Logic ---

  const handleInitialChoice = (choice: InitialChoice) => {
    setInitialChoice(choice);
    setError(null);

    if (choice === 'blank') {
      handleBlankSlate();
    } else {
      setStep('copyInput');
    }
  };

  const handleBack = () => {
    setError(null);
    if (step === 'copyInput') {
      setStep('initial');
    } else if (step === 'designLibrary' || step === 'aiDesign' || 'error') {
      setStep('copyInput');
    }
  };

  const handleCopyContinue = () => {
    if (initialChoice === 'library') {
      setStep('designLibrary');
    } else if (initialChoice === 'ai') {
      setStep('aiDesign');
    }
  };

  const handleBlankSlate = () => {
    const blankTemplate: TemplatePane = {
      id: '', // ctx will assign
      nodeType: 'Pane',
      parentId: '', // ctx will assign
      title: 'New Pane',
      slug: '',
      isDecorative: false,
      markdown: {
        id: '', // ctx will assign
        nodeType: 'Markdown',
        parentId: '', // ctx will assign
        type: 'markdown',
        markdownId: '', // ctx will assign
        defaultClasses: {},
        parentClasses: [],
        nodes: [],
      },
    };
    handleApplyTemplate(blankTemplate);
  };

  const handleDesignLibrarySelect = (entry: DesignLibraryEntry) => {
    // This flow is for "Design Library + Provide Copy"
    if (copyMode === 'raw') {
      const liveTemplate = convertStorageToLiveTemplate(
        mergeCopyIntoTemplate(entry.template, []) // Start with blank copy
      );
      if (liveTemplate.markdown) {
        liveTemplate.markdown.markdownBody = copyValue;
      }
      handleApplyTemplate(liveTemplate);
    }
    // This flow is for "Design Library + Write a Prompt" (Hybrid AI)
    else if (copyMode === 'prompt') {
      const liveTemplate = convertStorageToLiveTemplate(entry.template);
      const shellJson = convertTemplateToAIShell(liveTemplate);

      if (!shellJson) {
        setError(
          'Hybrid AI path is not yet implemented. Cannot generate AI copy for this design.'
        );
        setStep('error');
        return;
      }
      // TODO MILESTONE 2: Call single AI endpoint with shell + prompt
    }
  };

  const handleAiDesignGenerate = useCallback(async () => {
    setError(null);
    setStep('loading');

    let designInput = `Generate a design using a **${aiDesignConfig.harmony.toLowerCase()}** color scheme with a **${aiDesignConfig.theme.toLowerCase()}** theme.`;
    if (aiDesignConfig.baseColor)
      designInput += ` Base the colors around **${aiDesignConfig.baseColor}**.`;
    if (aiDesignConfig.accentColor)
      designInput += ` Use **${aiDesignConfig.accentColor}** as an accent color.`;
    if (aiDesignConfig.additionalNotes)
      designInput += ` Refine with these notes: "${aiDesignConfig.additionalNotes}"`;

    try {
      const shellPromptDetails = prompts.aiPaneShellPrompt;
      const copyPromptDetails = prompts.aiPaneCopyPrompt;
      const layout = 'Text Only'; // Hardcoded for this simplified AI path

      const formattedShellPrompt = shellPromptDetails.user_template
        .replace('{{DESIGN_INPUT}}', designInput)
        .replace('{{LAYOUT_TYPE}}', layout);

      const shellResult = await callAskLemurAPI(
        formattedShellPrompt,
        shellPromptDetails.system || '',
        true
      );

      const copyInputContent = copyMode === 'prompt' ? promptValue : copyValue;
      const formattedCopyPrompt = copyPromptDetails.user_template
        .replace('{{COPY_INPUT}}', copyInputContent)
        .replace('{{DESIGN_INPUT}}', designInput)
        .replace('{{LAYOUT_TYPE}}', layout)
        .replace('{{SHELL_JSON}}', shellResult);

      const copyResult = await callAskLemurAPI(
        formattedCopyPrompt,
        copyPromptDetails.system || '',
        false
      );

      const finalPane = parseAiPane(shellResult, copyResult, layout);
      handleApplyTemplate(finalPane);
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI pane.');
      setStep('error');
    }
  }, [aiDesignConfig, copyMode, promptValue, copyValue]);

  const handleApplyTemplate = async (template: TemplatePane) => {
    if (!ctx) return;
    try {
      const insertTemplate = cloneDeep(template);
      insertTemplate.title = insertTemplate.title || 'New Pane';
      insertTemplate.slug = insertTemplate.slug || '';

      const ownerId =
        isStoryFragment || isContextPane
          ? nodeId
          : ctx.getClosestNodeTypeFromId(nodeId, 'StoryFragment');

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

  // --- Render Logic ---

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
          <h4 className="font-semibold text-gray-800">Use Design Library</h4>
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
            <h4 className="font-semibold text-gray-800">Design with AI</h4>
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
          <h4 className="font-semibold text-gray-800">Blank Slate</h4>
          <p className="text-sm text-gray-600">
            Add a simple, empty pane to build from scratch.
          </p>
        </button>
      </div>
    </div>
  );

  const renderContentStep = () => (
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
          onClick={handleCopyContinue}
          disabled={
            copyMode === 'prompt' ? !promptValue.trim() : !copyValue.trim()
          }
          className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderDesignLibraryStep = () => (
    <div className="space-y-4 p-4">
      <div className="flex justify-start">
        <button
          onClick={handleBack}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          ← Back to Content
        </button>
      </div>
      <DesignLibraryStep
        config={config!}
        onSelect={handleDesignLibrarySelect}
      />
    </div>
  );

  const renderAiDesignStep = () => (
    <div className="space-y-4 p-4">
      <AiDesignStep
        config={config!}
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
          onClick={handleAiDesignGenerate}
          className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700"
        >
          ✨ Generate with AI
        </button>
      </div>
    </div>
  );

  const renderLoading = () => (
    <div className="flex min-h-[300px] flex-col items-center justify-center space-y-4 p-6">
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
      case 'copyInput':
        return renderContentStep();
      case 'designLibrary':
        return renderDesignLibraryStep();
      case 'aiDesign':
        return renderAiDesignStep();
      case 'loading':
        return renderLoading();
      case 'error':
        return renderError();
      default:
        return renderInitialStep();
    }
  };

  return (
    <div className="bg-white p-2 shadow-inner">
      <div className="group mb-2 flex w-full items-center gap-1 rounded-md bg-white p-1.5">
        {first ? (
          <div className="w-full text-center">
            <h2 className="font-action py-1.5 text-lg font-bold text-gray-800">
              Welcome to Tract Stack
            </h2>
          </div>
        ) : (
          <>
            <button
              onClick={() => setParentMode(PaneAddMode.DEFAULT, first)}
              className="w-fit rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-200"
            >
              ← Go Back
            </button>
            <div className="font-action ml-4 flex-none rounded px-2 py-2.5 text-sm font-bold text-cyan-700 shadow-sm">
              + Design New Pane
            </div>
          </>
        )}
      </div>
      <div className="min-h-[400px] rounded-md border bg-gray-50">
        {renderStep()}
      </div>
    </div>
  );
};

export default AddPaneNewPanel;
