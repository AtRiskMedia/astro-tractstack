import { useState, useEffect } from 'react';
import { emailHelpers } from '@/utils/api/emailHelpers';
import EmailBuilder from '../email-builder/EmailBuilder';

export default function ShopifyDashboard_Emails() {
  const [templates, setTemplates] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<{
    category: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await emailHelpers.getTemplates();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  if (editingTemplate) {
    return (
      <EmailBuilder
        category={editingTemplate.category}
        templateName={editingTemplate.name}
        onClose={() => setEditingTemplate(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-cyan-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(templates).map(([category, names]) => (
        <div
          key={category}
          className="rounded-lg border border-gray-200 bg-white"
        >
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h3 className="text-sm font-bold capitalize text-gray-900">
              {category}
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {names.map((name) => (
              <li
                key={name}
                className="flex items-center justify-between px-4 py-4 md:px-6"
              >
                <div className="flex items-center">
                  <p className="truncate text-sm font-bold text-gray-900">
                    {name}.json
                  </p>
                </div>
                <div className="ml-4 flex flex-shrink-0">
                  <button
                    onClick={() => setEditingTemplate({ category, name })}
                    className="rounded-md bg-white font-bold text-cyan-600 hover:text-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                  >
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
