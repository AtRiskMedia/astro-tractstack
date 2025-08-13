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

// Enhanced transition overlay that runs independently
const TransitionOverlay = ({ show }: { show: boolean }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (show) {
      // Start the 300ms fire & forget sequence
      setShouldRender(true);
      setIsVisible(true);

      // After 300ms, hide the overlay
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        // Remove from DOM after fade out completes
        setTimeout(() => setShouldRender(false), 150);
      }, 300);

      return () => clearTimeout(hideTimer);
    }
  }, [show]);

  if (!shouldRender) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-50 flex items-center justify-center transition-opacity duration-150 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        backgroundColor: 'rgba(167, 177, 183, 0.85)', // Start and end at 50% opacity
      }}
    >
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500" />
    </div>
  );
};

export const Compositor = (props: CompositorProps) => {
  const [initialized, setInitialized] = useState(false);
  const [updateCounter, setUpdateCounter] = useState(0);
  const [triggerTransition, setTriggerTransition] = useState(false);

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
        // Trigger the independent fade effect
        setTriggerTransition((prev) => !prev); // Toggle to trigger useEffect

        // Update the tree immediately
        setUpdateCounter((prev) => prev + 1);

        // Stop the existing loading animation with a slightly longer delay for effect
        // This is decoupled from our fade effect
        setTimeout(() => stopLoadingAnimation(), 260);
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
        <div className="text-gray-600">Compositing page...</div>
      </div>
    );
  }

  return (
    <div
      id="content" // This ID is used by startLoadingAnimation
      style={{
        position: 'relative',
        ...(viewportMinWidth ? { minWidth: `${viewportMinWidth}px` } : {}),
        maxWidth: `${viewportMaxWidth}px`,
        margin: '0 auto',
        background: 'white',
      }}
    >
      {/* Independent transition overlay - 300ms fire & forget */}
      <TransitionOverlay show={triggerTransition} />

      {/* Main content */}
      <Node
        nodeId={props.id}
        key={`${props.id}-${updateCounter}`}
        ctx={props.ctx}
        config={props.config}
      />
    </div>
  );
};
