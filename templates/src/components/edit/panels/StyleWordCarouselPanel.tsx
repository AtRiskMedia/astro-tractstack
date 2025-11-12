import { useState, useEffect } from 'react';
import { getCtx } from '@/stores/nodes';
import { settingsPanelStore } from '@/stores/storykeep';
import { processRichTextToNodes } from '@/utils/compositor/nodesHelper';
import type { FlatNode } from '@/types/compositorTypes';

interface StyleWordCarouselPanelProps {
  node: FlatNode;
}

const StyleWordCarouselPanel = ({ node }: StyleWordCarouselPanelProps) => {
  const ctx = getCtx();
  const [words, setWords] = useState<string>('');
  const [speed, setSpeed] = useState<number>(2);

  useEffect(() => {
    if (node.wordCarouselPayload) {
      setWords(node.wordCarouselPayload.words.join('\n'));
      setSpeed(node.wordCarouselPayload.speed);
    } else {
      // Initialize from current node text content if payload doesn't exist
      const childIds = ctx.getChildNodeIDs(node.id);
      const allNodes = ctx.allNodes.get();
      const currentText = childIds
        .map((id) => {
          const child = allNodes.get(id) as FlatNode | undefined;
          return child?.text || child?.copy || '';
        })
        .join('');

      setWords(currentText || node.copy || '');
      setSpeed(2);
    }
  }, [node.id, node.wordCarouselPayload]);

  const saveChanges = (currentWords: string, currentSpeed: number) => {
    const wordsArray = currentWords.split('\n').filter((w) => w.trim() !== '');

    // Sync the first word to the node's text content
    if (wordsArray.length > 0) {
      const firstWord = wordsArray[0];
      const childIds = ctx.getChildNodeIDs(node.id);
      const allNodes = ctx.allNodes.get();
      const currentText = childIds
        .map((id) => {
          const child = allNodes.get(id) as FlatNode | undefined;
          return child?.text || child?.copy || '';
        })
        .join('');

      if (currentText !== firstWord) {
        ctx.deleteChildren(node.id);
        // Use processRichTextToNodes to generate proper text nodes compatible with the compositor
        const newNodes = processRichTextToNodes(
          firstWord,
          node.id,
          [],
          () => { }
        );
        if (newNodes.length > 0) {
          ctx.addNodes(newNodes);
        }
      }
    }

    ctx.modifyNodes([
      {
        ...node,
        wordCarouselPayload: {
          words: wordsArray,
          speed: currentSpeed,
        },
        isChanged: true,
      } as FlatNode,
    ]);
  };

  const handleWordsChange = (val: string) => {
    setWords(val);
  };

  const handleWordsBlur = () => {
    saveChanges(words, speed);
  };

  const handleSpeedChange = (val: number) => {
    setSpeed(val);
    saveChanges(words, val);
  };

  const handleRemove = () => {
    // Fetch the latest node state to ensure we check current classes/properties
    const currentNode = ctx.allNodes.get().get(node.id) as FlatNode;
    if (!currentNode) return;

    // Logic: Only fully unwrap (delete node) if it is a "naked" span
    // If it has custom classes, overrides, or is a semantic tag (em, strong), we just strip the payload.

    const isSpan = currentNode.tagName === 'span';

    const hasCustomClasses =
      !!currentNode.elementCss && currentNode.elementCss.trim().length > 0;

    const hasOverrides =
      currentNode.overrideClasses &&
      (Object.keys(currentNode.overrideClasses.mobile || {}).length > 0 ||
        Object.keys(currentNode.overrideClasses.tablet || {}).length > 0 ||
        Object.keys(currentNode.overrideClasses.desktop || {}).length > 0);

    // Condition: It is a span, and it has NO custom styling or overrides.
    if (isSpan && !hasCustomClasses && !hasOverrides) {
      // "Remove outright"
      ctx.unwrapNode(node.id);
    } else {
      // Keep the tag/styles, but remove the carousel functionality
      ctx.modifyNodes([
        {
          ...currentNode,
          wordCarouselPayload: undefined,
          isChanged: true,
        } as FlatNode,
      ]);
    }

    settingsPanelStore.set(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-bold text-gray-500">
          Words (one per line)
        </label>
        <textarea
          className="focus:border-myblue focus:ring-myblue w-full rounded border border-gray-300 p-2 text-sm focus:ring-1"
          rows={5}
          value={words}
          onChange={(e) => handleWordsChange(e.target.value)}
          onBlur={handleWordsBlur}
          placeholder="Enter words..."
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-gray-500">
          Speed (seconds)
        </label>
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              onClick={() => handleSpeedChange(s)}
              className={`rounded px-3 py-1 text-sm font-bold transition-colors ${speed === s
                ? 'bg-myblue text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {s}s
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
        <button
          onClick={() => settingsPanelStore.set(null)}
          className="text-xs text-gray-400 underline hover:text-gray-600"
        >
          Done
        </button>
        <button
          onClick={handleRemove}
          className="text-xs text-red-400 underline hover:text-red-600"
        >
          Remove
        </button>
      </div>
    </div>
  );
};

export default StyleWordCarouselPanel;
