import { useMemo, useEffect } from 'react';
import {
  styleElementInfoStore,
  resetStyleElementInfo,
  settingsPanelStore,
} from '@/stores/storykeep';
import { StylesMemory } from '@/components/edit/state/StylesMemory';
import { isMarkdownPaneFragmentNode } from '@/utils/compositor/typeGuards';
import SelectedTailwindClass from '@/components/fields/SelectedTailwindClass';
import { tagTitles } from '@/types/compositorTypes';
import type {
  Tag,
  FlatNode,
  MarkdownPaneFragmentNode,
} from '@/types/compositorTypes';

interface StyleElementPanelProps {
  node: FlatNode;
  parentNode: MarkdownPaneFragmentNode;
  onTitleChange?: (title: string) => void;
}

const StyleElementPanel = ({
  node,
  parentNode,
  onTitleChange,
}: StyleElementPanelProps) => {
  if (!node?.tagName || !isMarkdownPaneFragmentNode(parentNode)) {
    return null;
  }

  const defaultClasses = parentNode.defaultClasses?.[node.tagName];
  const overrideClasses = node.overrideClasses;

  const mergedClasses = useMemo(() => {
    const result: {
      [key: string]: {
        mobile: string;
        tablet?: string;
        desktop?: string;
      };
    } = {};

    // First add all default classes
    if (defaultClasses) {
      Object.keys(defaultClasses.mobile).forEach((className) => {
        result[className] = {
          mobile: defaultClasses.mobile[className],
          ...(defaultClasses.tablet && {
            tablet: defaultClasses.tablet[className],
          }),
          ...(defaultClasses.desktop && {
            desktop: defaultClasses.desktop[className],
          }),
        };
      });
    }

    // Then overlay any override classes
    if (overrideClasses) {
      ['mobile', 'tablet', 'desktop'].forEach((viewport) => {
        const viewportOverrides =
          overrideClasses[viewport as keyof typeof overrideClasses];
        if (viewportOverrides) {
          Object.entries(viewportOverrides).forEach(([className, value]) => {
            if (!result[className]) {
              result[className] = { mobile: value };
            } else {
              result[className] = {
                ...result[className],
                [viewport]: value,
              };
            }
          });
        }
      });
    }

    return result;
  }, [defaultClasses, overrideClasses]);

  const handleClickAdd = () => {
    settingsPanelStore.set({
      nodeId: node.id,
      action: `style-element-add`,
      expanded: true,
    });
  };

  const handleRemove = (className: string) => {
    settingsPanelStore.set({
      nodeId: node.id,
      className,
      action: `style-element-remove`,
      expanded: true,
    });
  };

  const handleUpdate = (className: string) => {
    styleElementInfoStore.setKey('className', className);
    settingsPanelStore.set({
      nodeId: node.id,
      className,
      action: `style-element-update`,
      expanded: true,
    });
  };

  useEffect(() => {
    if (
      styleElementInfoStore.get().markdownParentId !== parentNode.id ||
      styleElementInfoStore.get().tagName !== node.tagName
    ) {
      styleElementInfoStore.set({
        markdownParentId: parentNode.id,
        tagName: node.tagName,
        overrideNodeId: null,
        className: null,
      });
    }

    return () => {
      resetStyleElementInfo();
    };
  }, [parentNode.id, node.tagName]);

  useEffect(() => {
    if (node?.tagName && onTitleChange) {
      const tagTitle =
        tagTitles[node.tagName as Tag] || node.tagName.toUpperCase();
      onTitleChange(`Style ${tagTitle}`);
    }
  }, [node?.tagName, onTitleChange]);

  return (
    <div className="space-y-4">
      {Object.keys(mergedClasses).length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {Object.entries(mergedClasses).map(([className, values]) => (
            <SelectedTailwindClass
              key={className}
              name={className}
              values={values}
              onRemove={handleRemove}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <em>No styles.</em>
        </div>
      )}

      <div className="space-y-4">
        <ul className="text-mydarkgrey flex flex-wrap gap-x-4 gap-y-1">
          <li>
            <em>Actions:</em>
          </li>
          <li>
            <button
              onClick={() => handleClickAdd()}
              className="text-myblue font-bold underline hover:text-black"
            >
              Add Style
            </button>
          </li>
          <li>
            <StylesMemory node={node} parentNode={parentNode} />
          </li>
        </ul>
      </div>
    </div>
  );
};

export default StyleElementPanel;
