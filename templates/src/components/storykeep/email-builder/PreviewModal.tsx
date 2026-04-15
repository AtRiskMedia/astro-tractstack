import { useState, useEffect } from 'react';
import { emailHelpers, type EmailTemplate } from '@/utils/api/emailHelpers';

interface PreviewModalProps {
  template: EmailTemplate;
  onClose: () => void;
}

export default function PreviewModal({ template, onClose }: PreviewModalProps) {
  const [variables, setVariables] = useState<string[]>([]);
  const [mockData, setMockData] = useState<Record<string, string>>({});
  const [html, setHtml] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const rawString = JSON.stringify(template);
    const regex = /\{\{\.([a-zA-Z0-9_]+)\}\}/g;
    const found = new Set<string>();

    let match;
    while ((match = regex.exec(rawString)) !== null) {
      found.add(match[1]);
    }

    setVariables(Array.from(found));

    const initialData: Record<string, string> = {};
    found.forEach((v) => {
      initialData[v] = `[${v}]`;
    });
    setMockData(initialData);
  }, [template]);

  const handleGenerate = async () => {
    try {
      setError(null);
      const res = await emailHelpers.previewTemplate(template, mockData);
      setHtml(res.html);
      setSubject(res.subject);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Preview generation failed'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75 p-4 backdrop-blur-sm">
      <div className="flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-xl md:flex-row">
        <div className="w-full border-r border-gray-200 bg-gray-50 p-6 md:w-80">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Mock Data</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-900 md:hidden"
            >
              &times;
            </button>
          </div>

          {variables.length === 0 ? (
            <p className="text-sm text-gray-500">
              No template variables found.
            </p>
          ) : (
            <div className="space-y-4">
              {variables.map((v) => (
                <div key={v}>
                  <label className="mb-1 block text-xs font-bold text-gray-700">
                    {v}
                  </label>
                  <input
                    type="text"
                    value={mockData[v] || ''}
                    onChange={(e) =>
                      setMockData({ ...mockData, [v]: e.target.value })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleGenerate}
            className="mt-8 w-full rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500"
          >
            Generate Preview
          </button>

          {error && (
            <p className="mt-4 text-xs font-bold text-red-600">{error}</p>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-hidden bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-500">Subject</span>
              <span className="text-sm font-bold text-gray-900">
                {subject || 'Generate preview to view subject...'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="hidden text-gray-400 hover:text-gray-900 md:block"
            >
              &times; Close
            </button>
          </div>

          <div className="flex-1 bg-gray-100 p-8">
            <div className="mx-auto h-full w-full max-w-2xl overflow-hidden rounded bg-white shadow-lg">
              {html ? (
                <iframe
                  srcDoc={html}
                  className="h-full w-full border-0"
                  title="Email Preview"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-bold text-gray-400">
                  Awaiting preview generation...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
