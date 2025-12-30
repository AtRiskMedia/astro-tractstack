import { useState } from 'react';
import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ArrowPathRoundedSquareIcon from '@heroicons/react/24/outline/ArrowPathRoundedSquareIcon';
import prompts from '@/constants/prompts.json';
import { htmlToHtmlAst } from '@/utils/compositor/htmlAst';
import type { TemplatePane } from '@/types/compositorTypes';
import { callAskLemurAPI } from '@/utils/compositor/aiGeneration';
import BooleanToggle from '@/components/form/BooleanToggle';
import { AiDesignStep, type AiDesignConfig } from './AiDesignStep';

interface AiCreativeDesignStepProps {
  onBack: () => void;
  onSuccess: () => void;
  onDirectInject: () => void;
  onCreatePane: (template: TemplatePane) => void;
  isSandboxMode?: boolean;
  initialTopic?: string;
  reStyle?: boolean;
}

export const AiCreativeDesignStep = ({
  onBack,
  onSuccess,
  onDirectInject,
  onCreatePane,
  isSandboxMode = false,
  initialTopic = '',
  reStyle = false,
}: AiCreativeDesignStepProps) => {
  const [topic, setTopic] = useState(initialTopic);
  const [designNotes, setDesignNotes] = useState('');
  const [showColors, setShowColors] = useState(false);
  const [aiDesignConfig, setAiDesignConfig] = useState<AiDesignConfig>({
    harmony: 'Analogous',
    baseColor: '',
    accentColor: '',
    theme: 'Light',
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customTemplate, setCustomTemplate] = useState(
    prompts.aiPaneCreativePrompt.user_template
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reviewMode, setReviewMode] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [pendingTemplate, setPendingTemplate] = useState<TemplatePane | null>(
    null
  );

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const systemPrompt = prompts.aiPaneCreativePrompt.system;
      let userPrompt = showAdvanced
        ? customTemplate
        : prompts.aiPaneCreativePrompt.user_template;

      let colorContext = '';
      if (showColors) {
        colorContext = `Generate a design using a **${aiDesignConfig.harmony.toLowerCase()}** color scheme with a **${aiDesignConfig.theme.toLowerCase()}** theme.`;
        if (aiDesignConfig.baseColor)
          colorContext += ` Base the colors around **${aiDesignConfig.baseColor}**.`;
        if (aiDesignConfig.accentColor)
          colorContext += ` Use **${aiDesignConfig.accentColor}** as an accent color.`;
      }

      const combinedNotes = [
        designNotes || 'Clean, modern, high contrast.',
        colorContext,
      ]
        .filter(Boolean)
        .join(' ');

      userPrompt = userPrompt.replace('{{TOPIC}}', topic);
      userPrompt = userPrompt.replace('{{DESIGN_NOTES}}', combinedNotes);

      // Use shared infrastructure utility
      const rawHtml = await callAskLemurAPI({
        prompt: userPrompt,
        context: systemPrompt,
        expectJson: false,
        isSandboxMode,
        maxTokens: 4000,
        temperature: 0.5,
      });

      const htmlAst = await htmlToHtmlAst(rawHtml, '');

      const template: TemplatePane = {
        id: '',
        nodeType: 'Pane',
        parentId: '',
        title: `Creative: ${topic.slice(0, 20)}`,
        slug: '',
        isDecorative: false,
        htmlAst,
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

      if (reStyle) {
        onCreatePane(template);
        onSuccess();
      } else {
        const goBackend =
          import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

        const tenantId =
          (window as any).TRACTSTACK_CONFIG?.tenantId ||
          import.meta.env.PUBLIC_TENANTID ||
          'default';

        const previewResponse = await fetch(
          `${goBackend}/api/v1/fragments/ast-preview`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Tenant-ID': tenantId,
            },
            body: JSON.stringify({
              id: 'preview-temp',
              title: 'Editor Preview',
              tree: htmlAst.tree,
            }),
          }
        );

        if (!previewResponse.ok) {
          throw new Error('Failed to generate preview HTML');
        }

        const htmlString = await previewResponse.text();

        setPendingTemplate(template);
        setPreviewHtml(htmlString);
        setReviewMode(true);
      }
    } catch (err: any) {
      console.error('Creative Generation Error:', err);
      setError(err.message || 'Failed to generate design.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    if (pendingTemplate) {
      onCreatePane(pendingTemplate);
      onSuccess();
    }
  };

  const handleCancel = () => {
    setReviewMode(false);
    setPendingTemplate(null);
    setPreviewHtml('');
    onBack();
  };

  const handleRedo = () => {
    setReviewMode(false);
    setPendingTemplate(null);
    setPreviewHtml('');
  };

  if (isGenerating) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-600"></div>
        <div className="text-center">
          <p className="font-bold text-gray-900">Generating Design...</p>
          <p className="mt-1 text-sm text-gray-500">
            This may take a few moments while AI codes your layout.
          </p>
        </div>
      </div>
    );
  }

  if (reviewMode && previewHtml) {
    return (
      <div className="relative flex h-full flex-col">
        <div className="absolute right-4 top-4 z-50 flex gap-2">
          <button
            onClick={handleCancel}
            className="rounded-full border border-gray-200 bg-white p-2 text-red-500 shadow-md transition-colors hover:bg-gray-100"
            title="Cancel"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
          <button
            onClick={handleRedo}
            className="rounded-full border border-gray-200 bg-white p-2 text-blue-500 shadow-md transition-colors hover:bg-gray-100"
            title="Redo with same params"
          >
            <ArrowPathRoundedSquareIcon className="h-6 w-6" />
          </button>
          <button
            onClick={handleAccept}
            className="rounded-full border border-green-600 bg-green-500 p-2 text-white shadow-md transition-colors hover:bg-green-600"
            title="Accept"
          >
            <CheckIcon className="h-6 w-6" />
          </button>
        </div>

        <style
          dangerouslySetInnerHTML={{
            __html: pendingTemplate?.htmlAst?.css || '',
          }}
        />
        <div
          className="w-full flex-1 overflow-y-auto rounded-md border bg-gray-50"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-pink-50">
          <SparklesIcon className="h-6 w-6 text-pink-600" aria-hidden="true" />
        </div>
        <h3 className="mt-2 text-lg font-bold text-gray-900">
          {reStyle ? 'Refine Creative Design' : 'Creative Design'}
        </h3>
        <p className="text-sm text-gray-500">
          {reStyle
            ? 'Modify the prompt below to iterate on the design.'
            : 'Describe what you want, and AI will code a unique HTML structure for you.'}
        </p>
      </div>

      {reStyle && <h2>WARNING: This will break links</h2>}

      <div className="space-y-4">
        {!showAdvanced && (
          <>
            <div>
              <label className="block text-sm font-bold text-gray-700">
                Topic / Content Brief
              </label>
              <textarea
                rows={6}
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-pink-500 focus:ring-pink-500"
                placeholder="e.g. A pricing table for a SaaS product..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700">
                Design Notes (Optional)
              </label>
              <textarea
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-pink-500 focus:ring-pink-500"
                placeholder="e.g. Dark mode, use rounded cards, neon accents..."
                value={designNotes}
                onChange={(e) => setDesignNotes(e.target.value)}
                disabled={isGenerating}
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
          </>
        )}

        <div className="my-4 flex items-center border-t border-gray-100 pt-4">
          <BooleanToggle
            label="Advanced: Edit Full Prompt"
            value={showAdvanced}
            onChange={setShowAdvanced}
            size="sm"
          />
        </div>

        {showAdvanced && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
            <label className="mb-2 block text-sm font-bold text-gray-800">
              Master Prompt Template
            </label>
            <p className="mb-3 text-xs text-gray-600">
              This is the raw scaffolding ruleset. Leave{' '}
              <code className="bg-gray-100 px-1 font-mono font-bold">
                {`{{TOPIC}}`}
              </code>{' '}
              and{' '}
              <code className="bg-gray-100 px-1 font-mono font-bold">
                {`{{DESIGN_NOTES}}`}
              </code>{' '}
              as-is; they will be replaced by your inputs (which are hidden
              while this mode is active).
            </p>
            <textarea
              rows={12}
              className="block w-full rounded-md border-gray-300 p-2 font-mono text-xs shadow-sm focus:border-pink-500 focus:ring-pink-500"
              value={customTemplate}
              onChange={(e) => setCustomTemplate(e.target.value)}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={onDirectInject}
          className="text-xs text-gray-400 underline hover:text-gray-600"
        >
          Want to write raw HTML yourself? Use Direct Inject.
        </button>
      </div>

      <div className="flex justify-between border-t border-gray-100 pt-4">
        <button
          onClick={onBack}
          disabled={isGenerating}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !topic.trim()}
          className="flex items-center gap-2 rounded-md bg-pink-600 px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-pink-700 disabled:bg-gray-400"
        >
          <SparklesIcon className="h-4 w-4" />
          {reStyle ? 'Re-Design' : 'Generate'}
        </button>
      </div>
    </div>
  );
};
