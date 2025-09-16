import { describe, it, expect } from 'vitest';
import { MarkupParser } from '../parser';

describe('Debugging Nested Tags Issues', () => {
	const parser = new MarkupParser();

	it('should debug first test case', () => {
		const content = '<speaker name="Narrateur">Soudain, <character name="Alice">Alice</character> apparut dans <location name="la forêt">la forêt</location> mystérieuse.</speaker>';
		
		const result = parser.parse(content);
		
		console.log('Parsing result:', JSON.stringify(result, null, 2));
		console.log('Errors:', result.errors);
		console.log('Nodes:', result.nodes);
		
		if (result.nodes.length > 0) {
			console.log('First node:', JSON.stringify(result.nodes[0], null, 2));
			if (result.nodes[0].children) {
				console.log('Children:', JSON.stringify(result.nodes[0].children, null, 2));
			}
		}
		
		expect(result.errors.length).toBe(0);
	});
});