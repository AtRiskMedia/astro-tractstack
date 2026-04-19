import { useState, useEffect } from 'react';
import {
  emailHelpers,
  type EmailTemplate,
  type EmailBlock,
} from '@/utils/api/emailHelpers';
import Blocks from './Blocks';
import PropertyPanel from './PropertyPanel';
import PreviewModal from './PreviewModal';

interface EmailBuilderProps {
  category: string;
  templateName: string;
  onClose: () => void;
}

export default function EmailBuilder({
  category,
  templateName,
  onClose,
}: EmailBuilderProps) {
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await emailHelpers.getTemplate(category, templateName);
        setTemplate(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load template'
        );
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [category, templateName]);

  const handleSave = async () => {
    if (!template) return;
    try {
      setIsSaving(true);
      await emailHelpers.saveTemplate(category, templateName, template);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const updateBlock = (index: number, newBlock: EmailBlock) => {
    if (!template) return;
    const newBlocks = [...template.blocks];
    newBlocks[index] = newBlock;
    setTemplate({ ...template, blocks: newBlocks });
  };

  const addBlock = (type: 'text' | 'button' | 'divider') => {
    if (!template) return;
    let newBlock: EmailBlock;
    if (type === 'text') {
      newBlock = {
        type: 'text',
        content: 'New Text',
        align: 'left',
        color: '#333333',
        isBold: false,
      };
    } else if (type === 'button') {
      newBlock = {
        type: 'button',
        label: 'Click Here',
        url: 'https://',
        bgColor: '#0867ec',
        textColor: '#ffffff',
      };
    } else {
      newBlock = { type: 'divider', color: '#e5e7eb' };
    }
    setTemplate({ ...template, blocks: [...template.blocks, newBlock] });
    setSelectedIdx(template.blocks.length);
  };

  const deleteBlock = (index: number) => {
    if (!template) return;
    const newBlocks = [...template.blocks];
    newBlocks.splice(index, 1);
    setTemplate({ ...template, blocks: newBlocks });
    setSelectedIdx(null);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (!template) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === template.blocks.length - 1) return;
    const newBlocks = [...template.blocks];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIdx];
    newBlocks[targetIdx] = temp;
    setTemplate({ ...template, blocks: newBlocks });
    setSelectedIdx(targetIdx);
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!template) return null;

  return (
    <div className="flex min-h-96 max-h-screen flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <button
            onClick={onClose}
            className="text-sm font-bold text-gray-500 hover:text-gray-900"
          >
            &larr; Back
          </button>
          <div className="hidden shrink-0 flex-col border-r border-gray-200 pr-4 md:flex">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Template file
            </span>
            <span className="max-w-xs truncate text-sm font-bold text-gray-700">
              {category}/{templateName}.json
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <label className="text-xs font-bold text-gray-500">
              Subject Line
            </label>
            <input
              type="text"
              value={template.subject}
              onChange={(e) =>
                setTemplate({ ...template, subject: e.target.value })
              }
              className="w-full min-w-0 border-0 bg-transparent p-0 text-sm font-bold focus:ring-0"
              placeholder="Email Subject..."
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200"
          >
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gray-50 p-8">
          <div className="mx-auto min-h-96 w-full max-w-2xl bg-white shadow-sm">
            <Blocks
              blocks={template.blocks}
              selectedIdx={selectedIdx}
              onSelect={setSelectedIdx}
              onChange={updateBlock}
            />
          </div>
          <div className="mx-auto mt-8 flex max-w-2xl gap-2">
            <button
              onClick={() => addBlock('text')}
              className="rounded border px-3 py-1 text-sm font-bold text-gray-600"
            >
              + Text
            </button>
            <button
              onClick={() => addBlock('button')}
              className="rounded border px-3 py-1 text-sm font-bold text-gray-600"
            >
              + Button
            </button>
            <button
              onClick={() => addBlock('divider')}
              className="rounded border px-3 py-1 text-sm font-bold text-gray-600"
            >
              + Divider
            </button>
          </div>
        </div>

        <div className="w-80 shrink-0 overflow-y-auto border-l border-gray-200 bg-white p-4">
          {selectedIdx !== null && template.blocks[selectedIdx] ? (
            <PropertyPanel
              block={template.blocks[selectedIdx]}
              onChange={(b) => updateBlock(selectedIdx, b)}
              onDelete={() => deleteBlock(selectedIdx)}
              onMoveUp={() => moveBlock(selectedIdx, 'up')}
              onMoveDown={() => moveBlock(selectedIdx, 'down')}
            />
          ) : (
            <div className="text-sm text-gray-500">
              Select a block to edit its properties.
            </div>
          )}
        </div>
      </div>

      {isPreviewOpen && (
        <PreviewModal
          template={template}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
}
