import ResourceTable from '@/components/storykeep/controls/content/ResourceTable';
import type { ResourceNode } from '@/types/compositorTypes';
import type { FullContentMapItem } from '@/types/tractstack';

interface ShopifyDashboardProductsProps {
  resources: ResourceNode[];
  onEdit: (resourceId: string) => void;
  onCreate: () => void;
  onRefresh: () => void;
}

export default function ShopifyDashboard_Products({
  resources,
  onEdit,
  onCreate,
  onRefresh,
}: ShopifyDashboardProductsProps) {
  /**
   * Convert local ResourceNode[] into FullContentMapItem[] to satisfy the
   * ResourceTable interface requirements.
   */
  const resourceItems = resources.map((r) => ({
    ...r,
    type: 'Resource' as const,
  })) as FullContentMapItem[];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Imported Products</h2>
        <p className="mt-2 text-sm text-gray-600">
          Manage the Shopify products you have already imported into StoryKeep.
          Edit their metadata, SEO, and layout parameters.
        </p>
      </div>

      <ResourceTable
        categorySlug="product"
        fullContentMap={resourceItems}
        onEdit={onEdit}
        onCreate={onCreate}
        onRefresh={onRefresh}
      />
    </div>
  );
}
