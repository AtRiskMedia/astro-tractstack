import { NodeAnchorComponent } from './NodeAnchorComponent';
import type { NodeProps } from '@/types/nodeProps';

export const NodeA = (props: NodeProps) =>
  NodeAnchorComponent({ ...props, isSelectableText: false }, 'a');
