import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { extractText, isSupportedSourceFile } from './sourceExtractor';
import { writeSidecarToS3 } from './sidecarWriter';
import { sha256S3Object } from './sourceHashing';
import {
  loadManifest,
  saveManifest,
  upsertRecord,
  findRecordBySource,
  ManifestRecord,
} from './manifestService';
import { normalizePathSeparators } from '../utils/portablePaths';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-west-2',
});

export interface ProcessResult {
  processed: number;
  skipped: number;
  failed: number;
  errors: Array<{ file: string; error: string }>;
}

export interface VerificationResult {
  missing: string[];
  stale: string[];
  mismatched: string[];
}

/**
 * Download an S3 object to a temporary local file
 */
const downloadS3ToTemp = async (
  bucket: string,
  key: string
): Promise<string> => {
  try {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3Client.send(command);

    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `source-${Date.now()}-${Math.random()}`);

    // Write stream to file
    const writeStream = fs.createWriteStream(tempFile);
    const readStream = response.Body as NodeJS.ReadableStream;

    return new Promise((resolve, reject) => {
      readStream.pipe(writeStream);
      writeStream.on('finish', () => resolve(tempFile));
      writeStream.on('error', (err) => reject(err));
      readStream.on('error', (err) => reject(err));
    });
  } catch (error) {
    throw new Error(
      `Failed to download S3 object: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * List all source files in an S3 prefix
 */
const listSourceFiles = async (
  bucket: string,
  prefix: string
): Promise<string[]> => {
  const files: string[] = [];
  let continuationToken: string | undefined;

  try {
    do {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const response = await s3Client.send(command);

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key && isSupportedSourceFile(obj.Key)) {
            files.push(obj.Key);
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return files;
  } catch (error) {
    throw new Error(
      `Failed to list source files: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Check if a file has changed based on S3 metadata
 */
const getS3FileSize = async (bucket: string, key: string): Promise<number> => {
  try {
    const command = new HeadObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3Client.send(command);
    return response.ContentLength || 0;
  } catch (error) {
    throw new Error(
      `Failed to get S3 object metadata: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Process all sources in an S3 prefix
 * Extracts text, writes sidecars, updates manifest
 */
export const processFolder = async (
  bucket: string,
  prefix: string
): Promise<ProcessResult> => {
  const result: ProcessResult = {
    processed: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  try {
    console.log(
      `[Source Pipeline] Starting processing for https://${bucket}.s3.amazonaws.com/${prefix}`
    );

    // Load existing manifest
    const manifestRecords = await loadManifest(bucket, prefix);
    console.log(
      `[Source Pipeline] Loaded ${manifestRecords.length} existing manifest records`
    );

    // List all source files
    const sourceFiles = await listSourceFiles(bucket, prefix);
    console.log(
      `[Source Pipeline] Found ${sourceFiles.length} source files to process`
    );

    // Process each source file
    for (const sourceKey of sourceFiles) {
      try {
        const fileName = path.basename(sourceKey);
        console.log(`[Source Pipeline] Processing: ${fileName}`);

        // Get source file hash
        const sourceHash = await sha256S3Object(bucket, sourceKey);

        // Check if already in manifest
        const existingRecord = findRecordBySource(manifestRecords, sourceKey);

        // Skip if unchanged
        if (existingRecord && existingRecord.source_sha256 === sourceHash) {
          console.log(
            `[Source Pipeline] Skipping unchanged source: ${fileName}`
          );
          result.skipped++;
          continue;
        }

        // Download source temporarily for text extraction
        console.log(`[Source Pipeline] Downloading for extraction: ${fileName}`);
        const tempSourcePath = await downloadS3ToTemp(bucket, sourceKey);

        try {
          // Extract text
          const extraction = await extractText(tempSourcePath);
          console.log(
            `[Source Pipeline] Extracted text (${extraction.text.length} chars) using ${extraction.extractor}`
          );

          // Write sidecar
          const { sidecarKey, sha256: sidecarHash } = await writeSidecarToS3(
            bucket,
            sourceKey,
            extraction.text
          );

          // Create/update manifest record
          const record: ManifestRecord = {
            source: normalizePathSeparators(sourceKey),
            source_sha256: sourceHash,
            sidecar: normalizePathSeparators(sidecarKey),
            sidecar_sha256: sidecarHash,
            extractor: extraction.extractor,
            created_at: existingRecord?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const updatedRecords = upsertRecord(manifestRecords, record);
          manifestRecords.length = 0;
          manifestRecords.push(...updatedRecords);

          result.processed++;
          console.log(
            `[Source Pipeline] Completed: ${fileName} → ${sidecarKey}`
          );
        } finally {
          // Clean up temp file
          try {
            fs.unlinkSync(tempSourcePath);
          } catch (err) {
            console.warn(
              `[Source Pipeline] Failed to clean temp file: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }
        }
      } catch (error) {
        result.failed++;
        const errorMsg =
          error instanceof Error ? error.message : String(error);
        console.error(`[Source Pipeline] Failed to process file: ${errorMsg}`);
        result.errors.push({
          file: sourceKey,
          error: errorMsg,
        });
      }
    }

    // Save updated manifest
    await saveManifest(bucket, prefix, manifestRecords);

    console.log(
      `[Source Pipeline] Processing complete: ${result.processed} processed, ${result.skipped} skipped, ${result.failed} failed`
    );

    return result;
  } catch (error) {
    throw new Error(
      `Failed to process folder: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Verify the integrity of sidecars and manifest
 */
export const verifyFolder = async (
  bucket: string,
  prefix: string
): Promise<VerificationResult> => {
  const result: VerificationResult = {
    missing: [],
    stale: [],
    mismatched: [],
  };

  try {
    console.log(
      `[Source Verification] Starting verification for https://${bucket}.s3.amazonaws.com/${prefix}`
    );

    // Load manifest
    const manifestRecords = await loadManifest(bucket, prefix);
    console.log(
      `[Source Verification] Loaded ${manifestRecords.length} manifest records`
    );

    // Verify each record
    for (const record of manifestRecords) {
      try {
        // Check if source still exists and hash matches
        try {
          const currentSourceHash = await sha256S3Object(bucket, record.source);
          if (currentSourceHash !== record.source_sha256) {
            result.stale.push(record.source);
            console.warn(
              `[Source Verification] Stale source detected: ${record.source}`
            );
          }
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes('NoSuchKey')
          ) {
            result.missing.push(record.source);
            console.warn(
              `[Source Verification] Missing source: ${record.source}`
            );
          } else {
            throw error;
          }
        }

        // Check if sidecar exists and hash matches
        try {
          const currentSidecarHash = await sha256S3Object(
            bucket,
            record.sidecar
          );
          if (currentSidecarHash !== record.sidecar_sha256) {
            result.mismatched.push(record.sidecar);
            console.warn(
              `[Source Verification] Mismatched sidecar: ${record.sidecar}`
            );
          }
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes('NoSuchKey')
          ) {
            result.missing.push(record.sidecar);
            console.warn(
              `[Source Verification] Missing sidecar: ${record.sidecar}`
            );
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.error(
          `[Source Verification] Error verifying record: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    console.log(
      `[Source Verification] Verification complete: ${result.missing.length} missing, ${result.stale.length} stale, ${result.mismatched.length} mismatched`
    );

    return result;
  } catch (error) {
    throw new Error(
      `Failed to verify folder: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
