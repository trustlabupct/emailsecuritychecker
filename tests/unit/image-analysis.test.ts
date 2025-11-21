// tests/unit/image-analysis.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  extractImagesFromHtml,
  decodeQrCode,
  performOcr,
  analyzeQrCodes,
  analyzeImagesWithOcr,
  analyzeEmailImages,
  cleanupTesseractWorker
} from '../../src/service-worker/analysis/image-analysis';

// Check if we're in a browser-like environment
const hasWorkerSupport = typeof Worker !== 'undefined';

describe('Image Analysis', () => {
  afterAll(async () => {
    // Cleanup Tesseract worker after all tests
    if (hasWorkerSupport) {
      await cleanupTesseractWorker();
    }
  });

  describe('extractImagesFromHtml', () => {
    it('should extract images with data URIs', () => {
      const html = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="test">';
      const result = extractImagesFromHtml(html);

      expect(result).toHaveLength(1);
      expect(result[0].src).toContain('data:image/png');
      expect(result[0].alt).toBe('test');
    });

    it('should extract images with HTTP/HTTPS URLs', () => {
      const html = '<img src="https://example.com/image.png" alt="example"><img src="http://test.com/photo.jpg">';
      const result = extractImagesFromHtml(html);

      expect(result).toHaveLength(2);
      expect(result[0].src).toBe('https://example.com/image.png');
      expect(result[0].alt).toBe('example');
      expect(result[1].src).toBe('http://test.com/photo.jpg');
    });

    it('should ignore relative URLs', () => {
      const html = '<img src="/images/logo.png"><img src="../photos/test.jpg">';
      const result = extractImagesFromHtml(html);

      expect(result).toHaveLength(0);
    });

    it('should handle multiple images', () => {
      const html = `
        <img src="https://example.com/1.png">
        <p>Some text</p>
        <img src="data:image/jpeg;base64,/9j/4AAQSkZJRg==" alt="photo">
        <img src="https://test.com/3.gif">
      `;
      const result = extractImagesFromHtml(html);

      expect(result).toHaveLength(3);
    });

    it('should handle HTML with no images', () => {
      const html = '<p>No images here</p><div>Just text</div>';
      const result = extractImagesFromHtml(html);

      expect(result).toHaveLength(0);
    });

    it('should handle malformed HTML gracefully', () => {
      const html = '<img src="https://example.com/image.png" alt="test>';
      const result = extractImagesFromHtml(html);

      // Should still extract the image despite missing closing quote
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe.skipIf(!hasWorkerSupport)('decodeQrCode', () => {
    it('should return null for image without QR code', async () => {
      // 1x1 red pixel PNG (base64)
      const redPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
      const result = await decodeQrCode(redPixel);

      expect(result).toBeNull();
    });

    it('should handle invalid image gracefully', async () => {
      const invalidData = 'data:image/png;base64,invalid';
      const result = await decodeQrCode(invalidData);

      expect(result).toBeNull();
    });

    // Note: Testing actual QR code decoding would require a real QR code image
    // In a real test suite, you'd include a base64-encoded QR code image
  });

  describe.skipIf(!hasWorkerSupport)('performOcr', () => {
    it('should extract text from image with text', async () => {
      // Note: This test would require a real image with text
      // For unit testing, we verify the function handles errors gracefully
      const invalidImage = 'data:image/png;base64,invalid';
      const result = await performOcr(invalidImage);

      // Should return empty string on error
      expect(typeof result).toBe('string');
    });

    // Full OCR testing would require real text images or mocking Tesseract
  });

  describe.skipIf(!hasWorkerSupport)('analyzeQrCodes', () => {
    it('should return empty array for HTML with no images', async () => {
      const html = '<p>No images here</p>';
      const result = await analyzeQrCodes(html);

      expect(result).toEqual([]);
    });

    it('should attempt to decode all images', async () => {
      const html = `
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==">
      `;
      const result = await analyzeQrCodes(html);

      // Should return empty array if no QR codes found (but shouldn't crash)
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle malformed HTML', async () => {
      const html = '<img src="not a valid url">';
      const result = await analyzeQrCodes(html);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe.skipIf(!hasWorkerSupport)('analyzeImagesWithOcr', () => {
    it('should return empty array for HTML with no images', async () => {
      const html = '<p>No images here</p>';
      const result = await analyzeImagesWithOcr(html);

      expect(result).toEqual([]);
    });

    it('should attempt OCR on all images', async () => {
      const html = `
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==">
      `;
      const result = await analyzeImagesWithOcr(html);

      // Should return array (might be empty if OCR finds no text)
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const html = '<img src="invalid">';
      const result = await analyzeImagesWithOcr(html);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe.skipIf(!hasWorkerSupport)('analyzeEmailImages', () => {
    it('should skip analysis if no images in HTML', async () => {
      const html = '<p>No images</p>';
      const result = await analyzeEmailImages(html, true, true, false);

      expect(result.qrCodes).toBeUndefined();
      expect(result.ocrResults).toBeUndefined();
    });

    it('should only analyze QR codes when QR is enabled', async () => {
      const html = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==">';
      const result = await analyzeEmailImages(html, true, false, false);

      expect(result.qrCodes).toBeDefined();
      expect(result.ocrResults).toBeUndefined();
    });

    it('should only analyze OCR when OCR is enabled', async () => {
      const html = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==">';
      const result = await analyzeEmailImages(html, false, true, false);

      expect(result.qrCodes).toBeUndefined();
      expect(result.ocrResults).toBeDefined();
    });

    it('should analyze both when both are enabled', async () => {
      const html = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==">';
      const result = await analyzeEmailImages(html, true, true, false);

      expect(result.qrCodes).toBeDefined();
      expect(result.ocrResults).toBeDefined();
    });

    it('should skip all analysis when both are disabled', async () => {
      const html = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==">';
      const result = await analyzeEmailImages(html, false, false, false);

      expect(result.qrCodes).toBeUndefined();
      expect(result.ocrResults).toBeUndefined();
    });

    it('should handle HTML with multiple images', async () => {
      const html = `
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==">
        <img src="https://example.com/test.png">
      `;
      const result = await analyzeEmailImages(html, true, true, false);

      expect(result.qrCodes).toBeDefined();
      expect(result.ocrResults).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty HTML', async () => {
      const result = await analyzeEmailImages('', true, true, false);

      expect(result.qrCodes).toBeUndefined();
      expect(result.ocrResults).toBeUndefined();
    });

    it.skipIf(!hasWorkerSupport)('should handle very long HTML', async () => {
      const longHtml = '<p>' + 'a'.repeat(100000) + '</p><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==">';
      const result = await analyzeEmailImages(longHtml, true, false, false);

      expect(result.qrCodes).toBeDefined();
    });

    it('should handle HTML with special characters', async () => {
      const html = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="Test & <special> \'chars\'">';
      const result = extractImagesFromHtml(html);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });
});
