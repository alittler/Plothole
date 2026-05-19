'use client';

import React, { useEffect, useRef, useState } from 'react';
import Uppy from '@uppy/core';
import DashboardModal from '@uppy/react/dashboard-modal';
import XHRUpload from '@uppy/xhr-upload';
import { X } from 'lucide-react';
import '@uppy/core/dist/style.css';
import '@uppy/dashboard/dist/style.css';

interface UppyModalUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  endpoint?: string;
  onSuccess?: (file: any, response: any) => void;
  onError?: (error: Error) => void;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  title?: string;
}

export const UppyModalUploader: React.FC<UppyModalUploaderProps> = ({
  isOpen,
  onClose,
  endpoint = '/api/upload',
  onSuccess,
  onError,
  maxFileSize = 50 * 1024 * 1024,
  allowedFileTypes = ['image/*', 'application/pdf'],
  title = 'Upload Files'
}) => {
  const uppyRef = useRef<Uppy | null>(null);
  const [instanceCreated, setInstanceCreated] = useState(false);

  useEffect(() => {
    if (!isOpen || instanceCreated) return;

    const uppy = new Uppy({
      id: 'uppy-modal-uploader',
      autoProceed: false,
      restrictions: {
        maxNumberOfFiles: 1,
        maxFileSize: maxFileSize,
        allowedFileTypes: allowedFileTypes
      }
    });

    uppy.use(XHRUpload, {
      endpoint,
      fieldName: 'file',
      timeout: 30 * 60 * 1000
    });

    uppy.on('upload-success', (file, response) => {
      console.log('Upload successful:', file.name);
      onSuccess?.(file, response);
      onClose();
    });

    uppy.on('upload-error', (file, error) => {
      console.error('Upload error:', error);
      onError?.(error);
    });

    uppyRef.current = uppy;
    setInstanceCreated(true);

    return () => {
      uppy.destroy();
      setInstanceCreated(false);
    };
  }, [isOpen, endpoint, onSuccess, onError, maxFileSize, allowedFileTypes, instanceCreated, onClose]);

  return (
    <>
      {isOpen && uppyRef.current && (
        <DashboardModal
          uppy={uppyRef.current}
          open={isOpen}
          onRequestClose={onClose}
          proudlyDisplayPoweredByUppy={false}
          theme="dark"
        />
      )}
    </>
  );
};

export default UppyModalUploader;
