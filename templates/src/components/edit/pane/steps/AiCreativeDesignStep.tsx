import { useState } from 'react';
import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import prompts from '@/constants/prompts.json';
import { htmlToHtmlAst } from '@/utils/compositor/htmlAst';
import type { TemplatePane } from '@/types/compositorTypes';
import { TractStackAPI } from '@/utils/api';
import { sandboxTokenStore } from '@/stores/storykeep';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const systemPrompt = prompts.aiPaneCreativePrompt.system;
      let userPrompt = prompts.aiPaneCreativePrompt.user_template;

      userPrompt = userPrompt.replace('[topic]', topic);
      userPrompt = userPrompt.replace(
        '[design_notes]',
        designNotes || 'Clean, modern, high contrast.'
      );

      const tenantId =
        (window as any).TRACTSTACK_CONFIG?.tenantId ||
        import.meta.env.PUBLIC_TENANTID ||
        'default';

      const requestBody = {
        prompt: userPrompt,
        input_text: systemPrompt,
        final_model: '',
        temperature: 0.7,
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
          const text = await response.text();
          throw new Error(`Sandbox API failed: ${text}`);
        }

        const json = await response.json();
        if (!json.success) {
          throw new Error(json.error || 'Sandbox generation failed');
        }
        resultData = json.data;
      } else {
        const api = new TractStackAPI(tenantId);
        const response = await api.post('/api/v1/aai/askLemur', requestBody);

        if (!response.success) {
          throw new Error(response.error || 'AI generation failed.');
        }
        resultData = response.data;
      }

      if (!resultData?.response) {
        throw new Error('Generation failed to return a response object.');
      }

      let rawHtml = resultData.response;

      if (typeof rawHtml === 'string') {
        if (rawHtml.startsWith('```json')) {
          rawHtml = rawHtml.slice(7, -3).trim();
        } else if (rawHtml.startsWith('```html')) {
          rawHtml = rawHtml.slice(7, -3).trim();
        }
      } else {
        throw new Error('Invalid response format from AI service.');
      }

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

      onCreatePane(template);
      onSuccess();
    } catch (err: any) {
      console.error('Creative Generation Error:', err);
      setError(err.message || 'Failed to generate design.');
    } finally {
      setIsGenerating(false);
    }
  };

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
        <div>
          <label className="block text-sm font-bold text-gray-700">
            Topic / Content Brief
          </label>
          <textarea
            rows={6}
            className="sm:text-sm mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-pink-500 focus:ring-pink-500"
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
            className="sm:text-sm mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            placeholder="e.g. Dark mode, use rounded cards, neon accents..."
            value={designNotes}
            onChange={(e) => setDesignNotes(e.target.value)}
            disabled={isGenerating}
          />
        </div>
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
          {isGenerating ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Generating...
            </>
          ) : (
            <>
              <SparklesIcon className="h-4 w-4" />
              {reStyle ? 'Re-Design' : 'Generate'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
