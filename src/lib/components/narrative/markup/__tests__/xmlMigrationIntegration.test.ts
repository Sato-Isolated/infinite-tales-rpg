/**
 * Integration Tests for XML Markup System Migration
 * Tests to verify complete migration from old @ prefix system to new XML system
 */

import { describe, it, expect } from 'vitest';
import { MarkupParser } from '../parser';
import { validateXmlMarkup } from '../../narrativeSanitizer';

describe('XML Markup System Migration Integration', () => {
	const parser = new MarkupParser();

	describe('Legacy Format Rejection', () => {
		it('should not parse old @ prefix format', () => {
			const legacyText = '@speaker:Marie:Hello there, traveler!';
			const result = parser.parse(legacyText);
			
			// Should treat as plain text, not markup
			expect(result.nodes).toHaveLength(1);
			expect(result.nodes[0].type).toBe('text');
			expect(result.nodes[0].content).toBe(legacyText);
			expect(result.errors).toHaveLength(0);
		});

		it('should not parse old [tag] format', () => {
			const legacyText = '[speaker:Marie]Hello there![/speaker]';
			const result = parser.parse(legacyText);
			
			// Should treat as plain text, not markup
			expect(result.nodes).toHaveLength(1);
			expect(result.nodes[0].type).toBe('text');
			expect(result.nodes[0].content).toBe(legacyText);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject mixed legacy and XML formats', () => {
			const mixedText = '@speaker:Marie:Hello! <character name="Hero" /> [action]waves[/action]';
			const result = parser.parse(mixedText);
			
			// Should parse only the XML part and treat the rest as text
			expect(result.nodes).toHaveLength(3); // text + character + text
			expect(result.nodes[0].type).toBe('text');
			expect(result.nodes[0].content).toContain('@speaker:Marie:Hello!');
			expect(result.nodes[1].type).toBe('character');
			expect(result.nodes[2].type).toBe('text');
			expect(result.nodes[2].content).toContain('[action]waves[/action]');
		});
	});

	describe('XML Format Validation', () => {
		it('should validate clean XML markup', () => {
			const xmlText = '<speaker name="Marie">Hello!</speaker> The <character name="Hero" /> nodded.';
			const result = validateXmlMarkup(xmlText);
			
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should provide helpful error messages for XML mistakes', () => {
			const invalidXml = '<speaker>Missing name attribute</speaker>';
			const result = validateXmlMarkup(invalidXml);
			
			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0]).toContain('name');
		});

		it('should handle complex XML scenarios', () => {
			const complexXml = `
				<speaker name="Marie">Bonjour, mon ami!</speaker> 
				The <character name="Marie" id="main_npc" /> approached the <location name="village_square" />. 
				<time>As the sun set</time>, she <action>drew her cloak tighter</action> and 
				<whisper>whispered a prayer</whisper>. 
				<thought>I hope this works</thought>, she mused. 
				<highlight>Something glimmered in the distance</highlight>. 
				<break />
			`;
			
			const result = parser.parse(complexXml);
			
			expect(result.errors).toHaveLength(0);
			expect(result.warnings).toHaveLength(0);
			
			// Count each type of markup
			const nodeTypes = result.nodes.map(n => n.type);
			expect(nodeTypes.filter(t => t === 'speaker')).toHaveLength(1);
			expect(nodeTypes.filter(t => t === 'character')).toHaveLength(1);
			expect(nodeTypes.filter(t => t === 'location')).toHaveLength(1);
			expect(nodeTypes.filter(t => t === 'time')).toHaveLength(1);
			expect(nodeTypes.filter(t => t === 'action')).toHaveLength(1);
			expect(nodeTypes.filter(t => t === 'whisper')).toHaveLength(1);
			expect(nodeTypes.filter(t => t === 'thought')).toHaveLength(1);
			expect(nodeTypes.filter(t => t === 'highlight')).toHaveLength(1);
			expect(nodeTypes.filter(t => t === 'break')).toHaveLength(1);
		});
	});

	describe('Backwards Compatibility Absence', () => {
		it('should completely ignore @ prefix patterns', () => {
			const textWithLegacy = 'Story text @speaker:Old:Format and @character:Name more text.';
			const result = parser.parse(textWithLegacy);
			
			expect(result.nodes).toHaveLength(1);
			expect(result.nodes[0].type).toBe('text');
			expect(result.nodes[0].content).toBe(textWithLegacy);
		});

		it('should completely ignore [tag] patterns', () => {
			const textWithLegacy = 'Story [speaker:Old]Format[/speaker] and [character:Name] more text.';
			const result = parser.parse(textWithLegacy);
			
			expect(result.nodes).toHaveLength(1);
			expect(result.nodes[0].type).toBe('text');
			expect(result.nodes[0].content).toBe(textWithLegacy);
		});

		it('should not provide migration warnings or suggestions', () => {
			const legacyText = '@speaker:Marie:This is the old format that should be ignored';
			const result = parser.parse(legacyText);
			
			// No warnings about legacy format - it's simply treated as text
			expect(result.warnings).toHaveLength(0);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('Performance with Mixed Content', () => {
		it('should efficiently handle large text with embedded XML', () => {
			const largeText = 'A'.repeat(5000);
			const mixedContent = `${largeText} <speaker name="Marie">Hello!</speaker> ${largeText}`;
			
			const startTime = performance.now();
			const result = parser.parse(mixedContent);
			const endTime = performance.now();
			
			expect(result.nodes).toHaveLength(3); // text + speaker + text
			expect(result.nodes[1].type).toBe('speaker');
			expect(endTime - startTime).toBeLessThan(50); // Should be fast
		});

		it('should handle multiple XML tags efficiently', () => {
			const multipleXml = Array.from({ length: 100 }, (_, i) => 
				`<character name="Character${i}" /> says <speaker name="Character${i}">Hello ${i}!</speaker>`
			).join(' ');
			
			const startTime = performance.now();
			const result = parser.parse(multipleXml);
			const endTime = performance.now();
			
			expect(result.nodes.filter(n => n.type === 'character')).toHaveLength(100);
			expect(result.nodes.filter(n => n.type === 'speaker')).toHaveLength(100);
			expect(endTime - startTime).toBeLessThan(100); // Should be reasonably fast
		});
	});

	describe('XML Validation Edge Cases', () => {
		it('should handle self-closing tags correctly', () => {
			const selfClosingXml = '<character name="Hero" /> and <location name="castle" /> and <break />';
			const result = parser.parse(selfClosingXml);
			
			expect(result.errors).toHaveLength(0);
			expect(result.nodes.filter(n => n.type === 'character')).toHaveLength(1);
			expect(result.nodes.filter(n => n.type === 'location')).toHaveLength(1);
			expect(result.nodes.filter(n => n.type === 'break')).toHaveLength(1);
		});

		it('should handle quoted attributes with special characters', () => {
			const quotedXml = '<speaker name="Marie \\"The Brave\\" O\'Connor">Hello!</speaker>';
			const result = parser.parse(quotedXml);
			
			expect(result.errors).toHaveLength(0);
			expect(result.nodes[0].attributes?.name).toBe('Marie "The Brave" O\'Connor');
		});

		it('should handle XML with line breaks and indentation', () => {
			const formattedXml = `
				<speaker name="Marie">
					This is a multi-line
					speaker dialogue
				</speaker>
			`;
			const result = parser.parse(formattedXml);
			
			expect(result.errors).toHaveLength(0);
			expect(result.nodes[0].type).toBe('speaker');
			expect(result.nodes[0].content).toContain('multi-line');
		});
	});

	describe('Error Recovery and Robustness', () => {
		it('should continue parsing after encountering errors', () => {
			const errorText = '<speaker>No name</speaker> then <character name="Hero" /> appears';
			const result = parser.parse(errorText);
			
			expect(result.errors.length).toBeGreaterThan(0); // Error for missing name
			expect(result.nodes.filter(n => n.type === 'character')).toHaveLength(1); // Should still parse the valid character
		});

		it('should handle malformed XML gracefully', () => {
			const malformedXml = '<speaker name="Marie">Unclosed tag and <character> no name </character>';
			const result = parser.parse(malformedXml);
			
			// Should handle gracefully and not crash
			expect(result).toBeDefined();
			expect(Array.isArray(result.nodes)).toBe(true);
			expect(Array.isArray(result.errors)).toBe(true);
		});

		it('should provide useful error messages and suggestions', () => {
			const errorXml = '<unknown>content</unknown>';
			const result = parser.parse(errorXml);
			
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].message).toContain('Unknown tag');
			expect(result.errors[0].suggestion).toContain('Available tags');
		});
	});

	describe('Content Sanitization', () => {
		it('should preserve content with special characters', () => {
			const specialChars = '<speaker name="Marie">Hello & welcome! "How are you?" she asked. Cost: $5.99</speaker>';
			const result = parser.parse(specialChars);
			
			expect(result.errors).toHaveLength(0);
			expect(result.nodes[0].content).toBe('Hello & welcome! "How are you?" she asked. Cost: $5.99');
		});

		it('should handle Unicode characters correctly', () => {
			const unicodeText = '<speaker name="Marie">Bonjour! 🌟 Comment allez-vous? ∀x∃y</speaker>';
			const result = parser.parse(unicodeText);
			
			expect(result.errors).toHaveLength(0);
			expect(result.nodes[0].content).toContain('🌟');
			expect(result.nodes[0].content).toContain('∀x∃y');
		});
	});
});