import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { sha256String } from './sourceHashing';
import { normalizePathSeparators } from '../utils/portablePaths';

export interface ManifestRecord {
  source: string; // Relative path in S3 prefix
  source_sha256: string; // SHA-256 of source file
  sidecar: string; // Relative path (e.g., "document.pdf.txt")
  sidecar_sha256: string; // SHA-256 of sidecar
  extractor: string; // "pdf-text", "ocr", "error"
  created_at: string; // ISO-8601 timestamp
  updated_at?: string; // ISO-8601 timestamp
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-west-2',
});

const MANIFEST_FILENAME = 'manifest.jsonl';

/**
 * Get the full manifest path for a prefix
 */
export const getManifestPath = (prefix: string): string => {
  const trimmed = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  if (!trimmed) return MANIFEST_FILENAME;
  return `${trimmed}/${MANIFEST_FILENAME}`;
};

/**
 * Load manifest from S3
 * Returns empty array if manifest doesn't exist
 */
export const loadManifest = async (
  bucket: string,
  prefix: string
): Promise<ManifestRecord[]> => {
  try {
    const manifestPath = getManifestPath(prefix);

    console.log(
      `[Manifest Service] Loading manifest: s3://${bucket}/${manifestPath}`
    );

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: manifestPath,
    });

    const response = await s3Client.send(command);
    const stream = response.Body as Readable;

    return new Promise((resolve, reject) => {
      let data = '';

      stream.on('data', (chunk) => {
        data += chunk.toString('utf-8');
      });

      stream.on('end', () => {
        if (!data.trim()) {
          resolve([]);
          return;
        }

        const records: ManifestRecord[] = [];
        const lines = data.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            records.push(JSON.parse(line));
          } catch (parseErr) {
            console.warn(
              `[Manifest Service] Failed to parse manifest line: ${line.substring(
                0,
                50
              )}...`
            );
          }
        }

        resolve(records);
      });

      stream.on('error', (err) => {
        reject(
          new Error(
            `Failed to read manifest from S3: ${err instanceof Error ? err.message : String(err)}`
          )
        );
      });
    });
  } catch (error) {
    // Manifest doesn't exist yet, return empty array
    if (
      error instanceof Error &&
      (error.message.includes('NoSuchKey') || error.message.includes('404'))
    ) {
      console.log(
        `[Manifest Service] Manifest not found (new prefix), starting fresh`
      );
      return [];
    }

    throw new Error(
      `Failed to load manifest: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Upsert a record in the manifest
 * Updates existing record by source path, or adds new one
 */
export const upsertRecord = (
  records: ManifestRecord[],
  newRecord: ManifestRecord
): ManifestRecord[] => {
  const sourcePath = normalizePathSeparators(newRecord.source);
  const existingIndex = records.findIndex(
    (r) => normalizePathSeparators(r.source) === sourcePath
  );

  if (existingIndex >= 0) {
    console.log(
      `[Manifest Service] Updating manifest record for: ${newRecord.source}`
    );
    records[existingIndex] = {
      ...records[existingIndex],
      ...newRecord,
      updated_at: new Date().toISOString(),
    };
  } else {
    console.log(
      `[Manifest Service] Adding new manifest record for: ${newRecord.source}`
    );
    records.push({
      ...newRecord,
      created_at: newRecord.created_at || new Date().toISOString(),
    });
  }

  return records;
};

/**
 * Save manifest to S3 atomically
 * Uses temp key + rename pattern
 */
export const saveManifest = async (
  bucket: string,
  prefix: string,
  records: ManifestRecord[]
): Promise<void> => {
  try {
    const manifestPath = getManifestPath(prefix);
    const tempKey = `${manifestPath}.tmp.${Date.now()}`;

    // Convert records to JSONL format
    const manifestContent = records.map((r) => JSON.stringify(r)).join('\n');
    if (records.length > 0) {
      manifestContent += '\n'; // Trailing newline for JSONL
    }

    const contentBuffer = Buffer.from(manifestContent, 'utf-8');

    console.log(
      `[Manifest Service] Writing manifest temp: s3://${bucket}/${tempKey} (${records.length} records)`
    );

    const putTempCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: tempKey,
      Body: contentBuffer,
      ContentType: 'application/x-ndjson; charset=utf-8',
      Metadata: {
        'manifest-temp': 'true',
        'record-count': String(records.length),
      },
    });

    await s3Client.send(putTempCommand);

    // Write final manifest
    console.log(
      `[Manifest Service] Finalizing manifest: s3://${bucket}/${manifestPath}`
    );

    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: manifestPath,
      Body: contentBuffer,
      ContentType: 'application/x-ndjson; charset=utf-8',
      Metadata: {
        'record-count': String(records.length),
        'last-updated': new Date().toISOString(),
      },
    });

    await s3Client.send(putCommand);

    // Delete temp file
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucket,
      Key: tempKey,
    });

    await s3Client.send(deleteCommand);

    console.log(
      `[Manifest Service] Manifest saved successfully: s3://${bucket}/${manifestPath}`
    );
  } catch (error) {
    throw new Error(
      `Failed to save manifest: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Find a record by source path (case-insensitive, path-normalized)
 */
export const findRecordBySource = (
  records: ManifestRecord[],
  sourcePath: string
): ManifestRecord | undefined => {
  const normalized = normalizePathSeparators(sourcePath);
  return records.find(
    (r) => normalizePathSeparators(r.source).toLowerCase() === normalized.toLowerCase()
  );
};

/**
 * Delete a record from manifest
 */
export const deleteRecord = (
  records: ManifestRecord[],
  sourcePath: string
): ManifestRecord[] => {
  const normalized = normalizePathSeparators(sourcePath);
  return records.filter(
    (r) => normalizePathSeparators(r.source) !== normalized
  );
};
