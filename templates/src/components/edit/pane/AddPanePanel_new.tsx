/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import DocumentPlusIcon from '@heroicons/react/24/outline/DocumentPlusIcon';
import SwatchIcon from '@heroicons/react/24/outline/SwatchIcon';
import SquaresPlusIcon from '@heroicons/react/24/outline/SquaresPlusIcon';
import DocumentIcon from '@heroicons/react/24/outline/DocumentIcon';
import PaintBrushIcon from '@heroicons/react/24/outline/PaintBrushIcon';
import { NodesContext, getCtx } from '@/stores/nodes';
import { cloneDeep } from '@/utils/helpers';
import { hasAssemblyAIStore } from '@/stores/storykeep';
import type { DesignLibraryEntry } from '@/types/tractstack';
import { PaneAddMode, type TemplatePane } from '@/types/compositorTypes';
import { useStore } from '@nanostores/react';
import { DesignLibraryStep } from './steps/DesignLibraryStep';
import { AiCreativeDesignStep } from './steps/AiCreativeDesignStep';
import { AiStandardDesignStep } from './steps/AiStandardDesignStep';
import { AiLibraryCopyStep } from './steps/AiLibraryCopyStep';
import { convertStorageToLiveTemplate } from '@/utils/compositor/designLibraryHelper';
import { DirectInjectStep } from './steps/DirectInjectStep';
import { CreativeInjectStep } from './steps/CreativeInjectStep';
import type { StoryFragmentNode } from '@/types/compositorTypes';

type Step =
  | 'initial'
  | 'dashboard'
  | 'designLibrary'
  | 'library-copy'
  | 'error'
  | 'creativeInject'
  | 'directInject'
  | 'ai-creative';

type InitialChoice = 'library' | 'ai' | 'blank';
type LayoutChoice = 'standard' | 'grid' | 'creative';

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
  const isTemplate = useStore(ctx.isTemplate);

  const [step, setStep] = useState<Step>('initial');
  const [initialChoice, setInitialChoice] = useState<InitialChoice | null>(
    null
  );
  const [layoutChoice, setLayoutChoice] = useState<LayoutChoice>('standard');
  const [error, setError] = useState<string | null>(null);
  const [selectedLibraryEntry, setSelectedLibraryEntry] =
    useState<DesignLibraryEntry | null>(null);

  const handleInitialChoice = (
    choice: InitialChoice,
    layout?: LayoutChoice
  ) => {
    setInitialChoice(choice);
    setError(null);

    if (choice === 'blank') {
      handleBlankSlate();
    } else if (choice === 'library') {
      setStep('designLibrary');
    } else if (choice === 'ai') {
      if (layout === 'creative') {
        setLayoutChoice('creative');
        setStep('ai-creative');
      } else {
        setLayoutChoice(layout || 'standard');
        setStep('dashboard');
      }
    }
  };

  const handleBack = () => {
    setError(null);
    if (step === 'dashboard' || step === 'ai-creative') {
      setStep('initial');
    } else if (
      step === 'designLibrary' ||
      step === 'error' ||
      step === 'directInject' ||
      step === 'creativeInject'
    ) {
      setStep('initial');
    } else if (step === 'library-copy') {
      setStep('designLibrary');
      setSelectedLibraryEntry(null);
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

    if (entry.locked) {
      const liveTemplate = convertStorageToLiveTemplate(entry.template);
      handleApplyTemplate(liveTemplate);
      return;
    }

    setStep('library-copy');
  };

  const renderInitialStep = () => (
    <div className="space-y-4 p-4">
      <div className="mb-6 text-center">
        <h3 className="text-lg font-bold text-gray-800">
          How would you like to build this pane?
        </h3>
        <p className="text-sm text-gray-500">
          Choose a starting point for your content.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {!isTemplate && (
          <button
            onClick={() => handleInitialChoice('library')}
            className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-gray-200 bg-white p-6 transition-all duration-200 hover:border-cyan-500 hover:shadow-md"
          >
            <div className="mb-3 rounded-full bg-cyan-50 p-3 text-cyan-600 group-hover:bg-cyan-100 group-hover:text-cyan-700">
              <SwatchIcon className="h-8 w-8" />
            </div>
            <h4 className="text-base font-bold text-gray-800">
              Design Library
            </h4>
            <p className="mt-1 text-center text-xs text-gray-500">
              Browse pre-built templates and saved designs.
            </p>
          </button>
        )}

        {hasAssemblyAI && (
          <button
            onClick={() => handleInitialChoice('ai', 'standard')}
            className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-gray-200 bg-white p-6 transition-all duration-200 hover:border-purple-500 hover:shadow-md"
          >
            <div className="absolute right-3 top-3 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
              Design with AI
            </div>
            <div className="mb-3 rounded-full bg-purple-50 p-3 text-purple-600 group-hover:bg-purple-100 group-hover:text-purple-700">
              <DocumentIcon className="h-8 w-8" />
            </div>
            <h4 className="text-base font-bold text-gray-800">
              Standard Layout
            </h4>
            <p className="mt-1 text-center text-xs text-gray-500">
              Single column flow. Perfect for articles and intros.
            </p>
          </button>
        )}

        {hasAssemblyAI && (
          <button
            onClick={() => handleInitialChoice('ai', 'grid')}
            className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-gray-200 bg-white p-6 transition-all duration-200 hover:border-purple-500 hover:shadow-md"
          >
            <div className="absolute right-3 top-3 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
              Design with AI
            </div>
            <div className="mb-3 rounded-full bg-purple-50 p-3 text-purple-600 group-hover:bg-purple-100 group-hover:text-purple-700">
              <SquaresPlusIcon className="h-8 w-8" />
            </div>
            <h4 className="text-base font-bold text-gray-800">
              Two-Column Grid
            </h4>
            <p className="mt-1 text-center text-xs text-gray-500">
              Split content. Great for features and comparisons.
            </p>
          </button>
        )}

        {hasAssemblyAI && (
          <button
            onClick={() => handleInitialChoice('ai', 'creative')}
            className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-gray-200 bg-white p-6 transition-all duration-200 hover:border-pink-500 hover:shadow-md"
          >
            <div className="absolute right-3 top-3 rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-700">
              Design with AI
            </div>
            <div className="mb-3 rounded-full bg-pink-50 p-3 text-pink-600 group-hover:bg-pink-100 group-hover:text-pink-700">
              <PaintBrushIcon className="h-8 w-8" />
            </div>
            <h4 className="text-base font-bold text-gray-800">
              Creative Design
            </h4>
            <p className="mt-1 text-center text-xs text-gray-500">
              Free-form HTML/CSS generation. Unique layouts.
            </p>
          </button>
        )}

        <button
          onClick={() => handleInitialChoice('blank')}
          className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-gray-200 bg-white p-6 transition-all duration-200 hover:border-gray-400 hover:shadow-md"
        >
          <div className="mb-3 rounded-full bg-gray-50 p-3 text-gray-600 group-hover:bg-gray-100 group-hover:text-gray-700">
            <DocumentPlusIcon className="h-8 w-8" />
          </div>
          <h4 className="text-base font-bold text-gray-800">Blank Slate</h4>
          <p className="mt-1 text-center text-xs text-gray-500">
            Start from scratch with an empty pane.
          </p>
        </button>
      </div>

      <div className="mt-4 flex justify-center border-t border-gray-100 pt-4">
        <button
          onClick={() => setParentMode(PaneAddMode.DEFAULT, false)}
          className="text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
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
        return (
          <AiStandardDesignStep
            layoutChoice={layoutChoice === 'grid' ? 'grid' : 'standard'}
            onBack={handleBack}
            onCreatePane={handleApplyTemplate}
            isSandboxMode={isSandboxMode}
            onDirectInject={() => setStep('directInject')}
          />
        );
      case 'designLibrary':
        return <DesignLibraryStep onSelect={handleDesignLibrarySelect} />;
      case 'library-copy':
        if (!selectedLibraryEntry) return renderInitialStep();
        return (
          <AiLibraryCopyStep
            entry={selectedLibraryEntry}
            onBack={handleBack}
            onCreatePane={handleApplyTemplate}
            isSandboxMode={isSandboxMode}
          />
        );
      case 'creativeInject':
        return (
          <CreativeInjectStep
            onBack={handleBack}
            onCreatePane={handleApplyTemplate}
          />
        );
      case 'directInject':
        return (
          <DirectInjectStep
            onBack={handleBack}
            onCreatePane={handleApplyTemplate}
            layout={layoutChoice === 'grid' ? 'grid' : 'standard'}
          />
        );
      case 'ai-creative':
        return (
          <AiCreativeDesignStep
            onBack={handleBack}
            onSuccess={() => setParentMode(PaneAddMode.DEFAULT, true)}
            onDirectInject={() => setStep('creativeInject')}
            onCreatePane={handleApplyTemplate}
            isSandboxMode={isSandboxMode}
          />
        );
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
