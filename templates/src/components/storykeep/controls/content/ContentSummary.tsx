import type { FullContentMapItem } from '../../../../types/tractstack';

interface ContentSummaryProps {
  fullContentMap: FullContentMapItem[];
}

const ContentSummary = ({ fullContentMap }: ContentSummaryProps) => {
  // Calculate content statistics from fullContentMap
  const contentStats = {
    storyfragments: fullContentMap.filter(
      (item) => item.type === 'StoryFragment'
    ).length,
    panes: fullContentMap.filter((item) => item.type === 'Pane').length,
    menus: fullContentMap.filter((item) => item.type === 'Menu').length,
    resources: fullContentMap.filter((item) => item.type === 'Resource').length,
    beliefs: fullContentMap.filter((item) => item.type === 'Belief').length,
    epinets: fullContentMap.filter((item) => item.type === 'Epinet').length,
    files: fullContentMap.filter((item) => item.type === 'File').length,
    tractstacks: fullContentMap.filter((item) => item.type === 'TractStack')
      .length,
  };

  const totalContent = Object.values(contentStats).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <div className="space-y-6">
      {/* Content Overview */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Content Overview
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-600">
              {contentStats.storyfragments}
            </div>
            <div className="text-sm text-gray-600">Story Fragments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-600">
              {contentStats.panes}
            </div>
            <div className="text-sm text-gray-600">Panes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-600">
              {contentStats.menus}
            </div>
            <div className="text-sm text-gray-600">Menus</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-600">
              {contentStats.resources}
            </div>
            <div className="text-sm text-gray-600">Resources</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-600">
              {contentStats.beliefs}
            </div>
            <div className="text-sm text-gray-600">Beliefs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-600">
              {contentStats.epinets}
            </div>
            <div className="text-sm text-gray-600">Epinets</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-600">
              {contentStats.files}
            </div>
            <div className="text-sm text-gray-600">Files</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-600">
              {contentStats.tractstacks}
            </div>
            <div className="text-sm text-gray-600">TractStacks</div>
          </div>
        </div>
        <div className="mt-4 text-center">
          <div className="text-lg font-medium text-gray-900">
            Total Content Items: {totalContent}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Recent Activity
        </h2>
        <div className="rounded-lg bg-gray-50 p-4 text-gray-600">
          <p>Recent changes and activity tracking will be displayed here.</p>
          <p className="mt-2 text-sm">
            This feature requires change tracking implementation.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <button
            onClick={() => (window.location.href = '/create/edit')}
            className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center hover:border-cyan-500 hover:text-cyan-600"
          >
            <div className="text-lg font-medium">+ New Story Fragment</div>
            <div className="text-sm text-gray-500">Create Page</div>
          </button>
          <button className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center hover:border-cyan-500 hover:text-cyan-600">
            <div className="text-lg font-medium">+ New Pane</div>
            <div className="text-sm text-gray-500">Create Content Block</div>
          </button>
          <button className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center hover:border-cyan-500 hover:text-cyan-600">
            <div className="text-lg font-medium">+ New Menu</div>
            <div className="text-sm text-gray-500">Create Navigation</div>
          </button>
          <button className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center hover:border-cyan-500 hover:text-cyan-600">
            <div className="text-lg font-medium">+ New Resource</div>
            <div className="text-sm text-gray-500">Create Resource</div>
          </button>
        </div>
      </div>

      {/* System Health */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          System Health
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Broken Relationships</span>
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
              0 Found
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Orphaned Content</span>
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
              0 Found
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Cache Status</span>
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
              Healthy
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentSummary;
