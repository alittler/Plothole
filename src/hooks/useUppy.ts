import { useCallback, useRef } from 'react';
import Uppy from '@uppy/core';
import XHRUpload from '@uppy/xhr-upload';

interface UseUppyOptions {
  endpoint?: string;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  autoProceed?: boolean;
  onSuccess?: (file: any, response: any) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

export const useUppy = (options: UseUppyOptions = {}) => {
  const {
    endpoint = '/api/upload',
    maxFileSize = 50 * 1024 * 1024,
    allowedFileTypes = [],
    autoProceed = true,
    onSuccess,
    onError,
    onProgress
  } = options;

  const uppyRef = useRef<Uppy | null>(null);

  const initializeUppy = useCallback(() => {
    if (uppyRef.current) return uppyRef.current;

    const uppy = new Uppy({
      id: `uppy-${Math.random()}`,
      autoProceed,
      allowMultiple: false,
      restrictions: {
        maxNumberOfFiles: 1,
        maxFileSize,
        ...(allowedFileTypes.length > 0 && { allowedFileTypes })
      }
    });

    uppy.use(XHRUpload, {
      endpoint,
      fieldName: 'file',
      timeout: 30 * 60 * 1000
    });

    uppy.on('upload-success', (file, response) => {
      onSuccess?.(file, response);
    });

    uppy.on('upload-error', (file, error) => {
      onError?.(error);
    });

    uppy.on('progress', (progress) => {
      onProgress?.(progress);
    });

    uppyRef.current = uppy;
    return uppy;
  }, [endpoint, maxFileSize, allowedFileTypes, autoProceed, onSuccess, onError, onProgress]);

  const upload = useCallback(async (file: File) => {
    const uppy = initializeUppy();
    uppy.addFile({
      name: file.name,
      type: file.type,
      data: file
    });
    return uppy.upload();
  }, [initializeUppy]);

  const getUppy = useCallback(() => {
    return initializeUppy();
  }, [initializeUppy]);

  const cleanup = useCallback(() => {
    if (uppyRef.current) {
      uppyRef.current.close({ reason: 'cleanup' });
      uppyRef.current = null;
    }
  }, []);

  return {
    uppy: getUppy(),
    upload,
    cleanup,
    initializeUppy
  };
};

export default useUppy;
