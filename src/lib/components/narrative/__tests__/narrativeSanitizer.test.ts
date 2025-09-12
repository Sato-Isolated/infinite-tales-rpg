import { describe, it, expect } from 'vitest';
import { sanitizeNarrativeText } from '../narrativeSanitizer';

describe('narrativeSanitizer', () => {
  describe('Basic Functionality', () => {
    it('should handle text without markup', () => {
      const text = 'This is plain text without any markup.';
      const result = sanitizeNarrativeText(text);
      expect(result).toBe(text);
    });

    it('should keep valid markup tags', () => {
      const text = '[speaker:Marie]Hello world![/speaker]';
      const result = sanitizeNarrativeText(text);
      expect(result).toBe(text);
    });

    it('should auto-close unclosed tags', () => {
      const text = '[speaker:Marie]Hello world!';
      const result = sanitizeNarrativeText(text);
      expect(result).toBe('[speaker:Marie]Hello world![/speaker]');
    });

    it('should remove unknown tags', () => {
      const text = '[unknown:test]content[/unknown] and [valid]text[/valid]';
      const result = sanitizeNarrativeText(text);
      expect(result).toBe('content and text');
    });

    it('should normalize whitespace in tags', () => {
      const text = '[ speaker : Marie ]Hello![ /speaker ]';
      const result = sanitizeNarrativeText(text);
      expect(result).toBe('[speaker:Marie]Hello![/speaker]');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      const result = sanitizeNarrativeText('');
      expect(result).toBe('');
    });

    it('should handle malformed tags', () => {
      const text = '[speaker:Marie Hello world! [highlight]important[/highlight]';
      const result = sanitizeNarrativeText(text);
      expect(result).toBe('[speaker:Marie]Hello world! [highlight]important[/highlight][/speaker]');
    });

    it('should handle nested tags', () => {
      const text = '[speaker:Marie]Hello [highlight]world[/highlight]![/speaker]';
      const result = sanitizeNarrativeText(text);
      // Our sanitizer moves punctuation before closing tags, so we expect:
      expect(result).toBe('[speaker:Marie]Hello [highlight]world![/highlight][/speaker]');
    });
  });
});
