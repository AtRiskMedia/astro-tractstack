import { type JSX, type MouseEvent, type KeyboardEvent } from 'react';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import { getCtx } from '@/stores/nodes';
import { viewportKeyStore } from '@/stores/storykeep';
import { RenderChildren } from '../RenderChildren';
import { tagTitles } from '@/types/compositorTypes';
import type { NodeProps } from '@/types/nodeProps';

type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

export const NodeBasicTagEraser = (props: NodeTagProps) => {
  const nodeId = props.nodeId;
  const children = getCtx(props).getChildNodeIDs(props.nodeId);

  const Tag = props.tagName;
  const tagTitle =
    tagTitles[props.tagName as keyof typeof tagTitles] || props.tagName;

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    getCtx(props).setClickedNodeId(nodeId);
  };

  const EraserUI = () => (
    <div
      className={`pointer-events-none absolute left-2 top-2 z-50 flex items-center gap-2 transition-opacity`}
    >
      <div className="rounded-full bg-gray-200 px-2 py-1 text-sm text-gray-800">
        {tagTitle}
      </div>
      <div className="flex items-center gap-1 rounded bg-white px-2 py-1 text-sm text-red-700 shadow-sm transition-colors group-focus-within:bg-red-700 group-focus-within:text-white group-hover:bg-red-700 group-hover:text-white">
        <TrashIcon className="h-4 w-4" />
      </div>
    </div>
  );

  return (
    <div
      className="group relative cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as unknown as MouseEvent);
        }
      }}
    >
      <div className="absolute inset-0">
        <div className="h-full w-full opacity-50 mix-blend-difference outline-dashed outline-4 outline-red-700 group-focus-within:opacity-100 group-hover:opacity-100" />
      </div>
      <EraserUI />
      <Tag
        className={`${getCtx(props).getNodeClasses(nodeId, viewportKeyStore.get().value)} pt-12`}
      >
        <RenderChildren children={children} nodeProps={props} />
      </Tag>
    </div>
  );
};
