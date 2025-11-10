import { useState, useEffect, useCallback } from 'react';
import { settingsPanelStore, fullContentMapStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { cloneDeep } from '@/utils/helpers';
import { lispLexer } from '@/utils/actions/lispLexer';
import { preParseAction } from '@/utils/actions/preParse_Action';
import ActionBuilderField from '@/components/form/ActionBuilderField';
import { brandConfigStore } from '@/stores/storykeep';
import { GOTO_TARGETS } from '@/constants';
import type { FlatNode, LispToken } from '@/types/compositorTypes';

interface StyleLinkConfigPanelProps {
  node: FlatNode;
}

const StyleLinkConfigPanel = ({ node }: StyleLinkConfigPanelProps) => {
  const config = brandConfigStore.get();
  if (
    !config ||
    !node?.tagName ||
    (node.tagName !== 'a' && node.tagName !== 'button')
  ) {
    return null;
  }

  const [isInitialized, setIsInitialized] = useState(false);
  const [callbackPayload, setCallbackPayload] = useState('');

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
    setIsInitialized(true);
  }, [node]);

  const updateNode = useCallback(() => {
    try {
      const linkNode = cloneDeep(allNodes.get(node.id)) as FlatNode;
      if (!linkNode || !markdownId) {
        return;
      }

      const existingButtonPayload = linkNode.buttonPayload;
      const newButtonPayload: FlatNode['buttonPayload'] = {
        callbackPayload: callbackPayload,
        buttonClasses: existingButtonPayload?.buttonClasses || {},
        buttonHoverClasses: existingButtonPayload?.buttonHoverClasses || {},
      };

      const [tokens] = lispLexer(callbackPayload);
      delete linkNode.href;

      if (
        callbackPayload.startsWith('(declare') ||
        callbackPayload.startsWith('(identifyAs')
      ) {
        linkNode.tagName = 'button';
      } else if (callbackPayload.startsWith('(bunnyMoment')) {
        linkNode.tagName = 'button';
        if (
          tokens &&
          Array.isArray(tokens) &&
          tokens[0] === 'bunnyMoment' &&
          Array.isArray(tokens[1])
        ) {
          const params = tokens[1];
          if (params.length === 2) {
            newButtonPayload.bunnyPayload = {
              videoId: String(params[0]),
              t: String(params[1]),
            };
          }
        }
      } else if (callbackPayload.startsWith('(goto')) {
        const targetUrl =
          tokens && preParseAction([tokens], slug, isContext, config);
        const isExternalUrl =
          typeof targetUrl === 'string' && targetUrl.startsWith('https://');

        linkNode.href = targetUrl || '#';
        linkNode.tagName = !targetUrl ? 'button' : 'a';
        if (isExternalUrl) {
          newButtonPayload.isExternalUrl = true;
        }
      } else {
        linkNode.tagName = 'button';
      }

      linkNode.buttonPayload = newButtonPayload;

      const currentSignal = settingsPanelStore.get();
      if (currentSignal) {
        settingsPanelStore.set({
          ...currentSignal,
          editLock: Date.now(),
        });
      }

      ctx.modifyNodes([{ ...linkNode, isChanged: true }]);
    } catch (error) {
      console.error('Error in updateNode:', error);
    }
  }, [
    allNodes,
    config,
    ctx,
    isContext,
    markdownId,
    node.id,
    slug,
    callbackPayload,
  ]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    let isComplete = false;

    if (callbackPayload.trim() === '') {
      isComplete = true;
    } else {
      const [tokens] = lispLexer(callbackPayload);

      if (
        Array.isArray(tokens) &&
        tokens.length > 0 &&
        Array.isArray(tokens[0])
      ) {
        const mainExpression = tokens[0] as LispToken[];

        if (mainExpression.length > 1) {
          // Must have a command AND parameters
          const command = mainExpression[0] as string;
          const parameters = mainExpression[1] as LispToken[];

          if (Array.isArray(parameters)) {
            if (command === 'declare' || command === 'identifyAs') {
              if (parameters.length === 2 && parameters[0] && parameters[1]) {
                isComplete = true;
              }
            } else if (command === 'bunnyMoment') {
              if (parameters.length === 2) {
                isComplete = true;
              }
            } else if (command === 'goto') {
              const target = parameters[0] as string;
              const targetConfig = GOTO_TARGETS[target];
              if (targetConfig) {
                if (target === 'url') {
                  isComplete =
                    parameters.length > 1 &&
                    String(parameters[1]).includes('.');
                } else if (targetConfig.subcommands) {
                  isComplete = parameters.length > 1;
                } else if (targetConfig.requiresParam) {
                  if (targetConfig.requiresSecondParam) {
                    isComplete = parameters.length > 2;
                  } else {
                    isComplete = parameters.length > 1;
                  }
                } else {
                  isComplete = true;
                }
              }
            }
          }
        }
      }
    }

    if (isComplete) {
      updateNode();
    }
  }, [callbackPayload, isInitialized, updateNode]);

  const handleChange = (value: string) => {
    setCallbackPayload(value);
  };

  const handleCloseConfig = () => {
    settingsPanelStore.set({
      nodeId: node.id,
      action: 'style-link',
      expanded: true,
    });
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

        <div className="space-y-2">
          <ActionBuilderField
            slug={slug}
            value={callbackPayload}
            onChange={handleChange}
            contentMap={fullContentMapStore.get()}
            label="Action Configuration"
          />
        </div>
      </div>
    </div>
  );
};

export default StyleLinkConfigPanel;
