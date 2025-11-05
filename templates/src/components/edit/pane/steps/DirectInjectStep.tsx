import { useState } from 'react';
import { parseAiPane } from '@/utils/compositor/aiPaneParser';
import type { TemplatePane } from '@/types/compositorTypes';

interface DirectInjectStepProps {
  onBack: () => void;
  onCreatePane: (template: TemplatePane) => void;
}

export const DirectInjectStep = ({
  onBack,
  onCreatePane,
}: DirectInjectStepProps) => {
  const [shellJson, setShellJson] = useState('');
  const [copyHtml, setCopyHtml] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    setError(null);
    if (!shellJson.trim() || !copyHtml.trim()) {
      setError('Both Shell JSON and Inner HTML must be provided.');
      return;
    }

    try {
      const finalPane = parseAiPane(shellJson, copyHtml, 'DirectInject');
      onCreatePane(finalPane);
    } catch (err: any) {
      console.error('Direct Inject Error:', err);
      setError(
        `Failed to parse inputs: ${err.message || 'Unknown error'}. Check console.`
      );
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-4">
        <div>
          <label
            htmlFor="shellJson"
            className="block text-sm font-bold text-gray-700"
          >
            Shell JSON
          </label>
          <textarea
            id="shellJson"
            rows={10}
            value={shellJson}
            onChange={(e) => setShellJson(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 p-2 font-mono text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
            placeholder={`{ "bgColour": "#ffffff", "parentClasses": [...], "defaultClasses": {...} }`}
          />
        </div>
        <div>
          <label
            htmlFor="copyHtml"
            className="block text-sm font-bold text-gray-700"
          >
            Inner HTML
          </label>
          <textarea
            id="copyHtml"
            rows={10}
            value={copyHtml}
            onChange={(e) => setCopyHtml(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 p-2 font-mono text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
            placeholder={`<h2 class="...">...</h2>\n<p class="...">...</p>`}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-bold text-red-800">{error}</p>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          ← Back
        </button>
        <button
          onClick={handleCreate}
          disabled={!shellJson.trim() || !copyHtml.trim()}
          className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          Create Pane
        </button>
      </div>
    </div>
  );
};
