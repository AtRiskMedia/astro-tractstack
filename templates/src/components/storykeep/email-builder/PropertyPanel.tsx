import type { EmailBlock } from '@/utils/api/emailHelpers';

interface PropertyPanelProps {
  block: EmailBlock;
  onChange: (block: EmailBlock) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export default function PropertyPanel({
  block,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: PropertyPanelProps) {
  return (
    <div className="space-y-6">
      <div className="flex min-w-0 items-center justify-between border-b border-gray-200 pb-4">
        <h3 className="min-w-0 flex-1 truncate text-sm font-bold capitalize text-gray-900">
          {block.type} Settings
        </h3>
        <div className="flex shrink-0 gap-2 text-gray-400">
          <button onClick={onMoveUp} className="hover:text-gray-900">
            &uarr;
          </button>
          <button onClick={onMoveDown} className="hover:text-gray-900">
            &darr;
          </button>
          <button onClick={onDelete} className="hover:text-red-600">
            &times;
          </button>
        </div>
      </div>

      {block.type === 'text' && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">
              Alignment
            </label>
            <select
              value={block.align}
              onChange={(e) =>
                onChange({ ...block, align: e.target.value as any })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">
              Text Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={block.color}
                onChange={(e) => onChange({ ...block, color: e.target.value })}
                className="h-8 w-8 cursor-pointer rounded"
              />
              <input
                type="text"
                value={block.color}
                onChange={(e) => onChange({ ...block, color: e.target.value })}
                className="flex-1 rounded-md border border-gray-300 px-3 py-1 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={block.isBold}
              onChange={(e) => onChange({ ...block, isBold: e.target.checked })}
              className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
            <label className="text-sm font-bold text-gray-700">Bold Text</label>
          </div>
        </div>
      )}

      {block.type === 'button' && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">
              Label
            </label>
            <input
              type="text"
              value={block.label}
              onChange={(e) => onChange({ ...block, label: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">
              URL
            </label>
            <input
              type="text"
              value={block.url}
              onChange={(e) => onChange({ ...block, url: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">
              Background Color
            </label>
            <input
              type="color"
              value={block.bgColor}
              onChange={(e) => onChange({ ...block, bgColor: e.target.value })}
              className="h-8 w-full cursor-pointer rounded"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">
              Text Color
            </label>
            <input
              type="color"
              value={block.textColor}
              onChange={(e) =>
                onChange({ ...block, textColor: e.target.value })
              }
              className="h-8 w-full cursor-pointer rounded"
            />
          </div>
        </div>
      )}

      {block.type === 'divider' && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">
              Line Color
            </label>
            <input
              type="color"
              value={block.color}
              onChange={(e) => onChange({ ...block, color: e.target.value })}
              className="h-8 w-full cursor-pointer rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}
