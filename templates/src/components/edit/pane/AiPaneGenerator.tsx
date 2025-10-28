import { useState, useCallback } from 'react';
import { AiPanePreview } from './AiPanePreview';
import type { TemplatePane } from '@/types/compositorTypes';
import prompts from '@/constants/prompts.json';
import StringInput from '@/components/form/StringInput';

interface AiPaneGeneratorProps {
  ownerId: string;
  onComplete: (pane: TemplatePane) => void;
  onCancel: () => void;
}

type GenerationStep = 'layout' | 'input' | 'preview' | 'loading';
type CopyMode = 'prompt' | 'raw';

interface GenerationResponse {
  success: boolean;
  data?: {
    response: string | object;
  };
  error?: string;
}

const layoutOptions = ['Text Only', 'Text + Image Left', 'Text + Image Right'];

export function AiPaneGenerator({
  ownerId,
  onComplete,
  onCancel,
}: AiPaneGeneratorProps) {
  const [currentStep, setCurrentStep] = useState<GenerationStep>('layout');
  const [selectedLayout, setSelectedLayout] = useState<string>(
    layoutOptions[0]
  );
  const [copyMode, setCopyMode] = useState<CopyMode>('prompt');
  const [copyPrompt, setCopyPrompt] = useState('');
  const [rawCopy, setRawCopy] = useState('');
  const [designPrompt, setDesignPrompt] = useState('');
  const [generatedShell, setGeneratedShell] = useState<string | null>(null);
  const [generatedCopy, setGeneratedCopy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const callAskLemurAPI = useCallback(
    async (
      prompt: string,
      context: string,
      expectJson: boolean
    ): Promise<string> => {
      const goBackend =
        import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
      const tenantId = import.meta.env.PUBLIC_TENANTID || 'default';

      const requestBody = {
        prompt: prompt,
        input_text: context,
        final_model: 'anthropic/claude-3-5-sonnet',
        temperature: 0.5,
        max_tokens: 2000,
      };

      const response = await fetch(`${goBackend}/api/v1/aai/askLemur`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AskLemur API Error Response:', errorText);
        let backendError = `API call failed: ${response.status} ${response.statusText}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson && errorJson.error) {
            backendError = errorJson.error;
          }
        } catch (e) {
          /* Ignore */
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

      // Handle case where API returns JSON object for shell
      if (expectJson && typeof rawResponseData === 'object') {
        return JSON.stringify(rawResponseData); // Return as string
      }

      // Handle case where API returns string (potentially wrapped)
      if (typeof rawResponseData === 'string') {
        let responseString = rawResponseData;
        try {
          if (
            responseString.startsWith('```json') &&
            responseString.endsWith('```')
          ) {
            responseString = responseString.slice(7, -3).trim();
          } else if (
            responseString.startsWith('```html') &&
            responseString.endsWith('```')
          ) {
            responseString = responseString.slice(7, -3).trim();
          }
        } catch (e) {
          /* Ignore stripping errors */
        }
        return responseString; // Return string directly
      }

      // Fallback if response is neither expected string nor object
      throw new Error('Unexpected response format received from API.');
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    setError(null);
    setCurrentStep('loading');
    setGeneratedShell(null);
    setGeneratedCopy(null);

    try {
      const shellPromptDetails = prompts.aiPaneShellPrompt;
      const copyPromptDetails = prompts.aiPaneCopyPrompt;

      if (
        !shellPromptDetails?.user_template ||
        !copyPromptDetails?.user_template
      ) {
        throw new Error('AI prompts not found or incomplete in prompts.json');
      }

      // --- This is the updated (sequential) logic ---

      // 1. Prepare and call the Shell API first
      const formattedShellPrompt = shellPromptDetails.user_template
        .replace('{{DESIGN_INPUT}}', designPrompt)
        .replace('{{LAYOUT_TYPE}}', selectedLayout);

      const shellResult = await callAskLemurAPI(
        formattedShellPrompt,
        shellPromptDetails.system || '',
        true
      );
      setGeneratedShell(shellResult); // Set this for the previewer

      // 2. NOW, create the copy prompt, injecting the shellResult
      const copyInputContent = copyMode === 'prompt' ? copyPrompt : rawCopy;
      // Note: Assumes prompts.json's aiPaneCopyPrompt.user_template now includes {{SHELL_JSON}}
      const formattedCopyPrompt = copyPromptDetails.user_template
        .replace('{{COPY_INPUT}}', copyInputContent)
        .replace('{{DESIGN_INPUT}}', designPrompt)
        .replace('{{LAYOUT_TYPE}}', selectedLayout)
        .replace('{{SHELL_JSON}}', shellResult); // <-- This is the new, critical part

      // 3. Call Copy API second, using the fully-formed prompt
      const copyResult = await callAskLemurAPI(
        formattedCopyPrompt,
        copyPromptDetails.system || '',
        false
      );
      setGeneratedCopy(copyResult); // Should be an HTML string

      setCurrentStep('preview');

      // --- End of updated logic ---
    } catch (err: any) {
      console.error('AI Pane Generation Error:', err);
      setError(err.message || 'Failed to generate AI pane.');
      setCurrentStep('input');
    }
  }, [
    designPrompt,
    selectedLayout,
    copyMode,
    copyPrompt,
    rawCopy,
    callAskLemurAPI,
  ]);

  const handleBack = () => {
    setError(null);
    if (currentStep === 'preview') {
      setCurrentStep('input');
    } else if (currentStep === 'input') {
      setCurrentStep('layout');
    } else if (currentStep === 'loading') {
      setCurrentStep('input');
    }
  };

  if (currentStep === 'loading') {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center space-y-4 p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-400"></div>
        <p className="text-sm text-gray-500">Generating AI Pane...</p>
        <button
          type="button"
          onClick={handleBack}
          className="mt-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (currentStep === 'preview' && generatedShell && generatedCopy) {
    return (
      <AiPanePreview
        shellJson={generatedShell}
        copyHtml={generatedCopy}
        layout={selectedLayout}
        ownerId={ownerId}
        onComplete={onComplete}
        onBack={handleBack}
      />
    );
  }

  if (currentStep === 'layout') {
    return (
      <div className="space-y-4 p-4">
        <label className="mb-2 block text-lg font-semibold text-gray-800">
          Choose a Layout
        </label>
        <div className="space-y-2">
          {layoutOptions.map((layout) => (
            <div key={layout} className="flex items-center space-x-2">
              <input
                type="radio"
                id={`layout-${layout}`}
                name="layoutOptions"
                value={layout}
                checked={selectedLayout === layout}
                onChange={(e) => setSelectedLayout(e.target.value)}
                className="h-4 w-4 border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <label
                htmlFor={`layout-${layout}`}
                className="text-sm font-medium text-gray-700"
              >
                {layout}
              </label>
            </div>
          ))}
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep('input')}
            className="rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === 'input') {
    return (
      <div className="space-y-6 p-4">
        <div>
          <label
            htmlFor="design-prompt"
            className="block text-lg font-semibold text-gray-800"
          >
            Describe the Design
          </label>
          <p className="mb-2 mt-1 text-sm text-gray-500">
            Example: "dark, minimalist hero", "bright, playful feature box"
          </p>
          <StringInput
            id="design-prompt"
            value={designPrompt}
            onChange={setDesignPrompt}
            placeholder="Enter design prompt..."
            className="block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-lg font-semibold text-gray-800">
            Provide Content
          </label>
          <div className="my-2 flex space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="copy-prompt-mode"
                name="copyModeOptions"
                value="prompt"
                checked={copyMode === 'prompt'}
                onChange={(e) => setCopyMode(e.target.value as CopyMode)}
                className="h-4 w-4 border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <label
                htmlFor="copy-prompt-mode"
                className="text-sm font-medium text-gray-700"
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
                onChange={(e) => setCopyMode(e.target.value as CopyMode)}
                className="h-4 w-4 border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <label
                htmlFor="copy-raw-mode"
                className="text-sm font-medium text-gray-700"
              >
                Provide Copy
              </label>
            </div>
          </div>

          {copyMode === 'prompt' ? (
            <>
              <p className="mb-2 text-sm text-gray-500">
                Let the AI write the copy based on your prompt.
              </p>
              <textarea
                id="copy-prompt"
                value={copyPrompt}
                onChange={(e) => setCopyPrompt(e.target.value)}
                placeholder="Enter copy prompt..."
                rows={4}
                className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
              />
            </>
          ) : (
            <>
              <p className="mb-2 text-sm text-gray-500">
                Provide your raw copy text here. The AI will structure and style
                it.
              </p>
              <textarea
                id="raw-copy"
                value={rawCopy}
                onChange={(e) => setRawCopy(e.target.value)}
                placeholder="Paste or type your copy text..."
                rows={6}
                className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
              />
            </>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={
              !designPrompt || (copyMode === 'prompt' ? !copyPrompt : !rawCopy)
            }
            className={`rounded-md border border-transparent px-4 py-2 text-sm font-bold text-white shadow-sm ${
              !designPrompt || (copyMode === 'prompt' ? !copyPrompt : !rawCopy)
                ? 'cursor-not-allowed bg-gray-400'
                : 'bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2'
            }`}
          >
            Generate Preview
          </button>
        </div>
      </div>
    );
  }

  return null;
}
