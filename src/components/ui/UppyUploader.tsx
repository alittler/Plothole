'use client';

import React, { useEffect, useRef } from 'react';
import Uppy from '@uppy/core';
import { Dashboard } from '@uppy/react';
import XHRUpload from '@uppy/xhr-upload';
import Dropbox from '@uppy/dropbox';
import GoogleDrive from '@uppy/google-drive';
import '@uppy/core/dist/style.css';
import '@uppy/dashboard/dist/style.css';
import '@uppy/dropbox/dist/style.css';
import '@uppy/google-drive/dist/style.css';

interface UppyUploaderProps {
  endpoint?: string;
  autoProceed?: boolean;
  allowMultiple?: boolean;
  maxFiles?: number;
  maxFileSize?: number;
  restrictions?: {
    maxNumberOfFiles?: number;
    maxFileSize?: number;
    minFileSize?: number;
    allowedFileTypes?: string[];
  };
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
  onComplete?: (result: any) => void;
  locale?: string;
}

export const UppyUploader: React.FC<UppyUploaderProps> = ({
  endpoint = '/api/upload',
  autoProceed = false,
  allowMultiple = false,
  maxFiles = 1,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  restrictions,
  onSuccess,
  onError,
  onComplete,
  locale = 'en_US'
}) => {
  const uppyRef = useRef<Uppy | null>(null);

  useEffect(() => {
    if (uppyRef.current) return;

    // Initialize Uppy instance
    const uppy = new Uppy({
      id: 'uppy-uploader',
      autoProceed,
      allowMultiple,
      restrictions: {
        maxNumberOfFiles: maxFiles,
        maxFileSize: maxFileSize,
        minFileSize: 0,
        ...restrictions
      },
      meta: {
        type: 'avatar'
      },
      onBeforeFileAdded: (currentFile, files) => {
        // Add custom validation logic here if needed
        return true;
      }
    });

    // Add XHR Upload plugin (local server upload)
    uppy.use(XHRUpload, {
      endpoint,
      fieldName: 'file',
      limit: 6,
      timeout: 30 * 60 * 1000 // 30 minutes
    });

    // Add Dropbox plugin (optional)
    uppy.use(Dropbox, {
      companionUrl: 'http://localhost:3020', // or your Companion server URL
      target: 'body'
    });

    // Add Google Drive plugin (optional)
    uppy.use(GoogleDrive, {
      companionUrl: 'http://localhost:3020',
      target: 'body'
    });

    // Event handlers
    uppy.on('upload-success', (file, response) => {
      console.log('Upload successful:', file.name, response);
      onSuccess?.({ file, response });
    });

    uppy.on('upload-error', (file, error, response) => {
      console.error('Upload error:', file.name, error);
      onError?.(error);
    });

    uppy.on('complete', (result) => {
      console.log('Upload complete:', result);
      onComplete?.(result);
    });

    uppyRef.current = uppy;

    return () => {
      uppy.close({ reason: 'unmount' });
    };
  }, [endpoint, autoProceed, allowMultiple, maxFiles, maxFileSize, restrictions, onSuccess, onError, onComplete]);

  return (
    <div className="uppy-uploader w-full">
      {uppyRef.current && (
        <Dashboard
          uppy={uppyRef.current}
          proudlyDisplayPoweredByUppy={false}
          locale={locale}
          note="Images, PDFs, and documents up to 50MB"
          theme="dark"
        />
      )}
    </div>
  );
};

export default UppyUploader;
