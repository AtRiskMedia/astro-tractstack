import type { ClipboardEvent } from 'react';
import type { EmailBlock } from '@/utils/api/emailHelpers';

interface BlocksProps {
  blocks: EmailBlock[];
  selectedIdx: number | null;
  onSelect: (index: number) => void;
  onChange: (index: number, block: EmailBlock) => void;
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
        const containerStyle = {
          border: isSelected ? '2px solid #0867ec' : '2px solid transparent',
          padding: '8px',
          cursor: 'pointer',
          marginBottom: '8px',
        };

        return (
          <div key={idx} style={containerStyle} onClick={() => onSelect(idx)}>
            {block.type === 'text' && (
              <textarea
                value={block.content}
                onChange={(e) =>
                  onChange(idx, { ...block, content: e.target.value })
                }
                onPaste={(e) =>
                  handlePaste(
                    e,
                    idx,
                    block as Extract<EmailBlock, { type: 'text' }>
                  )
                }
                style={{
                  width: '100%',
                  minHeight: '40px',
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
                rows={block.content.split('\n').length}
              />
            )}

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
