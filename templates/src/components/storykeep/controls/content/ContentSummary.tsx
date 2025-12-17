import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import {
  orphanAnalysisStore,
  loadOrphanAnalysis,
  countOrphans,
} from '@/stores/orphanAnalysis';
import type { FullContentMapItem } from '@/types/tractstack';

interface ContentSummaryProps {
  fullContentMap: FullContentMapItem[];
}

const ContentSummary = ({ fullContentMap }: ContentSummaryProps) => {
  const orphanState = useStore(orphanAnalysisStore);

  useEffect(() => {
    loadOrphanAnalysis();
  }, []);

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
  };

  const totalContent = Object.values(contentStats).reduce(
    (sum, count) => sum + count,
    0
  );

  const orphanCount = countOrphans(orphanState.data);
  const isOrphanDataLoading =
    orphanState.isLoading || orphanState.data?.status === 'loading';

  return (
    <div className="space-y-6">
      {/* Content Overview */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          Content Overview
        </h2>
        <div className="sm:grid-cols-4 lg:grid-cols-8 grid grid-cols-2 gap-4">
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
        </div>
        <div className="mt-4 text-center">
          <div className="text-lg font-bold text-gray-900">
            Total Content Items: {totalContent}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Quick Actions</h2>
        <div className="sm:grid-cols-4 grid grid-cols-2 gap-4">
          <a
            href="/create/edit"
            className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center hover:border-cyan-500 hover:text-cyan-600"
          >
            <div className="text-lg font-bold">+ New Story Fragment</div>
            <div className="text-sm text-gray-500">Create Page</div>
          </a>
          <a
            href="/context/create/edit"
            className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center hover:border-cyan-500 hover:text-cyan-600"
          >
            <div className="text-lg font-bold">+ New Context Page</div>
            <div className="text-sm text-gray-500">Create Page</div>
          </a>
        </div>
      </div>

      {/* System Health */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold text-gray-900">System Health</h2>
        <div className="flex flex-col gap-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Orphaned Content</span>
            {isOrphanDataLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-cyan-600"></div>
                <span className="text-sm text-gray-500">Analyzing...</span>
              </div>
            ) : orphanState.error ? (
              <span className="text-sm text-gray-500">
                Analysis unavailable
              </span>
            ) : (
              <span
                className={`rounded-full px-3 py-1 text-sm font-bold ${
                  orphanCount === 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {orphanCount === 0 ? '0 Found' : `${orphanCount} Found`}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Cache Status</span>
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-800">
              Healthy
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentSummary;
