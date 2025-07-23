import { useStore } from '@nanostores/react';
import { orphanAnalysisStore } from '@/stores/orphanAnalysis';
import type { FullContentMapItem } from '@/types/tractstack';

interface UsageCellProps {
  itemId: string;
  fullContentMap: FullContentMapItem[];
  usageType: 'storyFragments' | 'menus' | 'beliefs';
}

const UsageCell = ({ itemId, fullContentMap, usageType }: UsageCellProps) => {
  const orphanState = useStore(orphanAnalysisStore);

  // Force loading until we have actual data - no exceptions
  if (
    orphanState?.data?.status === `loading` ||
    !orphanState ||
    !orphanState.data ||
    !orphanState.data[usageType] ||
    orphanState.isLoading
  ) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="h-2 w-2 animate-pulse rounded-full bg-gray-400"
          style={{
            animationDuration: window.matchMedia(
              '(prefers-reduced-motion: reduce)'
            ).matches
              ? '2s'
              : '1s',
          }}
        />
      </div>
    );
  }

  const usage = orphanState.data[usageType][itemId] || [];

  if (usage.length === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-800">
        Unused
      </span>
    );
  }

  // Get titles for dependencies
  const usageDetails = usage.map((id) => {
    const dependentItem = fullContentMap.find((content) => content.id === id);
    return dependentItem
      ? `${dependentItem.title} (${dependentItem.type})`
      : `Unknown (${id})`;
  });

  return (
    <div className="group relative">
      <span className="inline-flex cursor-help items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800">
        {usage.length} dependent{usage.length !== 1 ? 's' : ''}
      </span>
      {/* Tooltip */}
      <div className="invisible absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg group-hover:visible">
        Dependencies: {usageDetails.slice(0, 3).join(', ')}
        {usageDetails.length > 3 && ` +${usageDetails.length - 3} more`}
        <div className="absolute left-1/2 top-full -translate-x-1/2 transform border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
};

export default UsageCell;
