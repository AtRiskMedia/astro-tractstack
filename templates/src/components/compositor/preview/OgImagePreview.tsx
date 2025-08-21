import { useState, useEffect, useRef } from 'react';
import ColorPickerCombo from '@/components/fields/ColorPickerCombo';
import { setPendingImageOperation } from '@/stores/storykeep';
import type { BrandConfig } from '@/types/tractstack';

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;
const OG_ASPECT_RATIO = OG_IMAGE_WIDTH / OG_IMAGE_HEIGHT;
const TEXT_MARGIN = 80;

interface OgImagePreviewProps {
  nodeId: string;
  title: string;
  socialImagePath: string | null;
  config: BrandConfig;
  onColorChange?: (textColor: string, bgColor: string) => void;
}

const OgImagePreview = ({
  nodeId,
  title,
  socialImagePath,
  config,
  onColorChange,
}: OgImagePreviewProps) => {
  const [fontSize, setFontSize] = useState<number>(48);
  const [textColor, setTextColor] = useState('#ffffff');
  const [bgColor, setBgColor] = useState('#1f2937');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!title) return;

    const baseSize = 48;
    const titleLength = title.length;
    let calculatedSize = baseSize;

    if (titleLength > 50) calculatedSize = 32;
    else if (titleLength > 30) calculatedSize = 40;
    else if (titleLength > 15) calculatedSize = 44;

    setFontSize(calculatedSize);
  }, [title, nodeId]);

  const generateCanvasImage = async () => {
    if (socialImagePath || !title) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = OG_IMAGE_WIDTH;
    canvas.height = OG_IMAGE_HEIGHT;

    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set up text
    ctx.fillStyle = textColor;
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    // Calculate available width for text
    const maxWidth = OG_IMAGE_WIDTH - TEXT_MARGIN * 2;
    const centerX = OG_IMAGE_WIDTH / 2;
    const centerY = OG_IMAGE_HEIGHT / 2;

    // Simple word wrapping
    const words = title.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Single word is too long, just use it
          lines.push(word);
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    // Draw text lines
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = centerY - totalHeight / 2 + lineHeight / 2;

    lines.forEach((line, index) => {
      const y = startY + index * lineHeight;
      ctx.fillText(line, centerX, y);
    });

    // Convert to base64
    const base64Data = canvas.toDataURL('image/png', 0.9);

    // Add to pending operations
    setPendingImageOperation(nodeId, {
      type: 'upload',
      data: base64Data,
      path: `/images/og/${nodeId}-generated-${Date.now()}.png`,
      filename: `${nodeId}-generated-${Date.now()}.png`,
    });
  };

  // Generate image when title or colors change
  useEffect(() => {
    generateCanvasImage();
  }, [title, textColor, bgColor, socialImagePath, fontSize, nodeId]);

  const handleTextColorChange = (color: string) => {
    setTextColor(color);
    onColorChange?.(color, bgColor);
  };

  const handleBgColorChange = (color: string) => {
    setBgColor(color);
    onColorChange?.(textColor, color);
  };

  const previewWidth = 480;
  const previewHeight = previewWidth / OG_ASPECT_RATIO;
  const scaledFontSize = fontSize
    ? (fontSize * previewWidth) / OG_IMAGE_WIDTH
    : 24;

  return (
    <div className="w-full space-y-6">
      <div className="flex w-full flex-col space-y-4">
        <div
          className="relative overflow-hidden rounded-md border border-gray-300"
          style={{
            width: `${previewWidth}px`,
            height: `${previewHeight}px`,
          }}
        >
          {socialImagePath ? (
            <img
              src={socialImagePath}
              alt="Open Graph preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ backgroundColor: bgColor }}
            >
              <div
                className="px-8 text-center"
                style={{
                  color: textColor,
                  fontSize: `${scaledFontSize}px`,
                  fontWeight: 'bold',
                  lineHeight: 1.2,
                  maxWidth: `${previewWidth - ((TEXT_MARGIN * previewWidth) / OG_IMAGE_WIDTH) * 2}px`,
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                {title || 'Your page title will appear here'}
              </div>
            </div>
          )}
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Images must be exactly {OG_IMAGE_WIDTH}x{OG_IMAGE_HEIGHT} pixels (JPG
          or PNG)
        </p>
      </div>

      {!socialImagePath && (
        <div className="grid max-w-md grid-cols-1 gap-6 md:grid-cols-2">
          <ColorPickerCombo
            title="Text Color"
            defaultColor={textColor}
            onColorChange={handleTextColorChange}
            config={config}
          />
          <ColorPickerCombo
            title="Background Color"
            defaultColor={bgColor}
            onColorChange={handleBgColorChange}
            config={config}
          />
        </div>
      )}

      <div className="mt-2 text-sm text-gray-600">
        <p>
          The Open Graph image will be shown when your page is shared on social
          media.
        </p>
        {!socialImagePath && (
          <p className="mt-1">
            An image will be automatically generated using your page title and
            these colors.
          </p>
        )}
      </div>

      {/* Hidden canvas for image generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default OgImagePreview;
