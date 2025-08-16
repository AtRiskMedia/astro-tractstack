import { useState, useEffect } from 'react';
import ColorPickerCombo from '@/components/fields/ColorPickerCombo';
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
            If no custom image is provided, an image will be generated using
            your page title and these colors.
          </p>
        )}
      </div>
    </div>
  );
};

export default OgImagePreview;
