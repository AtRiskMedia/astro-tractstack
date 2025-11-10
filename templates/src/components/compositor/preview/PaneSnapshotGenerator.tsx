import { useEffect, useState } from 'react';
import * as htmlToImage from 'html-to-image';
import { brandConfigStore } from '@/stores/storykeep';

export type SnapshotData = {
  imageData: string;
  height: number;
};

export interface PaneSnapshotGeneratorProps {
  id: string;
  htmlString: string;
  onComplete: (id: string, data: SnapshotData) => void;
  onError?: (id: string, error: string) => void;
  outputWidth?: number;
}

const snapshotCache = new Map<string, SnapshotData>();

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

export const PaneSnapshotGenerator = ({
  id,
  htmlString,
  onComplete,
  onError,
  outputWidth = 800,
}: PaneSnapshotGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!htmlString || isGenerating) return;

    const cacheKey = `${id}-${hashString(htmlString)}-${outputWidth}`;
    if (snapshotCache.has(cacheKey)) {
      const cached = snapshotCache.get(cacheKey)!;
      onComplete(id, cached);
      return;
    }

    const generateSnapshot = async () => {
      setIsGenerating(true);

      try {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-99999px';
        iframe.style.top = '0px';
        iframe.style.width = '1500px';
        iframe.style.height = '2000px';
        iframe.style.border = 'none';
        iframe.style.background = '#ffffff';

        document.body.appendChild(iframe);

        await new Promise<void>((resolve) => {
          iframe.onload = () => resolve();
          if (iframe.contentDocument) {
            resolve();
          }
        });

        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          throw new Error('Could not access iframe document');
        }

        const cssBasePath = '/media/css';
        const customCssUrl = `${cssBasePath}/custom.css`;
        const storykeepCssUrl = `${cssBasePath}/storykeep.css`;

        const brandColors =
          brandConfigStore.get()?.BRAND_COLOURS?.split(',') || [];

        // Get all existing CSS links from current document
        const existingCssLinks = Array.from(
          document.querySelectorAll('link[rel="stylesheet"]')
        )
          .map((link) => (link as HTMLLinkElement).href)
          .filter((href) => href);

        const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Snapshot Preview</title>
  <link rel="stylesheet" href="${customCssUrl}">
  <link rel="stylesheet" href="${storykeepCssUrl}">
  ${existingCssLinks.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n')}
  ${
    brandColors
      ? `
  <style>
    :root {
      --brand-primary: ${brandColors[0] || '#000000'};
      --brand-secondary: ${brandColors[1] || '#666666'};
      --brand-accent: ${brandColors[2] || '#cccccc'};
    }
  </style>
  `
      : ''
  }
  <style>
    body { 
      margin: 0; 
      padding: 0;
      font-family: system-ui, -apple-system, sans-serif; 
      width: 1500px; 
      overflow-x: hidden;
    }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  ${htmlString}
</body>
</html>`;

        iframeDoc.open();
        (iframeDoc as any).write(fullHtml);
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

        const iframeBody = iframeDoc.body;
        if (!iframeBody) {
          throw new Error('Iframe body not found');
        }

        const contentHeight = iframeBody.scrollHeight;

        const dataUrl = await htmlToImage.toPng(iframeBody, {
          width: 1500,
          height: contentHeight,
          pixelRatio: 1,
          backgroundColor: '#ffffff',
          quality: 0.95,
          skipFonts: true,
          skipAutoScale: true,
        });

        const scaleFactor = outputWidth / 1500;
        const scaledHeight = Math.round(contentHeight * scaleFactor);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        canvas.width = outputWidth;
        canvas.height = scaledHeight;

        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            ctx.drawImage(img, 0, 0, outputWidth, scaledHeight);
            resolve();
          };
          img.onerror = reject;
          img.src = dataUrl;
        });

        const finalImageData = canvas.toDataURL('image/png');

        document.body.removeChild(iframe);

        const snapshotData: SnapshotData = {
          imageData: finalImageData,
          height: scaledHeight,
        };

        snapshotCache.set(cacheKey, snapshotData);
        onComplete(id, snapshotData);
      } catch (error) {
        console.error(`Snapshot generation failed for ${id}:`, error);
        onError?.(id, error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsGenerating(false);
      }
    };

    generateSnapshot();
  }, [id, htmlString, isGenerating, onComplete, onError, outputWidth]);

  // Show spinner while generating
  if (isGenerating) {
    return (
      <div className="flex h-24 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return null;
};
