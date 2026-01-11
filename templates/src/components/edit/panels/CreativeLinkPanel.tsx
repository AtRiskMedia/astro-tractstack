import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import InformationCircleIcon from '@heroicons/react/24/outline/InformationCircleIcon';
import { getCtx } from '@/stores/nodes';
import { fullContentMapStore } from '@/stores/storykeep';
import ActionBuilderField from '@/components/form/ActionBuilderField';
import { lispLexer } from '@/utils/actions/lispLexer';
import { preParseAction } from '@/utils/actions/preParse_Action';
import type { BasePanelProps, PaneNode } from '@/types/compositorTypes';

const CreativeLinkPanel = ({ node, childId }: BasePanelProps) => {
  if (!node) return null;
  const pane = node as unknown as PaneNode;
  const assetMeta = pane?.htmlAst?.editableElements?.[childId || ''];
  const contentMap = useStore(fullContentMapStore);
  const ctx = getCtx();

  const [actionLisp, setActionLisp] = useState('');

  const isAnchor = assetMeta?.tagName === 'a';
  const restriction = isAnchor ? 'navigation' : 'action';

  useEffect(() => {
    if (assetMeta) {
      let initialValue = assetMeta.buttonPayload?.callbackPayload || '';

      if (!initialValue && isAnchor && assetMeta.href) {
        initialValue = `(goto url ${assetMeta.href})`;
      }

      setActionLisp(initialValue);
    }
  }, [assetMeta, isAnchor]);

  if (!pane || !assetMeta) return null;

  const handleUpdate = (newValue: string) => {
    setActionLisp(newValue);

    const el = document.querySelector(
      `[data-ast-id="${childId}"]`
    ) as HTMLElement;
    if (el) {
      if (isAnchor) {
        try {
          const config = (window as any).TRACTSTACK_CONFIG || {};
          const lexed = lispLexer(newValue);
          const resolvedHref = preParseAction(
            lexed,
            pane.slug,
            !!pane.isContextPane,
            config
          );
          if (resolvedHref) {
            (el as HTMLAnchorElement).href = resolvedHref;
          }
        } catch (e) {
          console.warn('Live DOM href resolution failed:', e);
        }
      } else {
        el.setAttribute('data-callback', newValue);
      }
    }

    (ctx as any).updateCreativeAsset(node.id, childId, {
      tagName: assetMeta.tagName,
      buttonPayload: {
        ...assetMeta.buttonPayload,
        callbackPayload: newValue,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-mydarkgrey">
          {isAnchor ? 'Link Destination' : 'Button Action'}
        </h3>
        <p className="text-xs text-gray-500">
          {isAnchor
            ? 'Configure where this link takes the user.'
            : 'Configure what happens when this button is clicked.'}
        </p>
      </div>

      <div className="space-y-4">
        <ActionBuilderField
          value={actionLisp}
          onChange={handleUpdate}
          contentMap={contentMap}
          label={isAnchor ? 'Destination' : 'Interaction'}
          restriction={restriction}
        />

        <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-xs text-blue-800">
          <InformationCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
          <p>
            This element is semantically locked as a{' '}
            <strong>{isAnchor ? 'Link (<a>)' : 'Button (<button>)'}</strong>. To
            change its type (e.g. turn a link into a button), use the "Refine
            Design" tool.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreativeLinkPanel;
