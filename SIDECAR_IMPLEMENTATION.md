# Source Sidecar + Manifest Pipeline Implementation

## Overview

This implementation provides a complete text extraction pipeline for source documents (PDFs and images) uploaded through the Codex. The system creates sidecar text files and maintains a manifest to track all sources without modifying the originals.

## Architecture

### Core Components

1. **sourceHashing.ts** - SHA-256 hashing for files, S3 objects, buffers, and strings
2. **sourceExtractor.ts** - Text extraction (PDFs: embedded text + Tesseract OCR fallback; Images: Tesseract OCR)
3. **sidecarWriter.ts** - Atomic sidecar writing to S3 with temp+rename pattern
4. **manifestService.ts** - JSONL manifest operations (load, upsert, save, query)
5. **sourcePipeline.ts** - Orchestration (processFolder, verifyFolder)
6. **portablePaths.ts** - Cross-platform path handling

### Trigger Points

- **Auto-trigger on upload**: `/api/source-upload` endpoint spawns async processing
- **Manual CLI**: `tsx scripts/process-sources.ts process <bucket> <prefix>`
- **Verification**: `tsx scripts/process-sources.ts verify <bucket> <prefix>`

## File Structure

```
s3://bucket/
  source/
    document.pdf                 ← Original source (read-only)
    document.pdf.txt             ← Sidecar with extracted text
    image.png                    ← Original source
    image.png.txt                ← Sidecar with OCR result
    manifest.jsonl               ← Tracking manifest (one JSON per line)
    project-123/
      report.pdf
      report.pdf.txt
      manifest.jsonl
```

## Manifest Schema

Each record in `manifest.jsonl` is a complete JSON object on one line:

```json
{
  "source": "document.pdf",
  "source_sha256": "abc123...",
  "sidecar": "document.pdf.txt",
  "sidecar_sha256": "def456...",
  "extractor": "pdf-text",
  "created_at": "2026-04-10T09:52:00.000Z",
  "updated_at": "2026-04-10T09:52:30.000Z"
}
```

## Usage

### Automatic Processing (Recommended)

Sources are automatically processed when uploaded via the web UI:

1. User uploads PDF/image in Codex
2. File goes to `/api/source-upload` → uploaded to S3
3. Response returns immediately to user
4. In background: `processFolder()` runs asynchronously
5. Text extraction + sidecar creation + manifest update all happen
6. AI can immediately access extracted text via sidecar

### Manual Processing

Process a folder of sources with CLI:

```bash
# Process sources in S3
tsx scripts/process-sources.ts process my-bucket source/project-123

# Output:
# 📄 Processing sources in s3://my-bucket/source/project-123
# ===================================================
# [Source Pipeline] Starting processing for s3://my-bucket/source/project-123
# [Source Pipeline] Loaded 2 existing manifest records
# [Source Pipeline] Found 3 source files to process
# [Source Pipeline] Processing: document.pdf
# [Source Pipeline] Extracted text (2451 chars) using pdf-text
# [Source Pipeline] Completed: document.pdf → source/project-123/document.pdf.txt
# ...
# ===================================================
# ✅ Processing complete!
#    Processed: 3
#    Skipped:   2
#    Failed:    0
```

### Verification

Verify manifest integrity:

```bash
tsx scripts/process-sources.ts verify my-bucket source/project-123

# Output:
# 🔍 Verifying manifest for s3://my-bucket/source/project-123
# ===================================================
# [Source Verification] Starting verification for s3://my-bucket/source/project-123
# [Source Verification] Loaded 5 manifest records
# ...
# ===================================================
# ✅ Verification complete!
#    All files verified successfully! ✨
```

## Features

### Text Extraction

**PDFs:**
- Primary: Extract embedded text using pdf-parse
- Fallback: If < 100 characters detected, run Tesseract OCR
- Labeled as "pdf-text" or "ocr" in manifest

**Images:**
- Use Tesseract OCR for .png, .jpg, .jpeg, .tif, .tiff, .webp
- Labeled as "ocr" in manifest

**Error Handling:**
- If extraction fails, write error message as sidecar content
- Manifest still updated with extraction metadata
- Labeled as "error" in manifest

### Sidecar Format

- Plain text with UTF-8 encoding
- Optional page markers for PDFs: `=== Page N ===`
- Preserves line breaks and formatting where possible
- No maximum size limit

### Manifest Management

- **Atomic Updates**: Write to temp file, rename atomically
- **Upsert Logic**: Updates existing record by source path, adds new if not found
- **JSONL Format**: One JSON object per line, newline-delimited
- **Metadata**: Created_at, updated_at timestamps (ISO-8601)
- **Path Normalization**: All paths use forward slashes for cross-platform compatibility

### Update Strategy

For each source file:
1. Compute SHA-256 hash of source
2. If source is new (not in manifest):
   - Extract text
   - Write sidecar
   - Create manifest record
3. If source changed (hash differs):
   - Re-extract text
   - Update sidecar
   - Update manifest record (updated_at timestamp)
4. If source unchanged:
   - Skip processing (no changes needed)

## Verification

The `verify` command reports:

- **Missing files**: Manifest entry exists but sidecar or source is missing from S3
- **Stale sources**: Source file hash differs from manifest (source was re-uploaded without re-extraction)
- **Mismatched sidecars**: Sidecar file hash differs from manifest (sidecar was modified)

## Performance Characteristics

- **Text Extraction**: PDF extraction ~100-500ms, OCR ~1-5 seconds per image
- **Hashing**: SHA-256 ~10-50ms per file
- **Manifest Operations**: Load ~50-200ms, Save ~100-300ms
- **S3 Operations**: Fully parallelizable with SDK concurrency

## Error Recovery

If processing fails:
- Error message is captured in manifest "extractor" field as "error"
- Error details logged to console
- Partial manifest updates are atomic (temp+rename)
- Manual re-run with `process` command will retry failed files

## Testing

Unit tests cover:
- SHA-256 hashing (consistency, different inputs, special characters)
- Manifest operations (add, update, delete, query)
- Path utilities (sidecar path generation, file type detection)
- Verification logic (creation dates, metadata tracking)

Run tests:
```bash
npm test
```

## Integration with Codex AI

The extracted text in sidecars is accessible to the AI:

1. When analyzing a source, the AI can read the `.txt` sidecar
2. Extracted text provides semantic context without modifying original
3. Manifest provides hash verification for data integrity
4. Multiple sources can be analyzed with their extracted text

Example in `analyzeSourceForCodex`:
```typescript
// Read sidecar for extracted text
const sidecarContent = await fetchSidecarText(sourceKey);
const sourceContent = sidecarContent || originalSourceContent;
// Pass extracted text to AI analysis
```

## Dependencies

- `tesseract.js` - OCR for images and scanned PDFs
- `pdf-parse` - PDF text extraction (already in project)
- `@aws-sdk/client-s3` - S3 operations (already in project)
- `crypto` - SHA-256 hashing (Node.js built-in)

## Environment Variables

Required for S3 operations:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET`
- `AWS_REGION` (default: us-west-2)

## Future Enhancements

- Parallel processing with configurable concurrency
- Webhook integration for real-time notifications
- Compression of sidecars for large PDFs
- Language detection and multi-language support
- Incremental indexing for full-text search
- Sidecar versioning for source updates
