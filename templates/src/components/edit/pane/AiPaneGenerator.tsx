import { useState, useCallback } from 'react';
import { AiPanePreview } from './AiPanePreview';
import type { TemplatePane } from '@/types/compositorTypes';
import prompts from '@/constants/prompts.json';
import ColorPickerCombo from '@/components/fields/ColorPickerCombo';
import { parseAiPane } from '@/utils/compositor/aiPaneParser';
import { classNames } from '@/utils/helpers';
import type { BrandConfig } from '@/types/tractstack';

interface AiPaneGeneratorProps {
  ownerId: string;
  onComplete: (pane: TemplatePane) => void;
  onCancel: () => void;
  config?: BrandConfig;
}

type GenerationStep = 'input' | 'preview' | 'loading';
type CopyMode = 'prompt' | 'raw';

interface GenerationResponse {
  success: boolean;
  data?: {
    response: string | object;
  };
  error?: string;
}

const harmonyOptions = [
  'Analogous',
  'Monochromatic',
  'Complementary',
  'Triadic',
];
const themeOptions = ['Light', 'Dark', 'Bright', 'Muted', 'Pastel', 'Earthy'];

export function AiPaneGenerator({
  ownerId,
  onComplete,
  onCancel,
  config,
}: AiPaneGeneratorProps) {
  const [currentStep, setCurrentStep] = useState<GenerationStep>('input');
  const [selectedLayout] = useState<string>('Text Only');
  const [copyMode, setCopyMode] = useState<CopyMode>('prompt');
  const [copyPrompt, setCopyPrompt] = useState('');
  const [rawCopy, setRawCopy] = useState('');
  const [generatedShell, setGeneratedShell] = useState<string | null>(null);
  const [generatedCopy, setGeneratedCopy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedHarmony, setSelectedHarmony] = useState<string>(
    harmonyOptions[0]
  );
  const [baseColor, setBaseColor] = useState<string>('');
  const [accentColor, setAccentColor] = useState<string>('');
  const [selectedTheme, setSelectedTheme] = useState<string>(themeOptions[0]);
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  const [isInjectMode, setIsInjectMode] = useState(false);
  const [injectShell, setInjectShell] = useState('');
  const [injectCopy, setInjectCopy] = useState('');

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

      if (expectJson && typeof rawResponseData === 'object') {
        return JSON.stringify(rawResponseData);
      }

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
        return responseString;
      }

      throw new Error('Unexpected response format received from API.');
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    setError(null);
    setCurrentStep('loading');
    setGeneratedShell(null);
    setGeneratedCopy(null);

    let designInput = `Generate a design using a **${selectedHarmony.toLowerCase()}** color scheme with a **${selectedTheme.toLowerCase()}** theme.`;
    if (baseColor) {
      designInput += ` Base the colors around **${baseColor}**.`;
    }
    if (accentColor) {
      designInput += ` Use **${accentColor}** as an accent color.`;
    }
    if (additionalNotes) {
      designInput += ` Refine the design with these additional notes: "${additionalNotes}"`;
    }

    try {
      const shellPromptDetails = prompts.aiPaneShellPrompt;
      const copyPromptDetails = prompts.aiPaneCopyPrompt;

      if (
        !shellPromptDetails?.user_template ||
        !copyPromptDetails?.user_template
      ) {
        throw new Error('AI prompts not found or incomplete in prompts.json');
      }

      const formattedShellPrompt = shellPromptDetails.user_template
        .replace('{{DESIGN_INPUT}}', designInput)
        .replace('{{LAYOUT_TYPE}}', selectedLayout);

      const shellResult = await callAskLemurAPI(
        formattedShellPrompt,
        shellPromptDetails.system || '',
        true
      );
      setGeneratedShell(shellResult);

      const copyInputContent = copyMode === 'prompt' ? copyPrompt : rawCopy;
      const formattedCopyPrompt = copyPromptDetails.user_template
        .replace('{{COPY_INPUT}}', copyInputContent)
        .replace('{{DESIGN_INPUT}}', designInput)
        .replace('{{LAYOUT_TYPE}}', selectedLayout)
        .replace('{{SHELL_JSON}}', shellResult);

      const copyResult = await callAskLemurAPI(
        formattedCopyPrompt,
        copyPromptDetails.system || '',
        false
      );
      setGeneratedCopy(copyResult);

      setCurrentStep('preview');
    } catch (err: any) {
      console.error('AI Pane Generation Error:', err);
      setError(err.message || 'Failed to generate AI pane.');
      setCurrentStep('input');
    }
  }, [
    selectedHarmony,
    baseColor,
    accentColor,
    selectedTheme,
    additionalNotes,
    selectedLayout,
    copyMode,
    copyPrompt,
    rawCopy,
    callAskLemurAPI,
  ]);

  const handleInject = useCallback(() => {
    setError(null);
    if (!injectShell || !injectCopy) {
      setError('Both Shell JSON and Copy HTML must be provided.');
      return;
    }
    try {
      const shellResponse = JSON.parse(injectShell);
      const copyResponse = JSON.parse(injectCopy);

      const shellPayloadString = JSON.stringify(shellResponse?.data?.response);
      const copyPayloadString = copyResponse?.data?.response;

      if (
        !shellPayloadString ||
        shellPayloadString === 'null' ||
        typeof copyPayloadString !== 'string'
      ) {
        throw new Error(
          'Payloads are in an unexpected format. Could not find "data.response".'
        );
      }

      const pane = parseAiPane(
        shellPayloadString,
        copyPayloadString,
        selectedLayout
      );
      onComplete(pane);
    } catch (err: any) {
      console.error('Payload Injection Error:', err);
      setError(err.message || 'Failed to parse payloads. Check JSON format.');
    }
  }, [injectShell, injectCopy, selectedLayout, onComplete]);

  const handleBack = () => {
    setError(null);
    if (currentStep === 'preview') {
      setCurrentStep('input');
    } else if (currentStep === 'input') {
      if (isInjectMode) {
        setIsInjectMode(false);
      } else {
        onCancel();
      }
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

  if (currentStep === 'input') {
    if (isInjectMode) {
      return (
        <div className="space-y-6 p-4">
          <div>
            <label
              htmlFor="shell-json"
              className="block text-lg font-semibold text-gray-800"
            >
              Shell JSON Payload
            </label>
            <textarea
              id="shell-json"
              value={injectShell}
              onChange={(e) => setInjectShell(e.target.value)}
              placeholder="Paste raw API response for ShellJson here..."
              rows={8}
              className="mt-2 block w-full rounded-md border-gray-300 p-2 font-mono text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label
              htmlFor="copy-html"
              className="block text-lg font-semibold text-gray-800"
            >
              Copy HTML Payload
            </label>
            <textarea
              id="copy-html"
              value={injectCopy}
              onChange={(e) => setInjectCopy(e.target.value)}
              placeholder="Paste raw API response for copyHtml here..."
              rows={8}
              className="mt-2 block w-full rounded-md border-gray-300 p-2 font-mono text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
            >
              Back to Generator
            </button>
            <button
              type="button"
              onClick={handleInject}
              disabled={!injectShell || !injectCopy}
              className={`rounded-md border border-transparent px-4 py-2 text-sm font-bold text-white shadow-sm ${
                !injectShell || !injectCopy
                  ? 'cursor-not-allowed bg-gray-400'
                  : 'bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2'
              }`}
            >
              Create from Payloads
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 p-4">
        <div>
          <label className="block text-lg font-semibold text-gray-800">
            Color Harmony
          </label>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {harmonyOptions.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`harmony-${option}`}
                  name="harmonyOptions"
                  value={option}
                  checked={selectedHarmony === option}
                  onChange={(e) => setSelectedHarmony(e.target.value)}
                  className="h-4 w-4 border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <label
                  htmlFor={`harmony-${option}`}
                  className="text-sm font-medium text-gray-700"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <ColorPickerCombo
              title="Base Color (Optional)"
              config={config!}
              defaultColor={baseColor}
              onColorChange={setBaseColor}
              allowNull={true}
            />
          </div>
          <div>
            <ColorPickerCombo
              title="Accent Color (Optional)"
              config={config!}
              defaultColor={accentColor}
              onColorChange={setAccentColor}
              allowNull={true}
            />
          </div>
        </div>

        <div>
          <label className="block text-lg font-semibold text-gray-800">
            Theme / Mood
          </label>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {themeOptions.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`theme-${option}`}
                  name="themeOptions"
                  value={option}
                  checked={selectedTheme === option}
                  onChange={(e) => setSelectedTheme(e.target.value)}
                  className="h-4 w-4 border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <label
                  htmlFor={`theme-${option}`}
                  className="text-sm font-medium text-gray-700"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="additional-notes"
            className="block text-lg font-semibold text-gray-800"
          >
            Additional Design Notes (Optional)
          </label>
          <p className="mb-2 mt-1 text-sm text-gray-500">
            Add specific requests like "use rounded corners", "add subtle
            texture".
          </p>
          <textarea
            id="additional-notes"
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Enter additional notes..."
            rows={3}
            className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
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
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={copyMode === 'prompt' ? !copyPrompt : !rawCopy}
            className={classNames(
              `rounded-md border border-transparent px-4 py-2 text-sm font-bold shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2`,
              (copyMode === 'prompt' && !copyPrompt) ||
                (copyMode === `raw` && !rawCopy)
                ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                : 'bg-cyan-600 text-white hover:bg-cyan-700'
            )}
          >
            Generate Pane
          </button>
        </div>

        <div className="border-t border-gray-200 pt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsInjectMode(true);
            }}
            className="text-sm text-cyan-600 hover:text-cyan-800 hover:underline"
          >
            Direct Inject Payload
          </button>
        </div>
      </div>
    );
  }

  return null;
}
