import { NodeAnchorComponent } from './NodeAnchorComponent';
import type { NodeProps } from '@/types/nodeProps';

export const NodeButton = (props: NodeProps) =>
  NodeAnchorComponent({ ...props, isSelectableText: false }, 'button');
