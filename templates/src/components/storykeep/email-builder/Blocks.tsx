import {
  useLayoutEffect,
  useRef,
  type ClipboardEvent,
} from 'react';
import type { EmailBlock } from '@/utils/api/emailHelpers';

interface BlocksProps {
  blocks: EmailBlock[];
  selectedIdx: number | null;
  onSelect: (index: number) => void;
  onChange: (index: number, block: EmailBlock) => void;
}

function TextBlockEditor({
  idx,
  block,
  isSelected,
  onSelect,
  onChange,
  handlePaste,
}: {
  idx: number;
  block: Extract<EmailBlock, { type: 'text' }>;
  isSelected: boolean;
  onSelect: (index: number) => void;
  onChange: (index: number, block: EmailBlock) => void;
  handlePaste: (
    e: ClipboardEvent<HTMLTextAreaElement>,
    idx: number,
    block: Extract<EmailBlock, { type: 'text' }>
  ) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [block.content]);

  const containerStyle = {
    border: isSelected ? '2px solid #0867ec' : '2px solid transparent',
    padding: '8px',
    cursor: 'pointer',
    marginBottom: '8px',
  };

  return (
    <div style={containerStyle} onClick={() => onSelect(idx)}>
      <textarea
        ref={textareaRef}
        value={block.content}
        className="box-border w-full py-1 leading-relaxed"
        onChange={(e) => onChange(idx, { ...block, content: e.target.value })}
        onPaste={(e) => handlePaste(e, idx, block)}
        onFocus={() => onSelect(idx)}
        onClick={(e) => e.stopPropagation()}
        style={{
          minHeight: '2.5rem',
          fontFamily: 'Helvetica, sans-serif',
          fontSize: '16px',
          color: block.color,
          textAlign: block.align,
          fontWeight: block.isBold ? 'bold' : 'normal',
          border: 'none',
          background: 'transparent',
          resize: 'none',
          overflow: 'hidden',
        }}
        rows={1}
      />
    </div>
  );
}

export default function Blocks({
  blocks,
  selectedIdx,
  onSelect,
  onChange,
}: BlocksProps) {
  const handlePaste = (
    e: ClipboardEvent<HTMLTextAreaElement>,
    idx: number,
    block: Extract<EmailBlock, { type: 'text' }>
  ) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain');
    const target = e.currentTarget;

    const start = target.selectionStart;
    const end = target.selectionEnd;

    const newContent =
      block.content.substring(0, start) +
      pastedText +
      block.content.substring(end);

    onChange(idx, { ...block, content: newContent });

    window.requestAnimationFrame(() => {
      target.setSelectionRange(
        start + pastedText.length,
        start + pastedText.length
      );
    });
  };

  return (
    <div className="flex flex-col p-8">
      {blocks.map((block, idx) => {
        const isSelected = selectedIdx === idx;

        if (block.type === 'text') {
          return (
            <TextBlockEditor
              key={idx}
              idx={idx}
              block={block}
              isSelected={isSelected}
              onSelect={onSelect}
              onChange={onChange}
              handlePaste={handlePaste}
            />
          );
        }

        const containerStyle = {
          border: isSelected ? '2px solid #0867ec' : '2px solid transparent',
          padding: '8px',
          cursor: 'pointer',
          marginBottom: '8px',
        };

        return (
          <div key={idx} style={containerStyle} onClick={() => onSelect(idx)}>
            {block.type === 'button' && (
              <div style={{ textAlign: 'center' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    backgroundColor: block.bgColor,
                    color: block.textColor,
                    borderRadius: '4px',
                    fontFamily: 'Helvetica, sans-serif',
                    fontSize: '16px',
                    fontWeight: 'bold',
                  }}
                >
                  {block.label}
                </span>
              </div>
            )}

            {block.type === 'divider' && (
              <div style={{ width: '100%', padding: '12px 0' }}>
                <div
                  style={{
                    borderTop: `1px solid ${block.color}`,
                    width: '100%',
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
