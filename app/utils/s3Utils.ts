/**
 * Presigned URL utilities for S3 access
 */

/**
 * Fetch a presigned URL from the server for accessing a private S3 object
 * @param key - The S3 object key
 * @returns Promise that resolves to the presigned URL
 */
export const getPresignedUrl = async (key: string): Promise<string> => {
  try {
    const response = await fetch('/api/presigned-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get presigned URL: ${response.statusText}`);
    }

    const data = await response.json();
    return data.url;
  } catch (err) {
    console.error('Error fetching presigned URL:', err);
    throw err;
  }
};

/**
 * Convert a relative S3 path to a presigned URL if needed
 * @param url - The URL returned from upload endpoints
 * @returns The URL (presigned if it starts with https://, otherwise returns as-is)
 */
export const ensurePresignedUrl = (url: string): string => {
  // If it's already a full URL (starts with https://), it's already presigned
  if (url.startsWith('https://')) {
    return url;
  }
  // Otherwise it's a relative path (e.g., /uploads/..., /source-files/...)
  return url;
};
