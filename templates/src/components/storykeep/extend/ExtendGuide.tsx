import { useState, type ComponentType, type SVGProps } from 'react';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import Bars3BottomLeftIcon from '@heroicons/react/24/outline/Bars3BottomLeftIcon';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import CircleStackIcon from '@heroicons/react/24/outline/CircleStackIcon';
import ClipboardDocumentCheckIcon from '@heroicons/react/24/outline/ClipboardDocumentCheckIcon';
import ClipboardDocumentIcon from '@heroicons/react/24/outline/ClipboardDocumentIcon';
import FolderArrowDownIcon from '@heroicons/react/24/outline/FolderArrowDownIcon';
import PaintBrushIcon from '@heroicons/react/24/outline/PaintBrushIcon';
import PuzzlePieceIcon from '@heroicons/react/24/outline/PuzzlePieceIcon';
import RectangleStackIcon from '@heroicons/react/24/outline/RectangleStackIcon';
import RocketLaunchIcon from '@heroicons/react/24/outline/RocketLaunchIcon';
import {
  baseBlock,
  buildingBlocks,
  guideIntro,
  publishBlock,
  type GuideBlock,
  type GuideBlockId,
} from './extendGuideContent';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const ICONS: Record<GuideBlockId, Icon> = {
  base: AcademicCapIcon,
  codehook: PuzzlePieceIcon,
  route: RectangleStackIcon,
  header: Bars3BottomLeftIcon,
  state: CircleStackIcon,
  files: FolderArrowDownIcon,
  customCss: PaintBrushIcon,
  publish: RocketLaunchIcon,
};

function CopyButton({
  text,
  label,
  onFailed,
}: {
  text: string;
  label: string;
  onFailed: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      onFailed();
    }
  }

  return (
    <button
      type="button"
      title={label}
      className="inline-flex shrink-0 items-center gap-1 bg-black/10 px-2 py-0.5 text-xs"
      onClick={() => void copy()}
    >
      {copied ? (
        <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 text-green-800" />
      ) : (
        <ClipboardDocumentIcon className="h-3.5 w-3.5" />
      )}
      {copied ? 'Copied' : 'Copy context'}
    </button>
  );
}

function ContextFallback({ text }: { text: string }) {
  return (
    <div className="mb-2">
      <p className="mb-2 border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-950">
        Copy failed — select and copy manually
      </p>
      <pre className="whitespace-pre-wrap border border-black/10 p-2 font-mono text-xs">
        {text}
      </pre>
    </div>
  );
}

function GuideCard({ block }: { block: GuideBlock }) {
  const [open, setOpen] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const Icon = ICONS[block.id];

  return (
    <div className="mb-2">
      <div className="flex w-full items-center gap-2">
        <button
          type="button"
          className="mb-1 flex min-w-0 flex-1 items-center gap-1 text-left font-action text-base"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
          <Icon className="h-4 w-4" />
          <span className="truncate">{block.title}</span>
        </button>
        <CopyButton
          text={block.context}
          label={`Copy ${block.title} agent context`}
          onFailed={() => {
            setCopyFailed(true);
            setOpen(true);
          }}
        />
      </div>
      {open && (
        <div className="pl-4">
          {block.summary.map((line) => (
            <p key={line} className="mb-1 text-xs text-black/60">
              {line}
            </p>
          ))}
          {copyFailed ? (
            <ContextFallback text={block.context} />
          ) : (
            <pre className="mb-2 whitespace-pre-wrap border border-black/10 p-2 font-mono text-xs">
              {block.context}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExtendGuide() {
  const [baseCopyFailed, setBaseCopyFailed] = useState(false);

  return (
    <div className="mb-4 max-w-xl">
      <div className="mb-4 border border-black/10 p-4">
        <div className="flex w-full items-center gap-2">
          <h2 className="min-w-0 flex-1 font-action text-lg">
            Extend with an AI agent
          </h2>
          <CopyButton
            text={baseBlock.context}
            label="Copy base agent context"
            onFailed={() => setBaseCopyFailed(true)}
          />
        </div>
        {guideIntro.map((line) => (
          <p key={line} className="mt-1 text-sm text-black/70">
            {line}
          </p>
        ))}
        {baseCopyFailed && (
          <div className="mt-1">
            <ContextFallback text={baseBlock.context} />
          </div>
        )}
      </div>

      <div className="border border-black/10 p-2 text-sm">
        <GuideCard block={baseBlock} />
        <p className="mb-1 text-xs text-black/60">Building blocks</p>
        {buildingBlocks.map((block) => (
          <GuideCard key={block.id} block={block} />
        ))}
        <p className="mb-1 text-xs text-black/60">Publish and verify</p>
        <GuideCard block={publishBlock} />
      </div>
    </div>
  );
}
