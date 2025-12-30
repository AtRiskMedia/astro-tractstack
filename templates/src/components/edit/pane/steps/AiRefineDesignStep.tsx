import { useState } from 'react';
import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ArrowPathRoundedSquareIcon from '@heroicons/react/24/outline/ArrowPathRoundedSquareIcon';
import prompts from '@/constants/prompts.json';
import { htmlToHtmlAst } from '@/utils/compositor/htmlAst';
import { callAskLemurAPI } from '@/utils/compositor/aiGeneration';
import type { TemplatePane } from '@/types/compositorTypes';

interface AiRefineDesignStepProps {
  onBack: () => void;
  onSuccess: () => void;
  onUpdatePane: (template: TemplatePane) => void;
  isSandboxMode?: boolean;
  initialHtml: string;
  initialCss: string;
}

export const AiRefineDesignStep = ({
  onBack,
  onSuccess,
  onUpdatePane,
  isSandboxMode = false,
  initialHtml,
  initialCss,
}: AiRefineDesignStepProps) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a refinement request.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const promptConfig = prompts.aiPaneCreativeRefinePrompt;
      const systemPrompt = promptConfig.system;
      let userPrompt = promptConfig.user_template;

      userPrompt = userPrompt.replace('{{DESIGN_NOTES}}', prompt);
      userPrompt = userPrompt.replace('{{CSS_INPUT}}', initialCss);
      userPrompt = userPrompt.replace('{{HTML_INPUT}}', initialHtml);

      const resultHtml = await callAskLemurAPI({
        prompt: userPrompt,
        context: systemPrompt,
        expectJson: false,
        isSandboxMode,
        maxTokens: 4000,
        temperature: 0.5,
      });

      setPreviewHtml(resultHtml);
      setReviewMode(true);
    } catch (err: any) {
      console.error('Refine Generation Error:', err);
      setError(err.message || 'Failed to refine design.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = async () => {
    try {
      setIsGenerating(true);
      const htmlAst = await htmlToHtmlAst(previewHtml, '');

      const template: TemplatePane = {
        id: '',
        nodeType: 'Pane',
        parentId: '',
        title: 'Refined Pane',
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

      onUpdatePane(template);
      onSuccess();
    } catch (err: any) {
      console.error('AST Compilation Error:', err);
      setError('Failed to compile the new design.');
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    setReviewMode(false);
    setPreviewHtml('');
    onBack();
  };

  const handleRedo = () => {
    setReviewMode(false);
    setPreviewHtml('');
  };

  if (isGenerating) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center space-y-4 p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-600"></div>
        <div className="text-center">
          <p className="font-bold text-gray-900">
            {reviewMode ? 'Compiling Design...' : 'Refining Design...'}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            AI is refactoring your component.
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
            title="Redo with same prompt"
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

        <div
          className="w-full flex-1 overflow-y-auto rounded-md border bg-gray-50 p-4"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-50">
          <SparklesIcon
            className="h-6 w-6 text-purple-600"
            aria-hidden="true"
          />
        </div>
        <h3 className="mt-2 text-lg font-bold text-gray-900">Refine Design</h3>
        <p className="text-sm text-gray-500">
          Modify the existing design using AI instructions.
        </p>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700">
          Refinement Instructions
        </label>
        <textarea
          rows={6}
          className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
          placeholder="e.g. Change the background to dark blue, make the title larger, and switch the button color to yellow."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

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
          disabled={isGenerating || !prompt.trim()}
          className="flex items-center gap-2 rounded-md bg-purple-600 px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-purple-700 disabled:bg-gray-400"
        >
          <SparklesIcon className="h-4 w-4" />
          Refine
        </button>
      </div>
    </div>
  );
};
