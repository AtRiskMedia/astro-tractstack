import { useState, useCallback, useEffect } from 'react';
import { settingsPanelStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { isLinkNode } from '@/utils/compositor/typeGuards';
import { cloneDeep } from '@/utils/helpers';
import { tailwindClasses } from '@/utils/compositor/tailwindClasses';
import ViewportComboBox from '@/components/fields/ViewportComboBox';
import type { BasePanelProps, FlatNode } from '@/types/compositorTypes';

const StyleLinkUpdatePanel = ({ node, className, config }: BasePanelProps) => {
  if (
    !node ||
    !className ||
    (node.tagName !== 'a' && node.tagName !== 'button')
  )
    return null;

  const [value, setValue] = useState<string>('');

  const friendlyName = tailwindClasses[className]?.title || className;
  const values = tailwindClasses[className]?.values || [];
  const isHoverMode = settingsPanelStore.get()?.action?.endsWith('-hover');

  const resetStore = () => {
    settingsPanelStore.set({
      action: 'style-link',
      nodeId: node.id,
      expanded: true,
    });
  };

  // Initialize value from current node state
  useEffect(() => {
    if (!node.buttonPayload) return;

    const classes = isHoverMode
      ? node.buttonPayload.buttonHoverClasses
      : node.buttonPayload.buttonClasses;
    if (classes && className in classes) {
      setValue(classes[className][0] || '');
    }
  }, [node, className, isHoverMode]);

  const handleFinalChange = useCallback(
    (newValue: string) => {
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();
      const linkNode = cloneDeep(allNodes.get(node.id)) as FlatNode;
      if (!isLinkNode(linkNode)) return;

      const markdownId = ctx.getClosestNodeTypeFromId(node.id, 'Markdown');
      if (!markdownId) return;

      // Initialize buttonPayload if it doesn't exist
      if (!linkNode.buttonPayload) {
        linkNode.buttonPayload = {
          buttonClasses: {},
          buttonHoverClasses: {},
          callbackPayload: '',
        };
      }

      // Update the appropriate classes object
      if (isHoverMode) {
        linkNode.buttonPayload.buttonHoverClasses = {
          ...linkNode.buttonPayload.buttonHoverClasses,
          [className]: [newValue],
        };
      } else {
        linkNode.buttonPayload.buttonClasses = {
          ...linkNode.buttonPayload.buttonClasses,
          [className]: [newValue],
        };
      }
      setValue(newValue);
      ctx.modifyNodes([{ ...linkNode, isChanged: true }]);
    },
    [node, className, isHoverMode]
  );

  return (
    <div className="isolate z-50 space-y-4">
      <div className="flex flex-row flex-nowrap justify-between">
        <h2 className="text-xl font-bold">
          {friendlyName} ({isHoverMode ? 'Hover' : 'Button'} State)
        </h2>
        <button
          className="text-myblue hover:text-black"
          title="Return to link panel"
          onClick={resetStore}
        >
          Go Back
        </button>
      </div>

      <div className="text-mydarkgrey my-3 flex flex-col gap-y-2.5 text-xl">
        <ViewportComboBox
          value={value}
          onFinalChange={(newValue) => handleFinalChange(newValue)}
          values={values}
          viewport="mobile"
          config={config!}
          isInferred={false}
        />
      </div>
    </div>
  );
};

export default StyleLinkUpdatePanel;
