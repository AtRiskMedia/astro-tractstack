import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ClipboardDocumentIcon from '@heroicons/react/24/outline/ClipboardDocumentIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import {
  shopifyData,
  shopifyStatus,
  fetchShopifyProducts,
  type ShopifyProduct,
} from '@/stores/shopify';
import ProductTable from './controls/content/ProductTable';
import ResourceForm from './controls/content/ResourceForm';
import { saveBrandConfigWithStateUpdate } from '@/utils/api/brandConfig';
import {
  deleteResource,
  getResourcesByCategory,
} from '@/utils/api/resourceConfig';
import { convertToLocalState } from '@/utils/api/brandHelpers';
import BooleanToggle from '@/components/form/BooleanToggle';
import type { BrandConfig, BrandConfigState } from '@/types/tractstack';
import type { ResourceNode } from '@/types/compositorTypes';
import type { ResourceConfig } from '@/types/tractstack';

interface DashboardShopifyProps {
  brandConfig: BrandConfig;
  existingResources: ResourceNode[];
}

type MachineState = 'INIT' | 'CONFIG' | 'UPDATE' | 'READY';

export default function StoryKeepDashboard_Shopify({
  brandConfig,
  existingResources,
}: DashboardShopifyProps) {
  const data = useStore(shopifyData);
  const status = useStore(shopifyStatus);
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  // Local Resource State (allows optimistic updates/refreshes without full page reload)
  const [resources, setResources] = useState<ResourceNode[]>(existingResources);

  // Sync Logic
  const [draftResource, setDraftResource] =
    useState<Partial<ResourceConfig> | null>(null);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [targetProduct, setTargetProduct] = useState<ShopifyProduct | null>(
    null
  );
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  // State Machine
  const [machineState, setMachineState] = useState<MachineState>('INIT');
  const [internalBrandConfig, setInternalBrandConfig] =
    useState<BrandConfigState | null>(null);

  // Config State (User Decisions)
  const [wantProduct, setWantProduct] = useState(true);
  const [wantService, setWantService] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize state based on prop
  useEffect(() => {
    if (brandConfig) {
      const localState = convertToLocalState(brandConfig);
      setInternalBrandConfig(localState);

      const hasProduct = !!localState.knownResources['product'];
      if (hasProduct) {
        setMachineState('READY');
      } else {
        setMachineState('CONFIG');
      }
    }
  }, [brandConfig]);

  // Operational Effect: Fetch products only when READY
  useEffect(() => {
    if (machineState === 'READY') {
      fetchShopifyProducts();
    }
  }, [machineState]);

  // Memoize the lookup map for performance (gid -> ResourceNode)
  const linkedResourceMap = useMemo(() => {
    const map = new Map<string, ResourceNode>();
    resources.forEach((r) => {
      if (r.optionsPayload?.gid) {
        map.set(r.optionsPayload.gid, r);
      }
    });
    return map;
  }, [resources]);

  const handleRefresh = () => {
    fetchShopifyProducts();
  };

  const refreshResources = async () => {
    const tenantId = window.TRACTSTACK_CONFIG?.tenantId || 'default';
    try {
      // Fetch both categories if configured, then merge unique
      const promises = [];
      if (internalBrandConfig?.knownResources['product']) {
        promises.push(getResourcesByCategory(tenantId, 'product'));
      }
      if (internalBrandConfig?.knownResources['service']) {
        promises.push(getResourcesByCategory(tenantId, 'service'));
      }

      const results = await Promise.all(promises);
      const flattened = results.flat() as ResourceNode[];

      // We only strictly need to update the relevant categories in our local state,
      // but simplistic replacement works if we only show these types here.
      // For robustness, let's merge into existingResources to preserve other types if they exist.
      setResources((prev) => {
        const otherTypes = prev.filter(
          (r) => r.categorySlug !== 'product' && r.categorySlug !== 'service'
        );
        return [...otherTypes, ...flattened];
      });
    } catch (e) {
      console.error('Failed to refresh resources', e);
    }
  };

  const handleLink = (product: ShopifyProduct) => {
    const hasProductSchema = !!internalBrandConfig?.knownResources['product'];
    const hasServiceSchema = !!internalBrandConfig?.knownResources['service'];

    if (hasProductSchema && hasServiceSchema) {
      setTargetProduct(product);
      setShowTypeSelector(true);
    } else if (hasServiceSchema) {
      startCreateFlow('service', product);
    } else {
      startCreateFlow('product', product);
    }
  };

  const startCreateFlow = (category: string, product: ShopifyProduct) => {
    // Construct the schema-compliant options payload manually.
    // ResourceForm ignores default values if data is passed, so we must merge them here.
    const schema = internalBrandConfig?.knownResources[category] || {};
    const mergedOptions: Record<string, any> = {
      gid: product.id,
      shopifyData: JSON.stringify(product),
    };

    // Apply schema defaults for missing fields
    Object.entries(schema).forEach(([key, def]) => {
      if (mergedOptions[key] === undefined) {
        if (def.type === 'number') {
          mergedOptions[key] = def.defaultValue ?? def.minNumber ?? 0;
        } else if (def.type === 'boolean') {
          mergedOptions[key] = def.defaultValue ?? false;
        } else if (def.type === 'string') {
          mergedOptions[key] = def.defaultValue ?? '';
        } else if (def.type === 'multi') {
          mergedOptions[key] = def.defaultValue ?? [];
        }
      }
    });

    setDraftResource({
      title: product.title,
      oneliner: product.description || '',
      slug: `${category}-${product.handle}`.toLowerCase(),
      categorySlug: category,
      optionsPayload: mergedOptions,
    });

    setShowTypeSelector(false);
    setShowResourceModal(true);
  };

  const handleUnlink = async (resourceId: string) => {
    if (
      !confirm(
        'Are you sure you want to unlink this resource? Content on your site relying on this link may break.'
      )
    ) {
      return;
    }

    try {
      await deleteResource(
        window.TRACTSTACK_CONFIG?.tenantId || 'default',
        resourceId
      );
      // Optimistic update
      setResources((prev) => prev.filter((r) => r.id !== resourceId));
    } catch (error) {
      console.error('Unlink failed', error);
      alert('Failed to delete resource');
    }
  };

  const handleCopy = () => {
    if (selectedProduct) {
      navigator.clipboard.writeText(JSON.stringify(selectedProduct, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfigContinue = async () => {
    if (!internalBrandConfig) return;
    setIsSaving(true);
    setMachineState('UPDATE');

    try {
      const updatedKnownResources = { ...internalBrandConfig.knownResources };

      // 1. Product Schema
      if (wantProduct) {
        updatedKnownResources['product'] = {
          gid: { type: 'string', optional: false },
          allowMultiple: { type: 'boolean', optional: false },
          shopifyData: { type: 'string', optional: false },
          ...(wantService
            ? {
                serviceBound: {
                  type: 'string',
                  optional: true,
                  belongsToCategory: 'service',
                },
              }
            : {}),
        };
      }

      // 2. Service Schema
      if (wantService) {
        updatedKnownResources['service'] = {
          gid: { type: 'string', optional: true },
          shopifyData: { type: 'string', optional: true },
          bookingLengthMinutes: {
            type: 'number',
            optional: false,
            minNumber: 15,
            maxNumber: 120,
          },
        };
      }

      const updatedState = {
        ...internalBrandConfig,
        knownResources: updatedKnownResources,
      };

      const freshConfig = await saveBrandConfigWithStateUpdate(
        window.TRACTSTACK_CONFIG?.tenantId || 'default',
        updatedState
      );

      setInternalBrandConfig(freshConfig);
      setMachineState('READY');
    } catch (error) {
      console.error('Failed to configure Shopify resources:', error);
      setMachineState('CONFIG');
    } finally {
      setIsSaving(false);
    }
  };

  if (machineState === 'INIT') {
    return null;
  }

  // CONFIG State
  if (machineState === 'CONFIG' || machineState === 'UPDATE') {
    return (
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-xl font-bold text-gray-900">Shopify Setup</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure how your store interacts with StoryKeep content.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-blue-400">ℹ️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-bold text-blue-800">
                  Resource Configuration
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    We need to create content definitions for your store. Select
                    the types of content you plan to manage.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <BooleanToggle
              label="Enable Products"
              description="Creates a 'product' resource type to map Shopify items."
              value={wantProduct}
              onChange={setWantProduct}
              disabled={isSaving}
            />

            <BooleanToggle
              label="Enable Services"
              description="Creates a 'service' resource type for bookings and appointments."
              value={wantService}
              onChange={setWantService}
              disabled={isSaving}
            />
          </div>

          <div className="pt-4">
            <button
              onClick={handleConfigContinue}
              disabled={(!wantProduct && !wantService) || isSaving}
              className="inline-flex items-center rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSaving ? 'Configuring...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // READY State
  return (
    <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-900">Shopify Integration</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your connected Shopify store.
        </p>
      </div>

      {status.error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-bold text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{status.error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {status.isLoading && data.products.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-cyan-600"></div>
            <p className="mt-2 text-sm text-gray-500">
              Loading products from Shopify...
            </p>
          </div>
        </div>
      ) : (
        <ProductTable
          products={data.products}
          linkedResourceMap={linkedResourceMap}
          onRefresh={handleRefresh}
          isRefreshing={status.isLoading}
          onSelectProduct={setSelectedProduct}
          onLink={handleLink}
          onUnlink={handleUnlink}
        />
      )}

      {/* Product Inspector Modal */}
      {selectedProduct && (
        <div className="relative z-50" aria-modal="true">
          <div className="fixed inset-0 bg-black bg-opacity-75" />
          <div className="fixed inset-0 flex items-end justify-center p-4 md:items-center">
            <div
              className="flex w-full flex-col overflow-hidden rounded-lg bg-white shadow-xl md:max-w-4xl"
              style={{ maxHeight: '90vh' }}
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedProduct.title}
                </h3>
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={() => setSelectedProduct(null)}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                <div className="mb-4">
                  <h4 className="mb-2 text-sm font-bold text-gray-900">
                    Product Details
                  </h4>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
                    <div className="md:col-span-1">
                      <dt className="text-sm font-bold text-gray-500">
                        Handle
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {selectedProduct.handle}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-900">
                      Raw API Data
                    </h4>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-800"
                    >
                      {copied ? (
                        <CheckIcon className="h-4 w-4" />
                      ) : (
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      )}
                      {copied ? 'Copied' : 'Copy JSON'}
                    </button>
                  </div>
                  <pre
                    className="overflow-auto rounded-md bg-gray-50 p-4 text-xs text-gray-800"
                    style={{ maxHeight: '40vh' }}
                  >
                    {JSON.stringify(selectedProduct, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Type Selector Modal */}
      {showTypeSelector && targetProduct && (
        <div className="relative z-50" aria-modal="true">
          <div className="fixed inset-0 bg-black bg-opacity-50" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-xl">
              <div className="px-6 py-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Import as...
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Should "{targetProduct.title}" be imported as a Product or
                  Service?
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    onClick={() => startCreateFlow('product', targetProduct)}
                    className="flex w-full items-center justify-center rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-500"
                  >
                    Product
                  </button>
                  <button
                    onClick={() => startCreateFlow('service', targetProduct)}
                    className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Service (Bookable)
                  </button>
                </div>
                <div className="mt-4 border-t pt-4">
                  <button
                    onClick={() => setShowTypeSelector(false)}
                    className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resource Form Modal */}
      {showResourceModal && draftResource && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <ResourceForm
                resourceData={draftResource as any}
                fullContentMap={resources as any} // Use local resources for slug uniqueness check
                categorySlug={draftResource.categorySlug || ''}
                categorySchema={
                  internalBrandConfig?.knownResources[
                    draftResource.categorySlug || ''
                  ] || {}
                }
                isCreate={true}
                onClose={(saved) => {
                  setShowResourceModal(false);
                  if (saved) {
                    refreshResources();
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
