import {
  useEffect,
  useState,
  useRef,
  type MouseEvent as ReactMouseEvent, // Alias React's MouseEvent
} from 'react';
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
  hasArtpacksStore,
  settingsPanelStore,
} from '@/stores/storykeep';
import { getCtx, ROOT_NODE_NAME, type NodesContext } from '@/stores/nodes';
import { stopLoadingAnimation } from '@/utils/helpers';
import Node from './Node';
import { ARTPACKS } from '@/constants/brandThemes';
import {
  selectionStore,
  resetSelectionStore,
  type SelectionStoreState,
} from '@/stores/selection';
import type { LoadData } from '@/types/compositorTypes';
import type {
  Theme,
  BrandConfig,
  FullContentMapItem,
} from '@/types/tractstack';
import type { SelectionOrigin } from '@/types/nodeProps';

type SelectionRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

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

const VERBOSE = false;
const LOG_PREFIX = '[Compositor] ';

export const Compositor = (props: CompositorProps) => {
  const [initialized, setInitialized] = useState(false);
  const [updateCounter, setUpdateCounter] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(
    null
  );
  const isDragging = useRef(false);
  const selectionOrigin = useRef<SelectionOrigin | null>(null);
  const dragStartCoords = useRef<{ x: number; y: number } | null>(null);

  const $viewportKey = useStore(viewportKeyStore);
  const $selection = useStore(selectionStore);
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

  const handleDragStart = (
    origin: SelectionOrigin,
    e: ReactMouseEvent<HTMLElement> // Use aliased React MouseEvent
  ) => {
    if (VERBOSE)
      console.log(LOG_PREFIX + 'handleDragStart FIRED', { origin, event: e });
    if (isDragging.current) {
      if (VERBOSE)
        console.log(LOG_PREFIX + 'handleDragStart aborted: already dragging.');
      return;
    }
    isDragging.current = true;
    selectionOrigin.current = origin;
    dragStartCoords.current = { x: e.clientX, y: e.clientY };

    resetSelectionStore();
    if (VERBOSE) console.log(LOG_PREFIX + 'Selection store reset.');
    selectionStore.setKey('isDragging', true);
    selectionStore.setKey('blockNodeId', origin.blockNodeId);
    selectionStore.setKey('lcaNodeId', origin.lcaNodeId);
    selectionStore.setKey('startNodeId', origin.startNodeId);
    selectionStore.setKey('startCharOffset', origin.startCharOffset);
    selectionStore.setKey('endNodeId', origin.endNodeId);
    selectionStore.setKey('endCharOffset', origin.endCharOffset);
    if (VERBOSE)
      console.log(
        LOG_PREFIX + 'Selection store updated with origin:',
        selectionStore.get()
      );

    const initialRect = {
      left: e.clientX,
      top: e.clientY,
      width: 0,
      height: 0,
    };
    setSelectionRect(initialRect);
    if (VERBOSE)
      console.log(LOG_PREFIX + 'Initial selectionRect set:', initialRect);

    if (VERBOSE) console.log(LOG_PREFIX + 'Adding window event listeners...');
    try {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleMouseUp);
      if (VERBOSE)
        console.log(LOG_PREFIX + 'Window event listeners successfully added.');
    } catch (error) {
      console.error(LOG_PREFIX + 'Error adding window event listeners:', error);
    }
  };

  const handleDragMove = (e: globalThis.MouseEvent) => {
    if (
      !isDragging.current ||
      !selectionOrigin.current ||
      !dragStartCoords.current
    ) {
      return;
    }

    const startX = dragStartCoords.current.x;
    const startY = dragStartCoords.current.y;
    const currentX = e.clientX;
    const currentY = e.clientY;

    const newRect = {
      left: Math.min(startX, currentX),
      top: Math.min(startY, currentY),
      width: Math.abs(currentX - startX),
      height: Math.abs(currentY - startY),
    };
    setSelectionRect(newRect);

    const elementAtPoint = document.elementFromPoint(currentX, currentY);
    if (!elementAtPoint) return;

    const textNodeElement = elementAtPoint.closest(
      '[data-parent-text-node-id]'
    );

    if (textNodeElement) {
      const parentBlockNodeId =
        textNodeElement
          .closest('[data-node-id]')
          ?.getAttribute('data-node-id') || null;

      if (parentBlockNodeId !== selectionOrigin.current.blockNodeId) {
        return;
      }

      const endNodeId = textNodeElement.getAttribute(
        'data-parent-text-node-id'
      );
      const endCharOffset = parseInt(
        textNodeElement.getAttribute('data-end-char-offset') || '0',
        10
      );

      if (endNodeId) {
        selectionStore.setKey('endNodeId', endNodeId);
        selectionStore.setKey('endCharOffset', endCharOffset);
      }
    }
  };

  const handleMouseUp = async (e: globalThis.MouseEvent) => {
    if (VERBOSE) console.log(LOG_PREFIX + 'handleMouseUp FIRED', { event: e });
    if (!isDragging.current) {
      if (VERBOSE)
        console.log(LOG_PREFIX + 'handleMouseUp aborted: was not dragging.');
      return;
    }

    if (VERBOSE) console.log(LOG_PREFIX + 'Removing window event listeners...');
    try {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (VERBOSE)
        console.log(
          LOG_PREFIX + 'Window event listeners successfully removed.'
        );
    } catch (error) {
      console.error(
        LOG_PREFIX + 'Error removing window event listeners:',
        error
      );
    }

    isDragging.current = false;
    dragStartCoords.current = null;
    setSelectionRect(null);
    if (VERBOSE)
      console.log(LOG_PREFIX + 'Drag state reset, selectionRect cleared.');

    const selectionRange = selectionStore.get();
    if (VERBOSE)
      console.log(
        LOG_PREFIX + 'Final selection range from store:',
        selectionRange
      );

    if (
      !selectionRange.startNodeId ||
      !selectionRange.endNodeId ||
      (selectionRange.startNodeId === selectionRange.endNodeId &&
        selectionRange.startCharOffset === selectionRange.endCharOffset)
    ) {
      if (VERBOSE)
        console.log(
          LOG_PREFIX +
            'handleMouseUp aborted: invalid or zero-length selection.'
        );
      resetSelectionStore();
      selectionOrigin.current = null;
      return;
    }

    if (VERBOSE)
      console.log(LOG_PREFIX + 'Calculating selection bounding box.');

    const startElement = document.querySelector(
      `[data-parent-text-node-id="${selectionRange.startNodeId}"][data-start-char-offset="${selectionRange.startCharOffset}"]`
    );
    const endElement = document.querySelector(
      `[data-parent-text-node-id="${selectionRange.endNodeId}"]`
    );

    let selectionBox = null;
    if (startElement && endElement) {
      const startRect = startElement.getBoundingClientRect();
      const endRect = endElement.getBoundingClientRect();
      const contentRect = document
        .getElementById('content')
        ?.getBoundingClientRect();

      if (contentRect) {
        selectionBox = {
          top: Math.min(startRect.top, endRect.top) - contentRect.top,
          left: Math.min(startRect.left, endRect.left) - contentRect.left,
        };
      }
    }

    if (selectionBox) {
      if (VERBOSE)
        console.log(LOG_PREFIX + 'Selection complete, setting isActive: true.');
      selectionStore.setKey('selectionBox', selectionBox);
      selectionStore.setKey('isActive', true);
    } else {
      if (VERBOSE)
        console.log(
          LOG_PREFIX + 'Could not calculate bounding box, resetting selection.'
        );
      resetSelectionStore();
    }

    selectionStore.setKey('isDragging', false);
    selectionOrigin.current = null;
  };

  useEffect(() => {
    fullContentMapStore.set(props.fullContentMap);
    hasAssemblyAIStore.set(props.config.HAS_AAI);
    urlParamsStore.set(props.urlParams);
    canonicalURLStore.set(props.fullCanonicalURL);
    preferredThemeStore.set(props.config.THEME as Theme);
    brandColourStore.set(props.config.BRAND_COLOURS);
    codehookMapStore.set(props.availableCodeHooks);
  }, [
    props.fullContentMap,
    props.config.HAS_AAI,
    props.config.THEME,
    props.config.BRAND_COLOURS,
    props.urlParams,
    props.fullCanonicalURL,
    props.availableCodeHooks,
  ]);

  // Initialize nodes tree and set up subscriptions
  useEffect(() => {
    if (VERBOSE) console.log(LOG_PREFIX + 'Compositor initializing...');
    getCtx(props).buildNodesTreeFromRowDataMadeNodes(props.nodes);
    hasArtpacksStore.set(ARTPACKS);
    setInitialized(true);
    if (VERBOSE)
      console.log(LOG_PREFIX + 'Nodes tree built, initialized set to true.');

    // Stop initial loading after initialization
    setTimeout(() => {
      setIsLoading(false);
      stopLoadingAnimation();
      if (VERBOSE)
        console.log(LOG_PREFIX + 'Initial loading animation stopped.');
    }, 300);

    const unsubscribe = getCtx(props).notifications.subscribe(
      ROOT_NODE_NAME,
      () => {
        if (VERBOSE)
          console.log(LOG_PREFIX + 'Received root notification, updating...');
        // Start loading state
        setIsLoading(true);

        // Update the tree immediately
        setUpdateCounter((prev) => prev + 1);

        // Stop loading after 300ms
        setTimeout(() => {
          setIsLoading(false);
          stopLoadingAnimation();
          if (VERBOSE)
            console.log(LOG_PREFIX + 'Update loading animation stopped.');
        }, 300);
      }
    );

    const unsubscribeToolMode = getCtx(props).toolModeValStore.subscribe(
      (mode) => {
        if (VERBOSE) console.log(LOG_PREFIX + 'Tool mode changed:', mode.value);
        if (mode.value !== 'styles') {
          if (VERBOSE)
            console.log(
              LOG_PREFIX + 'Exited styles mode, resetting selection store.'
            );
          resetSelectionStore();
          // Ensure drag state is also reset if mode changes mid-drag
          if (isDragging.current) {
            if (VERBOSE)
              console.log(
                LOG_PREFIX + 'Mode changed mid-drag, cleaning up listeners.'
              );
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleMouseUp);
            isDragging.current = false;
            dragStartCoords.current = null;
            setSelectionRect(null);
            selectionOrigin.current = null;
          }
        }
      }
    );

    // Cleanup function
    return () => {
      if (VERBOSE)
        console.log(LOG_PREFIX + 'Compositor unmounting, cleaning up...');
      unsubscribe();
      unsubscribeToolMode();
      stopLoadingAnimation();
      // Ensure listeners are removed on unmount
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (VERBOSE) console.log(LOG_PREFIX + 'Cleanup complete.');
    };
  }, []);

  useEffect(() => {
    const handleAction = async () => {
      if (!$selection.isActive || !$selection.pendingAction) {
        return;
      }

      const ctx = getCtx(props);
      const range = $selection;

      if ($selection.pendingAction === 'style') {
        if (VERBOSE) console.log(LOG_PREFIX + 'useEffect acting on: style');
        await ctx.wrapRangeInSpan(range as SelectionStoreState, 'span');
        resetSelectionStore();
      }

      if ($selection.pendingAction === 'link') {
        if (VERBOSE) console.log(LOG_PREFIX + 'useEffect acting on: link');
        const newAnchorNodeId = await ctx.wrapRangeInAnchor(
          range as SelectionStoreState
        );
        if (newAnchorNodeId) {
          ctx.handleInsertSignal('a', newAnchorNodeId);
        }
        resetSelectionStore();
      }
      ctx.notifyNode('root');
    };

    handleAction();
  }, [$selection.pendingAction, $selection.isActive]);

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

      {/* Selection drag box */}
      {selectionRect && (
        <div
          className="bg-mygreen/20 fixed z-50 border border-blue-600"
          style={{
            left: `${selectionRect.left}px`,
            top: `${selectionRect.top}px`,
            width: `${selectionRect.width}px`,
            height: `${selectionRect.height}px`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Main content */}
      {initialized && (
        <Node
          nodeId={props.id}
          key={`${props.id}-${updateCounter}`}
          ctx={props.ctx}
          config={props.config}
          onDragStart={handleDragStart}
        />
      )}
    </div>
  );
};
