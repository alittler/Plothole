# Source Sidecar Pipeline - Quick Reference

## What This Does
When you upload a PDF or image to the Codex, this system:
1. **Extracts text** from the document (PDFs + OCR for images)
2. **Creates a sidecar file** with the extracted text (filename.ext.txt)
3. **Maintains a manifest** tracking all files with SHA-256 hashes
4. **Keeps originals safe** - never modifies the source files

## File Organization

```
S3 Bucket:
├── source/
│   ├── document.pdf          ← Original (untouched)
│   ├── document.pdf.txt      ← Extracted text (NEW)
│   ├── image.png             ← Original
│   ├── image.png.txt         ← OCR result (NEW)
│   └── manifest.jsonl        ← Tracking file (NEW)
│
└── source/project-123/
    ├── report.pdf
    ├── report.pdf.txt
    └── manifest.jsonl
```

## How It Works

### Automatic (Most Common)
```
Upload via Codex UI
    ↓
File stored in S3
    ↓
Server responds immediately (fast ✓)
    ↓
Background process:
  • Extracts text
  • Writes .txt sidecar
  • Updates manifest.jsonl
    ↓
AI can read extracted text from sidecar
```

### Manual CLI (For Batch/Debugging)
```bash
# Process all sources in a folder
tsx scripts/process-sources.ts process bucket-name source/project-123

# Check if everything is correct
tsx scripts/process-sources.ts verify bucket-name source/project-123

# Show help
tsx scripts/process-sources.ts help
```

## Key Features

| Feature | Benefit |
|---------|---------|
| **Atomic Writes** | No partial updates or data corruption |
| **SHA-256 Hashing** | Detects file changes and corruption |
| **Error Recovery** | Failed extractions don't break the manifest |
| **Cross-Platform** | Works on Windows, Mac, Linux |
| **Non-Blocking** | Upload returns immediately, processing happens in background |

## Manifest Format

Each `manifest.jsonl` contains one JSON object per line:

```json
{"source":"document.pdf","source_sha256":"abc123...","sidecar":"document.pdf.txt","sidecar_sha256":"def456...","extractor":"pdf-text","created_at":"2026-04-10T09:52:00.000Z"}
{"source":"image.png","source_sha256":"xyz789...","sidecar":"image.png.txt","sidecar_sha256":"uvw123...","extractor":"ocr","created_at":"2026-04-10T10:00:00.000Z"}
```

## Text Extraction Methods

| File Type | Method | Fallback |
|-----------|--------|----------|
| PDF | pdf-parse (embedded text) | Tesseract OCR |
| PNG | Tesseract OCR | - |
| JPG/JPEG | Tesseract OCR | - |
| TIF/TIFF | Tesseract OCR | - |
| WebP | Tesseract OCR | - |

## Verification

The `verify` command checks for:

```bash
# Missing files
✗ manifest.jsonl says "document.pdf" but it's not in S3

# Stale sources  
✗ document.pdf was re-uploaded but manifest.jsonl wasn't updated

# Corrupted sidecars
✗ manifest.jsonl says hash=XYZ but document.pdf.txt has hash=ABC
```

## Troubleshooting

### Sidecar not created?
1. Check S3 is configured: `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, etc.
2. Run manual process: `tsx scripts/process-sources.ts process bucket source/`
3. Check logs for "Source Pipeline" messages

### Wrong extraction method?
- PDF extracted as OCR instead of text? → PDF has no readable text layer
- Solution: The system tries pdf-parse first, falls back to OCR automatically

### Want to fix a stale source?
```bash
# Re-upload the file via UI (generates new hash)
# OR manually trigger processing
tsx scripts/process-sources.ts process bucket source/
```

## Performance Tips

- OCR on images takes ~1-5 seconds per image
- Large PDFs may take a few seconds
- All operations are async (non-blocking)
- Manifest updates are atomic (safe even if interrupted)

## Integration with AI

When the AI analyzes a source:
1. It reads the `.txt` sidecar with extracted content
2. Uses that text for semantic analysis
3. Original file remains untouched
4. Manifest ensures data integrity

Example:
```typescript
// Pseudo-code showing how AI uses extracted text
const sidecarPath = `${sourceKey}.txt`;
const extractedText = await s3.getObject(sidecarPath);
const analysis = await ai.analyze(extractedText);
```

## Commands Reference

```bash
# Process sources in S3
tsx scripts/process-sources.ts process <bucket> <prefix>

# Verify manifest integrity
tsx scripts/process-sources.ts verify <bucket> <prefix>

# Show help
tsx scripts/process-sources.ts help

# Examples:
tsx scripts/process-sources.ts process my-bucket source/
tsx scripts/process-sources.ts process my-bucket source/project-123
tsx scripts/process-sources.ts verify my-bucket source/project-123
```

## Configuration

Required environment variables (already configured in your .env):
```bash
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-west-2  # or your region
```

## Files in the Repository

### Core Code
- `src/services/sourceHashing.ts` - SHA-256 hashing
- `src/services/sourceExtractor.ts` - Text extraction logic
- `src/services/sidecarWriter.ts` - Write sidecars to S3
- `src/services/manifestService.ts` - Manage JSONL manifests
- `src/services/sourcePipeline.ts` - Main orchestration
- `src/utils/portablePaths.ts` - Cross-platform path handling

### Tests
- `src/tests/sourceExtraction.test.ts` - Unit tests

### CLI
- `scripts/process-sources.ts` - Command-line tool

### Documentation
- `SIDECAR_IMPLEMENTATION.md` - Full technical docs
- `IMPLEMENTATION_SUMMARY.md` - High-level overview
