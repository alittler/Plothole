/**
 * Image processing utilities for resizing and converting to WebP format
 */

interface ImageProcessingOptions {
  maxWidth?: number;
  maxFileSize?: number; // in bytes
  quality?: number; // 0-1 for WebP quality
}

interface ImageProcessingResult {
  blob: Blob;
  dimensions: { width: number; height: number };
  originalSize: number;
  processedSize: number;
}

type ProgressCallback = (progress: {
  stage: 'validation' | 'reading' | 'processing' | 'uploading';
  percentage: number;
  message: string;
}) => void;

/**
 * Validate file before processing
 * @param file - The file to validate
 * @param maxFileSize - Maximum allowed file size in bytes
 * @returns { valid: boolean, error?: string }
 */
export function validateImageFile(
  file: File,
  maxFileSize: number = 5 * 1024 * 1024
): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }

  if (file.size > maxFileSize) {
    const maxMB = (maxFileSize / 1024 / 1024).toFixed(0);
    const actualMB = (file.size / 1024 / 1024).toFixed(2);
    return {
      valid: false,
      error: `File is ${actualMB}MB. Maximum allowed is ${maxMB}MB. Please select a smaller image or compress it first.`
    };
  }

  return { valid: true };
}

/**
 * Process an image file: resize to max width and convert to WebP
 * @param file - The image file to process
 * @param options - Processing options (maxWidth: ~1200px, quality: 0.8)
 * @param onProgress - Optional callback for progress updates
 * @returns Promise that resolves to a processed image result with blob and metadata
 */
export async function processImage(
  file: File,
  options: ImageProcessingOptions = {},
  onProgress?: ProgressCallback
): Promise<ImageProcessingResult> {
  const {
    maxWidth = 1200,
    maxFileSize = 5 * 1024 * 1024, // 5MB
    quality = 0.8
  } = options;

  // Validate file size
  const validation = validateImageFile(file, maxFileSize);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  onProgress?.({
    stage: 'validation',
    percentage: 10,
    message: 'Image validated'
  });

  // Create image element to get dimensions
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      onProgress?.({
        stage: 'reading',
        percentage: 25,
        message: 'Reading image data'
      });

      const img = new Image();
      img.onload = () => {
        onProgress?.({
          stage: 'processing',
          percentage: 40,
          message: 'Resizing image'
        });

        // Calculate new dimensions
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        if (width > maxWidth) {
          const scale = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * scale);
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        onProgress?.({
          stage: 'processing',
          percentage: 65,
          message: 'Converting to WebP'
        });

        // Convert to WebP
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob from canvas'));
              return;
            }

            // If WebP conversion failed or result is too large, try with lower quality
            if (blob.size > maxFileSize) {
              // Recursively try with lower quality
              const newQuality = Math.max(0.1, quality - 0.1);
              if (newQuality > 0.2) {
                canvas.toBlob(
                  (retryBlob) => {
                    if (retryBlob && retryBlob.size <= maxFileSize) {
                      onProgress?.({
                        stage: 'processing',
                        percentage: 90,
                        message: 'Image compressed successfully'
                      });
                      resolve({
                        blob: retryBlob,
                        dimensions: { width, height },
                        originalSize: file.size,
                        processedSize: retryBlob.size
                      });
                    } else {
                      reject(
                        new Error(
                          `Image could not be compressed enough. Please select a smaller or lower-resolution image.`
                        )
                      );
                    }
                  },
                  'image/webp',
                  newQuality
                );
              } else {
                reject(
                  new Error(
                    `Image could not be compressed enough. Please select a smaller or lower-resolution image.`
                  )
                );
              }
            } else {
              onProgress?.({
                stage: 'processing',
                percentage: 90,
                message: 'Image ready for upload'
              });
              resolve({
                blob,
                dimensions: { width, height },
                originalSize: file.size,
                processedSize: blob.size
              });
            }
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image. The file may be corrupted or in an unsupported format.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Upload a processed image file
 * @param blob - The processed image blob
 * @param filename - Optional filename (without extension)
 * @param onProgress - Optional callback for progress updates
 * @returns Promise that resolves to the image URL
 */
export async function uploadProcessedImage(
  blob: Blob,
  filename?: string,
  onProgress?: ProgressCallback
): Promise<string> {
  const formData = new FormData();
  
  // Create a File from the blob with .webp extension
  const file = new File(
    [blob],
    `${filename || 'image'}-${Date.now()}.webp`,
    { type: 'image/webp' }
  );
  
  formData.append('image', file);

  onProgress?.({
    stage: 'uploading',
    percentage: 95,
    message: 'Uploading to server'
  });

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload image to server');
  }

  onProgress?.({
    stage: 'uploading',
    percentage: 100,
    message: 'Upload complete'
  });

  const data = await response.json();
  return data.url;
}

/**
 * Process and upload an image in one step
 * @param file - The image file to process and upload
 * @param filename - Optional filename for the uploaded file
 * @param options - Processing options
 * @param onProgress - Optional callback for progress updates
 * @returns Promise that resolves to the image URL and metadata
 */
export async function processAndUploadImage(
  file: File,
  filename?: string,
  options?: ImageProcessingOptions,
  onProgress?: ProgressCallback
): Promise<string> {
  const result = await processImage(file, options, onProgress);
  return uploadProcessedImage(result.blob, filename, onProgress);
}
