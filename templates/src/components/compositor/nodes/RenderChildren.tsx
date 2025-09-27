import Node from '../Node';
import type { NodeProps } from '@/types/nodeProps';
import type { CompositorProps } from '../Compositor';

export type RenderChildrenProps = {
  children: string[];
  nodeProps: NodeProps | CompositorProps;
};

export const RenderChildren = (props: RenderChildrenProps) => {
  const { children, nodeProps } = props;
  return (
    <>
      {children.map((id: string) => (
        <Node
          nodeId={id}
          key={id}
          ctx={nodeProps.ctx}
          config={nodeProps.config}
        />
      ))}
    </>
  );
};
