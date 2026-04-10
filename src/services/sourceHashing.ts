import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-west-2',
});

/**
 * Compute SHA-256 hash of a local file
 */
export const sha256File = async (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (chunk) => {
      hash.update(chunk);
    });

    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });

    stream.on('error', (err) => {
      reject(new Error(`Failed to hash file ${filePath}: ${err.message}`));
    });
  });
};

/**
 * Compute SHA-256 hash of an S3 object
 */
export const sha256S3Object = async (
  bucket: string,
  key: string
): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);
    const stream = response.Body as Readable;

    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');

      stream.on('data', (chunk) => {
        hash.update(chunk);
      });

      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });

      stream.on('error', (err) => {
        reject(
          new Error(
            `Failed to hash S3 object s3://${bucket}/${key}: ${err.message}`
          )
        );
      });
    });
  } catch (error) {
    throw new Error(
      `Failed to hash S3 object s3://${bucket}/${key}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Compute SHA-256 hash of a buffer
 */
export const sha256Buffer = (data: Buffer): string => {
  return createHash('sha256').update(data).digest('hex');
};

/**
 * Compute SHA-256 hash of a string
 */
export const sha256String = (data: string): string => {
  return createHash('sha256').update(data, 'utf-8').digest('hex');
};
