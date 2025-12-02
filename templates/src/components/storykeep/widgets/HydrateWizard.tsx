import { useEffect, useState, useRef } from 'react';
import { prepareHydrationContext } from '@/utils/api/setupHelpers';
import SaveModal from '@/components/edit/state/SaveModal';
import type { FullContentMapItem } from '@/types/tractstack';
import type { LoadData } from '@/types/compositorTypes';

interface Props {
  initialSuitcase: LoadData;
  fullContentMap: FullContentMapItem[];
}

export default function HydrateWizard({
  initialSuitcase,
  fullContentMap,
}: Props) {
  const [status, setStatus] = useState<'preparing' | 'ready' | 'error'>(
    'preparing'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const timer = setTimeout(() => {
      try {
        prepareHydrationContext(initialSuitcase, fullContentMap);
        setStatus('ready');
      } catch (err) {
        console.error('Hydration preparation failed:', err);
        setErrorMessage(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center">
        <div className="rounded-lg bg-white p-12 shadow-lg">
          <h2 className="text-xl font-bold text-red-600">Setup Failed</h2>
          <p className="mt-2 text-gray-600">{errorMessage}</p>
          <div className="mt-6">
            <a
              href="/storykeep"
              className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'ready') {
    return (
      <SaveModal
        show={true}
        slug="hello"
        isContext={false}
        onClose={() => {}}
        hydrate={true}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6 text-center">
      <div className="rounded-lg bg-white p-12 shadow-lg">
        <div className="mb-4 flex h-16 justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-cyan-600"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          Preparing installation...
        </h2>
        <p className="mt-2 text-gray-600">Unpacking suitcase content</p>
      </div>
    </div>
  );
}
