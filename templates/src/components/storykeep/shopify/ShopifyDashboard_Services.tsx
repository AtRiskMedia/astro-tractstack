import ResourceTable from '@/components/storykeep/controls/content/ResourceTable';
import type { ResourceNode } from '@/types/compositorTypes';
import type { FullContentMapItem } from '@/types/tractstack';

interface ShopifyDashboardServicesProps {
  resources: ResourceNode[];
  onEdit: (resourceId: string) => void;
  onCreate: () => void;
  onRefresh: () => void;
}

export default function ShopifyDashboard_Services({
  resources,
  onEdit,
  onCreate,
  onRefresh,
}: ShopifyDashboardServicesProps) {
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
        <h2 className="text-2xl font-bold text-gray-900">Imported Services</h2>
        <p className="mt-2 text-sm text-gray-600">
          Manage the services and bookable appointments you have already
          imported into StoryKeep. Edit metadata, scheduling requirements, and
          SEO.
        </p>
      </div>

      <ResourceTable
        categorySlug="service"
        fullContentMap={resourceItems}
        onEdit={onEdit}
        onCreate={onCreate}
        onRefresh={onRefresh}
      />
    </div>
  );
}
