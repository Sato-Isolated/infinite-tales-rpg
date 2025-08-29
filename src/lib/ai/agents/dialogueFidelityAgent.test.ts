import { describe, it, expect } from 'vitest';
import { DialogueFidelityAgent, DEFAULT_FIDELITY_SETTINGS } from './dialogueFidelityAgent';

describe('DialogueFidelityAgent', () => {
	const agent = new DialogueFidelityAgent(DEFAULT_FIDELITY_SETTINGS);

	describe('Explicit Fidelity Markers', () => {
		it('should detect exact preservation markers', () => {
			const analysis = agent.analyzeDialogueFidelity('Je dis exactement "Bonjour"');
			expect(analysis.fidelity_level).toBe('preserve_exact');
			expect(analysis.reasoning).toContain('explicitly requested exact preservation');
		});

		it('should detect creative interpretation markers', () => {
			const analysis = agent.analyzeDialogueFidelity('J\'improvise une réponse créative');
			expect(analysis.fidelity_level).toBe('allow_creative');
			expect(analysis.reasoning).toContain('explicitly allowed creative interpretation');
		});
	});

	describe('Quoted Dialogue Detection', () => {
		it('should detect French quotation marks', () => {
			const analysis = agent.analyzeDialogueFidelity('Je dis « Bonjour tout le monde »');
			expect(analysis.fidelity_level).toBe('preserve_exact');
			expect(analysis.detected_patterns.some(p => p.includes('Quoted dialogue'))).toBe(true);
		});

		it('should detect English quotation marks', () => {
			const analysis = agent.analyzeDialogueFidelity('I say "Hello everyone"');
			expect(analysis.fidelity_level).toBe('preserve_exact');
			expect(analysis.detected_patterns.some(p => p.includes('Quoted dialogue'))).toBe(true);
		});

		it('should detect simple apostrophes', () => {
			const analysis = agent.analyzeDialogueFidelity('Je réponds \'Peut-être\'');
			expect(analysis.fidelity_level).toBe('preserve_exact');
			expect(analysis.detected_patterns.some(p => p.includes('Quoted dialogue'))).toBe(true);
		});
	});

	describe('First Person Dialogue Detection', () => {
		it('should detect "je dis" pattern', () => {
			const analysis = agent.analyzeDialogueFidelity('Je dis bonjour à tout le monde');
			expect(analysis.fidelity_level).toBe('preserve_exact');
			expect(analysis.detected_patterns.some(p => p.includes('First-person dialogue'))).toBe(true);
		});

		it('should detect "je réponds" pattern', () => {
			const analysis = agent.analyzeDialogueFidelity('Je réponds que c\'est une bonne idée');
			expect(analysis.fidelity_level).toBe('preserve_exact');
			expect(analysis.detected_patterns.some(p => p.includes('First-person dialogue'))).toBe(true);
		});

		it('should detect English "I say" pattern', () => {
			const analysis = agent.analyzeDialogueFidelity('I say hello to everyone');
			expect(analysis.fidelity_level).toBe('preserve_exact');
			expect(analysis.detected_patterns.some(p => p.includes('First-person dialogue'))).toBe(true);
		});

		it('should detect dialogue with colon separation', () => {
			const analysis = agent.analyzeDialogueFidelity('Je dis : Bonne idée !');
			expect(analysis.fidelity_level).toBe('preserve_exact');
			expect(analysis.detected_patterns.some(p => p.includes('colon separation'))).toBe(true);
		});
	});

	describe('Auto Detection', () => {
		it('should default to preserve_exact for short simple text', () => {
			const analysis = agent.analyzeDialogueFidelity('Oui.');
			expect(analysis.fidelity_level).toBe('preserve_exact');
			expect(analysis.reasoning).toContain('Very short text suggests');
		});

		it('should suggest creative for complex actions', () => {
			const analysis = agent.analyzeDialogueFidelity('Je tente de convaincre le garde en utilisant ma persuasion et en faisant appel à ses émotions');
			expect(analysis.fidelity_level).toBe('allow_creative');
			expect(analysis.reasoning).toContain('Complex actions detected');
		});

		it('should generate appropriate preservation instructions', () => {
			const analysis = agent.analyzeDialogueFidelity('Je dis "Bonjour"');
			expect(analysis.suggested_preservation_instructions).toContain('PRESERVE EXACT');
			expect(analysis.suggested_preservation_instructions).toContain('DO NOT paraphrase');
		});

		it('should generate appropriate creative instructions', () => {
			const analysis = agent.analyzeDialogueFidelity('J\'improvise une réponse');
			expect(analysis.suggested_preservation_instructions).toContain('ALLOW CREATIVE');
			expect(analysis.suggested_preservation_instructions).toContain('creative expansion');
		});
	});

	describe('Edge Cases', () => {
		it('should handle mixed signals by prioritizing explicit markers', () => {
			const analysis = agent.analyzeDialogueFidelity('Je dis exactement et j\'improvise "Bonjour"');
			expect(analysis.fidelity_level).toBe('preserve_exact');
		});

		it('should handle empty text gracefully', () => {
			const analysis = agent.analyzeDialogueFidelity('');
			expect(analysis.fidelity_level).toBe('preserve_exact'); // Empty text gets exact preservation
		});

		it('should handle multilingual text', () => {
			const analysis = agent.analyzeDialogueFidelity('I say "Hello" et je dis "Bonjour"');
			expect(analysis.fidelity_level).toBe('preserve_exact');
			expect(analysis.detected_patterns.some(p => p.includes('Quoted dialogue'))).toBe(true);
		});
	});

	describe('Preserve Essence Detection', () => {
		it('should default to preserve_essence for medium-length simple actions', () => {
			const analysis = agent.analyzeDialogueFidelity('Je regarde autour de moi');
			expect(analysis.fidelity_level).toBe('preserve_essence');
			expect(analysis.reasoning).toContain('essence preservation');
		});

		it('should use preserve_exact for first-person dialogue actions', () => {
			const analysis = agent.analyzeDialogueFidelity('Je réponds calmement');
			expect(analysis.fidelity_level).toBe('preserve_exact'); // "Je réponds" is first-person dialogue
		});

		it('should preserve_essence for non-dialogue actions', () => {
			const analysis = agent.analyzeDialogueFidelity('Je me dirige vers la porte');
			expect(analysis.fidelity_level).toBe('preserve_essence');
		});

		it('should preserve_exact for very short text', () => {
			const analysis = agent.analyzeDialogueFidelity('Oui');
			expect(analysis.fidelity_level).toBe('preserve_exact');
			expect(analysis.reasoning).toContain('Very short text');
		});

		it('should allow_creative for complex emotional actions', () => {
			const analysis = agent.analyzeDialogueFidelity('Je tente de masquer ma nervosité en essayant de sourire tout en réfléchissant à une stratégie');
			expect(analysis.fidelity_level).toBe('allow_creative');
			expect(analysis.reasoning).toContain('Complex actions detected');
		});
	});

	describe('Settings Configuration', () => {
		it('should respect custom default mode', () => {
			const customAgent = new DialogueFidelityAgent({
				...DEFAULT_FIDELITY_SETTINGS,
				default_mode: 'allow_creative'
			});

			const analysis = customAgent.analyzeDialogueFidelity('Je marche vers la porte');
			expect(analysis.fidelity_level).toBe('allow_creative');
		});

		it('should allow disabling quoted text preservation', () => {
			const customAgent = new DialogueFidelityAgent({
				...DEFAULT_FIDELITY_SETTINGS,
				preserve_quoted_text: false
			});

			const analysis = customAgent.analyzeDialogueFidelity('Je dis "Bonjour"');
			expect(analysis.fidelity_level).toBe('preserve_exact'); // Should still detect first-person
		});
	});
});
