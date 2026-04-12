import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ClipboardDocumentIcon from '@heroicons/react/24/outline/ClipboardDocumentIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import {
  shopifyStatus,
  shopifyActiveTabStore,
  type ShopifyProduct,
} from '@/stores/shopify';
import ResourceForm from './controls/content/ResourceForm';
import { saveBrandConfigWithStateUpdate } from '@/utils/api/brandConfig';
import {
  deleteResource,
  getResource,
  getResourcesByCategory,
} from '@/utils/api/resourceConfig';
import { convertToLocalState } from '@/utils/api/brandHelpers';
import BooleanToggle from '@/components/form/BooleanToggle';
import type { BrandConfig, BrandConfigState } from '@/types/tractstack';
import type { ResourceNode } from '@/types/compositorTypes';
import type { ResourceConfig } from '@/types/tractstack';
import ShopifyDashboard from './shopify/ShopifyDashboard';
import ShopifyDashboard_Products from './shopify/ShopifyDashboard_Products';
import ShopifyDashboard_Services from './shopify/ShopifyDashboard_Services';
import ShopifyDashboard_Schedule from './shopify/ShopifyDashboard_Schedule';
import ShopifyDashboard_Search from './shopify/ShopifyDashboard_Search';
import ShopifyDashboard_Bookings from './shopify/ShopifyDashboard_Bookings';

interface DashboardShopifyProps {
  brandConfig: BrandConfig;
  existingResources: ResourceNode[];
}

type MachineState = 'INIT' | 'CONFIG' | 'UPDATE' | 'READY';

export default function StoryKeepDashboard_Shopify({
  brandConfig,
  existingResources,
}: DashboardShopifyProps) {
  const status = useStore(shopifyStatus);
  const activeTab = useStore(shopifyActiveTabStore);

  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const [resources, setResources] = useState<ResourceNode[]>(existingResources);

  const [draftResource, setDraftResource] =
    useState<Partial<ResourceConfig> | null>(null);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(true);
  const [targetProduct, setTargetProduct] = useState<ShopifyProduct | null>(
    null
  );
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const [showSmartCartWarning, setShowSmartCartWarning] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    category: string;
    product: ShopifyProduct;
  } | null>(null);

  const [machineState, setMachineState] = useState<MachineState>('INIT');
  const [internalBrandConfig, setInternalBrandConfig] =
    useState<BrandConfigState | null>(null);

  const [wantProduct, setWantProduct] = useState(true);
  const [wantService, setWantService] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Tab definitions
  const tabs = [
    { id: 'dashboards', name: 'Dashboard' },
    { id: 'bookings', name: 'Bookings' },
    { id: 'products', name: 'Products' },
    { id: 'services', name: 'Services' },
    { id: 'schedule', name: 'Schedule' },
    { id: 'search', name: 'Search' },
  ];

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

  const linkedResourceMap = useMemo(() => {
    const map = new Map<string, ResourceNode>();
    resources.forEach((r) => {
      if (r.optionsPayload?.gid) {
        map.set(r.optionsPayload.gid, r);
      }
    });
    return map;
  }, [resources]);

  const refreshResources = async () => {
    const tenantId = window.TRACTSTACK_CONFIG?.tenantId || 'default';
    try {
      const promises = [];
      if (internalBrandConfig?.knownResources['product']) {
        promises.push(getResourcesByCategory(tenantId, 'product'));
      }
      if (internalBrandConfig?.knownResources['service']) {
        promises.push(getResourcesByCategory(tenantId, 'service'));
      }

      const results = await Promise.all(promises);
      const flattened = results.flat() as ResourceNode[];

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
      executePreFlightCheck('service', product);
    } else {
      executePreFlightCheck('product', product);
    }
  };

  // Handler for ProductTable (External Catalog)
  const handleEditFromCatalog = (
    _product: ShopifyProduct,
    resource: ResourceNode
  ) => {
    setDraftResource(resource as any);
    setIsCreateMode(false);
    setShowResourceModal(true);
  };

  // Handler for ResourceTable (Local Management)
  const handleEditResource = async (resourceId: string) => {
    try {
      const resource = await getResource(
        window.TRACTSTACK_CONFIG?.tenantId || 'default',
        resourceId
      );
      setDraftResource(resource as any);
      setIsCreateMode(false);
      setShowResourceModal(true);
    } catch (error) {
      console.error('Failed to load resource for editing:', error);
    }
  };

  const executePreFlightCheck = (category: string, product: ShopifyProduct) => {
    const hasMode = product.options.some((opt) => opt.name === 'Mode');
    if (category === 'service' || hasMode) {
      startCreateFlow(category, product);
    } else {
      setPendingImport({ category, product });
      setShowSmartCartWarning(true);
      setShowTypeSelector(false);
    }
  };

  const startCreateFlow = (category: string, product: ShopifyProduct) => {
    const schema = internalBrandConfig?.knownResources[category] || {};
    const mergedOptions: Record<string, any> = {
      gid: product.id,
      shopifyData: JSON.stringify(product),
    };

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

    setIsCreateMode(true);
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

      if (wantProduct) {
        updatedKnownResources['product'] = {
          gid: { type: 'string', optional: false },
          allowMultiple: { type: 'boolean', optional: false },
          group: { type: 'string', optional: true },
          shopifyData: { type: 'string', optional: false },
          shopifyImage: { type: 'string', optional: true, defaultValue: '{}' },
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

      if (wantService) {
        updatedKnownResources['service'] = {
          gid: { type: 'string', optional: true },
          group: { type: 'string', optional: true },
          shopifyData: { type: 'string', optional: true },
          shopifyImage: { type: 'string', optional: true, defaultValue: '{}' },
          bookingLengthMinutes: {
            type: 'number',
            optional: false,
            minNumber: 15,
            maxNumber: 120,
            defaultValue: 15,
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

  const handleDismissHelper = async () => {
    if (!internalBrandConfig) return;
    try {
      const updatedState = {
        ...internalBrandConfig,
        showShopifyHelper: false,
      };
      await saveBrandConfigWithStateUpdate(
        window.TRACTSTACK_CONFIG?.tenantId || 'default',
        updatedState
      );
      setInternalBrandConfig(updatedState);
    } catch (error) {
      console.error('Failed to dismiss Shopify helper:', error);
    }
  };

  if (machineState === 'INIT') return null;

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

  return (
    <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-900">Shopify Integration</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your connected Shopify store.
        </p>
      </div>

      {/* Persistent Onboarding Helper Banner */}
      {internalBrandConfig?.showShopifyHelper && (
        <div className="relative mb-8 rounded-lg border border-cyan-200 bg-cyan-50 p-6 pr-12 shadow-sm">
          <button
            onClick={handleDismissHelper}
            className="absolute right-4 top-4 text-cyan-600 hover:text-cyan-800"
            title="Dismiss instructions"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
          <h3 className="text-lg font-bold text-cyan-900">
            Smart Cart Architecture: "Mode" Options
          </h3>
          <div className="mt-2 space-y-3 text-sm text-cyan-800">
            <p>
              To enable automatic shipping fee bypass for local pickup, your
              Shopify products must be configured with a specific architectural
              pattern:
            </p>
            <ul className="list-inside list-disc space-y-1 font-bold">
              <li>
                Option Name: Must be exactly{' '}
                <code className="rounded bg-cyan-100 px-1">Mode</code>
              </li>
              <li>
                Option Values: Must include{' '}
                <code className="rounded bg-cyan-100 px-1">Shipped</code> and{' '}
                <code className="rounded bg-cyan-100 px-1">Pickup</code>
              </li>
            </ul>
            <p>
              Without this "Mode" option, items will always be treated as
              standard shipped products.
            </p>
          </div>
        </div>
      )}

      {/* Tab Navigation Shell */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => shopifyActiveTabStore.set(tab.id)}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-bold ${
                activeTab === tab.id
                  ? 'border-cyan-500 text-cyan-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } `}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-6">
        {status.error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="ml-3">
              <h3 className="text-sm font-bold text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{status.error}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboards' && (
          <ShopifyDashboard existingResources={resources} />
        )}

        {activeTab === 'bookings' && (
          <ShopifyDashboard_Bookings existingResources={resources} />
        )}

        {/* Local Management Tabs */}
        {activeTab === 'products' && (
          <ShopifyDashboard_Products
            resources={resources}
            onEdit={handleEditResource}
            onCreate={() => shopifyActiveTabStore.set('search')}
            onRefresh={refreshResources}
          />
        )}

        {activeTab === 'services' && (
          <ShopifyDashboard_Services
            resources={resources}
            onEdit={handleEditResource}
            onCreate={() => shopifyActiveTabStore.set('search')}
            onRefresh={refreshResources}
          />
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <ShopifyDashboard_Schedule brandConfig={brandConfig} />
        )}

        {/* Catalog Discovery Tab */}
        {activeTab === 'search' && (
          <ShopifyDashboard_Search
            linkedResourceMap={linkedResourceMap}
            onSelectProduct={setSelectedProduct}
            onLink={handleLink}
            onUnlink={handleUnlink}
            onEdit={handleEditFromCatalog}
          />
        )}
      </div>

      {/* Shared Modals */}
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
                  className="rounded-md bg-white text-gray-400 hover:text-gray-50"
                  onClick={() => setSelectedProduct(null)}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="overflow-y-auto p-6">
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
      )}

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
                  Should "{targetProduct.title}" be a Product or Service?
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    onClick={() =>
                      executePreFlightCheck('product', targetProduct)
                    }
                    className="flex w-full items-center justify-center rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-500"
                  >
                    Product
                  </button>
                  <button
                    onClick={() =>
                      executePreFlightCheck('service', targetProduct)
                    }
                    className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Service (Bookable)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSmartCartWarning && pendingImport && (
        <div className="relative z-50" aria-modal="true">
          <div className="fixed inset-0 bg-black bg-opacity-50" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
              <div className="px-6 py-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Missing Smart Cart Architecture
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  To enable Smart Cart pickup, the product must have a "Mode"
                  option containing "Shipped" and "Pickup". If you import now,
                  it will be standard shipping only.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setShowSmartCartWarning(false);
                      startCreateFlow(
                        pendingImport.category,
                        pendingImport.product
                      );
                      setPendingImport(null);
                    }}
                    className="flex w-full items-center justify-center rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-500"
                  >
                    Acknowledge & Import
                  </button>
                  <button
                    onClick={() => {
                      setShowSmartCartWarning(false);
                      setPendingImport(null);
                    }}
                    className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResourceModal && draftResource && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <ResourceForm
                resourceData={draftResource as any}
                fullContentMap={resources as any}
                categorySlug={draftResource.categorySlug || ''}
                categorySchema={
                  internalBrandConfig?.knownResources[
                    draftResource.categorySlug || ''
                  ] || {}
                }
                isCreate={isCreateMode}
                onClose={(saved) => {
                  setShowResourceModal(false);
                  setIsCreateMode(true);
                  if (saved) refreshResources();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
