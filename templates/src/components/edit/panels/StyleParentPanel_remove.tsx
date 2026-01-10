import { useState, useCallback, useMemo } from 'react';
import { settingsPanelStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { cloneDeep } from '@/utils/helpers';
import {
  isMarkdownPaneFragmentNode,
  isGridLayoutNode,
} from '@/utils/compositor/typeGuards';
import type {
  ParentBasePanelProps,
  MarkdownPaneFragmentNode,
  GridLayoutNode,
  DefaultClassValue,
} from '@/types/compositorTypes';

type StyleableNode = MarkdownPaneFragmentNode | GridLayoutNode;

// This custom prop is passed via the settingsPanelStore signal.
type CustomPanelProps = ParentBasePanelProps & {
  targetProperty: 'parentClasses' | 'gridClasses' | undefined;
};

const StyleParentPanelRemove = ({
  node,
  layer,
  className,
  targetProperty,
}: CustomPanelProps) => {
  const [confirm, setConfirm] = useState(false);
  const ctx = getCtx();

  const styleableNode = node as StyleableNode | null;

  if (
    !targetProperty ||
    !styleableNode ||
    (!isMarkdownPaneFragmentNode(styleableNode) &&
      !isGridLayoutNode(styleableNode))
  ) {
    return null;
  }

  const values = useMemo(() => {
    if (!styleableNode || !layer || !className) {
      return { mobile: '', tablet: '', desktop: '' };
    }

    let classesSource: DefaultClassValue | undefined;

    if (targetProperty === 'parentClasses') {
      const layerIndex = layer - 1;
      classesSource = styleableNode.parentClasses?.[layerIndex];
    } else if (
      targetProperty === 'gridClasses' &&
      isMarkdownPaneFragmentNode(styleableNode)
    ) {
      classesSource = styleableNode.gridClasses;
    }

    if (!classesSource) {
      return { mobile: '', tablet: '', desktop: '' };
    }

    return {
      mobile: classesSource.mobile?.[className] || '',
      tablet: classesSource.tablet?.[className] || '',
      desktop: classesSource.desktop?.[className] || '',
    };
  }, [styleableNode, layer, className, targetProperty]);

  const handleCancel = () => {
    settingsPanelStore.set({
      nodeId: styleableNode.id,
      layer: layer,
      view: settingsPanelStore.get()?.view,
      action: 'style-parent',
      expanded: true,
    });
  };

  const handleRemove = useCallback(() => {
    if (!styleableNode || !layer || !className) return;

    const updatedNode = cloneDeep(styleableNode);
    let wasModified = false;

    if (targetProperty === 'parentClasses') {
      const layerIndex = layer - 1;
      if (updatedNode.parentClasses?.[layerIndex]) {
        if (updatedNode.parentClasses[layerIndex].mobile?.[className]) {
          delete updatedNode.parentClasses[layerIndex].mobile[className];
          wasModified = true;
        }
        if (updatedNode.parentClasses[layerIndex].tablet?.[className]) {
          delete updatedNode.parentClasses[layerIndex].tablet[className];
          wasModified = true;
        }
        if (updatedNode.parentClasses[layerIndex].desktop?.[className]) {
          delete updatedNode.parentClasses[layerIndex].desktop[className];
          wasModified = true;
        }
      }
    } else if (
      targetProperty === 'gridClasses' &&
      isMarkdownPaneFragmentNode(updatedNode)
    ) {
      if (updatedNode.gridClasses) {
        if (updatedNode.gridClasses.mobile?.[className]) {
          delete updatedNode.gridClasses.mobile[className];
          wasModified = true;
        }
        if (updatedNode.gridClasses.tablet?.[className]) {
          delete updatedNode.gridClasses.tablet[className];
          wasModified = true;
        }
        if (updatedNode.gridClasses.desktop?.[className]) {
          delete updatedNode.gridClasses.desktop[className];
          wasModified = true;
        }
      }
    }

    if (wasModified) {
      updatedNode.isChanged = true;
      ctx.modifyNodes([updatedNode]);
      ctx.notifyNode('root');
    }

    settingsPanelStore.set({
      nodeId: styleableNode.id,
      layer: layer,
      action: 'style-parent',
      expanded: true,
    });
  }, [styleableNode, layer, className, targetProperty, ctx]);

  if (!className) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-row flex-nowrap justify-between">
        <button
          title="Return to preview pane"
          onClick={handleCancel}
          className="text-myblue hover:text-black"
        >
          Go Back
        </button>
      </div>
      <div>
        <h3 className="text-xl font-bold">Remove Style</h3>
        <p className="mt-2 text-mydarkgrey">
          Are you sure you want to remove this style?
        </p>
        <div className="my-4 rounded-md bg-slate-100 p-4">
          <p className="font-mono text-sm font-bold">{className}</p>
          <div className="mt-2 space-y-1 text-sm">
            <p>
              <span className="font-bold">Mobile:</span>{' '}
              {values.mobile || 'N/A'}
            </p>
            <p>
              <span className="font-bold">Tablet:</span>{' '}
              {values.tablet || 'N/A'}
            </p>
            <p>
              <span className="font-bold">Desktop:</span>{' '}
              {values.desktop || 'N/A'}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end space-x-3">
        {!confirm ? (
          <button
            onClick={() => setConfirm(true)}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-700"
          >
            Remove
          </button>
        ) : (
          <button
            onClick={handleRemove}
            className="rounded-md bg-red-700 px-4 py-2 text-sm font-bold text-white shadow-sm ring-2 ring-red-800 ring-offset-2"
          >
            Confirm Removal
          </button>
        )}
      </div>
    </div>
  );
};

export default StyleParentPanelRemove;
