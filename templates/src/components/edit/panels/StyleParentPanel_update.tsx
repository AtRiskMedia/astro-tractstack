import { useState, useCallback, useMemo } from 'react';
import { settingsPanelStore, brandConfigStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { tailwindClasses } from '@/utils/compositor/tailwindClasses';
import { cloneDeep } from '@/utils/helpers';
import ViewportComboBox from '@/components/fields/ViewportComboBox';
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

type ViewportValues = {
  mobile: string;
  tablet: string;
  desktop: string;
};

type CustomPanelProps = ParentBasePanelProps & {
  targetProperty: 'parentClasses' | 'gridClasses' | undefined;
};

const StyleParentPanelUpdate = ({
  node,
  layer,
  className,
  targetProperty,
}: CustomPanelProps) => {
  const ctx = getCtx();
  const styleableNode = node as StyleableNode | null;
  const config = brandConfigStore.get();

  if (
    !targetProperty ||
    !styleableNode ||
    (!isMarkdownPaneFragmentNode(styleableNode) &&
      !isGridLayoutNode(styleableNode)) ||
    !layer ||
    !className ||
    !config // Ensure config exists
  ) {
    return (
      <div>
        Error: Could not find node, layer, class name, or config to update.
        <pre>
          {JSON.stringify(
            {
              nodeExists: !!styleableNode,
              layer,
              className,
              targetProperty,
              configExists: !!config,
            },
            null,
            2
          )}
        </pre>
      </div>
    );
  }

  const tailwindConfig = tailwindClasses[className];
  if (!tailwindConfig) {
    return <div>Error: Tailwind config not found for {className}</div>;
  }

  const getInitialValues = (): ViewportValues => {
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

    return {
      mobile: classesSource?.mobile?.[className] || '',
      tablet: classesSource?.tablet?.[className] || '',
      desktop: classesSource?.desktop?.[className] || '',
    };
  };

  const [values, setValues] = useState<ViewportValues>(getInitialValues);

  const validTailwindValues = useMemo(() => {
    return ['', ...tailwindConfig.values];
  }, [tailwindConfig]);

  const handleCancel = () => {
    settingsPanelStore.set({
      nodeId: styleableNode.id,
      layer: layer,
      view: settingsPanelStore.get()?.view,
      action: 'style-parent',
      expanded: true,
    });
  };

  const handleUpdate = useCallback(
    (value: string, viewport: 'mobile' | 'tablet' | 'desktop') => {
      const newValues = { ...values, [viewport]: value };
      setValues(newValues);

      const updatedNode = cloneDeep(styleableNode);
      let classesTarget: DefaultClassValue | undefined;

      if (targetProperty === 'parentClasses') {
        const layerIndex = layer - 1;
        if (!updatedNode.parentClasses) {
          updatedNode.parentClasses = [];
        }
        while (updatedNode.parentClasses.length <= layerIndex) {
          updatedNode.parentClasses.push({
            mobile: {},
            tablet: {},
            desktop: {},
          });
        }
        if (!updatedNode.parentClasses[layerIndex]) {
          updatedNode.parentClasses[layerIndex] = {
            mobile: {},
            tablet: {},
            desktop: {},
          };
        }
        classesTarget = updatedNode.parentClasses[layerIndex];
      } else if (
        targetProperty === 'gridClasses' &&
        isMarkdownPaneFragmentNode(updatedNode)
      ) {
        if (!updatedNode.gridClasses) {
          updatedNode.gridClasses = { mobile: {}, tablet: {}, desktop: {} };
        }
        classesTarget = updatedNode.gridClasses;
      }

      if (classesTarget) {
        if (!classesTarget.mobile) classesTarget.mobile = {};
        if (!classesTarget.tablet) classesTarget.tablet = {};
        if (!classesTarget.desktop) classesTarget.desktop = {};

        classesTarget[viewport][className] = value;

        updatedNode.isChanged = true;
        ctx.modifyNodes([updatedNode]);
        ctx.notifyNode('root');
      }
    },
    [styleableNode, layer, className, targetProperty, values, ctx]
  );

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
        <h3 className="text-xl font-bold">{tailwindConfig.title}</h3>
        <p className="mt-1 font-mono text-sm text-mydarkgrey">
          {tailwindConfig.className}
        </p>
      </div>

      <div className="space-y-3">
        <ViewportComboBox
          viewport="mobile"
          value={values.mobile}
          values={validTailwindValues}
          onFinalChange={handleUpdate}
          allowNegative={tailwindConfig.allowNegative}
        />
        <ViewportComboBox
          viewport="tablet"
          value={values.tablet}
          values={validTailwindValues}
          onFinalChange={handleUpdate}
          allowNegative={tailwindConfig.allowNegative}
        />
        <ViewportComboBox
          viewport="desktop"
          value={values.desktop}
          values={validTailwindValues}
          onFinalChange={handleUpdate}
          allowNegative={tailwindConfig.allowNegative}
        />
      </div>
    </div>
  );
};

export default StyleParentPanelUpdate;
