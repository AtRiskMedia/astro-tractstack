import type {
  AllowedImageFormat,
  ImageDimensions,
  ImageProcessingResult,
} from '@/types/formTypes';

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates file size
 */
export const validateFileSize = (
  file: File,
  maxSizeKB: number
): ValidationResult => {
  if (file.size > maxSizeKB * 1024) {
    return {
      isValid: false,
      error: `File size must be less than ${maxSizeKB}KB (current: ${Math.round(file.size / 1024)}KB)`,
    };
  }
  return { isValid: true };
};

/**
 * Validates file type against allowed formats
 */
export const validateFileType = (
  file: File,
  allowedFormats: AllowedImageFormat[]
): ValidationResult => {
  const fileExtension = file.name.toLowerCase().split('.').pop();
  const mimeType = file.type.toLowerCase();

  const formatChecks: Record<
    AllowedImageFormat,
    (ext: string, mime: string) => boolean
  > = {
    svg: (ext, mime) => ext === 'svg' || mime === 'image/svg+xml',
    ico: (ext, mime) =>
      ext === 'ico' ||
      mime === 'image/x-icon' ||
      mime === 'image/vnd.microsoft.icon',
    png: (ext, mime) => ext === 'png' || mime === 'image/png',
    jpg: (ext, mime) =>
      ext === 'jpg' || ext === 'jpeg' || mime === 'image/jpeg',
    jpeg: (ext, mime) =>
      ext === 'jpg' || ext === 'jpeg' || mime === 'image/jpeg',
    webp: (ext, mime) => ext === 'webp' || mime === 'image/webp',
    gif: (ext, mime) => ext === 'gif' || mime === 'image/gif',
  };

  const isValid = allowedFormats.some((format) =>
    formatChecks[format]?.(fileExtension || '', mimeType)
  );

  if (!isValid) {
    return {
      isValid: false,
      error: `File type not allowed. Accepted formats: ${allowedFormats.join(', ')}`,
    };
  }

  return { isValid: true };
};

/**
 * Gets image dimensions from a file
 */
export const getImageDimensions = (file: File): Promise<ImageDimensions> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
      });
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Validates image dimensions
 */
export const validateImageDimensions = async (
  file: File,
  requiredDimensions: ImageDimensions
): Promise<ValidationResult> => {
  try {
    const dimensions = await getImageDimensions(file);

    if (
      dimensions.width !== requiredDimensions.width ||
      dimensions.height !== requiredDimensions.height
    ) {
      return {
        isValid: false,
        error: `Image must be ${requiredDimensions.width}x${requiredDimensions.height}px (got ${dimensions.width}x${dimensions.height}px)`,
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to read image dimensions',
    };
  }
};

/**
 * Checks if a file is an SVG (which doesn't need canvas processing)
 */
export const isSvgFile = (file: File): boolean => {
  return (
    file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
  );
};

/**
 * Converts file to base64 (for SVG files and simple conversions)
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result as string;
      resolve(result);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Resizes and crops an image to exact dimensions
 * Uses smart cropping (center crop) to maintain aspect ratio
 */
export const resizeAndCropImage = async (
  file: File,
  targetDimensions: ImageDimensions,
  quality: number = 0.9
): Promise<ImageProcessingResult> => {
  // Handle SVG files differently
  if (isSvgFile(file)) {
    const base64 = await fileToBase64(file);
    return {
      processedFile: base64,
      warnings: ['SVG files cannot be resized. Original file preserved.'],
      originalDimensions: { width: 0, height: 0 }, // SVG dimensions are dynamic
      finalDimensions: targetDimensions,
    };
  }

  return new Promise(async (resolve, reject) => {
    try {
      const originalDimensions = await getImageDimensions(file);
      const warnings: string[] = [];

      // If already correct dimensions, just convert to base64
      if (
        originalDimensions.width === targetDimensions.width &&
        originalDimensions.height === targetDimensions.height
      ) {
        const base64 = await fileToBase64(file);
        resolve({
          processedFile: base64,
          warnings: [],
          originalDimensions,
          finalDimensions: targetDimensions,
        });
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const img = new Image();

      img.onload = () => {
        // Calculate scaling to fill target dimensions (will crop if needed)
        const scaleX = targetDimensions.width / img.width;
        const scaleY = targetDimensions.height / img.height;
        const scale = Math.max(scaleX, scaleY); // Use larger scale to fill

        // Calculate scaled dimensions
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;

        // Calculate crop offset to center the image
        const cropX = (scaledWidth - targetDimensions.width) / 2;
        const cropY = (scaledHeight - targetDimensions.height) / 2;

        // Set canvas to target dimensions
        canvas.width = targetDimensions.width;
        canvas.height = targetDimensions.height;

        // Draw image scaled and centered
        ctx.drawImage(img, -cropX, -cropY, scaledWidth, scaledHeight);

        // Add warning about resizing
        if (
          originalDimensions.width !== targetDimensions.width ||
          originalDimensions.height !== targetDimensions.height
        ) {
          warnings.push(
            `Image resized from ${originalDimensions.width}x${originalDimensions.height} to ${targetDimensions.width}x${targetDimensions.height}`
          );
        }

        // Add warning about cropping if aspect ratios don't match
        const originalAspect =
          originalDimensions.width / originalDimensions.height;
        const targetAspect = targetDimensions.width / targetDimensions.height;

        if (Math.abs(originalAspect - targetAspect) > 0.01) {
          warnings.push('Image was cropped to fit the required aspect ratio');
        }

        // Convert to base64 (use JPEG for photos, PNG for images with transparency)
        const outputFormat = file.type.includes('png')
          ? 'image/png'
          : 'image/jpeg';
        const processedFile = canvas.toDataURL(outputFormat, quality);

        resolve({
          processedFile,
          warnings,
          originalDimensions,
          finalDimensions: targetDimensions,
        });

        URL.revokeObjectURL(img.src);
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image for processing'));
      };

      img.src = URL.createObjectURL(file);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Comprehensive file validation
 */
export interface FileValidationOptions {
  maxSizeKB?: number;
  allowedFormats?: AllowedImageFormat[];
  requiredDimensions?: ImageDimensions;
  allowAnyImageWithWarning?: boolean;
}

export const validateFile = async (
  file: File,
  options: FileValidationOptions
): Promise<ValidationResult> => {
  // Validate file size
  if (options.maxSizeKB) {
    const sizeResult = validateFileSize(file, options.maxSizeKB);
    if (!sizeResult.isValid) return sizeResult;
  }

  // Validate file type
  if (options.allowedFormats && !options.allowAnyImageWithWarning) {
    const typeResult = validateFileType(file, options.allowedFormats);
    if (!typeResult.isValid) return typeResult;
  }

  // Validate dimensions (skip for SVG files)
  if (options.requiredDimensions && !isSvgFile(file)) {
    const dimensionResult = await validateImageDimensions(
      file,
      options.requiredDimensions
    );
    if (!dimensionResult.isValid) return dimensionResult;
  }

  return { isValid: true };
};
