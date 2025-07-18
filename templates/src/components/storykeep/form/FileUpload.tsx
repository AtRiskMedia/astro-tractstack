import { useRef, useState, useId } from 'react';
import { classNames } from '@/utils/helpers';
import {
  validateFile,
  resizeAndCropImage,
  fileToBase64,
  isSvgFile,
  type FileValidationOptions,
} from '@/utils/api/fileHelpers';
import type { AllowedImageFormat, ImageDimensions } from '@/types/formTypes';

interface FileUploadProps {
  value: string; // Base64 encoded file or URL
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;

  // Basic options
  accept?: string;
  maxSizeKB?: number;
  showPreview?: boolean;
  previewAlt?: string;

  // Enhanced validation options
  allowedFormats?: AllowedImageFormat[];
  requiredDimensions?: ImageDimensions;
  allowAnyImageWithWarning?: boolean;

  // Auto-processing options
  autoResize?: ImageDimensions;
  imageQuality?: number; // 0.1 to 1.0 for JPEG compression

  // Accessibility options
  id?: string;
  name?: string;
}

const FileUpload = ({
  value,
  onChange,
  label,
  error,
  disabled = false,
  required = false,
  className,
  accept = 'image/*',
  maxSizeKB = 1024,
  showPreview = true,
  previewAlt = 'Preview',
  allowedFormats,
  requiredDimensions,
  allowAnyImageWithWarning = false,
  autoResize,
  imageQuality = 0.9,
  id: customId,
  name: customName,
}: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Generate unique IDs for accessibility
  const defaultId = useId();
  const inputId = customId || defaultId;
  const errorId = `${inputId}-error`;
  const warningId = `${inputId}-warnings`;
  const helpTextId = `${inputId}-help`;
  const inputName = customName || inputId;

  const isImage = accept.includes('image/');
  const hasValue = Boolean(value);

  // Extract file info from base64 if available
  const getFileInfo = () => {
    if (!value || !value.startsWith('data:')) return null;

    const mimeMatch = value.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : 'unknown';

    // Estimate size from base64 length (rough approximation)
    const sizeEstimate = Math.round((value.length * 0.75) / 1024);

    return {
      type: mime,
      size: `~${sizeEstimate}KB`,
    };
  };

  const fileInfo = getFileInfo();

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setUploadError(null);
    setWarnings([]);

    try {
      // Build validation options
      const validationOptions: FileValidationOptions = {
        maxSizeKB,
        allowedFormats,
        requiredDimensions: !autoResize ? requiredDimensions : undefined,
        allowAnyImageWithWarning,
      };

      // Validate file
      const validationResult = await validateFile(file, validationOptions);

      if (!validationResult.isValid && !allowAnyImageWithWarning) {
        setUploadError(validationResult.error || 'File validation failed');
        setIsProcessing(false);
        return;
      }

      let processedBase64: string;
      let processingWarnings: string[] = [];

      // Handle auto-resize
      if (autoResize && isImage && !isSvgFile(file)) {
        const result = await resizeAndCropImage(file, autoResize, imageQuality);
        processedBase64 = result.processedFile;
        processingWarnings = result.warnings;
      } else {
        // Simple base64 conversion
        processedBase64 = await fileToBase64(file);
      }

      // Combine validation warnings with processing warnings
      const allWarnings: string[] = [];

      if (validationResult.error && allowAnyImageWithWarning) {
        allWarnings.push(validationResult.error);
      }

      allWarnings.push(...processingWarnings);

      // Set warnings and update value
      setWarnings(allWarnings);
      onChange(processedBase64);
    } catch (err) {
      console.error('File processing error:', err);
      setUploadError(
        err instanceof Error ? err.message : 'Failed to process file'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleRemove = () => {
    onChange('');
    setWarnings([]);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getAcceptString = () => {
    if (allowedFormats) {
      const mimeTypes: Record<AllowedImageFormat, string> = {
        svg: 'image/svg+xml',
        ico: 'image/x-icon,image/vnd.microsoft.icon',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        gif: 'image/gif',
      };

      return allowedFormats
        .map((format) => mimeTypes[format])
        .filter(Boolean)
        .join(',');
    }
    return accept;
  };

  const getHelpText = () => {
    const parts: string[] = [];

    if (allowedFormats) {
      parts.push(allowedFormats.map((f) => f.toUpperCase()).join(', '));
    } else {
      parts.push(accept);
    }

    parts.push(`up to ${maxSizeKB}KB`);

    if (requiredDimensions && !autoResize) {
      parts.push(`${requiredDimensions.width}x${requiredDimensions.height}px`);
    }

    if (autoResize) {
      parts.push(
        `(auto-resized to ${autoResize.width}x${autoResize.height}px)`
      );
    }

    return parts.join(' • ');
  };

  return (
    <div className={className}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="mb-2 block text-sm font-bold text-gray-700"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      {/* Upload Area */}
      <div
        className={classNames(
          'relative rounded-lg border-2 border-dashed p-6 text-center transition-colors',
          dragOver
            ? 'border-cyan-400 bg-cyan-50'
            : hasValue
              ? 'border-green-300 bg-green-50'
              : 'border-gray-300 bg-gray-50',
          disabled
            ? 'cursor-not-allowed opacity-50'
            : 'cursor-pointer hover:border-cyan-400 hover:bg-cyan-50'
        )}
        onClick={() =>
          !disabled && !isProcessing && fileInputRef.current?.click()
        }
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          id={inputId}
          name={inputName}
          type="file"
          accept={getAcceptString()}
          onChange={handleFileSelect}
          disabled={disabled || isProcessing}
          aria-invalid={!!error}
          aria-describedby={
            [
              error ? errorId : null,
              warnings.length > 0 ? warningId : null,
              helpTextId,
            ]
              .filter(Boolean)
              .join(' ') || undefined
          }
          className="hidden"
        />

        {isProcessing ? (
          <div className="text-cyan-600">
            <svg
              className="mx-auto mb-2 h-8 w-8 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-sm">Processing image...</p>
          </div>
        ) : hasValue ? (
          <div className="space-y-2">
            <svg
              className="mx-auto h-8 w-8 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm font-bold text-green-700">File uploaded</p>
            {fileInfo && (
              <p className="text-xs text-gray-600">
                {fileInfo.type} • {fileInfo.size}
              </p>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="text-sm text-red-600 underline hover:text-red-800"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <svg
              className="mx-auto h-8 w-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <div>
              <p className="text-sm text-gray-600">
                <span className="font-bold text-cyan-600">Click to upload</span>{' '}
                or drag and drop
              </p>
              <p id={helpTextId} className="text-xs text-gray-500">
                {getHelpText()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      {showPreview && hasValue && isImage && (
        <div className="mt-3">
          <img
            src={value}
            alt={previewAlt}
            className="h-32 max-w-full rounded-md border border-gray-200 object-contain"
            onError={(e) => {
              // Hide image if it fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
          {/* Show file info for URL paths */}
          {!value.startsWith('data:') && (
            <p className="mt-1 text-xs text-gray-500">
              Current: {value.split('/').pop()}
            </p>
          )}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div id={warningId} className="mt-2">
          {warnings.map((warning, index) => (
            <p
              key={index}
              className="flex items-start gap-1 text-sm text-amber-600"
            >
              <svg
                className="mt-0.5 h-4 w-4 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {warning}
            </p>
          ))}
        </div>
      )}

      {/* Error Messages */}
      {uploadError && (
        <p
          id={errorId}
          className="mt-2 flex items-start gap-1 text-sm text-red-600"
          role="alert"
        >
          <svg
            className="mt-0.5 h-4 w-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {uploadError}
        </p>
      )}

      {error && !uploadError && (
        <p
          id={errorId}
          className="mt-2 flex items-start gap-1 text-sm text-red-600"
          role="alert"
        >
          <svg
            className="mt-0.5 h-4 w-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default FileUpload;
