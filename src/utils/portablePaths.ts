import * as path from 'path';

/**
 * Convert an absolute path to a relative path from a base directory
 * Uses forward slashes for portability across OSes
 */
export const toPortablePath = (filePath: string, baseDir?: string): string => {
  let relPath = filePath;

  if (baseDir) {
    relPath = path.relative(baseDir, filePath);
  }

  // Always use forward slashes for cross-platform compatibility
  return relPath.replace(/\\/g, '/');
};

/**
 * Normalize a path to use forward slashes
 */
export const normalizePathSeparators = (filePath: string): string => {
  return filePath.replace(/\\/g, '/');
};

/**
 * Construct a sidecar path from a source path
 * Example: "document.pdf" -> "document.pdf.txt"
 */
export const getSidecarPath = (sourcePath: string): string => {
  return `${sourcePath}.txt`;
};

/**
 * Check if a path is a sidecar (ends with .txt and has a source file before it)
 */
export const isSidecarPath = (filePath: string): boolean => {
  return filePath.endsWith('.txt') && filePath.length > 4;
};
