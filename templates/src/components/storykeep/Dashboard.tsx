import { useState, useEffect } from 'react';
import { getBrandConfig } from '@/utils/api/brandConfig';
import { classNames } from '@/utils/helpers';
import Wizard from './widgets/Wizard';
import type { FullContentMapItem, BrandConfig } from '@/types/tractstack';

interface Tab {
  id: string;
  name: string;
  current: boolean;
}

export default function StoryKeepDashboard({
  fullContentMap,
  homeSlug,
  activeTab = 'analytics',
  role,
  initializing = false,
}: {
  fullContentMap: FullContentMapItem[];
  homeSlug: string;
  activeTab?: string;
  role?: string | null;
  initializing?: boolean;
}) {
  const [isClient, setIsClient] = useState<boolean>(false);
  const [brandConfig, setBrandConfig] = useState<BrandConfig | null>(null);
  const [loading, setLoading] = useState(false);

  const isCurrentlyInitializing = initializing && !brandConfig?.SITE_INIT;

  // Define tabs - show only branding when initializing
  const tabs: Tab[] = isCurrentlyInitializing
    ? [{ id: 'branding', name: 'Welcome to your StoryKeep', current: true }]
    : [
        {
          id: 'analytics',
          name: 'Analytics',
          current: activeTab === 'analytics',
        },
        {
          id: 'content',
          name: 'Content',
          current: activeTab === 'content',
        },
        {
          id: 'branding',
          name: 'Branding',
          current: activeTab === 'branding',
        },
        ...(role === 'admin'
          ? [
              {
                id: 'advanced',
                name: 'Advanced',
                current: activeTab === 'advanced',
              },
            ]
          : []),
      ];

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!brandConfig && !loading) {
      setLoading(true);
      getBrandConfig(window.TRACTSTACK_CONFIG?.tenantId || 'default')
        .then(setBrandConfig)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [brandConfig, loading]);

  if (!isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="md:mb-18 mb-12 w-full">
      {isCurrentlyInitializing ? (
        <div className="mb-8 rounded-md border border-dashed border-orange-200 bg-orange-50 p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">⭐</span>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-bold text-black">
                Welcome to your StoryKeep
              </h3>
              <div className="text-mydarkgrey mt-2 text-sm">
                <p>
                  Complete your site's branding configuration to get started.
                  (And update as often as you like!)
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Wizard fullContentMap={fullContentMap} homeSlug={homeSlug} />
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <a
              key={tab.id}
              href={
                tab.id === 'analytics' ? '/storykeep' : `/storykeep/${tab.id}`
              }
              className={classNames(
                tab.current
                  ? 'border-cyan-500 text-cyan-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                'whitespace-nowrap border-b-2 px-1 py-4 text-sm font-bold'
              )}
              aria-current={tab.current ? 'page' : undefined}
            >
              {tab.name}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
