import { useState, useMemo } from 'react';
import type { FullContentMapItem } from '../../../types/tractstack';

interface ActionBuilderSlugSelectorProps {
  type: 'storyFragment' | 'context' | 'pane';
  value: string;
  onSelect: (value: string) => void;
  label: string;
  contentMap: FullContentMapItem[];
  parentSlug?: string;
}

export default function ActionBuilderSlugSelector({
  type,
  value,
  onSelect,
  label,
  contentMap,
  parentSlug,
}: ActionBuilderSlugSelectorProps) {
  const [query, setQuery] = useState('');

  // Filter items based on type and query
  const filteredItems = useMemo(() => {
    let items: FullContentMapItem[] = [];

    switch (type) {
      case 'storyFragment':
        items = contentMap.filter((item) => item.type === 'StoryFragment');
        break;
      case 'context':
        items = contentMap.filter(
          (item) =>
            item.type === 'Pane' && 'isContext' in item && item.isContext
        );
        break;
      case 'pane':
        if (parentSlug) {
          const parentFragment = contentMap.find(
            (item) => item.type === 'StoryFragment' && item.slug === parentSlug
          ) as (FullContentMapItem & { panes?: string[] }) | undefined;

          if (parentFragment?.panes) {
            items = contentMap.filter(
              (item) =>
                item.type === 'Pane' &&
                'isContext' in item &&
                !item.isContext &&
                parentFragment.panes?.includes(item.id)
            );
          }
        }
        break;
    }

    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.slug.toLowerCase().includes(query.toLowerCase())
    );
  }, [contentMap, type, query, parentSlug]);

  const selectedItem = useMemo(() => {
    return contentMap.find((item) => item.slug === value);
  }, [contentMap, value]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-700">{label}</label>

      {/* Search Input */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-700 focus:ring-cyan-700"
      />

      {/* Selected Item Display */}
      {selectedItem && (
        <div className="rounded-md bg-cyan-50 p-2 text-sm">
          <strong>Selected:</strong> {selectedItem.title} ({selectedItem.slug})
        </div>
      )}

      {/* Results List */}
      <div className="max-h-60 overflow-y-auto rounded-md border border-gray-300">
        {filteredItems.length === 0 ? (
          <div className="p-3 text-center text-gray-500">
            {query ? 'No matching items found' : 'No items available'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.slug);
                  setQuery(`${item.title} (${item.slug})`);
                }}
                className={`w-full p-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
                  value === item.slug ? 'bg-cyan-50' : ''
                }`}
              >
                <div className="font-medium text-gray-900">{item.title}</div>
                <div className="text-sm text-gray-500">{item.slug}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
