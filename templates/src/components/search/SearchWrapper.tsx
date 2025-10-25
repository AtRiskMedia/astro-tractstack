import { useState, useEffect } from 'react';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import { initSearch } from '@/utils/customHelpers';
import SearchModal from './SearchModal';
import type { FullContentMapItem } from '@/types/tractstack';

interface SearchWrapperProps {
  contentMap: FullContentMapItem[];
}

export default function SearchWrapper({ contentMap }: SearchWrapperProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearchOpen = () => {
    setIsSearchOpen(true);
  };

  const handleSearchClose = () => {
    setIsSearchOpen(false);
  };

  useEffect(() => {
    initSearch();
  }, []);

  return (
    <>
      <button
        onClick={handleSearchOpen}
        className="text-myblue/80 hover:text-myblue hover:rotate-6"
        title="Search content"
        aria-label="Search content"
      >
        <MagnifyingGlassIcon className="h-6 w-6" />
      </button>

      {isSearchOpen && (
        <SearchModal
          isOpen={isSearchOpen}
          onClose={handleSearchClose}
          contentMap={contentMap}
        />
      )}
    </>
  );
}
