import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import * as crypto from 'crypto';
import { sha256String } from './sourceHashing';
import { getSidecarPath } from '../utils/portablePaths';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-west-2',
});

/**
 * Write a sidecar text file to S3 atomically
 * Uses temp key + rename pattern to ensure atomicity
 */
export const writeSidecarToS3 = async (
  bucket: string,
  sourceKey: string,
  text: string
): Promise<{ sidecarKey: string; sha256: string }> => {
  try {
    const sidecarKey = getSidecarPath(sourceKey);
    const textBuffer = Buffer.from(text, 'utf-8');
    const textSha256 = sha256String(text);

    // Write temp file first
    const tempKey = `${sidecarKey}.tmp.${Date.now()}`;

    console.log(
      `[Sidecar Writer] Writing sidecar temp: s3://${bucket}/${tempKey} (${textBuffer.length} bytes)`
    );

    const putTempCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: tempKey,
      Body: textBuffer,
      ContentType: 'text/plain; charset=utf-8',
      Metadata: {
        'extraction-temp': 'true',
      },
    });

    await s3Client.send(putTempCommand);

    // Rename (atomic operation in S3)
    console.log(
      `[Sidecar Writer] Finalizing sidecar: s3://${bucket}/${sidecarKey}`
    );

    const copySource = `${bucket}/${tempKey}`;
    const copyCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: sidecarKey,
      Body: textBuffer,
      ContentType: 'text/plain; charset=utf-8',
      Metadata: {
        'source-sha256': '', // Will be set by manifest service
      },
    });

    await s3Client.send(copyCommand);

    // Delete temp file
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucket,
      Key: tempKey,
    });

    await s3Client.send(deleteCommand);

    console.log(
      `[Sidecar Writer] Sidecar written successfully: s3://${bucket}/${sidecarKey}`
    );

    return {
      sidecarKey,
      sha256: textSha256,
    };
  } catch (error) {
    throw new Error(
      `Failed to write sidecar for s3://${bucket}/${sourceKey}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Delete a sidecar file from S3
 */
export const deleteSidecarFromS3 = async (
  bucket: string,
  sourceKey: string
): Promise<void> => {
  try {
    const sidecarKey = getSidecarPath(sourceKey);

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: sidecarKey,
    });

    await s3Client.send(command);

    console.log(
      `[Sidecar Writer] Sidecar deleted: s3://${bucket}/${sidecarKey}`
    );
  } catch (error) {
    console.warn(
      `[Sidecar Writer] Failed to delete sidecar: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Format sidecar content with optional page markers for PDFs
 */
export const formatSidecarContent = (
  text: string,
  pageCount?: number
): string => {
  // If text already has page markers, return as-is
  if (text.includes('=== Page')) {
    return text;
  }

  // Add page markers for multi-page documents
  if (pageCount && pageCount > 1) {
    let formatted = '';
    for (let i = 0; i < pageCount; i++) {
      formatted += `\n=== Page ${i + 1} ===\n`;
    }
    formatted += text;
    return formatted;
  }

  return text;
};
