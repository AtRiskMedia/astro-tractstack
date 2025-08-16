import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import {
  viewportKeyStore,
  fullContentMapStore,
  hasAssemblyAIStore,
  urlParamsStore,
  canonicalURLStore,
  preferredThemeStore,
  codehookMapStore,
  brandColourStore,
} from '@/stores/storykeep';
import { getCtx, ROOT_NODE_NAME, type NodesContext } from '@/stores/nodes';
import { stopLoadingAnimation } from '@/utils/helpers';
import Node from './Node';
import type { LoadData } from '@/types/compositorTypes';
import type {
  Theme,
  BrandConfig,
  FullContentMapItem,
} from '@/types/tractstack';

export type CompositorProps = {
  nodes: LoadData | null;
  ctx?: NodesContext;
  id: string;
  config: BrandConfig;
  fullContentMap: FullContentMapItem[];
  availableCodeHooks: string[];
  urlParams: Record<string, string | boolean>;
  fullCanonicalURL: string;
};

export const Compositor = (props: CompositorProps) => {
  const [initialized, setInitialized] = useState(false);
  const [updateCounter, setUpdateCounter] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true

  fullContentMapStore.set(props.fullContentMap);
  hasAssemblyAIStore.set(props.config.HAS_AAI);
  urlParamsStore.set(props.urlParams);
  canonicalURLStore.set(props.fullCanonicalURL);
  preferredThemeStore.set(props.config.THEME as Theme);
  brandColourStore.set(props.config.BRAND_COLOURS);
  codehookMapStore.set(props.availableCodeHooks);

  const $viewportKey = useStore(viewportKeyStore);
  const viewportMaxWidth =
    $viewportKey.value === `mobile`
      ? 600
      : $viewportKey.value === `tablet`
        ? 1000
        : 1500;
  const viewportMinWidth =
    $viewportKey.value === `mobile`
      ? null
      : $viewportKey.value === `tablet`
        ? 801
        : 1368;

  // Initialize nodes tree and set up subscriptions
  useEffect(() => {
    getCtx(props).buildNodesTreeFromRowDataMadeNodes(props.nodes);
    setInitialized(true);

    // Stop initial loading after initialization
    setTimeout(() => {
      setIsLoading(false);
      stopLoadingAnimation();
    }, 300);

    const unsubscribe = getCtx(props).notifications.subscribe(
      ROOT_NODE_NAME,
      () => {
        // Start loading state
        setIsLoading(true);

        // Update the tree immediately
        setUpdateCounter((prev) => prev + 1);

        // Stop loading after 300ms
        setTimeout(() => {
          setIsLoading(false);
          stopLoadingAnimation();
        }, 300);
      }
    );

    return () => {
      unsubscribe();
      stopLoadingAnimation();
    };
  }, []);

  return (
    <div
      id="content" // This ID is used by startLoadingAnimation
      className={`transition-all duration-300 ${
        isLoading ? 'opacity-60' : 'opacity-100'
      }`}
      style={{
        position: 'relative',
        ...(viewportMinWidth ? { minWidth: `${viewportMinWidth}px` } : {}),
        maxWidth: `${viewportMaxWidth}px`,
        margin: '0 auto',
        background: isLoading ? 'rgba(167, 177, 183, 0.2)' : 'white',
        minHeight: '100vh',
      }}
    >
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-gray-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
            <span>{initialized ? 'Updating...' : 'Compositing page...'}</span>
          </div>
        </div>
      )}

      {/* Main content */}
      {initialized && (
        <Node
          nodeId={props.id}
          key={`${props.id}-${updateCounter}`}
          ctx={props.ctx}
          config={props.config}
        />
      )}
    </div>
  );
};
