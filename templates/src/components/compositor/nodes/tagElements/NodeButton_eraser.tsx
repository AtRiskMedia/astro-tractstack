import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import { getCtx } from '@/stores/nodes';
import { viewportKeyStore } from '@/stores/storykeep';
import { RenderChildren } from '../RenderChildren';
import type { NodeProps } from '@/types/nodeProps';

export const NodeButtonEraser = (props: NodeProps) => {
  return (
    <button
      className={` ${getCtx(props).getNodeClasses(props.nodeId, viewportKeyStore.get().value)} eraser-child group relative transition-all before:pointer-events-none before:absolute before:inset-0 before:opacity-50 before:outline-dashed before:outline-4 before:outline-red-700 hover:before:bg-red-600/50 hover:before:opacity-100 focus:before:bg-red-600/50 focus:before:opacity-100`}
      title="Delete Link"
      onClick={(e) => {
        getCtx(props).setClickedNodeId(props.nodeId);
        e.stopPropagation();
      }}
    >
      <div className="absolute right-2 top-2 rounded-full bg-red-700 p-0.5">
        <TrashIcon className="h-5 w-5 text-white" />
      </div>
      <RenderChildren
        children={getCtx(props).getChildNodeIDs(props.nodeId)}
        nodeProps={props}
      />
    </button>
  );
};
