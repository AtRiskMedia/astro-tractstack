import { NodesContext } from '@/stores/nodes';
import type { BrandConfig } from './tractstack';
import type { Tag } from './compositorTypes';

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

export type ElementStylesMemory = {
  [key in Tag]?: {
    mobile: Record<string, string>;
    tablet: Record<string, string>;
    desktop: Record<string, string>;
  };
};

export type ParentStylesMemory = {
  parentClasses: Array<{
    mobile: Record<string, string>;
    tablet: Record<string, string>;
    desktop: Record<string, string>;
  }>;
  bgColour: string | null;
};

export type ButtonStylesMemory = {
  buttonClasses: Record<string, string[]>;
  buttonHoverClasses: Record<string, string[]>;
};

// Image Operations Types (from legacy storykeep.ts)
export interface PendingImageOperation {
  type: 'upload' | 'remove' | 'custom';
  data?: string;
  path?: string;
  filename?: string;
}

export type PendingImageOperationsStore = {
  [storyFragmentId: string]: PendingImageOperation | null;
};

// Topics Management Types (from legacy storykeep.ts)
export interface Topic {
  id?: string | number;
  title: string;
}

export interface StoryFragmentTopicsData {
  description: string;
  topics: Topic[];
}
