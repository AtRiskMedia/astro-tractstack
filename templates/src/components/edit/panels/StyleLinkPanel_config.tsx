import { useState, useEffect } from 'react';
import { settingsPanelStore, fullContentMapStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { cloneDeep } from '@/utils/helpers';
import { lispLexer } from '@/utils/actions/lispLexer';
import { preParseAction } from '@/utils/actions/preParse_Action';
import { preParseBunny } from '@/utils/actions/preParse_Bunny';
import ActionBuilderField from '@/components/form/ActionBuilderField';
import BunnyMomentSelector from '@/components/fields/BunnyMomentSelector';
import { GOTO_TARGETS } from '@/constants';
import type { BrandConfig } from '@/types/tractstack';
import type { FlatNode } from '@/types/compositorTypes';

interface StyleLinkConfigPanelProps {
  node: FlatNode;
  config: BrandConfig;
}

const StyleLinkConfigPanel = ({ node, config }: StyleLinkConfigPanelProps) => {
  if (!node?.tagName || (node.tagName !== 'a' && node.tagName !== 'button')) {
    return null;
  }

  const [isInitialized, setIsInitialized] = useState(false);
  const [callbackPayload, setCallbackPayload] = useState('');
  const [actionType, setActionType] = useState<'goto' | 'bunnyMoment'>('goto');

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const markdownId = ctx.getClosestNodeTypeFromId(node.id, 'Markdown');
  const storyFragmentId = ctx.getClosestNodeTypeFromId(
    node.id,
    'StoryFragment'
  );
  const storyFragment = storyFragmentId ? allNodes.get(storyFragmentId) : null;
  const slug =
    storyFragment && 'slug' in storyFragment
      ? (storyFragment.slug as string)
      : '';
  const isContext = ctx.getIsContextPane(markdownId);

  useEffect(() => {
    const currentPayload = node.buttonPayload?.callbackPayload || '';
    setCallbackPayload(currentPayload);
    setActionType(
      currentPayload.startsWith('(bunnyMoment') ? 'bunnyMoment' : 'goto'
    );
    setIsInitialized(true);
  }, [node]);

  const updateNode = (newCallbackPayload: string) => {
    try {
      const linkNode = cloneDeep(allNodes.get(node.id)) as FlatNode;
      if (!linkNode || !markdownId) return;

      const lexedPayload = lispLexer(newCallbackPayload);
      let targetUrl = null;
      if (newCallbackPayload.startsWith('(goto')) {
        targetUrl =
          lexedPayload && preParseAction(lexedPayload, slug, isContext, config);
      }
      const bunnyPayload = lexedPayload && preParseBunny(lexedPayload);
      const isExternalUrl =
        typeof targetUrl === 'string' && targetUrl.startsWith('https://');
      const existingButtonPayload = linkNode.buttonPayload || {
        buttonClasses: {},
        buttonHoverClasses: {},
        callbackPayload: '',
      };

      if (newCallbackPayload.startsWith('(bunnyMoment')) {
        linkNode.tagName = 'button';
        linkNode.href = '#';
      } else {
        linkNode.href = isExternalUrl ? targetUrl : targetUrl || '#';
        linkNode.tagName = !targetUrl || bunnyPayload ? 'button' : 'a';
      }

      linkNode.buttonPayload = {
        ...existingButtonPayload,
        callbackPayload: newCallbackPayload,
        buttonClasses: existingButtonPayload.buttonClasses || {},
        buttonHoverClasses: existingButtonPayload.buttonHoverClasses || {},
        ...(isExternalUrl ? { isExternalUrl: true } : {}),
        ...(bunnyPayload ? { bunnyPayload } : {}),
      };

      ctx.modifyNodes([{ ...linkNode, isChanged: true }]);
    } catch (error) {
      console.error('Error updating node:', error);
    }
  };

  useEffect(() => {
    if (!isInitialized) return;

    if (callbackPayload.startsWith('(bunnyMoment')) {
      const match = callbackPayload.match(
        /\(bunnyMoment\s+\(\s*([^\s]+)\s+(\d+)\s*\)\)/
      );
      if (match && match[1] && match[2]) {
        updateNode(callbackPayload);
      }
      return;
    }

    const match = callbackPayload.match(/\(goto\s+\(([^)]+)\)/);
    if (!match) return;

    const parts = match[1].split(' ').filter(Boolean);
    if (parts.length === 0) return;

    const target = parts[0];
    const targetConfig = GOTO_TARGETS[target];
    if (!targetConfig) return;

    let isComplete = false;

    if (target === 'url') {
      isComplete = parts.length > 1;
    } else if (targetConfig.subcommands) {
      isComplete = parts.length > 1;
    } else if (targetConfig.requiresParam) {
      if (targetConfig.requiresSecondParam) {
        isComplete = parts.length > 2;
      } else {
        isComplete = parts.length > 1;
      }
    } else {
      isComplete = true;
    }

    if (isComplete) {
      updateNode(callbackPayload);
    }
  }, [
    callbackPayload,
    isInitialized,
    node.id,
    config,
    allNodes,
    ctx,
    markdownId,
    slug,
    isContext,
  ]);

  const handleChange = (value: string) => {
    setCallbackPayload(value);
  };

  const handleActionTypeChange = (type: 'goto' | 'bunnyMoment') => {
    setActionType(type);
    if (type === 'bunnyMoment') {
      setCallbackPayload('(bunnyMoment ( ))');
    } else {
      setCallbackPayload('');
    }
  };

  const handleCloseConfig = () => {
    settingsPanelStore.set({
      nodeId: node.id,
      action: 'style-link',
      expanded: true,
    });
  };

  const renderActionBuilder = () => {
    switch (actionType) {
      case 'bunnyMoment':
        return (
          <BunnyMomentSelector
            value={callbackPayload}
            onChange={handleChange}
          />
        );
      case 'goto':
      default:
        return (
          <ActionBuilderField
            slug={slug}
            value={callbackPayload}
            onChange={handleChange}
            contentMap={fullContentMapStore.get()}
          />
        );
    }
  };

  return (
    <div className="relative">
      <div className="w-full max-w-md space-y-4">
        <div className="flex flex-row flex-nowrap justify-between">
          <button
            className="text-myblue hover:text-black"
            title="Return to style panel"
            onClick={handleCloseConfig}
          >
            Go Back
          </button>
        </div>

        <div className="mb-4 space-y-2">
          <label className="block text-sm text-gray-700">Action Type</label>
          <select
            value={actionType}
            onChange={(e) =>
              handleActionTypeChange(e.target.value as 'goto' | 'bunnyMoment')
            }
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          >
            <option value="goto">Navigation Action</option>
            <option value="bunnyMoment">Video Moment Action</option>
          </select>
          <p className="mt-1 text-sm text-gray-500">
            {actionType === 'goto'
              ? 'Create a link to navigate to another page or section'
              : 'Jump to a specific moment in a video on this page'}
          </p>
        </div>

        <div className="space-y-2">
          <div className="relative overflow-y-auto">
            <div className="absolute inset-x-0">
              <label className="text-mydarkgrey mb-2 block text-sm">
                {actionType === 'goto'
                  ? 'Callback Payload'
                  : 'Video Moment Settings'}
              </label>
              {renderActionBuilder()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StyleLinkConfigPanel;
