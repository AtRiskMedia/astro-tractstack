import type { MouseEvent, KeyboardEvent } from 'react';

interface TabIndicatorProps {
  onTab: () => void;
  parentNodeId?: string;
}

export default function TabIndicator({
  onTab,
  parentNodeId,
}: TabIndicatorProps) {
  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onTab();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onTab();
    }
  };

  return (
    <div
      className="animate-fadeIn mt-1.5 flex cursor-pointer items-center border-t border-dashed border-cyan-500 py-1 text-sm hover:bg-cyan-50/20"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label="Tab for a new paragraph"
      data-tab-indicator="true"
      data-parent-node={parentNodeId}
    >
      <svg
        className="mx-1 h-4 w-4 text-cyan-500"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
          clipRule="evenodd"
        />
      </svg>
      Tab for a new paragraph
    </div>
  );
}
