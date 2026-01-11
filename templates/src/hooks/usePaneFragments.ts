import { useState, useEffect, useRef } from 'react';
import { TractStackAPI } from '@/utils/api';

export const usePaneFragments = (paneIds: string[]) => {
  const [fragments, setFragments] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const loadedIds = useRef<Set<string>>(new Set());

  const tenantId =
    (typeof window !== 'undefined' && window.TRACTSTACK_CONFIG?.tenantId) ||
    import.meta.env.PUBLIC_TENANTID ||
    'default';

  useEffect(() => {
    // Identify IDs that haven't been loaded yet
    const neededIds = paneIds.filter((id) => !loadedIds.current.has(id));

    if (neededIds.length === 0) return;

    let isMounted = true;

    const fetchFragments = async () => {
      setIsLoading(true);
      try {
        const api = new TractStackAPI(tenantId);
        const response = await api.post('/api/v1/fragments/panes', {
          paneIds: neededIds,
        });

        if (!isMounted) return;

        if (response.success && response.data) {
          const newFragments = response.data.fragments || {};
          const newErrors = response.data.errors || {};

          // Update cache refs
          Object.keys(newFragments).forEach((id) => loadedIds.current.add(id));
          Object.keys(newErrors).forEach((id) => loadedIds.current.add(id));

          setFragments((prev) => ({ ...prev, ...newFragments }));
          setErrors((prev) => ({ ...prev, ...newErrors }));
        }
      } catch (error) {
        console.error('Failed to fetch fragments:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchFragments();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(paneIds), tenantId]);

  return { fragments, errors, isLoading };
};
