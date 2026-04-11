import { useStore } from '@nanostores/react';
import {
  shopifyData,
  shopifyStatus,
  fetchShopifyProducts,
  type ShopifyProduct,
} from '@/stores/shopify';
import ProductTable from '@/components/storykeep/controls/content/ProductTable';
import type { ResourceNode } from '@/types/compositorTypes';

interface ShopifyDashboardSearchProps {
  linkedResourceMap: Map<string, ResourceNode>;
  onSelectProduct: (product: ShopifyProduct) => void;
  onLink: (product: ShopifyProduct) => void;
  onUnlink: (resourceId: string) => void;
  onEdit: (product: ShopifyProduct, resource: ResourceNode) => void;
}

export default function ShopifyDashboard_Search({
  linkedResourceMap,
  onSelectProduct,
  onLink,
  onUnlink,
  onEdit,
}: ShopifyDashboardSearchProps) {
  const data = useStore(shopifyData);
  const status = useStore(shopifyStatus);

  const handleRefresh = () => {
    fetchShopifyProducts();
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Catalog Search</h2>
        <p className="mt-2 text-sm text-gray-600">
          Search your live Shopify store to import products and services into
          your StoryKeep.
        </p>
      </div>

      <ProductTable
        products={data.products}
        linkedResourceMap={linkedResourceMap}
        onRefresh={handleRefresh}
        isRefreshing={status.isLoading}
        onSelectProduct={onSelectProduct}
        onLink={onLink}
        onUnlink={onUnlink}
        onEdit={onEdit}
      />
    </div>
  );
}
