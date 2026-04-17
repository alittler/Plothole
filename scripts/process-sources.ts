#!/usr/bin/env tsx
/**
 * Sidecar Source Processing CLI
 * 
 * Usage:
 *   tsx scripts/process-sources.ts process <bucket> <prefix>
 *   tsx scripts/process-sources.ts verify <bucket> <prefix>
 *   tsx scripts/process-sources.ts help
 * 
 * Examples:
 *   tsx scripts/process-sources.ts process my-bucket source/
 *   tsx scripts/process-sources.ts verify my-bucket source/project-123
 */

import { processFolder, verifyFolder } from '../src/services/sourcePipeline.ts';

const HELP_TEXT = `
Sidecar Source Processing CLI
==============================

Process source documents (PDFs/images) to extract text and create manifests.

COMMANDS:
  process <bucket> <prefix>    Extract text from sources, write sidecars, update manifest
  verify <bucket> <prefix>     Verify manifest integrity and report issues
  help                         Show this help message

OPTIONS:
  <bucket>    S3 bucket name (required)
  <prefix>    S3 prefix/folder (e.g., 'source/', 'source/project-123')

ENVIRONMENT VARIABLES:
  AWS_ACCESS_KEY_ID        AWS credentials
  AWS_SECRET_ACCESS_KEY    AWS credentials
  AWS_REGION              AWS region (default: us-west-2)

EXAMPLES:
  # Process all sources in bucket
  tsx scripts/process-sources.ts process my-bucket source/

  # Process sources in a project
  tsx scripts/process-sources.ts process my-bucket source/project-123/

  # Verify a prefix
  tsx scripts/process-sources.ts verify my-bucket source/

OUTPUT:
  Detailed logs are printed to console. Check manifest.jsonl for records.

MANIFEST FORMAT (JSONL):
  source              Relative path to source file
  source_sha256       SHA-256 hash of source
  sidecar             Relative path to sidecar text file
  sidecar_sha256      SHA-256 hash of sidecar
  extractor           Extraction method used ("pdf-text", "ocr", "error")
  created_at          ISO-8601 timestamp of creation
  updated_at          ISO-8601 timestamp of last update
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const command = args[0];
  const bucket = args[1];
  const prefix = args[2];

  if (!bucket || !prefix) {
    console.error('Error: Missing required arguments <bucket> <prefix>');
    console.error(`\nUsage: tsx scripts/process-sources.ts ${command} <bucket> <prefix>`);
    console.error('\nRun with "help" for more information');
    process.exit(1);
  }

  try {
    if (command === 'process') {
      console.log(`\n📄 Processing sources in https://${bucket}.s3.amazonaws.com/${prefix}`);
      console.log('==================================================\n');

      const result = await processFolder(bucket, prefix);

      console.log('\n==================================================');
      console.log('✅ Processing complete!');
      console.log(`   Processed: ${result.processed}`);
      console.log(`   Skipped:   ${result.skipped}`);
      console.log(`   Failed:    ${result.failed}`);

      if (result.errors.length > 0) {
        console.log(`\n⚠️  Errors during processing:`);
        for (const err of result.errors) {
          console.log(`   - ${err.file}: ${err.error}`);
        }
      }
    } else if (command === 'verify') {
      console.log(`\n🔍 Verifying manifest for https://${bucket}.s3.amazonaws.com/${prefix}`);
      console.log('==================================================\n');

      const result = await verifyFolder(bucket, prefix);

      console.log('\n==================================================');
      console.log('✅ Verification complete!');

      if (result.missing.length === 0 && 
          result.stale.length === 0 && 
          result.mismatched.length === 0) {
        console.log('   All files verified successfully! ✨');
      } else {
        if (result.missing.length > 0) {
          console.log(`\n⚠️  Missing files (${result.missing.length}):`);
          for (const file of result.missing) {
            console.log(`   - ${file}`);
          }
        }

        if (result.stale.length > 0) {
          console.log(`\n⚠️  Stale sources (${result.stale.length}) - re-run process:`);
          for (const file of result.stale) {
            console.log(`   - ${file}`);
          }
        }

        if (result.mismatched.length > 0) {
          console.log(`\n⚠️  Mismatched sidecars (${result.mismatched.length}):`);
          for (const file of result.mismatched) {
            console.log(`   - ${file}`);
          }
        }
      }
    } else {
      console.error(`Error: Unknown command '${command}'`);
      console.error('\nValid commands: process, verify, help');
      process.exit(1);
    }

    console.log('');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
