import { describe, it, expect } from 'vitest';
import { MarkupParser } from '../parser';

describe('Nested Tags Integration Test', () => {
	const parser = new MarkupParser();

	it('should parse and prepare nested character tags inside speaker dialogue for rendering', () => {
		const content = '<speaker name="Narrateur">Soudain, <character name="Alice">Alice</character> apparut dans <location name="la forêt">la forêt</location> mystérieuse.</speaker>';
		
		const result = parser.parse(content);
		
		// Vérifier qu'il n'y a pas d'erreurs
		expect(result.errors).toHaveLength(0);
		expect(result.nodes).toHaveLength(1);
		
		const speakerNode = result.nodes[0];
		expect(speakerNode.type).toBe('speaker');
		expect(speakerNode.attributes?.name).toBe('Narrateur');
		
		// Le contenu principal devrait contenir le texte sans les balises imbriquées
		expect(speakerNode.content).toBe('Soudain,  apparut dans  mystérieuse.');
		
		// Les enfants devraient contenir les balises imbriquées
		expect(speakerNode.children).toBeDefined();
		expect(speakerNode.children).toHaveLength(2);
		
		const characterChild = speakerNode.children![0];
		expect(characterChild.type).toBe('character');
		expect(characterChild.attributes?.name).toBe('Alice');
		expect(characterChild.content).toBe('Alice');
		
		const locationChild = speakerNode.children![1];
		expect(locationChild.type).toBe('location');
		expect(locationChild.attributes?.name).toBe('la forêt');
		expect(locationChild.content).toBe('la forêt');
	});

	it('should handle deeply nested tags correctly', () => {
		const content = '<speaker name="Guide">Dans <location name="ville">cette ville</location>, <character name="Marie">Marie</character> trouve <highlight>un mystérieux <character name="étranger">étranger</character></highlight>.</speaker>';
		
		const result = parser.parse(content);
		
		expect(result.errors).toHaveLength(0);
		expect(result.nodes).toHaveLength(1);
		
		const speakerNode = result.nodes[0];
		expect(speakerNode.children).toBeDefined();
		expect(speakerNode.children).toHaveLength(3); // location, character, highlight
		
		// Vérifier la balise highlight qui contient elle-même un character
		const highlightChild = speakerNode.children![2];
		expect(highlightChild.type).toBe('highlight');
		expect(highlightChild.content).toBe('un mystérieux ');
		expect(highlightChild.children).toBeDefined();
		expect(highlightChild.children).toHaveLength(1);
		
		const nestedCharacter = highlightChild.children![0];
		expect(nestedCharacter.type).toBe('character');
		expect(nestedCharacter.attributes?.name).toBe('étranger');
		expect(nestedCharacter.content).toBe('étranger');
	});

	it('should maintain proper text positioning with nested tags', () => {
		const content = '<speaker name="Conteur"><action>Il regarde <character name="Bob">Bob</character> attentivement</action> puis dit : "Salut <character name="Bob">Bob</character> !"</speaker>';
		
		const result = parser.parse(content);
		
		expect(result.errors).toHaveLength(0);
		
		const speakerNode = result.nodes[0];
		expect(speakerNode.children).toBeDefined();
		expect(speakerNode.children).toHaveLength(2); // action + character
		
		// Vérifier l'action imbriquée
		const actionChild = speakerNode.children![0];
		expect(actionChild.type).toBe('action');
		expect(actionChild.content).toBe('Il regarde  attentivement');
		expect(actionChild.children).toBeDefined();
		expect(actionChild.children).toHaveLength(1);
		
		const nestedCharacter = actionChild.children![0];
		expect(nestedCharacter.type).toBe('character');
		expect(nestedCharacter.attributes?.name).toBe('Bob');
		
		// Vérifier le deuxième character
		const secondCharacter = speakerNode.children![1];
		expect(secondCharacter.type).toBe('character');
		expect(secondCharacter.attributes?.name).toBe('Bob');
	});

	it('should handle complex real-world nested scenario', () => {
		// Scénario complexe du problème initial
		const content = '<speaker name="Narrateur">La <character name="Alice">fée Alice</character> murmure : "<whisper>Je connais <location name="le secret">le secret</location> de cette <highlight>magie ancienne</highlight></whisper>"</speaker>';
		
		const result = parser.parse(content);
		
		expect(result.errors).toHaveLength(0);
		
		const speakerNode = result.nodes[0];
		expect(speakerNode.type).toBe('speaker');
		expect(speakerNode.children).toBeDefined();
		expect(speakerNode.children).toHaveLength(2); // character + whisper
		
		const characterChild = speakerNode.children![0];
		expect(characterChild.type).toBe('character');
		expect(characterChild.attributes?.name).toBe('Alice');
		
		const whisperChild = speakerNode.children![1];
		expect(whisperChild.type).toBe('whisper');
		expect(whisperChild.children).toBeDefined();
		expect(whisperChild.children).toHaveLength(2); // location + highlight
		
		const locationInWhisper = whisperChild.children![0];
		expect(locationInWhisper.type).toBe('location');
		expect(locationInWhisper.attributes?.name).toBe('le secret');
		
		const highlightInWhisper = whisperChild.children![1];
		expect(highlightInWhisper.type).toBe('highlight');
		expect(highlightInWhisper.content).toBe('magie ancienne');
	});
});