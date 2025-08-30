import { useEffect, useState } from 'react';
import { getCtx } from '@/stores/nodes';
import { viewportKeyStore } from '@/stores/storykeep';
import { RenderChildren } from './RenderChildren';
import type { NodeProps } from '@/types/nodeProps';

export const StoryFragment = (props: NodeProps) => {
  //console.log(`Rendering StoryFragment with id: ${props.nodeId}`);
  const [children, setChildren] = useState<string[]>([
    ...getCtx(props).getChildNodeIDs(props.nodeId),
  ]);

  useEffect(() => {
    const unsubscribe = getCtx(props).notifications.subscribe(
      props.nodeId,
      () => {
        //console.log(" !! StoryFragment received notification:", props.nodeId);
        setChildren([...getCtx(props).getChildNodeIDs(props.nodeId)]);
      }
    );
    return unsubscribe;
  }, [props.nodeId]);

  return (
    <div
      className={getCtx(props).getNodeClasses(
        props.nodeId,
        viewportKeyStore.get().value
      )}
      style={getCtx(props).getNodeCSSPropertiesStyles(props.nodeId)}
    >
      <RenderChildren children={children} nodeProps={props} />
    </div>
  );
};
