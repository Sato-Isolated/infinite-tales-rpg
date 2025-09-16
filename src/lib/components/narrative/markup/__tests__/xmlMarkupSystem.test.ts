/**
 * Modern XML Narrative Markup System Tests
 * Comprehensive test suite for the new XML-based markup system
 */

import { describe, it, expect } from 'vitest';
import { MarkupParser } from '../parser';
import { validateXmlMarkup, cleanXmlMarkup } from '../../narrativeSanitizer';
import { validateMarkupTags, generateMarkupReferenceGuide, createNPCXmlResolver } from '$lib/ai/prompts/helpers/npcMarkupHelpers';
import type { NPCState } from '$lib/ai/agents/characterStatsAgent';

describe('XML Markup Parser', () => {
	const parser = new MarkupParser();

	describe('Basic Text Parsing', () => {
		it('should parse plain text without markup', () => {
			const result = parser.parse('Simple text content without any markup.');
			
			expect(result.nodes).toHaveLength(1);
			expect(result.nodes[0].type).toBe('text');
			expect(result.nodes[0].content).toBe('Simple text content without any markup.');
			expect(result.errors).toHaveLength(0);
			expect(result.warnings).toHaveLength(0);
		});

		it('should handle empty input', () => {
			const result = parser.parse('');
			
			expect(result.nodes).toHaveLength(0);
			expect(result.errors).toHaveLength(0);
		});

		it('should handle whitespace-only input', () => {
			const result = parser.parse('   \n\t  ');
			
			expect(result.nodes).toHaveLength(0);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('Speaker Tags', () => {
		it('should parse valid speaker dialogue correctly', () => {
			const result = parser.parse('<speaker name="Marie">Hello there, traveler!</speaker>');
			
			expect(result.nodes).toHaveLength(1);
			expect(result.nodes[0].type).toBe('speaker');
			expect(result.nodes[0].content).toBe('Hello there, traveler!');
			expect(result.nodes[0].attributes?.name).toBe('Marie');
			expect(result.errors).toHaveLength(0);
		});

		it('should require name attribute for speaker', () => {
			const result = parser.parse('<speaker>Hello there!</speaker>');
			
			expect(result.errors.length).toBeGreaterThanOrEqual(1);
			expect(result.errors.some(e => e.message.includes('name') && e.message.includes('attribute'))).toBe(true);
		});

		it('should require content for speaker', () => {
			const result = parser.parse('<speaker name="Marie"></speaker>');
			
			expect(result.errors.length).toBeGreaterThanOrEqual(1);
			expect(result.errors.some(e => e.message.includes('content') || e.message.includes('dialogue'))).toBe(true);
		});

		it('should handle speaker with quoted attributes', () => {
			const result = parser.parse('<speaker name="Marie Dubois">Bonjour!</speaker>');
			
			expect(result.nodes[0].attributes?.name).toBe('Marie Dubois');
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('Character Tags', () => {
		it('should parse self-closing character tags', () => {
			const result = parser.parse('<character name="John" />');
			
			expect(result.nodes).toHaveLength(1);
			expect(result.nodes[0].type).toBe('character');
			expect(result.nodes[0].content).toBe('');
			expect(result.nodes[0].attributes?.name).toBe('John');
			expect(result.errors).toHaveLength(0);
		});

		it('should require name attribute for character', () => {
			const result = parser.parse('<character />');
			
			expect(result.errors.length).toBeGreaterThanOrEqual(1);
			expect(result.errors.some(e => e.message.includes('name') && e.message.includes('attribute'))).toBe(true);
		});

		it('should handle character with optional id attribute', () => {
			const result = parser.parse('<character name="Hero" id="main_character" />');
			
			expect(result.nodes[0].attributes?.name).toBe('Hero');
			expect(result.nodes[0].attributes?.id).toBe('main_character');
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('Content Tags', () => {
		it('should parse highlight tags', () => {
			const result = parser.parse('<highlight>mysterious glow</highlight>');
			
			expect(result.nodes).toHaveLength(1);
			expect(result.nodes[0].type).toBe('highlight');
			expect(result.nodes[0].content).toBe('mysterious glow');
			expect(result.errors).toHaveLength(0);
		});

		it('should parse time tags', () => {
			const result = parser.parse('<time>Three hours later</time>');
			
			expect(result.nodes[0].type).toBe('time');
			expect(result.nodes[0].content).toBe('Three hours later');
			expect(result.errors).toHaveLength(0);
		});

		it('should parse whisper tags', () => {
			const result = parser.parse('<whisper>stay quiet</whisper>');
			
			expect(result.nodes[0].type).toBe('whisper');
			expect(result.nodes[0].content).toBe('stay quiet');
			expect(result.errors).toHaveLength(0);
		});

		it('should parse action tags', () => {
			const result = parser.parse('<action>draws sword</action>');
			
			expect(result.nodes[0].type).toBe('action');
			expect(result.nodes[0].content).toBe('draws sword');
			expect(result.errors).toHaveLength(0);
		});

		it('should parse thought tags', () => {
			const result = parser.parse('<thought>something feels wrong</thought>');
			
			expect(result.nodes[0].type).toBe('thought');
			expect(result.nodes[0].content).toBe('something feels wrong');
			expect(result.errors).toHaveLength(0);
		});

		it('should require content for content tags', () => {
			const result = parser.parse('<highlight></highlight>');
			
			expect(result.errors.length).toBeGreaterThanOrEqual(1);
			expect(result.errors.some(e => e.message.includes('content') || e.message.includes('requires'))).toBe(true);
		});
	});

	describe('Location Tags', () => {
		it('should parse location tags', () => {
			const result = parser.parse('<location name="ancient_temple" />');
			
			expect(result.nodes[0].type).toBe('location');
			expect(result.nodes[0].attributes?.name).toBe('ancient_temple');
			expect(result.errors).toHaveLength(0);
		});

		it('should require name attribute for location', () => {
			const result = parser.parse('<location />');
			
			expect(result.errors.length).toBeGreaterThanOrEqual(1);
			expect(result.errors.some(e => e.message.includes('name') && e.message.includes('attribute'))).toBe(true);
		});
	});

	describe('Break Tags', () => {
		it('should parse break tags', () => {
			const result = parser.parse('<break />');
			
			expect(result.nodes[0].type).toBe('break');
			expect(result.nodes[0].content).toBe('');
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('Mixed Content', () => {
		it('should handle mixed text and markup', () => {
			const text = 'The <character name="hero" /> approached the <location name="castle" /> carefully. <speaker name="Guard">Halt!</speaker>';
			const result = parser.parse(text);
			
			expect(result.nodes).toHaveLength(6); // 3 text + 3 markup
			expect(result.errors).toHaveLength(0);
			
			expect(result.nodes[0].type).toBe('text');
			expect(result.nodes[1].type).toBe('character');
			expect(result.nodes[2].type).toBe('text');
			expect(result.nodes[3].type).toBe('location');
			expect(result.nodes[4].type).toBe('text');
			expect(result.nodes[5].type).toBe('speaker');
		});

		it('should handle complex narrative with multiple elements', () => {
			const text = `<speaker name="Marie">Bonjour!</speaker> said <character name="Marie" />. 
			<time>An hour later</time>, they reached <location name="ruins" />. 
			<whisper>Be careful</whisper>, she warned. <action>She draws her weapon</action> 
			and <thought>hopes this works</thought>. <break />`;
			
			const result = parser.parse(text);
			
			expect(result.errors).toHaveLength(0);
			expect(result.nodes.filter((n: any) => n.type === 'speaker')).toHaveLength(1);
			expect(result.nodes.filter((n: any) => n.type === 'character')).toHaveLength(1);
			expect(result.nodes.filter((n: any) => n.type === 'time')).toHaveLength(1);
			expect(result.nodes.filter((n: any) => n.type === 'location')).toHaveLength(1);
			expect(result.nodes.filter((n: any) => n.type === 'whisper')).toHaveLength(1);
			expect(result.nodes.filter((n: any) => n.type === 'action')).toHaveLength(1);
			expect(result.nodes.filter((n: any) => n.type === 'thought')).toHaveLength(1);
			expect(result.nodes.filter((n: any) => n.type === 'break')).toHaveLength(1);
		});
	});

	describe('Error Handling', () => {
		it('should detect unknown tags', () => {
			const result = parser.parse('<unknown>content</unknown>');
			
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].message).toContain('Unknown tag: unknown');
			expect(result.errors[0].suggestion).toContain('Available tags');
		});

		it('should detect unclosed tags', () => {
			const result = parser.parse('<speaker name="Marie">Hello there!');
			
			expect(result.errors.length).toBeGreaterThanOrEqual(1);
			expect(result.errors.some(e => e.message.includes('Unclosed') || e.message.includes('closing'))).toBe(true);
		});

		it('should detect malformed self-closing tags', () => {
			const result = parser.parse('<character name="John">');
			
			expect(result.errors.length).toBeGreaterThanOrEqual(1);
			expect(result.errors.some(e => e.message.includes('Self-closing') || e.message.includes('/>'))).toBe(true);
		});

		it('should detect invalid attributes', () => {
			const result = parser.parse('<character name="John" invalid="value" />');
			
			expect(result.warnings.length).toBeGreaterThanOrEqual(1);
			expect(result.warnings.some(w => w.message.includes('invalid') || w.message.includes('not allowed'))).toBe(true);
		});
	});
});

describe('XML Markup Validation', () => {
	describe('validateXmlMarkup', () => {
		it('should validate correct markup', () => {
			const text = '<speaker name="Marie">Hello!</speaker> The <character name="hero" /> nodded.';
			const result = validateXmlMarkup(text);
			
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should detect errors in markup', () => {
			const text = '<speaker>No name!</speaker>';
			const result = validateXmlMarkup(text);
			
			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('should handle empty input gracefully', () => {
			const result = validateXmlMarkup('');
			
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('cleanXmlMarkup', () => {
		it('should normalize whitespace around tags', () => {
			const input = 'Text < speaker name="Marie" > Hello </ speaker >';
			const result = cleanXmlMarkup(input);
			
			// The function normalizes spaces around < and > but preserves the content structure
			expect(result).toContain('<speaker name="Marie">');
			expect(result).toContain('</speaker>');
		});

		it('should normalize attribute spacing', () => {
			const input = '<character name = "John" />';
			const result = cleanXmlMarkup(input);
			
			// The function should normalize spacing around = and quotes
			expect(result).toContain('name="John"');
			expect(result).toContain('/>');
		});

		it('should handle excessive whitespace', () => {
			const input = 'Text   with    lots   of    spaces.';
			const result = cleanXmlMarkup(input);
			
			expect(result).toBe('Text with lots of spaces.');
		});
	});
});

describe('NPC XML Helpers', () => {
	const mockNPCState: NPCState = {
		npc_001: {
			known_names: ['Marie', 'Marie Dubois'],
			is_party_member: false,
			class: 'merchant',
			rank_enum_english: 'Average',
			level: 5,
			spells_and_abilities: []
		},
		npc_002: {
			known_names: ['Captain Jean', 'Jean'],
			is_party_member: false,
			class: 'guard',
			rank_enum_english: 'Strong',
			level: 8,
			spells_and_abilities: []
		}
	};

	describe('validateMarkupTags', () => {
		it('should validate XML markup through helper', () => {
			const text = '<speaker name="Marie">Hello!</speaker>';
			const result = validateMarkupTags(text);
			
			expect(result.isValid).toBe(true);
		});
	});

	describe('createNPCXmlResolver', () => {
		it('should create resolver with validation', () => {
			const resolver = createNPCXmlResolver(mockNPCState);
			
			expect(resolver.validateNPCMarkup).toBeDefined();
			expect(resolver.getAvailableCharacters).toBeDefined();
		});

		it('should validate known characters', () => {
			const resolver = createNPCXmlResolver(mockNPCState);
			const text = '<character name="Marie" /> meets <character name="Jean" />';
			const result = resolver.validateNPCMarkup(text);
			
			expect(result.isValid).toBe(true);
			expect(result.characterNames).toEqual(['Marie', 'Jean']);
		});

		it('should detect unknown characters', () => {
			const resolver = createNPCXmlResolver(mockNPCState);
			const text = '<character name="Unknown" />';
			const result = resolver.validateNPCMarkup(text);
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Unknown character: "Unknown"');
		});

		it('should get available characters', () => {
			const resolver = createNPCXmlResolver(mockNPCState);
			const characters = resolver.getAvailableCharacters();
			
			expect(characters).toContain('Marie');
			expect(characters).toContain('Captain Jean');
		});
	});

	describe('generateMarkupReferenceGuide', () => {
		it('should generate guide without NPCs', () => {
			const guide = generateMarkupReferenceGuide();
			
			expect(guide).toContain('Modern XML Narrative Markup System');
			expect(guide).toContain('<speaker name="CharacterName">');
			expect(guide).toContain('<character name="CharacterName" />');
			expect(guide).toContain('Advantages');
		});

		it('should generate guide with NPC context', () => {
			const guide = generateMarkupReferenceGuide(mockNPCState);
			
			expect(guide).toContain('Available Characters');
			expect(guide).toContain('Marie');
			expect(guide).toContain('Captain Jean');
		});
	});
});

describe('Edge Cases and Performance', () => {
	const parser = new MarkupParser();

	it('should handle nested same-type tags', () => {
		const result = parser.parse('<speaker name="A"><speaker name="B">Inner</speaker></speaker>');
		
		// Should handle nesting gracefully - the inner speaker becomes part of content
		expect(result.nodes).toHaveLength(1);
		expect(result.nodes[0].type).toBe('speaker');
		expect(result.nodes[0].content).toContain('Inner');
	});

	it('should handle large content efficiently', () => {
		const largeContent = 'A'.repeat(10000);
		const text = `<highlight>${largeContent}</highlight>`;
		const result = parser.parse(text);
		
		expect(result.nodes[0].content).toBe(largeContent);
		expect(result.errors).toHaveLength(0);
	});

	it('should handle special characters in content', () => {
		const result = parser.parse('<speaker name="Marie">Hello & welcome! "How are you?" she asked.</speaker>');
		
		expect(result.nodes[0].content).toContain('&');
		expect(result.nodes[0].content).toContain('"');
		expect(result.errors).toHaveLength(0);
	});

	it('should handle escaped quotes in attributes', () => {
		const result = parser.parse('<speaker name="Marie \\"The Brave\\"">Hello!</speaker>');
		
		expect(result.nodes[0].attributes?.name).toBe('Marie "The Brave"');
		expect(result.errors).toHaveLength(0);
	});
});