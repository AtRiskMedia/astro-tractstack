import { useEffect, useState } from 'react';
import { timestampNodeId } from '@/utils/helpers';
import { transformLivePaneForPreview } from '@/utils/etl';
import * as htmlToImage from 'html-to-image';
import type { BrandConfig } from '@/types/tractstack';
import type { NodesContext } from '@/stores/nodes';

const VERBOSE = false;

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
  const outputWidth = props.outputWidth || 800;

  useEffect(() => {
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
        const rootNodeId = props.ctx.rootNodeId.get();

        // Get the actual Pane ID, not StoryFragment wrapper
        let actualPaneId = rootNodeId;
        const rootNode = props.ctx.allNodes.get().get(rootNodeId);

        if (rootNode?.nodeType === 'StoryFragment') {
          // Find pane that has this StoryFragment as parent
          const allNodes = Array.from(props.ctx.allNodes.get().values());
          const childPanes = allNodes.filter(
            (node) => node.nodeType === 'Pane' && node.parentId === rootNodeId
          );

          if (childPanes.length > 0) {
            actualPaneId = childPanes[0].id;
            if (VERBOSE)
              console.log(
                '🎯 SNAPSHOT - Converting StoryFragment to actual pane:',
                actualPaneId
              );
          } else {
            throw new Error(`No Pane found under StoryFragment ${rootNodeId}`);
          }
        }

        const previewPayload = transformLivePaneForPreview(
          props.ctx,
          actualPaneId
        );

        const goBackend =
          import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
        const response = await fetch(`${goBackend}/api/v1/fragments/preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': import.meta.env.PUBLIC_TENANTID || 'default',
          },
          body: JSON.stringify({ panes: [previewPayload] }),
        });

        if (!response.ok) {
          throw new Error(`Preview API failed: ${response.status}`);
        }

        const { fragments } = await response.json();
        const htmlString = fragments[previewPayload.id];

        if (!htmlString) {
          throw new Error('No HTML returned from preview endpoint');
        }

        // Create iframe with complete document and CSS at 1500px width
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-99999px';
        iframe.style.top = '0px';
        iframe.style.width = '1500px';
        iframe.style.height = '2000px';
        iframe.style.border = 'none';
        iframe.style.background = '#ffffff';

        document.body.appendChild(iframe);

        // Determine CSS paths based on environment (matching Layout.astro logic)
        const isDev = import.meta.env.DEV;
        const cssBasePath = isDev ? '/styles' : '/media/css';

        // Get all existing CSS links from current document
        const existingCssLinks = Array.from(
          document.querySelectorAll('link[rel="stylesheet"]')
        )
          .map((link) => (link as HTMLLinkElement).href)
          .filter((href) => href);

        // Add storykeep.css (this is the key missing piece)
        const storykeepCssUrl = `${cssBasePath}/storykeep.css`;
        const customCssUrl = `${cssBasePath}/custom.css`;

        const iframeDoc = iframe.contentDocument!;

        // Write complete HTML document with proper CSS injection
        const fullHTML = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <link rel="stylesheet" href="${customCssUrl}">
              <link rel="stylesheet" href="${storykeepCssUrl}">
              ${existingCssLinks.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n')}
            </head>
            <body style="margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; width: 1500px;">
              ${htmlString}
            </body>
          </html>
        `;

        iframeDoc.open();
        iframeDoc.write(fullHTML);
        iframeDoc.close();

        // Wait for CSS to load
        await new Promise((resolve) => {
          if (iframeDoc.readyState === 'complete') {
            resolve(void 0);
          } else {
            iframe.onload = () => resolve(void 0);
          }
        });

        // Additional wait for rendering
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Get the body element for screenshot
        const bodyElement = iframeDoc.body;
        if (!bodyElement) {
          throw new Error('No body element found in iframe');
        }

        // Generate screenshot at 1500px width
        const dataUrl = await htmlToImage.toPng(bodyElement, {
          width: 1500,
          backgroundColor: '#ffffff',
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left',
          },
        });

        // Get actual height at 1500px
        const actualHeight = bodyElement.scrollHeight;

        // Clean up
        document.body.removeChild(iframe);

        const snapshotData: SnapshotData = {
          imageData: dataUrl,
          height: actualHeight,
        };

        // Cache the result
        snapshotCache.set(cacheKey, snapshotData);

        props.onComplete?.(snapshotData);
        setIsGenerating(false);
      } catch (error) {
        console.error('Snapshot generation failed:', error);
        setIsGenerating(false);

        // Clean up iframe if it exists
        const existingIframe = document.querySelector(
          'iframe[style*="-99999px"]'
        );
        if (existingIframe) {
          document.body.removeChild(existingIframe);
        }
      }
    };

    generateSnapshot();
  }, [props.ctx, props.forceRegenerate, props.onComplete, outputWidth]);

  return null;
};
