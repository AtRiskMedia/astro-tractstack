import { useState, useRef } from 'react';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import {
  RadioGroup,
  type RadioGroup as RadioGroupNamespace,
} from '@ark-ui/react/radio-group';
import CheckCircleIcon from '@heroicons/react/20/solid/CheckIcon';
import {
  formatPrompt,
  pagePrompts,
  pagePromptsDetails,
} from '@/constants/prompts.json';
import {
  parsePageMarkdown,
  createPagePanes,
} from '@/utils/compositor/processMarkdown';
import PageCreationPreview from './PageGen_preview';
import type { NodesContext } from '@/stores/nodes';
import type { StoryFragmentNode, PageDesign } from '@/types/compositorTypes';

type PromptType = keyof typeof pagePrompts;

interface GenerationResponse {
  success: boolean;
  data?: {
    response: string;
  };
  error?: string;
}

type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';

interface PageCreationGenProps {
  nodeId: string;
  ctx: NodesContext;
}

export const PageCreationGen = ({ nodeId, ctx }: PageCreationGenProps) => {
  const [selectedPromptType, setSelectedPromptType] =
    useState<PromptType>('landing');
  const [customizedPrompt, setCustomizedPrompt] = useState(
    pagePrompts[selectedPromptType]
  );
  const [referenceContext, setReferenceContext] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const [generationStatus, setGenerationStatus] =
    useState<GenerationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const dialogButtonRef = useRef<HTMLButtonElement>(null);

  const handlePromptTypeChange = (
    details: RadioGroupNamespace.ValueChangeDetails
  ) => {
    if (!details.value) return;

    const type = details.value as PromptType;
    setSelectedPromptType(type);
    setCustomizedPrompt(pagePrompts[type]);
  };

  const handleGenerate = async () => {
    setShowModal(true);
    setGenerationStatus('generating');
    setError(null);

    const finalPrompt = `${formatPrompt}

Writing Style Instructions:
${customizedPrompt}

Additional Instructions:
${additionalInstructions}`;

    try {
      const goBackend =
        import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
      const tenantId = import.meta.env.PUBLIC_TENANTID || 'default';

      const response = await fetch(`${goBackend}/api/v1/aai/askLemur`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        credentials: 'include',
        body: JSON.stringify({
          prompt: finalPrompt,
          input_text: referenceContext,
          final_model: 'anthropic/claude-3-5-sonnet',
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const result = (await response.json()) as GenerationResponse;

      if (!result.success || !result.data?.response) {
        throw new Error(result.error || 'Generation failed');
      }

      setGeneratedContent(result.data.response);
      setGenerationStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setGenerationStatus('error');
    }
  };

  const handleModalClose = (details: { open: boolean }) => {
    if (generationStatus === 'generating') {
      return;
    }
    if (generationStatus === 'success' && !details.open) {
      setShowModal(false);
      setShowPreview(true);
      return;
    }
    setShowModal(false);
    setGenerationStatus('idle');
  };

  const handlePreviewApply = async (
    previewCtx: NodesContext,
    markdownContent: string,
    design: PageDesign
  ) => {
    if (isApplying) return; // Prevent multiple clicks

    setIsApplying(true);

    try {
      // Get preview storyfragment and its panes
      const previewStoryfragment = previewCtx.allNodes
        .get()
        .get('tmp') as StoryFragmentNode;
      if (!previewStoryfragment) {
        setIsApplying(false);
        return;
      }

      // Process our markdown content into sections
      const processedPage = parsePageMarkdown(markdownContent);
      const paneIds = await createPagePanes(
        processedPage,
        design,
        ctx,
        true,
        nodeId
      );

      // Update the storyfragment with the new panes
      const storyfragment = ctx.allNodes.get().get(nodeId) as StoryFragmentNode;
      if (storyfragment) {
        storyfragment.paneIds = paneIds;
        storyfragment.isChanged = true;
        ctx.modifyNodes([storyfragment]);
        ctx.notifyNode('root');
      }

      setShowPreview(false);
    } catch (error) {
      console.error('Error applying design:', error);
    } finally {
      setIsApplying(false);
    }
  };

  if (showPreview && generatedContent) {
    return (
      <PageCreationPreview
        markdownContent={generatedContent}
        onComplete={handlePreviewApply}
        onBack={() => setShowPreview(false)}
        isApplying={isApplying}
      />
    );
  }

  // CSS for Dialog styles
  const dialogStyles = `
    [data-part="backdrop"] {
      background-color: rgba(0, 0, 0, 0.3);
    }
    [data-part="content"] {
      max-width: 32rem;
      background-color: white;
      border-radius: 0.5rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      padding: 1.5rem;
    }
    [data-part="title"] {
      font-size: 1.125rem;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 0.5rem;
    }
  `;

  // CSS for RadioGroup styles
  const radioGroupStyles = `
    .radio-item[data-highlighted] {
      outline: none;
    }
    .radio-item[data-state="checked"] {
      background-color: #efefef;
      color: white;
    }
    .radio-item[data-state="checked"] .radio-description {
      color: black;
    }
    .radio-item[data-state="checked"] .check-icon {
      display: flex;
    }
    .radio-item .check-icon {
      display: none;
    }
  `;

  return (
    <div className="p-0.5 shadow-inner">
      <style>{dialogStyles}</style>
      <style>{radioGroupStyles}</style>
      <div className="w-full rounded-md bg-white p-6">
        <h2 className="font-action mb-6 text-2xl font-bold text-gray-900">
          Generate Page Content with AI
        </h2>

        <div className="space-y-8">
          {/* Prompt Type Selection */}
          <div className="w-full">
            <RadioGroup.Root
              defaultValue={selectedPromptType}
              onValueChange={handlePromptTypeChange}
            >
              <RadioGroup.Label className="mb-4 block text-sm font-bold text-gray-900">
                Select Page Type
              </RadioGroup.Label>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {Object.entries(pagePromptsDetails).map(([key, details]) => (
                  <RadioGroup.Item
                    key={key}
                    value={key}
                    className="radio-item relative flex cursor-pointer rounded-lg px-5 py-4 shadow-md focus:outline-none"
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center">
                        <RadioGroup.ItemControl className="hidden" />
                        <RadioGroup.ItemText>
                          <div className="text-sm">
                            <p className="font-bold text-black">
                              {details.title}
                            </p>
                            <span className="radio-description inline text-gray-500">
                              {details.description}
                            </span>
                          </div>
                        </RadioGroup.ItemText>
                      </div>
                      <div className="check-icon shrink-0 text-white">
                        <CheckCircleIcon className="h-6 w-6" />
                      </div>
                    </div>
                    <RadioGroup.ItemHiddenInput />
                  </RadioGroup.Item>
                ))}
              </div>
            </RadioGroup.Root>
          </div>

          {/* Customizable Prompt */}
          <div>
            <label
              htmlFor="customPrompt"
              className="mb-2 block text-sm font-bold text-gray-900"
            >
              Customize Writing Style (Optional)
            </label>
            <textarea
              id="customPrompt"
              rows={6}
              className="w-full rounded-md border-gray-300 p-3.5 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
              value={customizedPrompt}
              onChange={(e) => setCustomizedPrompt(e.target.value)}
              maxLength={1000}
            />
          </div>

          {/* Reference Context */}
          <div>
            <label
              htmlFor="referenceContext"
              className="block text-sm font-bold text-gray-900"
            >
              Reference Content &ndash; copy and paste dump here; no formatting
              required...
            </label>
            <textarea
              id="referenceContext"
              rows={8}
              className="w-full rounded-md border-gray-300 p-3.5 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
              value={referenceContext}
              onChange={(e) => setReferenceContext(e.target.value)}
              maxLength={200000}
              placeholder="Paste your reference content here..."
            />
          </div>

          {/* Additional Instructions */}
          <div>
            <label
              htmlFor="additionalInstructions"
              className="mb-2 block text-sm font-bold text-gray-900"
            >
              Additional Instructions (Optional)
            </label>
            <textarea
              id="additionalInstructions"
              rows={4}
              className="w-full rounded-md border-gray-300 p-3.5 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              maxLength={2000}
              placeholder="Any additional instructions or requirements..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end pt-4">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  ctx.setPanelMode(nodeId, 'add', 'DEFAULT');
                  ctx.notifyNode('root');
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={
                  !referenceContext.trim() || generationStatus === 'generating'
                }
                className={`rounded-md px-4 py-2 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${
                  referenceContext.trim() && generationStatus !== 'generating'
                    ? 'bg-cyan-600 hover:bg-cyan-700'
                    : 'cursor-not-allowed bg-gray-300'
                }`}
              >
                {generationStatus === 'generating'
                  ? 'Generating...'
                  : 'Generate Content'}
              </button>
            </div>
          </div>
        </div>

        {/* Generation Result Modal */}
        <Dialog.Root
          open={showModal}
          onOpenChange={handleModalClose}
          modal={true}
        >
          <Portal>
            <Dialog.Backdrop className="fixed inset-0" />
            <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <Dialog.Content className="w-full max-w-md overflow-hidden text-left align-middle">
                <Dialog.Title>
                  {generationStatus === 'error'
                    ? 'Generation Error'
                    : generationStatus === 'success'
                      ? 'Content Generated'
                      : 'Generating Content'}
                </Dialog.Title>

                <div className="mt-2">
                  {generationStatus === 'error' ? (
                    <p className="text-sm text-red-600">{error}</p>
                  ) : generationStatus === 'success' ? (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Content has been generated successfully!
                      </p>
                      <div className="max-h-60 overflow-y-auto rounded-md bg-gray-50 p-3">
                        <pre className="whitespace-pre-wrap text-sm text-gray-800">
                          {generatedContent}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-cyan-600"></div>
                      <p className="text-sm text-gray-500">
                        Generating your page content...
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <button
                    ref={dialogButtonRef}
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
                    onClick={() => {
                      if (generationStatus === 'success') {
                        setShowModal(false);
                        setShowPreview(true);
                      } else if (generationStatus === 'error') {
                        setShowModal(false);
                        setGenerationStatus('idle');
                      } else {
                        // Don't close if still generating
                      }
                    }}
                    disabled={generationStatus === 'generating'}
                  >
                    {generationStatus === 'error'
                      ? 'Try Again'
                      : generationStatus === 'success'
                        ? 'Continue'
                        : 'Cancel'}
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      </div>
    </div>
  );
};

export default PageCreationGen;
