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

  console.log(props);

  fullContentMapStore.set(props.fullContentMap);
  hasAssemblyAIStore.set(false); // TODO: Must add to BRAND_CONFIG !!
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

    const unsubscribe = getCtx(props).notifications.subscribe(
      ROOT_NODE_NAME,
      () => {
        setUpdateCounter((prev) => prev + 1);
        setTimeout(() => stopLoadingAnimation(), 160);
      }
    );

    return () => {
      unsubscribe();
      stopLoadingAnimation();
    };
  }, []);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Loading compositor...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...(viewportMinWidth ? { minWidth: `${viewportMinWidth}px` } : {}),
        maxWidth: `${viewportMaxWidth}px`,
        margin: '0 auto',
        background: 'white',
      }}
    >
      {/* Placeholder for Node component until it's ported */}
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <h3 className="mb-2 text-lg font-semibold text-gray-700">
          Compositor Ready
        </h3>
        <p className="mb-4 text-gray-600">Node ID: {props.id}</p>
        <p className="text-sm text-gray-500">Update Counter: {updateCounter}</p>
        <div className="mt-4 text-xs text-gray-400">
          Node component will render here when ported
        </div>
      </div>
      <Node
        nodeId={props.id}
        key={`${props.id}-${updateCounter}`}
        ctx={props.ctx}
        config={props.config}
      />
    </div>
  );
};
