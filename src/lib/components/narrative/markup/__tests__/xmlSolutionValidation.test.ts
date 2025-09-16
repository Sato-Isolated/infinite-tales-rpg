import { expect, test } from 'vitest';
import { MarkupParser } from '../parser';

test('Complete nested tags solution validation - Fenrir example', () => {
	const parser = new MarkupParser();

	// Test the corrected format from user's example
	const correctedUserExample = `<speaker name="Fenrir">Moi ? Accuser un esprit-loup légendaire de chaparder des gâteaux de riz ? Mon honneur est bafoué, <character name="Cain" />. Je préfère la chair fraîche, pas les douceurs gluantes. Et puis, je les aurais mangés devant elle pour le plaisir de la provocation.</speaker>`;

	const result = parser.parse(correctedUserExample);

	// Should have one speaker element with nested character tag in content
	expect(result.nodes.length).toBe(1);
	expect(result.nodes[0].type).toBe('speaker');
	expect(result.nodes[0].attributes?.name).toBe('Fenrir');

	// The content should contain the nested character tag (as text, not parsed)
	const speakerContent = result.nodes[0].content;
	expect(speakerContent).toContain('<character name="Cain" />');
	expect(speakerContent).toContain('Mon honneur est bafoué');
	expect(speakerContent).toContain('chair fraîche');

	// Should not have parsing errors for this valid XML
	expect(result.errors.length).toBe(0);
});

test('Nested tags are preserved in content for rendering components', () => {
	const parser = new MarkupParser();

	const complexExample = `<speaker name="Narrator">The <highlight>mysterious treasure</highlight> lies in the <location name="Hidden Temple" />.</speaker>`;

	const result = parser.parse(complexExample);

	expect(result.nodes.length).toBe(1);
	expect(result.nodes[0].type).toBe('speaker');
	expect(result.nodes[0].attributes?.name).toBe('Narrator');

	// The nested tags should be preserved in the content for component rendering
	const content = result.nodes[0].content;
	expect(content).toContain('<highlight>mysterious treasure</highlight>');
	expect(content).toContain('<location name="Hidden Temple" />');
	
	// Should not have parsing errors
	expect(result.errors.length).toBe(0);
});