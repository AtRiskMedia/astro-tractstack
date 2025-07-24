import { useEffect, useRef, useState } from 'react';
import { timestampNodeId } from '@/utils/helpers';
import Node from '../Node';
import type { BrandConfig } from '@/types/tractstack';
import type { NodesContext } from '@/stores/nodes';

export type SnapshotData = {
  imageData: string;
  height: number;
};

export type NodesSnapshotRendererProps = {
  ctx: NodesContext;
  onComplete?: ((data: SnapshotData) => void) | undefined;
  forceRegenerate: boolean;
  config?: BrandConfig;
  outputWidth?: number;
};

const snapshotCache = new Map<string, SnapshotData>();

export const NodesSnapshotRenderer = (props: NodesSnapshotRendererProps) => {
  const [isGenerating, setIsGenerating] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const outputWidth = props.outputWidth || 800;

  useEffect(() => {
    if (!contentRef.current) return;
    if (!isGenerating && !props.forceRegenerate) return;
    if (props.ctx.allNodes.get().size === 0) return;

    const cacheKey = timestampNodeId(props.ctx.rootNodeId.get());
    if (!props.forceRegenerate && snapshotCache.has(cacheKey)) {
      const cached = snapshotCache.get(cacheKey);
      props.onComplete?.(cached!);
      setIsGenerating(false);
      return;
    }

    const generateSnapshot = async () => {
      try {
        // TODO: Replace with backend endpoint call
        // const response = await fetch('/api/v1/generate-snapshot', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     html: contentRef.current?.outerHTML,
        //     rootNodeId: props.ctx.rootNodeId.get(),
        //     outputWidth: outputWidth,
        //     config: props.config
        //   })
        // });
        // const result = await response.json();
        // const data = { imageData: result.imageData, height: result.height };

        // Temporary fallback: create a placeholder image
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (!contentRef.current) return;

        const height = contentRef.current.offsetHeight;
        const scaledHeight = (height * outputWidth) / 1500; // Simulate scaling

        // Create a placeholder base64 image (1x1 white pixel WebP)
        const placeholderBase64 =
          'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';

        const data = {
          imageData: placeholderBase64,
          height: Math.max(scaledHeight, 200), // Ensure minimum height
        };

        if (props.onComplete) {
          snapshotCache.set(cacheKey, data);
          props.onComplete(data);
        }
      } catch (error) {
        console.error('Error generating snapshot:', error);

        // Fallback on error
        const fallbackData = {
          imageData:
            'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
          height: 200,
        };
        props.onComplete?.(fallbackData);
      } finally {
        setIsGenerating(false);
      }
    };

    generateSnapshot();
  }, [props.ctx, props.forceRegenerate, outputWidth]);

  return (
    <>
      {(isGenerating || props.forceRegenerate) && (
        <div className="bg-mylightgrey/10 absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="border-myorange mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
            <p className="text-mydarkgrey mt-2 text-sm">
              Generating preview...
            </p>
          </div>
        </div>
      )}

      <div
        className="pointer-events-none absolute left-[-9999px] top-[-9999px] opacity-0"
        aria-hidden="true"
      >
        <div
          ref={contentRef}
          className="w-[1500px]"
          style={{
            backgroundColor: '#FFFFFF',
            isolation: 'isolate',
          }}
        >
          <Node
            nodeId={props.ctx.rootNodeId.get()}
            key={timestampNodeId(props.ctx.rootNodeId.get())}
            ctx={props.ctx}
            config={props.config}
          />
        </div>
      </div>
    </>
  );
};
