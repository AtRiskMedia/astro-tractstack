import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { BeakerIcon, TrashIcon } from '@heroicons/react/24/outline';
import { deleteBelief } from '../../../../utils/api/beliefConfig';
import {
  orphanAnalysisStore,
  loadOrphanAnalysis,
} from '../../../../stores/orphanAnalysis';
import type { BeliefNode } from '../../../../types/tractstack';

interface BeliefTableProps {
  beliefs: BeliefNode[];
  onEdit: (beliefId: string) => void;
  onRefresh: () => void;
}

export default function BeliefTable({
  beliefs,
  onEdit,
  onRefresh,
}: BeliefTableProps) {
  const [query, setQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Subscribe to orphan analysis store
  const orphanState = useStore(orphanAnalysisStore);

  // Load orphan analysis on component mount
  useEffect(() => {
    loadOrphanAnalysis();
  }, []);

  const filteredBeliefs = beliefs.filter(
    (belief) =>
      belief.title.toLowerCase().includes(query.toLowerCase()) ||
      belief.slug.toLowerCase().includes(query.toLowerCase())
  );

  // Get usage information for each belief using orphan analysis
  const getBeliefUsage = (beliefId: string): string[] => {
    if (!orphanState.data || !orphanState.data.beliefs) {
      return [];
    }
    return orphanState.data.beliefs[beliefId] || [];
  };

  // Get usage details (what is using this belief)
  const getUsageDetails = (beliefId: string) => {
    const usageIds = getBeliefUsage(beliefId);
    return usageIds.map((id) => {
      // Usage could be from various sources, try to find a readable name
      const item = beliefs.find((b) => b.id === id);
      return item ? item.title : `Usage (${id})`;
    });
  };

  const handleDelete = async (belief: BeliefNode) => {
    const usage = getBeliefUsage(belief.id);

    if (usage.length > 0) {
      const usageDetails = getUsageDetails(belief.id);
      alert(
        `Cannot delete belief "${belief.title}": it is currently in use by ${usage.length} item(s):\n\n${usageDetails.join('\n')}`
      );
      return;
    }

    if (
      !confirm(`Are you sure you want to delete the belief "${belief.title}"?`)
    ) {
      return;
    }

    try {
      setIsDeleting(belief.id);
      await deleteBelief(belief.id);

      // Reload orphan analysis after successful deletion
      await loadOrphanAnalysis();
      onRefresh();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete belief. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Beliefs</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage beliefs for adaptive content and magic paths
          </p>
        </div>
        <button
          onClick={() => onEdit('')}
          className="flex items-center rounded-md border border-transparent bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Belief
        </button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <input
          type="text"
          placeholder="Search beliefs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-700 focus:ring-cyan-700"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        {filteredBeliefs.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            {query
              ? 'No beliefs found matching your search.'
              : 'No beliefs created yet.'}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  Scale
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  Custom Values
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  Usage
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredBeliefs.map((belief) => {
                const usage = getBeliefUsage(belief.id);
                const usageDetails = getUsageDetails(belief.id);
                const isInUse = usage.length > 0;

                return (
                  <tr key={belief.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      {belief.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {belief.slug}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                        {belief.scale}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {belief.customValues && belief.customValues.length > 0 ? (
                        <span className="text-xs text-gray-500">
                          {belief.customValues.length} values
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {!orphanState.data ? (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                          Loading...
                        </span>
                      ) : isInUse ? (
                        <div className="group relative">
                          <span className="inline-flex cursor-help items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            {usage.length} usage{usage.length !== 1 ? 's' : ''}
                          </span>
                          {/* Tooltip */}
                          <div className="invisible absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg group-hover:visible">
                            Used by: {usageDetails.slice(0, 3).join(', ')}
                            {usageDetails.length > 3 &&
                              ` +${usageDetails.length - 3} more`}
                            <div className="absolute left-1/2 top-full -translate-x-1/2 transform border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          Unused
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => onEdit(belief.id)}
                          className="text-cyan-600 hover:text-cyan-900"
                          title="Edit belief"
                        >
                          <BeakerIcon className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(belief)}
                          disabled={
                            isInUse ||
                            isDeleting === belief.id ||
                            !orphanState.data
                          }
                          className={`${
                            isInUse ||
                            isDeleting === belief.id ||
                            !orphanState.data
                              ? 'cursor-not-allowed text-gray-400'
                              : 'text-red-600 hover:text-red-900'
                          }`}
                          title={
                            !orphanState.data
                              ? 'Loading usage analysis...'
                              : isInUse
                                ? `Cannot delete: belief is used by ${usage.length} item(s)`
                                : 'Delete belief'
                          }
                        >
                          {isDeleting === belief.id ? (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                          ) : (
                            <TrashIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
