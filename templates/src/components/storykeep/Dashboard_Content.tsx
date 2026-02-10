import { useState, useEffect } from 'react';
import { TractStackAPI } from '@/utils/api';
import ContentBrowser from './controls/content/ContentBrowser';
import type { FullContentMapItem } from '@/types/tractstack';

interface StoryKeepDashboardContentProps {
  fullContentMap: FullContentMapItem[];
  homeSlug: string;
}

const StoryKeepDashboard_Content = ({
  fullContentMap,
  homeSlug,
}: StoryKeepDashboardContentProps) => {
  const [analytics, setAnalytics] = useState<{
    dashboard: {
      hotContent?: Array<{ id: string; totalEvents: number }>;
    } | null;
    isLoading: boolean;
    status: string;
    error: string | null;
  }>({
    dashboard: null,
    isLoading: false,
    status: 'idle',
    error: null,
  });

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 2;

    const fetchContentSummary = async () => {
      try {
        setAnalytics((prev) => ({ ...prev, isLoading: true, error: null }));

        const api = new TractStackAPI(
          window.TRACTSTACK_CONFIG?.tenantId || 'default'
        );

        const response = await api.get('/api/v1/analytics/content-summary');

        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch content summary');
        }

        const data = response.data;
        const hasData = data.hotContent && data.hotContent.length > 0;

        setAnalytics({
          dashboard: { hotContent: data.hotContent || [] },
          isLoading: false,
          status: hasData ? 'complete' : 'empty',
          error: null,
        });

        // If no data and we have retries left, try again after delay
        if (!hasData && retryCount < maxRetries) {
          retryCount++;
          const delayMs = retryCount === 1 ? 3000 : 6000; // 3s, then 6s
          setTimeout(fetchContentSummary, delayMs);
        }
      } catch (error) {
        console.error('Content summary fetch error:', error);

        // If we have retries left, try again
        if (retryCount < maxRetries) {
          retryCount++;
          const delayMs = retryCount === 1 ? 3000 : 6000;
          setAnalytics((prev) => ({
            ...prev,
            isLoading: false,
            status: 'retrying',
            error: `Attempt ${retryCount} failed, retrying in ${delayMs / 1000}s...`,
          }));
          setTimeout(fetchContentSummary, delayMs);
        } else {
          // Max retries reached
          setAnalytics({
            dashboard: { hotContent: [] },
            isLoading: false,
            status: 'error',
            error:
              error instanceof Error
                ? error.message
                : 'Failed to load content analytics',
          });
        }
      }
    };

    fetchContentSummary();
  }, []);

  return (
    <div className="w-full">
      <ContentBrowser
        analytics={analytics}
        fullContentMap={fullContentMap}
        homeSlug={homeSlug}
      />
    </div>
  );
};

export default StoryKeepDashboard_Content;
