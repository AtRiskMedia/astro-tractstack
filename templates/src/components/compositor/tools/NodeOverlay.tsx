import {
  useState,
  useRef,
  useEffect,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { useStore } from '@nanostores/react';
import PencilSquareIcon from '@heroicons/react/24/outline/PencilSquareIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import { getCtx } from '@/stores/nodes';
import { settingsPanelStore } from '@/stores/storykeep';
import { handleClickEventDefault } from '@/utils/compositor/handleClickEvent';
import { getTemplateNode } from '@/utils/compositor/nodesHelper';
import { classNames } from '@/utils/helpers';
import type { NodeProps } from '@/types/nodeProps';
import type { FlatNode } from '@/types/compositorTypes';

interface NodeOverlayProps extends NodeProps {
  children: ReactNode;
  isTopLevel: boolean;
  isInline?: boolean;
}

const getIconForTag = (tagName?: string): string | null => {
  const t = tagName?.toLowerCase() || '';
  if (['h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'code'].includes(t)) {
    return `/icons/${t}.svg`;
  }
  if (t === 'img' || t === 'image') return '/icons/image.svg';
  if (t === 'a' || t === 'button') return '/icons/link.svg';
  return null;
};

export const NodeOverlay = ({
  nodeId,
  children,
  isTopLevel,
  isInline,
  ...props
}: NodeOverlayProps) => {
  const ctx = getCtx({ nodeId, ...props });
  const toolMode = useStore(ctx.toolModeValStore).value;
  const toolAddMode = useStore(ctx.toolAddModeStore).value;
  const settingsPanel = useStore(settingsPanelStore);
  const [hoverZone, setHoverZone] = useState<'before' | 'after' | null>(null);

  // put a contentEditable={false} component inside a tree that inherits contentEditable={true}.
  const chromeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chromeRef.current) {
      chromeRef.current.contentEditable = 'false';
    }
  });

  const node = ctx.allNodes.get().get(nodeId) as FlatNode;
  if (!node) return <>{children}</>;

  const zIndexClass = isTopLevel ? 'z-101 hover:z-103' : 'z-101 hover:z-104';

  const isSelected = settingsPanel?.nodeId === nodeId;

  const outlineClass = isSelected
    ? 'outline outline-4 outline-dotted outline-orange-400 outline-offset-2'
    : 'hover:outline hover:outline-2 hover:outline-dotted hover:outline-cyan-500 hover:outline-offset-2';

  const handleEditClick = (e: MouseEvent) => {
    e.stopPropagation();
    handleClickEventDefault(node, true);
  };

  const handleDeleteClick = (e: MouseEvent) => {
    e.stopPropagation();
    ctx.deleteNode(nodeId);
  };

  const handleCopyIdClick = (e: MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(nodeId);
  };

  const handleInsert = (location: 'before' | 'after', e: MouseEvent) => {
    e.stopPropagation();

    const tagName = toolAddMode || 'p';
    const templateNode = getTemplateNode(tagName);

    if (templateNode) {
      ctx.addTemplateNode(nodeId, templateNode, nodeId, location);
    }
  };

  const canInsert =
    toolMode === 'insert'
      ? ctx.allowInsert(nodeId, toolAddMode || 'p')
      : { allowInsertBefore: false, allowInsertAfter: false };

  const iconSrc = getIconForTag(node.tagName);

  return (
    <div
      className={classNames(
        'compositor-wrapper group relative transition-all duration-200',
        zIndexClass,
        toolMode === 'text' ? outlineClass : ''
      )}
      style={isInline ? { display: 'inline-block' } : {}}
      data-node-overlay={nodeId}
    >
      {children}

      {/* Text Mode: Tool Cart */}
      {toolMode === 'text' && (
        <div
          ref={chromeRef}
          className="node-overlay compositor-chrome absolute flex gap-1 opacity-10 transition-opacity duration-200 group-hover:opacity-100"
          style={{
            top: '-24px',
            right: 0,
            zIndex: 10,
          }}
          onClick={(e) => e.stopPropagation()}
          data-attr="exclude"
        >
          <button
            onClick={handleCopyIdClick}
            className="flex h-6 w-auto min-w-px cursor-help items-center justify-center px-1"
            title={`${node.tagName}: ${nodeId}`}
          >
            {iconSrc && (
              <img
                src={iconSrc}
                alt={node.tagName || 'node'}
                className="h-3.5 w-auto"
              />
            )}
          </button>

          <button
            onClick={handleEditClick}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-white shadow-md hover:scale-110 hover:bg-cyan-600"
            title="Edit Styles"
          >
            <PencilSquareIcon className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleDeleteClick}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:scale-110 hover:bg-red-600"
            title="Delete Element"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Insert Mode: Split Drop Zones */}
      {toolMode === 'insert' && toolAddMode !== `span` && (
        <div
          className="compositor-chrome absolute inset-0 z-50 flex flex-col"
          data-attr="exclude"
        >
          {/* Top / Before Zone */}
          <div
            className={classNames(
              'flex-1 transition-colors duration-200',
              canInsert.allowInsertBefore
                ? 'cursor-pointer hover:bg-blue-500/10'
                : 'cursor-not-allowed opacity-0'
            )}
            onMouseEnter={() => setHoverZone('before')}
            onMouseLeave={() => setHoverZone(null)}
            onClick={(e) =>
              canInsert.allowInsertBefore && handleInsert('before', e)
            }
          >
            {canInsert.allowInsertBefore && (
              <div
                className={classNames(
                  'absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 transform transition-opacity duration-200',
                  hoverZone === 'before' ? 'opacity-100' : 'opacity-40'
                )}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                  <PlusIcon className="h-3.5 w-3.5" />
                </div>
              </div>
            )}
          </div>

          {/* Bottom / After Zone */}
          <div
            className={classNames(
              'flex-1 transition-colors duration-200',
              canInsert.allowInsertAfter
                ? 'cursor-pointer hover:bg-blue-500/10'
                : 'cursor-not-allowed opacity-0'
            )}
            onMouseEnter={() => setHoverZone('after')}
            onMouseLeave={() => setHoverZone(null)}
            onClick={(e) =>
              canInsert.allowInsertAfter && handleInsert('after', e)
            }
          >
            {canInsert.allowInsertAfter && (
              <div
                className={classNames(
                  'absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 transform transition-opacity duration-200',
                  hoverZone === 'after' ? 'opacity-100' : 'opacity-40'
                )}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                  <PlusIcon className="h-3.5 w-3.5" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
