import { describe, it, expect, beforeEach } from '@jest/globals';
import { sha256String, sha256Buffer } from '../services/sourceHashing';
import {
  upsertRecord,
  deleteRecord,
  findRecordBySource,
  ManifestRecord,
} from '../services/manifestService';
import { getSidecarPath } from '../utils/portablePaths';
import { isSupportedSourceFile } from '../services/sourceExtractor';

describe('Source Extraction Pipeline', () => {
  describe('SHA-256 Hashing', () => {
    it('should compute consistent SHA-256 hash for string', () => {
      const text = 'hello world';
      const hash1 = sha256String(text);
      const hash2 = sha256String(text);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different strings', () => {
      const hash1 = sha256String('hello');
      const hash2 = sha256String('world');
      expect(hash1).not.toBe(hash2);
    });

    it('should compute correct SHA-256 hash', () => {
      const hash = sha256String('test');
      expect(hash).toHaveLength(64); // SHA-256 hex is 64 chars
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true); // Only hex chars
    });

    it('should hash buffers correctly', () => {
      const buffer = Buffer.from('test');
      const hash = sha256Buffer(buffer);
      expect(hash).toHaveLength(64);
    });

    it('should handle empty strings', () => {
      const hash = sha256String('');
      expect(hash).toHaveLength(64);
    });

    it('should handle unicode strings', () => {
      const hash = sha256String('Hello 世界 🌍');
      expect(hash).toHaveLength(64);
    });
  });

  describe('Manifest Operations', () => {
    let records: ManifestRecord[];

    beforeEach(() => {
      records = [];
    });

    it('should add new record to empty manifest', () => {
      const newRecord: ManifestRecord = {
        source: 'document.pdf',
        source_sha256: 'abc123',
        sidecar: 'document.pdf.txt',
        sidecar_sha256: 'def456',
        extractor: 'pdf-text',
        created_at: '2026-04-10T00:00:00Z',
      };

      const updated = upsertRecord(records, newRecord);
      expect(updated).toHaveLength(1);
      expect(updated[0].source).toBe('document.pdf');
    });

    it('should update existing record by source path', () => {
      const record1: ManifestRecord = {
        source: 'document.pdf',
        source_sha256: 'abc123',
        sidecar: 'document.pdf.txt',
        sidecar_sha256: 'def456',
        extractor: 'pdf-text',
        created_at: '2026-04-10T00:00:00Z',
      };

      records = upsertRecord(records, record1);

      const record2: ManifestRecord = {
        source: 'document.pdf',
        source_sha256: 'abc999',
        sidecar: 'document.pdf.txt',
        sidecar_sha256: 'def999',
        extractor: 'ocr',
        created_at: '2026-04-10T00:00:00Z',
      };

      records = upsertRecord(records, record2);

      expect(records).toHaveLength(1);
      expect(records[0].source_sha256).toBe('abc999');
      expect(records[0].extractor).toBe('ocr');
    });

    it('should handle multiple records', () => {
      const record1: ManifestRecord = {
        source: 'document1.pdf',
        source_sha256: 'abc123',
        sidecar: 'document1.pdf.txt',
        sidecar_sha256: 'def456',
        extractor: 'pdf-text',
        created_at: '2026-04-10T00:00:00Z',
      };

      const record2: ManifestRecord = {
        source: 'document2.pdf',
        source_sha256: 'abc789',
        sidecar: 'document2.pdf.txt',
        sidecar_sha256: 'def789',
        extractor: 'ocr',
        created_at: '2026-04-10T00:00:00Z',
      };

      records = upsertRecord(records, record1);
      records = upsertRecord(records, record2);

      expect(records).toHaveLength(2);
      expect(findRecordBySource(records, 'document1.pdf')).toBeDefined();
      expect(findRecordBySource(records, 'document2.pdf')).toBeDefined();
    });

    it('should delete records by source path', () => {
      const record1: ManifestRecord = {
        source: 'document1.pdf',
        source_sha256: 'abc123',
        sidecar: 'document1.pdf.txt',
        sidecar_sha256: 'def456',
        extractor: 'pdf-text',
        created_at: '2026-04-10T00:00:00Z',
      };

      const record2: ManifestRecord = {
        source: 'document2.pdf',
        source_sha256: 'abc789',
        sidecar: 'document2.pdf.txt',
        sidecar_sha256: 'def789',
        extractor: 'ocr',
        created_at: '2026-04-10T00:00:00Z',
      };

      records = upsertRecord(records, record1);
      records = upsertRecord(records, record2);

      records = deleteRecord(records, 'document1.pdf');

      expect(records).toHaveLength(1);
      expect(records[0].source).toBe('document2.pdf');
    });

    it('should find records case-insensitively', () => {
      const record: ManifestRecord = {
        source: 'Document.PDF',
        source_sha256: 'abc123',
        sidecar: 'Document.PDF.txt',
        sidecar_sha256: 'def456',
        extractor: 'pdf-text',
        created_at: '2026-04-10T00:00:00Z',
      };

      records = upsertRecord(records, record);

      const found = findRecordBySource(records, 'document.pdf');
      expect(found).toBeDefined();
    });

    it('should handle paths with backslashes', () => {
      const record: ManifestRecord = {
        source: 'folder\\document.pdf',
        source_sha256: 'abc123',
        sidecar: 'folder\\document.pdf.txt',
        sidecar_sha256: 'def456',
        extractor: 'pdf-text',
        created_at: '2026-04-10T00:00:00Z',
      };

      records = upsertRecord(records, record);

      const found = findRecordBySource(records, 'folder/document.pdf');
      expect(found).toBeDefined();
    });
  });

  describe('Path Utilities', () => {
    it('should generate correct sidecar path', () => {
      expect(getSidecarPath('document.pdf')).toBe('document.pdf.txt');
      expect(getSidecarPath('image.png')).toBe('image.png.txt');
      expect(getSidecarPath('folder/file.tif')).toBe('folder/file.tif.txt');
    });

    it('should recognize supported source file types', () => {
      expect(isSupportedSourceFile('document.pdf')).toBe(true);
      expect(isSupportedSourceFile('image.png')).toBe(true);
      expect(isSupportedSourceFile('photo.jpg')).toBe(true);
      expect(isSupportedSourceFile('scan.jpeg')).toBe(true);
      expect(isSupportedSourceFile('scan.tif')).toBe(true);
      expect(isSupportedSourceFile('scan.tiff')).toBe(true);
      expect(isSupportedSourceFile('image.webp')).toBe(true);
      expect(isSupportedSourceFile('readme.txt')).toBe(false);
      expect(isSupportedSourceFile('document.docx')).toBe(false);
      expect(isSupportedSourceFile('sidecar.pdf.txt')).toBe(false);
    });

    it('should recognize uppercase extensions', () => {
      expect(isSupportedSourceFile('document.PDF')).toBe(true);
      expect(isSupportedSourceFile('image.PNG')).toBe(true);
      expect(isSupportedSourceFile('image.JpG')).toBe(true);
    });
  });

  describe('Verification Logic', () => {
    it('should track manifest record creation date', () => {
      const record: ManifestRecord = {
        source: 'document.pdf',
        source_sha256: 'abc123',
        sidecar: 'document.pdf.txt',
        sidecar_sha256: 'def456',
        extractor: 'pdf-text',
        created_at: '2026-04-10T00:00:00Z',
      };

      expect(record.created_at).toBeDefined();
      expect(record.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO-8601 format
    });
  });
});
