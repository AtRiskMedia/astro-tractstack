import { NodesContext } from '@/stores/nodes';
import type { BrandConfig } from './tractstack';

export interface WidgetProps {
  nodeId: string;
  ctx?: NodesContext;
  hook: string | null;
  value1: string | null;
  value2: string | null;
  value3: string;
}

export type NodeProps = {
  nodeId: string;
  config?: BrandConfig;
  ctx?: NodesContext;
  first?: boolean;
};

export type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };
