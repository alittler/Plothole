import React, { useRef, useState } from 'react';
import { Upload, AlertCircle, CheckCircle, Image as ImageIcon, X } from 'lucide-react';
import { processAndUploadImage, validateImageFile } from '../../utils/imageUtils';

interface ImageUploadInputProps {
  onImageUrl: (url: string) => void;
  onError: (error: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  filename?: string;
  maxFileSize?: number;
  showPreview?: boolean;
}

type UploadStage = 'idle' | 'validation' | 'reading' | 'processing' | 'uploading' | 'complete' | 'error';

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  onImageUrl,
  onError,
  isLoading = false,
  disabled = false,
  filename = 'image',
  maxFileSize = 5 * 1024 * 1024,
  showPreview = true
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const stageMessages = {
    idle: 'Drop image or click to upload',
    validation: 'Validating image...',
    reading: 'Reading image data...',
    processing: 'Resizing & converting to WebP...',
    uploading: 'Uploading to server...',
    complete: 'Upload complete!',
    error: 'Upload failed'
  };

  const handleFileSelect = async (file: File) => {
    // Clear previous state
    setErrorMessage('');
    setPreviewUrl('');

    // Client-side file size validation
    const validation = validateImageFile(file, maxFileSize);
    if (!validation.valid) {
      setUploadStage('error');
      setErrorMessage(validation.error || 'Invalid file');
      onError(validation.error || 'Invalid file');
      return;
    }

    setUploadStage('validation');
    setProgress(10);

    try {
      // Show preview of original image
      if (showPreview) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }

      // Process and upload with progress tracking
      const url = await processAndUploadImage(
        file,
        filename,
        {},
        (progressUpdate) => {
          setUploadStage(progressUpdate.stage);
          setProgress(progressUpdate.percentage);
        }
      );

      setUploadStage('complete');
      setProgress(100);
      onImageUrl(url);

      // Keep preview visible - don't auto-reset
      // User can see confirmation that upload succeeded
    } catch (error) {
      setUploadStage('error');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMessage(errorMsg);
      onError(errorMsg);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    } else {
      setErrorMessage('Please drop an image file');
      onError('Please drop an image file');
    }
  };

  const isProcessing = uploadStage !== 'idle' && uploadStage !== 'error' && uploadStage !== 'complete';
  const hasError = uploadStage === 'error';
  const isSuccess = uploadStage === 'complete';

  return (
    <div className="w-full space-y-2">
      <div
        className={`relative border-2 border-dashed rounded-xl transition-all ${
          isDragging
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
            : hasError
            ? 'border-red-300 dark:border-red-700'
            : isSuccess
            ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <label className={`block cursor-pointer p-4 text-center ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            disabled={disabled || isProcessing}
            className="hidden"
          />

          {/* Preview */}
          {previewUrl && showPreview && (
            <div className="mb-3">
              <img src={previewUrl} alt="Preview" className="h-24 w-24 mx-auto object-cover rounded-lg" />
            </div>
          )}

          {/* Status Icon */}
          <div className="mb-2 flex justify-center">
            {isSuccess ? (
              <CheckCircle className="text-green-500" size={32} />
            ) : hasError ? (
              <AlertCircle className="text-red-500" size={32} />
            ) : isProcessing ? (
              <ImageIcon className="text-indigo-500 animate-pulse" size={32} />
            ) : (
              <Upload className="text-slate-400" size={32} />
            )}
          </div>

          {/* Status Text */}
          <div className="space-y-1">
            <p className={`text-sm font-semibold ${
              hasError ? 'text-red-700 dark:text-red-300' :
              isSuccess ? 'text-green-700 dark:text-green-300' :
              isProcessing ? 'text-indigo-600 dark:text-indigo-400' :
              'text-slate-600 dark:text-slate-400'
            }`}>
              {stageMessages[uploadStage]}
            </p>

            {!isProcessing && !hasError && !isSuccess && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Max 5MB • Resized to 1200px • Converted to WebP
              </p>
            )}
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="mt-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </label>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex gap-2">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Info Message */}
      {isLoading && (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <p className="text-xs text-indigo-700 dark:text-indigo-300">Processing your image...</p>
        </div>
      )}
    </div>
  );
};
