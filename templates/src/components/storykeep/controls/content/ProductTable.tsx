import { useState } from 'react';
import { Pagination } from '@ark-ui/react/pagination';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import ChevronLeftIcon from '@heroicons/react/24/outline/ChevronLeftIcon';
import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import type { ShopifyProduct } from '@/stores/shopify';
import type { ResourceNode } from '@/types/compositorTypes';

interface ProductTableProps {
  products: ShopifyProduct[];
  linkedResourceMap: Map<string, ResourceNode>;
  onRefresh: () => void;
  isRefreshing: boolean;
  onSelectProduct: (product: ShopifyProduct) => void;
  onLink: (product: ShopifyProduct) => void;
  onUnlink: (resourceId: string) => void;
}

const ITEMS_PER_PAGE = 10;

export default function ProductTable({
  products,
  linkedResourceMap,
  onRefresh,
  isRefreshing,
  onSelectProduct,
  onLink,
  onUnlink,
}: ProductTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredProducts = products.filter(
    (product) =>
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.handle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalResults = filteredProducts.length;
  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-700 focus:ring-cyan-700"
          />
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-bold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
          title="Refresh from Shopify"
        >
          <ArrowPathIcon
            className={`mr-1.5 h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          Sync
        </button>
      </div>

      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
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
            {paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    {products.length === 0
                      ? 'No products found in store'
                      : 'No products match your search'}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedProducts.map((product) => {
                const linkedResource = linkedResourceMap.get(product.id);
                const isLinked = !!linkedResource;

                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">
                        {product.title}
                      </div>
                      {isLinked && (
                        <span className="mt-1 inline-flex items-center rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700 ring-1 ring-inset ring-cyan-600/20">
                          Synced: {linkedResource.title}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {product.handle}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold">
                      <div className="flex items-center justify-end space-x-2">
                        {isLinked ? (
                          <button
                            onClick={() => onUnlink(linkedResource.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Unlink Resource"
                          >
                            <TrashIcon className="h-5 w-5" aria-hidden="true" />
                            <span className="sr-only">
                              Unlink {product.title}
                            </span>
                          </button>
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

      {totalPages > 1 && (
        <div className="flex justify-center pt-4">
          <Pagination.Root
            count={totalResults}
            pageSize={ITEMS_PER_PAGE}
            page={currentPage}
            onPageChange={(details) => handlePageChange(details.page)}
          >
            <Pagination.PrevTrigger className="mr-2 flex items-center gap-1 rounded px-3 py-2 text-sm font-bold text-mydarkgrey transition-colors hover:text-myblue disabled:opacity-50">
              <ChevronLeftIcon className="h-4 w-4" />
              Previous
            </Pagination.PrevTrigger>

            <div className="flex items-center gap-1">
              <Pagination.Context>
                {(pagination) =>
                  pagination.pages.map((page, index) =>
                    page.type === 'page' ? (
                      <Pagination.Item
                        key={index}
                        type="page"
                        value={page.value}
                        className={`rounded px-3 py-2 text-sm font-bold transition-colors ${
                          page.value === currentPage
                            ? 'bg-myblue text-white'
                            : 'text-mydarkgrey hover:text-myblue'
                        }`}
                      >
                        {page.value}
                      </Pagination.Item>
                    ) : (
                      <span
                        key={index}
                        className="px-2 text-sm text-mydarkgrey"
                      >
                        {page.type === 'ellipsis' ? '...' : ''}
                      </span>
                    )
                  )
                }
              </Pagination.Context>
            </div>

            <Pagination.NextTrigger className="ml-2 flex items-center gap-1 rounded px-3 py-2 text-sm font-bold text-mydarkgrey transition-colors hover:text-myblue disabled:opacity-50">
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </Pagination.NextTrigger>
          </Pagination.Root>
        </div>
      )}
    </div>
  );
}
