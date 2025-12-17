import { useMemo, useState } from 'react';
import { getCtx } from '@/stores/nodes';
import { settingsPanelStore } from '@/stores/storykeep';
import { cloneDeep } from '@/utils/helpers';
import {
  isMarkdownPaneFragmentNode,
  isGridLayoutNode,
} from '@/utils/compositor/typeGuards';
import { StylesMemory } from '@/components/edit/state/StylesMemory';
import SelectedTailwindClass from '@/components/fields/SelectedTailwindClass';
import ImageUpload, { type ImageParams } from '@/components/fields/ImageUpload';
import type {
  FlatNode,
  MarkdownPaneFragmentNode,
  GridLayoutNode,
} from '@/types/compositorTypes';

interface StyleImagePanelProps {
  node: FlatNode;
  containerNode: FlatNode;
  outerContainerNode: FlatNode;
  parentNode: MarkdownPaneFragmentNode | GridLayoutNode;
}

const StyleImagePanel = ({
  node,
  containerNode,
  outerContainerNode,
  parentNode,
}: StyleImagePanelProps) => {
  const [altDescription, setAltDescription] = useState(node.alt || '');

  const imgDefaultClasses = parentNode.defaultClasses?.[node.tagName];
  const imgOverrideClasses = node.overrideClasses;
  const containerDefaultClasses =
    parentNode.defaultClasses?.[containerNode.tagName];
  const containerOverrideClasses = containerNode.overrideClasses;
  const outerDefaultClasses =
    parentNode.defaultClasses?.[outerContainerNode.tagName];
  const outerOverrideClasses = outerContainerNode.overrideClasses;

  // Merge classes for image
  const mergedImgClasses = useMemo(() => {
    const result: {
      [key: string]: {
        mobile: string;
        tablet?: string;
        desktop?: string;
      };
    } = {};

    // Add default classes
    if (imgDefaultClasses) {
      Object.keys(imgDefaultClasses.mobile).forEach((className) => {
        result[className] = {
          mobile: imgDefaultClasses.mobile[className],
          ...(imgDefaultClasses.tablet && {
            tablet: imgDefaultClasses.tablet[className],
          }),
          ...(imgDefaultClasses.desktop && {
            desktop: imgDefaultClasses.desktop[className],
          }),
        };
      });
    }

    // Add override classes
    if (imgOverrideClasses) {
      ['mobile', 'tablet', 'desktop'].forEach((viewport) => {
        const viewportOverrides =
          imgOverrideClasses[viewport as keyof typeof imgOverrideClasses];
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
  }, [imgDefaultClasses, imgOverrideClasses]);

  // Merge classes for container
  const mergedContainerClasses = useMemo(() => {
    const result: {
      [key: string]: {
        mobile: string;
        tablet?: string;
        desktop?: string;
      };
    } = {};

    if (containerDefaultClasses) {
      Object.keys(containerDefaultClasses.mobile).forEach((className) => {
        result[className] = {
          mobile: containerDefaultClasses.mobile[className],
          ...(containerDefaultClasses.tablet && {
            tablet: containerDefaultClasses.tablet[className],
          }),
          ...(containerDefaultClasses.desktop && {
            desktop: containerDefaultClasses.desktop[className],
          }),
        };
      });
    }

    if (containerOverrideClasses) {
      ['mobile', 'tablet', 'desktop'].forEach((viewport) => {
        const viewportOverrides =
          containerOverrideClasses[
            viewport as keyof typeof containerOverrideClasses
          ];
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
  }, [containerDefaultClasses, containerOverrideClasses]);

  // Merge classes for outer container
  const mergedOuterClasses = useMemo(() => {
    const result: {
      [key: string]: {
        mobile: string;
        tablet?: string;
        desktop?: string;
      };
    } = {};

    if (outerDefaultClasses) {
      Object.keys(outerDefaultClasses.mobile).forEach((className) => {
        result[className] = {
          mobile: outerDefaultClasses.mobile[className],
          ...(outerDefaultClasses.tablet && {
            tablet: outerDefaultClasses.tablet[className],
          }),
          ...(outerDefaultClasses.desktop && {
            desktop: outerDefaultClasses.desktop[className],
          }),
        };
      });
    }

    if (outerOverrideClasses) {
      ['mobile', 'tablet', 'desktop'].forEach((viewport) => {
        const viewportOverrides =
          outerOverrideClasses[viewport as keyof typeof outerOverrideClasses];
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
  }, [outerDefaultClasses, outerOverrideClasses]);

  const handleImgAdd = () => {
    settingsPanelStore.set({
      action: `style-img-add`,
      nodeId: node.id,
      childId: node.id,
      expanded: true,
    });
  };

  const handleContainerAdd = () => {
    settingsPanelStore.set({
      action: `style-img-container-add`,
      nodeId: containerNode.id,
      childId: node.id,
      expanded: true,
    });
  };

  const handleOuterAdd = () => {
    settingsPanelStore.set({
      action: `style-img-outer-add`,
      nodeId: outerContainerNode.id,
      childId: node.id,
      expanded: true,
    });
  };

  const handleImgRemove = (className: string) => {
    settingsPanelStore.set({
      action: `style-img-remove`,
      nodeId: node.id,
      className,
      expanded: true,
    });
  };

  const handleContainerRemove = (className: string) => {
    settingsPanelStore.set({
      action: `style-img-container-remove`,
      nodeId: containerNode.id,
      childId: node.id,
      className,
      expanded: true,
    });
  };

  const handleOuterRemove = (className: string) => {
    settingsPanelStore.set({
      action: `style-img-outer-remove`,
      nodeId: outerContainerNode.id,
      childId: node.id,
      className,
      expanded: true,
    });
  };

  const handleImgUpdate = (className: string) => {
    settingsPanelStore.set({
      action: `style-img-update`,
      nodeId: node.id,
      className,
      expanded: true,
    });
  };

  const handleContainerUpdate = (className: string) => {
    settingsPanelStore.set({
      action: `style-img-container-update`,
      nodeId: containerNode.id,
      childId: node.id,
      className,
      expanded: true,
    });
  };

  const handleOuterUpdate = (className: string) => {
    settingsPanelStore.set({
      action: `style-img-outer-update`,
      nodeId: outerContainerNode.id,
      childId: node.id,
      className,
      expanded: true,
    });
  };

  const handleAltUpdate = (newAlt: string) => {
    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();
    const imgNode = cloneDeep(allNodes.get(node.id)) as FlatNode;
    if (!imgNode) return;
    imgNode.alt = newAlt;
    ctx.modifyNodes([{ ...imgNode, isChanged: true }]);
  };

  const handleImageUpdate = (params: ImageParams) => {
    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();
    const imgNode = cloneDeep(allNodes.get(node.id)) as FlatNode;
    if (!imgNode) return;
    imgNode.fileId = params.fileId;
    imgNode.src = params.src;
    imgNode.alt = params.altDescription || '!!This is requires a description!!';
    if (params.base64Data) imgNode.base64Data = params.base64Data;
    setAltDescription(
      params.altDescription || '!!This is requires a description!!'
    );
    if (params.srcSet) imgNode.srcSet = params.srcSet;
    ctx.modifyNodes([{ ...imgNode, isChanged: true }]);
  };

  const handleImageRemove = () => {
    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();
    const imgNode = cloneDeep(allNodes.get(node.id)) as FlatNode;
    if (!imgNode) return;
    if (typeof imgNode.fileId === `string`) delete imgNode.fileId;
    imgNode.src = `/static.jpg`;
    if (typeof imgNode.srcSet === `string`) delete imgNode.srcSet;
    imgNode.alt = `This is a placeholder for an image that hasn't yet been uploaded`;
    ctx.modifyNodes([{ ...imgNode, isChanged: true }]);
  };

  if (
    !node?.tagName ||
    !containerNode?.tagName ||
    !outerContainerNode?.tagName ||
    (!isMarkdownPaneFragmentNode(parentNode) && !isGridLayoutNode(parentNode))
  ) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <ImageUpload
          currentFileId={node.fileId}
          nodeId={node.id}
          onUpdate={handleImageUpdate}
          onRemove={handleImageRemove}
        />

        <div>
          <label className="block text-sm text-mydarkgrey">
            Alt Description
          </label>
          <input
            type="text"
            value={altDescription}
            onChange={(e) => setAltDescription(e.target.value)}
            onBlur={(e) => handleAltUpdate(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className="w-full rounded-md border-mydarkgrey py-2 pl-3 text-base"
            placeholder="Describe the image..."
          />
        </div>

        {Object.keys(mergedImgClasses).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(mergedImgClasses).map(([className, values]) => (
              <SelectedTailwindClass
                key={className}
                name={className}
                values={values}
                onRemove={handleImgRemove}
                onUpdate={handleImgUpdate}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <em>No styles.</em>
          </div>
        )}

        <div className="space-y-4">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-mydarkgrey">
            <li>
              <em>Actions:</em>
            </li>
            <li>
              <button
                onClick={handleImgAdd}
                className="font-bold text-myblue underline hover:text-black"
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

      <div className="space-y-4">
        <h3 className="text-sm font-bold">Container Styles</h3>

        {Object.keys(mergedContainerClasses).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(mergedContainerClasses).map(
              ([className, values]) => (
                <SelectedTailwindClass
                  key={className}
                  name={className}
                  values={values}
                  onRemove={handleContainerRemove}
                  onUpdate={handleContainerUpdate}
                />
              )
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <em>No styles.</em>
          </div>
        )}

        <div className="space-y-4">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-mydarkgrey">
            <li>
              <em>Actions:</em>
            </li>
            <li>
              <button
                onClick={handleContainerAdd}
                className="font-bold text-myblue underline hover:text-black"
              >
                Add Style
              </button>
            </li>
            <li>
              <StylesMemory node={containerNode} parentNode={parentNode} />
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold">Outer Container Styles</h3>

        {Object.keys(mergedOuterClasses).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(mergedOuterClasses).map(([className, values]) => (
              <SelectedTailwindClass
                key={className}
                name={className}
                values={values}
                onRemove={handleOuterRemove}
                onUpdate={handleOuterUpdate}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <em>No styles.</em>
          </div>
        )}

        <div className="space-y-4">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-mydarkgrey">
            <li>
              <em>Actions:</em>
            </li>
            <li>
              <button
                onClick={handleOuterAdd}
                className="font-bold text-myblue underline hover:text-black"
              >
                Add Style
              </button>
            </li>
            <li>
              <StylesMemory node={outerContainerNode} parentNode={parentNode} />
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StyleImagePanel;
