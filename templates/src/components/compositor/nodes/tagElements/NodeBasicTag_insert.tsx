import { getCtx } from '@/stores/nodes';
import { viewportKeyStore } from '@/stores/storykeep';
import { RenderChildren } from '../RenderChildren';
import type { NodeProps } from '@/types/nodeProps';
import { tagTitles } from '@/types/compositorTypes';
import { getTemplateNode } from '@/utils/compositor/nodesHelper';
import { type JSX, type MouseEvent } from 'react';

type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

export const NodeBasicTagInsert = (props: NodeTagProps) => {
  const { value: toolAddMode } = getCtx(props).toolAddModeStore.get();
  console.log(toolAddMode);
  const nodeId = props.nodeId;
  const { allowInsertBefore, allowInsertAfter } =
    props.tagName !== 'li'
      ? getCtx(props).allowInsert(nodeId, toolAddMode)
      : getCtx(props).allowInsertLi(nodeId, toolAddMode);
  const children = getCtx(props).getChildNodeIDs(props.nodeId);

  const Tag = props.tagName;
  const newTagTitle = tagTitles[toolAddMode];

  const handleInsertAbove = (e: MouseEvent) => {
    e.stopPropagation();
    const templateNode = getTemplateNode(
      getCtx(props).toolAddModeStore.get().value
    );
    const newNodeId = getCtx(props).addTemplateNode(
      props.nodeId,
      templateNode,
      props.nodeId,
      'before'
    );
    if (newNodeId && templateNode.tagName)
      handleInsertSignal(templateNode.tagName, newNodeId);
  };

  const handleInsertBelow = (e: MouseEvent) => {
    e.stopPropagation();
    const templateNode = getTemplateNode(
      getCtx(props).toolAddModeStore.get().value
    );
    const newNodeId = getCtx(props).addTemplateNode(
      props.nodeId,
      templateNode,
      props.nodeId,
      'after'
    );
    if (newNodeId && templateNode.tagName)
      handleInsertSignal(templateNode.tagName, newNodeId);
  };

  const handleInsertSignal = (tagName: string, nodeId: string) => {
    getCtx(props).handleInsertSignal(tagName, nodeId);
  };

  const handleClickIntercept = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const InsertButtons = () => (
    <div
      className={`absolute left-2 top-2 z-10 flex items-center gap-2 transition-opacity`}
    >
      {(allowInsertBefore || allowInsertAfter) && (
        <div className="rounded-full bg-gray-200 px-2 py-1 text-sm text-gray-800">
          Insert {newTagTitle}
        </div>
      )}
      {allowInsertBefore && (
        <button
          onClick={handleInsertAbove}
          className="z-10 rounded bg-white px-2 py-1 text-sm text-cyan-700 shadow-sm transition-colors hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white"
        >
          + Above
        </button>
      )}
      {allowInsertAfter && (
        <button
          onClick={handleInsertBelow}
          className="z-10 rounded bg-white px-2 py-1 text-sm text-cyan-700 shadow-sm transition-colors hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white"
        >
          + Below
        </button>
      )}
      {!allowInsertBefore && !allowInsertAfter && (
        <button
          className="rounded bg-white px-2 py-1 text-sm text-cyan-700 opacity-50 shadow-sm transition-colors"
          disabled={true}
        >
          + Can't Insert {newTagTitle} Here
        </button>
      )}
    </div>
  );

  return (
    <div className="group relative">
      <div className="relative">
        {/* Click interceptor layer */}
        <div
          className="absolute inset-0 z-10"
          onClick={handleClickIntercept}
          onMouseDown={handleClickIntercept}
          onMouseUp={handleClickIntercept}
        />
        <div className="absolute inset-0">
          <div className="h-full w-full opacity-50 mix-blend-difference outline-dashed outline-4 outline-cyan-600 group-focus-within:opacity-100 group-hover:opacity-100" />
        </div>
        <InsertButtons />
        <Tag
          className={`${getCtx(props).getNodeClasses(nodeId, viewportKeyStore.get().value)} pt-12`}
        >
          <RenderChildren children={children} nodeProps={props} />
        </Tag>
      </div>
    </div>
  );
};
