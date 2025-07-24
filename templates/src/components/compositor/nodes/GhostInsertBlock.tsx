import { memo, useMemo, useState } from 'react';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import {
  isTemplateToolAddModes,
  toolAddModes,
  toolAddModesIcons,
  toolAddModeTitles,
} from '@/constants';
import { settingsPanelStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { getTemplateNode } from '@/utils/compositor/nodesHelper';
import allowInsert from '@/utils/compositor/allowInsert';
import type { ToolAddMode, FlatNode, Tag } from '@/types/compositorTypes';
import type { NodeProps } from '@/types/nodeProps';

type GhostInsertBlockProps = NodeProps & {
  isEmpty: boolean;
  lastChildId: string | null;
};

export const GhostInsertBlock = memo((props: GhostInsertBlockProps) => {
  const { isEmpty, lastChildId } = props;
  const [showInsertOptions, setShowInsertOptions] = useState(false);

  const isTemplate = getCtx(props).isTemplate.get();
  const $toolAddModes = isTemplate ? isTemplateToolAddModes : toolAddModes;
  const parentNode = getCtx(props).allNodes.get().get(props.nodeId) as FlatNode;
  const lastChildNode = lastChildId
    ? (getCtx(props).allNodes.get().get(lastChildId) as FlatNode)
    : null;

  const allowedModes = useMemo(() => {
    const contextNode = isEmpty ? parentNode : lastChildNode;
    if (!contextNode) return [];
    return $toolAddModes.filter((mode) =>
      typeof contextNode.tagName === `string`
        ? allowInsert(
            contextNode,
            contextNode.tagName as Tag,
            mode as Tag,
            undefined
          )
        : false
    );
  }, [isEmpty, lastChildId, parentNode, lastChildNode]);

  const handleInsert = (mode: ToolAddMode, e: React.MouseEvent) => {
    e.stopPropagation();
    const templateNode = getTemplateNode(mode);
    let newNodeId: string | null = null;
    try {
      if (isEmpty) {
        if (!allowedModes.includes(mode)) {
          console.warn(`Insertion of ${mode} not allowed in empty container`);
          return;
        }
        newNodeId = getCtx(props).addTemplateNode(props.nodeId, templateNode);
      } else if (lastChildId && lastChildNode) {
        if (!allowedModes.includes(mode)) {
          console.warn(
            `Insertion of ${mode} after ${lastChildNode.tagName} not allowed`
          );
          return;
        }
        newNodeId = getCtx(props).addTemplateNode(
          lastChildId,
          templateNode,
          lastChildId,
          'after'
        );
      }
      if (newNodeId && templateNode.tagName) {
        getCtx(props).handleInsertSignal(templateNode.tagName, newNodeId);
      }
    } catch (error) {
      console.error('Insertion failed:', error);
    }
    setShowInsertOptions(false);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    getCtx(props).setPanelMode('', '', '');
    setShowInsertOptions(false);
  };

  const TextElementButtons = () => (
    <div className="flex flex-wrap gap-2 p-2">
      {['p', 'h2', 'h3', 'h4']
        .filter((mode) => allowedModes.includes(mode as ToolAddMode))
        .map((mode) => (
          <button
            key={mode}
            onClick={(e) => handleInsert(mode as ToolAddMode, e)}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-800 shadow-sm transition-colors hover:border-cyan-700 hover:bg-cyan-600 hover:text-white"
          >
            {toolAddModeTitles[mode as ToolAddMode]}
          </button>
        ))}
    </div>
  );

  const ElementButtons = () => (
    <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3">
      {$toolAddModes
        .filter((mode) => !['p', 'h2', 'h3', 'h4'].includes(mode))
        .filter((mode) => allowedModes.includes(mode))
        .map((mode) => (
          <button
            key={mode}
            onClick={(e) => handleInsert(mode, e)}
            className="flex flex-col items-center rounded border border-gray-300 bg-white p-2 text-gray-800 shadow-sm transition-colors hover:border-cyan-700 hover:bg-cyan-600 hover:text-white"
          >
            {toolAddModesIcons[mode] ? (
              <img
                src={`/icons/${toolAddModesIcons[mode]}`}
                alt={toolAddModeTitles[mode]}
                className="mb-1 h-8 w-8"
              />
            ) : (
              <span className="mb-1 text-3xl">+</span>
            )}
            <span className="text-xs font-bold">{toolAddModeTitles[mode]}</span>
          </button>
        ))}
    </div>
  );

  // Check if there are any allowed non-text elements
  const hasAllowedElements = $toolAddModes
    .filter((mode) => !['p', 'h2', 'h3', 'h4'].includes(mode))
    .some((mode) => allowedModes.includes(mode));

  if (isEmpty) {
    return (
      <div className="my-4">
        {showInsertOptions ? (
          <div className="rounded-lg border-2 border-cyan-600 bg-white p-3 text-gray-800 shadow-lg">
            <div className="mb-3 flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-bold">Add content</h3>
              <button
                onClick={handleClose}
                className="rounded-full bg-gray-200 p-1 hover:bg-gray-300"
                title="Close"
              >
                <XMarkIcon className="h-5 w-5 text-gray-700" />
              </button>
            </div>
            <TextElementButtons />
            {hasAllowedElements && (
              <>
                <div className="my-2 text-center text-sm text-gray-500">or</div>
                <ElementButtons />
              </>
            )}
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              settingsPanelStore.set(null);
              setShowInsertOptions(true);
            }}
            className="group w-full rounded-lg border-2 border-dashed border-cyan-500 bg-cyan-50 p-6 transition-colors hover:bg-cyan-100 dark:border-cyan-600 dark:bg-cyan-900 dark:hover:bg-cyan-800"
          >
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="rounded-full bg-cyan-100 p-2 group-hover:bg-cyan-200 dark:bg-cyan-800 dark:group-hover:bg-cyan-700">
                <PlusIcon className="h-6 w-6 text-cyan-700 dark:text-cyan-300" />
              </div>
              <div className="font-bold text-cyan-800 dark:text-cyan-300">
                Add content
              </div>
            </div>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="my-4">
      {showInsertOptions ? (
        <div className="rounded-lg border-2 border-cyan-600 bg-white p-3 text-gray-800 shadow-lg">
          <div className="mb-3 flex items-center justify-between border-b pb-2">
            <h3 className="text-lg font-bold">Add content</h3>
            <button
              onClick={handleClose}
              className="rounded-full bg-gray-200 p-1 hover:bg-gray-300"
              title="Close"
            >
              <XMarkIcon className="h-5 w-5 text-gray-700" />
            </button>
          </div>
          <TextElementButtons />
          {hasAllowedElements && (
            <>
              <div className="my-2 text-center text-sm text-gray-500">or</div>
              <ElementButtons />
            </>
          )}
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            settingsPanelStore.set(null);
            getCtx(props).setPanelMode(props.nodeId, 'insert', 'insert');
            setShowInsertOptions(true);
          }}
          className="group w-full rounded border border-dashed border-cyan-500 bg-cyan-50 py-3 transition-colors hover:bg-cyan-100 dark:border-cyan-600 dark:bg-cyan-900 dark:hover:bg-cyan-800"
        >
          <div className="flex items-center justify-center space-x-2">
            <PlusIcon className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
            <span className="text-sm font-bold text-cyan-800 dark:text-cyan-300">
              Add new element
            </span>
          </div>
        </button>
      )}
    </div>
  );
});
