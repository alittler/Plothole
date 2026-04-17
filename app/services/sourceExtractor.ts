import _pdfParse from 'pdf-parse';
const pdfParse: any = _pdfParse;
import Tesseract from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';

export interface ExtractionResult {
  text: string;
  extractor: string;
  error?: string;
}

/**
 * Extract text from a PDF file
 * First tries to extract embedded text, falls back to OCR if minimal text found
 */
const extractFromPdf = async (filePath: string): Promise<ExtractionResult> => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    // Combine text from all pages
    let extractedText = '';
    if (data.text) {
      extractedText = data.text;
    }

    const textCharCount = extractedText.trim().length;

    // If we have reasonable amount of text, use it
    if (textCharCount > 100) {
      // Add page markers for clarity
      let markedText = '';
      for (let i = 0; i < (data.numpages || 1); i++) {
        markedText += `\n=== Page ${i + 1} ===\n`;
      }
      markedText += extractedText;

      return {
        text: markedText,
        extractor: 'pdf-text',
      };
    }

    // Otherwise fall back to OCR
    console.log(
      `[Source Extraction] PDF has minimal text (${textCharCount} chars), attempting OCR...`
    );
    const ocrResult = await extractFromImage(filePath);
    return {
      text: ocrResult.text,
      extractor: 'ocr',
      error: ocrResult.error,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Source Extraction] PDF extraction failed: ${errorMsg}`);
    return {
      text: `[Extraction Error]\n\nFailed to extract text from PDF: ${errorMsg}`,
      extractor: 'error',
      error: errorMsg,
    };
  }
};

/**
 * Extract text from an image using Tesseract OCR
 */
const extractFromImage = async (filePath: string): Promise<ExtractionResult> => {
  try {
    console.log(`[Source Extraction] Running OCR on image: ${filePath}`);

    const {
      data: { text },
    } = await Tesseract.recognize(filePath, 'eng');

    if (!text || text.trim().length === 0) {
      return {
        text: '[OCR Result]\n\nNo text detected in image',
        extractor: 'ocr',
      };
    }

    return {
      text: text,
      extractor: 'ocr',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Source Extraction] OCR failed: ${errorMsg}`);
    return {
      text: `[Extraction Error]\n\nFailed to extract text from image: ${errorMsg}`,
      extractor: 'error',
      error: errorMsg,
    };
  }
};

/**
 * Main extraction function - routes to appropriate extractor based on file type
 */
export const extractText = async (
  filePath: string
): Promise<ExtractionResult> => {
  try {
    // Verify file exists
    if (!fs.existsSync(filePath)) {
      return {
        text: `[Extraction Error]\n\nFile not found: ${filePath}`,
        extractor: 'error',
        error: `File not found: ${filePath}`,
      };
    }

    const ext = path.extname(filePath).toLowerCase();

    // Route to appropriate extractor
    if (ext === '.pdf') {
      return await extractFromPdf(filePath);
    } else if (['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.webp'].includes(ext)) {
      return await extractFromImage(filePath);
    } else {
      return {
        text: `[Extraction Error]\n\nUnsupported file type: ${ext}`,
        extractor: 'error',
        error: `Unsupported file type: ${ext}`,
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Source Extraction] Unexpected error: ${errorMsg}`);
    return {
      text: `[Extraction Error]\n\nUnexpected error during extraction: ${errorMsg}`,
      extractor: 'error',
      error: errorMsg,
    };
  }
};

/**
 * Check if a file extension is supported
 */
export const isSupportedSourceFile = (filePath: string): boolean => {
  const ext = path.extname(filePath).toLowerCase();
  return ['.pdf', '.png', '.jpg', '.jpeg', '.tif', '.tiff', '.webp'].includes(
    ext
  );
};
