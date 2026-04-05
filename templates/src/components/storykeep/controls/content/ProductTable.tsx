import { useState, useRef, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import ChevronLeftIcon from '@heroicons/react/24/outline/ChevronLeftIcon';
import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import PencilIcon from '@heroicons/react/24/outline/PencilIcon';
import {
  shopifyData,
  shopifyStatus,
  fetchShopifyProducts,
  clearShopifySearch,
  type ShopifyProduct,
} from '@/stores/shopify';
import type { ResourceNode } from '@/types/compositorTypes';

interface ProductTableProps {
  products: ShopifyProduct[];
  linkedResourceMap: Map<string, ResourceNode>;
  onRefresh: () => void;
  isRefreshing: boolean;
  onSelectProduct: (product: ShopifyProduct) => void;
  onLink: (product: ShopifyProduct) => void;
  onUnlink: (resourceId: string) => void;
  onEdit: (product: ShopifyProduct, resource: ResourceNode) => void;
}

export default function ProductTable({
  products,
  linkedResourceMap,
  onSelectProduct,
  onLink,
  onUnlink,
  onEdit,
}: ProductTableProps) {
  const data = useStore(shopifyData);
  const status = useStore(shopifyStatus);

  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDebouncing, setIsDebouncing] = useState(false);

  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setIsDebouncing(true);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (val.length === 0) {
      setIsDebouncing(false);
      setSearchTerm('');
      setCursorStack([]);
      setCurrentCursor(null);
      clearShopifySearch();
      return;
    }

    debounceTimer.current = setTimeout(() => {
      setIsDebouncing(false);
      setSearchTerm(val);
      setCursorStack([]);
      setCurrentCursor(null);

      if (val.length >= 3) {
        fetchShopifyProducts(val, null);
      } else {
        clearShopifySearch();
      }
    }, 1000);
  };

  const handleRefreshSearch = () => {
    if (searchTerm.length >= 3) {
      fetchShopifyProducts(searchTerm, currentCursor);
    }
  };

  const handleNext = () => {
    if (data.pageInfo?.hasNextPage && data.pageInfo?.endCursor) {
      const nextCursor = data.pageInfo.endCursor;
      setCursorStack((prev) => [...prev, currentCursor || '']);
      setCurrentCursor(nextCursor);
      fetchShopifyProducts(searchTerm, nextCursor);
    }
  };

  const handlePrev = () => {
    if (cursorStack.length > 0) {
      const newStack = [...cursorStack];
      const prevCursor = newStack.pop() || null;
      setCursorStack(newStack);
      setCurrentCursor(prevCursor || null);
      fetchShopifyProducts(searchTerm, prevCursor || null);
    }
  };

  const isLoading = status.isLoading || isDebouncing;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search products..."
              value={inputValue}
              onChange={handleSearchChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-700 focus:ring-cyan-700"
            />
          </div>
          <button
            onClick={handleRefreshSearch}
            disabled={isLoading || searchTerm.length < 3}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-bold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
            title="Refresh current search"
          >
            <ArrowPathIcon
              className={`mr-1.5 h-5 w-5 ${isLoading ? 'animate-spin' : ''}`}
            />
            Sync
          </button>
        </div>
        <p className="text-xs text-gray-500">Search by product title.</p>
      </div>

      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                Handle
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {status.error ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center">
                  <div className="font-bold text-red-600">{status.error}</div>
                  <div className="mt-1 text-sm text-red-500">
                    Please check your Shopify integration settings or API token.
                  </div>
                </td>
              </tr>
            ) : isLoading ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-cyan-600"></div>
                  <p className="mt-2 text-sm text-gray-500">
                    Searching Shopify...
                  </p>
                </td>
              </tr>
            ) : inputValue.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  Search to discover products.
                </td>
              </tr>
            ) : inputValue.length < 3 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  Please enter at least 3 characters to search.
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No products match your search.
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const linkedResource = linkedResourceMap.get(product.id);
                const isLinked = !!linkedResource;

                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div
                        className="max-w-xs truncate font-bold text-gray-900"
                        title={product.title}
                      >
                        {product.title}
                      </div>
                      {isLinked && (
                        <span
                          className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${
                            linkedResource.categorySlug === 'service'
                              ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/20'
                              : 'bg-cyan-50 text-cyan-700 ring-cyan-600/20'
                          }`}
                        >
                          Synced:{' '}
                          <span
                            className="max-w-xs truncate"
                            title={linkedResource.title}
                          >
                            {linkedResource.title}
                          </span>
                        </span>
                      )}
                    </td>
                    <td
                      className="max-w-xs truncate whitespace-nowrap px-6 py-4 text-sm text-gray-500"
                      title={product.handle}
                    >
                      {product.handle}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold">
                      <div className="flex items-center justify-end space-x-2">
                        {isLinked ? (
                          <>
                            <button
                              onClick={() => onEdit(product, linkedResource)}
                              className="text-cyan-600 hover:text-cyan-900"
                              title="Edit Resource"
                            >
                              <PencilIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                              <span className="sr-only">
                                Edit {product.title}
                              </span>
                            </button>
                            <button
                              onClick={() => onUnlink(linkedResource.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Unlink Resource"
                            >
                              <TrashIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                              <span className="sr-only">
                                Unlink {product.title}
                              </span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => onLink(product)}
                            className="text-cyan-600 hover:text-cyan-900"
                            title="Create Resource"
                          >
                            <PlusIcon className="h-5 w-5" aria-hidden="true" />
                            <span className="sr-only">
                              Link {product.title}
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() => onSelectProduct(product)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <MagnifyingGlassIcon
                            className="h-5 w-5"
                            aria-hidden="true"
                          />
                          <span className="sr-only">
                            Inspect {product.title}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {(cursorStack.length > 0 || data.pageInfo?.hasNextPage) &&
        !isLoading &&
        inputValue.length >= 3 &&
        products.length > 0 && (
          <div className="flex items-center justify-center space-x-4 pt-4">
            <button
              onClick={handlePrev}
              disabled={cursorStack.length === 0}
              className="flex items-center gap-1 rounded px-3 py-2 text-sm font-bold text-gray-700 transition-colors hover:text-cyan-600 disabled:opacity-30 disabled:hover:text-gray-700"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Previous
            </button>

            <button
              onClick={handleNext}
              disabled={!data.pageInfo?.hasNextPage}
              className="flex items-center gap-1 rounded px-3 py-2 text-sm font-bold text-gray-700 transition-colors hover:text-cyan-600 disabled:opacity-30 disabled:hover:text-gray-700"
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}
    </div>
  );
}
