import { type JSX } from 'react';
import ArrowDownIcon from '@heroicons/react/24/outline/ArrowDownIcon';
import ArrowUpIcon from '@heroicons/react/24/outline/ArrowUpIcon';
import { getCtx } from '@/stores/nodes';
import { viewportKeyStore } from '@/stores/storykeep';
import { RenderChildren } from '../RenderChildren';
import type { FlatNode } from '@/types/compositorTypes';
import type { NodeProps } from '@/types/nodeProps';

type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

export const NodeBasicTagSettings = (props: NodeTagProps) => {
  const nodeId = props.nodeId;
  const node = getCtx(props).allNodes.get().get(nodeId) as FlatNode;
  const children = getCtx(props).getChildNodeIDs(props.nodeId);
  const Tag = props.tagName;

  const canMove = (/*direction: "before" | "after"*/): boolean => {
    console.log(`TODO-- wire into allowInsert for proper signal`);
    const hasCodeChildren = getCtx(props).getChildNodeByTagNames(nodeId, [
      'code',
    ]);
    // only ul/ol can move code nodes
    if (hasCodeChildren && node.tagName === 'li') {
      return false;
    }
    return true;
  };

  const SettingsButtons = () => (
    <div
      className={`absolute left-2 top-2 z-10 flex items-center gap-2 transition-opacity`}
    >
      {canMove(/*"after"*/) && (
        <button onClick={() => getCtx().moveNode(nodeId, 'after')}>
          <div className="inline-flex items-center rounded-b-md bg-gray-200 px-2 py-1 text-sm text-gray-800">
            <ArrowDownIcon className="mr-1 h-6 w-6" />
          </div>
        </button>
      )}
      {canMove(/*"before"*/) && (
        <button onClick={() => getCtx().moveNode(nodeId, 'before')}>
          <div className="inline-flex items-center rounded-b-md bg-gray-200 px-2 py-1 text-sm text-gray-800">
            <ArrowUpIcon className="mr-1 h-6 w-6" />
          </div>
        </button>
      )}
    </div>
  );

  return (
    <div className="group relative">
      <div className="relative">
        <div className="absolute inset-0">
          <div className="h-full w-full opacity-50 outline-dashed outline-4 outline-cyan-600 group-focus-within:opacity-100 group-hover:opacity-100" />
        </div>
        <SettingsButtons />
        <Tag
          className={`${getCtx(props).getNodeClasses(nodeId, viewportKeyStore.get().value)} pt-12`}
        >
          <RenderChildren children={children} nodeProps={props} />
        </Tag>
      </div>
    </div>
  );
};
