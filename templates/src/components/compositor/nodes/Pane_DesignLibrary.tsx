import {
  type CSSProperties,
  type MouseEvent,
  useEffect,
  useState,
} from 'react';
import { useStore } from '@nanostores/react';
import ArchiveBoxArrowDownIcon from '@heroicons/react/24/outline/ArchiveBoxArrowDownIcon';
import ArrowPathRoundedSquareIcon from '@heroicons/react/24/outline/ArrowPathRoundedSquareIcon';
import ArrowDownTrayIcon from '@heroicons/react/24/outline/ArrowDownTrayIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import SparklesIcon from '@heroicons/react/24/solid/SparklesIcon';
import { viewportKeyStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { RenderChildren } from './RenderChildren';
import { CodeHookContainer } from './Pane';
import type { NodeProps } from '@/types/nodeProps';
import type { BgImageNode, ArtpackImageNode } from '@/types/compositorTypes';
import { SaveToLibraryModal } from '@/components/edit/state/SaveToLibraryModal';
import { RestylePaneModal } from '@/components/edit/pane/RestylePaneModal';
import { AiRestylePaneModal } from '@/components/edit/pane/AiRestylePaneModal';
import { CreativePane } from './CreativePane';
import { selectionStore } from '@/stores/selection';
import { copyPaneToClipboard } from '@/utils/compositor/designLibraryHelper';
import type { PaneNode } from '@/types/compositorTypes';

function getSizeClasses(
  size: string,
  side: 'image' | 'content',
  viewport: string
): string {
  if (viewport === 'mobile') {
    return 'w-full';
  }
  switch (size) {
    case 'narrow':
      return side === 'image' ? 'w-1/3' : 'w-2/3';
    case 'wide':
      return side === 'image' ? 'w-2/3' : 'w-1/3';
    default:
      return 'w-1/2';
  }
}

export const Pane_DesignLibrary = (props: NodeProps) => {
  const ctx = getCtx(props);
  const paneNode = getCtx(props).allNodes.get().get(props.nodeId);
  const isHtmlAstPane = !!(paneNode as PaneNode).htmlAst;
  const { isRestyleModalOpen, isAiRestyleModalOpen } = useStore(
    selectionStore,
    {
      keys: ['isRestyleModalOpen', 'isAiRestyleModalOpen'],
    }
  );
  const [currentViewport, setCurrentViewport] = useState(
    viewportKeyStore.get().value
  );

  useEffect(() => {
    const unsubscribeViewport = viewportKeyStore.subscribe((newViewport) => {
      setCurrentViewport(newViewport.value);
    });
    return () => unsubscribeViewport();
  }, []);

  const wrapperClasses = `grid ${ctx.getNodeClasses(props.nodeId, currentViewport)}`;
  const contentClasses = 'relative w-full h-auto justify-self-start';
  const contentStyles: CSSProperties = {
    ...ctx.getNodeCSSPropertiesStyles(props.nodeId),
    gridArea: '1/1/1/1',
    position: 'relative',
    zIndex: 1,
  };
  const codeHookPayload = ctx.getNodeCodeHookPayload(props.nodeId);
  const [children, setChildren] = useState<string[]>([
    ...ctx.getChildNodeIDs(props.nodeId),
  ]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [wasCopied, setWasCopied] = useState(false);
  const [renderCount, setRenderCount] = useState(0);

  const getPaneId = (): string => `pane-${props.nodeId}`;

  useEffect(() => {
    const unsubscribe = ctx.notifications.subscribe(props.nodeId, () => {
      setChildren([...ctx.getChildNodeIDs(props.nodeId)]);
      setRenderCount((prev) => prev + 1);
    });
    return unsubscribe;
  }, [props.nodeId, ctx.notifications]);

  const handleRestyleClick = (e: MouseEvent) => {
    e.stopPropagation();
    selectionStore.setKey('paneToRestyleId', props.nodeId);
    selectionStore.setKey('isRestyleModalOpen', true);
  };

  const handleAiRestyleClick = (e: MouseEvent) => {
    e.stopPropagation();
    selectionStore.setKey('paneToRestyleId', props.nodeId);
    selectionStore.setKey('isAiRestyleModalOpen', true);
  };

  const handleSaveClick = (e: MouseEvent) => {
    e.stopPropagation();
    setIsSaveModalOpen(true);
  };

  const handleCopyToClipboard = async (e: MouseEvent) => {
    e.stopPropagation();
    const success = await copyPaneToClipboard(props.nodeId);
    if (success) {
      setWasCopied(true);
      setTimeout(() => setWasCopied(false), 2000);
    }
  };

  const Buttons = () => (
    <div className="absolute left-2 top-2 z-10 flex flex-row gap-x-2">
      {!props.isSandboxMode && (
        <button
          title="Save Pane to Design Library"
          onClick={handleSaveClick}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-600 p-1.5 shadow-lg hover:bg-cyan-700"
        >
          <ArchiveBoxArrowDownIcon className="h-7 w-7 text-white" />
        </button>
      )}
      <button
        title="Re-Color"
        onClick={handleAiRestyleClick}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 p-1.5 shadow-lg hover:bg-purple-700"
      >
        <SparklesIcon className="h-5 w-5 text-white" />
      </button>
      <button
        title="Restyle Pane from Design Library"
        onClick={handleRestyleClick}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 p-1.5 shadow-lg hover:bg-blue-700"
      >
        <ArrowPathRoundedSquareIcon className="h-7 w-7 text-white" />
      </button>
      <button
        title="Copy Pane Design to Clipboard"
        onClick={handleCopyToClipboard}
        className={`flex h-10 w-10 items-center justify-center rounded-full p-1.5 shadow-lg transition-colors ${
          wasCopied ? 'bg-green-500' : 'bg-gray-600 hover:bg-gray-700'
        }`}
      >
        {wasCopied ? (
          <CheckIcon className="h-7 w-7 text-white" />
        ) : (
          <ArrowDownTrayIcon className="h-7 w-7 text-white" />
        )}
      </button>
    </div>
  );

  const AstButtons = () => (
    <div className="absolute left-2 top-2 z-101 flex flex-row gap-x-2">
      <button
        title="Re-Style"
        onClick={handleAiRestyleClick}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 p-1.5 shadow-lg hover:bg-purple-700"
      >
        <SparklesIcon className="h-5 w-5 text-white" />
      </button>
    </div>
  );

  const allNodes = ctx.allNodes.get();
  const bgNode = children
    .map((id) => allNodes.get(id))
    .find(
      (node) =>
        node?.nodeType === 'BgPane' &&
        'type' in node &&
        (node.type === 'background-image' || node.type === 'artpack-image')
    ) as (BgImageNode | ArtpackImageNode) | undefined;

  const useFlexLayout =
    bgNode &&
    (bgNode.position === 'leftBleed' || bgNode.position === 'rightBleed');
  const deferFlexLayout =
    bgNode && (bgNode.position === 'left' || bgNode.position === 'right');

  const flexDirection =
    currentViewport === 'mobile'
      ? 'flex-col'
      : bgNode?.position === 'rightBleed'
        ? 'flex-row-reverse'
        : 'flex-row';

  return (
    <div id={getPaneId()} className="pane min-h-16">
      <div
        id={ctx.getNodeSlug(props.nodeId)}
        className={useFlexLayout ? '' : wrapperClasses}
      >
        {isHtmlAstPane ? (
          <div className="relative">
            <AstButtons />
            <CreativePane
              nodeId={props.nodeId}
              htmlAst={(paneNode as PaneNode).htmlAst!}
              isProtected={true}
            />
          </div>
        ) : codeHookPayload ? (
          <div className={contentClasses} style={contentStyles}>
            <Buttons />
            <CodeHookContainer payload={codeHookPayload} />
          </div>
        ) : useFlexLayout ? (
          <div
            className={`flex flex-nowrap ${flexDirection} ${ctx.getNodeClasses(props.nodeId, currentViewport)}`}
          >
            <div
              className={`relative overflow-hidden ${getSizeClasses(bgNode.size || 'equal', 'image', currentViewport)}`}
            >
              <RenderChildren
                children={children.filter((id) => {
                  const node = allNodes.get(id);
                  return node?.nodeType === 'BgPane';
                })}
                nodeProps={props}
                key={`bg-children-${props.nodeId}-${renderCount}`}
              />
            </div>
            <div
              className={`${contentClasses} ${getSizeClasses(bgNode.size || 'equal', 'content', currentViewport)}`}
              style={ctx.getNodeCSSPropertiesStyles(props.nodeId)}
              onClick={(e) => {
                ctx.setClickedNodeId(props.nodeId);
                e.stopPropagation();
              }}
            >
              <Buttons />
              <RenderChildren
                children={children.filter((id) => {
                  const node = allNodes.get(id);
                  return node?.nodeType !== 'BgPane';
                })}
                nodeProps={props}
                key={`content-children-${props.nodeId}-${renderCount}`}
              />
            </div>
          </div>
        ) : deferFlexLayout ? (
          <div
            className={contentClasses}
            style={contentStyles}
            onClick={(e) => {
              ctx.setClickedNodeId(props.nodeId);
              e.stopPropagation();
            }}
          >
            <Buttons />
            <RenderChildren
              children={children.filter((id) => {
                const node = allNodes.get(id);
                return node?.nodeType !== 'BgPane';
              })}
              nodeProps={props}
              key={`content-children-${props.nodeId}-${renderCount}`}
            />
          </div>
        ) : (
          <div
            className={contentClasses}
            style={contentStyles}
            onClick={(e) => {
              ctx.setClickedNodeId(props.nodeId);
              e.stopPropagation();
            }}
          >
            <Buttons />
            <RenderChildren
              children={children}
              nodeProps={props}
              key={`render-children-${props.nodeId}-${renderCount}`}
            />
          </div>
        )}
      </div>
      {isSaveModalOpen && (
        <SaveToLibraryModal
          paneId={props.nodeId}
          onClose={() => setIsSaveModalOpen(false)}
        />
      )}

      {isRestyleModalOpen && <RestylePaneModal />}
      {isAiRestyleModalOpen && (
        <AiRestylePaneModal isSandboxMode={props.isSandboxMode} />
      )}
    </div>
  );
};
