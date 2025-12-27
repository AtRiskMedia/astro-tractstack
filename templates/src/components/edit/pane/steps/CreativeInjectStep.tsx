import { useState } from 'react';
import { htmlToHtmlAst } from '@/utils/compositor/htmlAst';
import type { TemplatePane } from '@/types/compositorTypes';

interface CreativeInjectStepProps {
  onBack: () => void;
  onCreatePane: (template: TemplatePane) => void;
}

export const CreativeInjectStep = ({
  onBack,
  onCreatePane,
}: CreativeInjectStepProps) => {
  const [html, setHtml] = useState('');
  const [css, setCss] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    if (!html.trim()) {
      setError('HTML content is required.');
      return;
    }

    setIsCompiling(true);

    try {
      const htmlAst = await htmlToHtmlAst(html, css);

      const template: TemplatePane = {
        id: '',
        nodeType: 'Pane',
        parentId: '',
        title: 'Creative Pane',
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
    } catch (err: any) {
      console.error('Compiler Error:', err);
      setError(`Compilation failed: ${err.message}`);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="rounded-md bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>Creative Mode:</strong> Input raw HTML and CSS. Tailwind
          classes will be compiled and bucketed into an optimized structure.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="htmlInput"
            className="block text-sm font-bold text-gray-700"
          >
            HTML Structure
          </label>
          <textarea
            id="htmlInput"
            rows={15}
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            disabled={isCompiling}
            className="block w-full rounded-md border-gray-300 p-2 font-mono text-xs shadow-sm focus:border-cyan-500 focus:ring-cyan-500 disabled:bg-gray-100"
            placeholder={`<div class="p-8 bg-blue-500 hover:bg-blue-600">\n  <h1 class="text-white text-4xl">Hello</h1>\n</div>`}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="cssInput"
            className="block text-sm font-bold text-gray-700"
          >
            Custom CSS Styles
          </label>
          <textarea
            id="cssInput"
            rows={15}
            value={css}
            onChange={(e) => setCss(e.target.value)}
            disabled={isCompiling}
            className="block w-full rounded-md border-gray-300 p-2 font-mono text-xs shadow-sm focus:border-cyan-500 focus:ring-cyan-500 disabled:bg-gray-100"
            placeholder={`.my-class {\n  border: 1px solid red;\n}`}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-bold text-red-800">{error}</p>
        </div>
      )}

      <div className="flex justify-between border-t pt-4">
        <button
          onClick={onBack}
          disabled={isCompiling}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          onClick={handleCreate}
          disabled={isCompiling}
          className="flex items-center gap-2 rounded-md bg-cyan-600 px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50"
        >
          {isCompiling ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              Compiling...
            </>
          ) : (
            'Compile & Create'
          )}
        </button>
      </div>
    </div>
  );
};
