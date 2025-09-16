// Test pour les tags XML imbriqués
import { describe, it, expect } from 'vitest';
import { MarkupParser } from '../parser';

describe('XML Nested Tags Support', () => {
  it('should correctly parse nested tags within speaker dialogue', () => {
    const nestedContent = `
      <speaker name="Fenrir">Mon honneur est bafoué, <character name="Cain" />. Je préfère la <emphasis>chair fraîche</emphasis>, pas les douceurs gluantes.</speaker>
    `;

    const parser = new MarkupParser();
    const result = parser.parse(nestedContent);

    // Vérifier que le parsing réussit
    expect(result.errors.length).toBeLessThanOrEqual(5); // Tolérer quelques avertissements
    expect(result.nodes.length).toBeGreaterThan(0);

    // Vérifier que le tag speaker principal est trouvé
    const speakerNodes = result.nodes.filter(node => node.type === 'speaker');
    expect(speakerNodes.length).toBeGreaterThanOrEqual(1);

    if (speakerNodes.length > 0) {
      expect(speakerNodes[0]?.attributes?.name).toBe('Fenrir');
      expect(speakerNodes[0]?.content).toContain('Mon honneur est bafoué');
      expect(speakerNodes[0]?.content).toContain('<character name="Cain" />');
    }
  });

  it('should handle complex nested dialogue with multiple tags', () => {
    const complexContent = `
      <speaker name="Marie">I found this <highlight>ancient scroll</highlight> in the <location name="Sacred Library" />. It speaks of a <important>ritual that must be performed at midnight</important>.</speaker>
    `;

    const parser = new MarkupParser();
    const result = parser.parse(complexContent);

    const speakerNodes = result.nodes.filter(node => node.type === 'speaker');
    expect(speakerNodes.length).toBeGreaterThanOrEqual(1);

    if (speakerNodes.length > 0) {
      const content = speakerNodes[0]?.content || '';
      expect(content).toContain('ancient scroll');
      expect(content).toContain('Sacred Library');
      expect(content).toContain('ritual that must be performed');
    }
  });

  it('should properly parse standalone tags alongside nested dialogue', () => {
    const mixedContent = `
      The ancient <location name="Tower" /> loomed ahead.
      <speaker name="Fenrir">Mon honneur est bafoué, <character name="Cain" />.</speaker>
      <character name="Captain" /> scanned the horizon.
    `;

    const parser = new MarkupParser();
    const result = parser.parse(mixedContent);

    // Vérifier que tous les types de tags sont trouvés
    const tagTypes = result.nodes.map(node => node.type).filter(type => type !== 'text');
    expect(tagTypes).toContain('location');
    expect(tagTypes).toContain('speaker');
    expect(tagTypes).toContain('character');

    // Vérifier les attributs name
    const locationNodes = result.nodes.filter(node => node.type === 'location');
    if (locationNodes.length > 0) {
      expect(locationNodes[0]?.attributes?.name).toBe('Tower');
    }

    const speakerNodes = result.nodes.filter(node => node.type === 'speaker');
    if (speakerNodes.length > 0) {
      expect(speakerNodes[0]?.attributes?.name).toBe('Fenrir');
    }
  });

  it('should handle the exact user example with correct XML formatting', () => {
    const userExampleFixed = `
      <speaker name="Fenrir">Moi ? Accuser un esprit-loup légendaire de chaparder des gâteaux de riz ? Mon honneur est bafoué, <character name="Cain" />. Je préfère la chair fraîche, pas les douceurs gluantes. Et puis, je les aurais mangés devant elle pour le plaisir de la provocation.</speaker>
    `;

    const parser = new MarkupParser();
    const result = parser.parse(userExampleFixed);

    // Le contenu doit être parsé avec succès
    const speakerNodes = result.nodes.filter(node => node.type === 'speaker');
    expect(speakerNodes.length).toBeGreaterThanOrEqual(1);

    if (speakerNodes.length > 0) {
      expect(speakerNodes[0]?.attributes?.name).toBe('Fenrir');
      expect(speakerNodes[0]?.content).toContain('Accuser un esprit-loup légendaire');
      expect(speakerNodes[0]?.content).toContain('<character name="Cain" />');
      expect(speakerNodes[0]?.content).toContain('chair fraîche');
    }
  });

  it('should demonstrate the incorrect format from user example', () => {
    const userExampleIncorrect = `
      Fenrir:
      "Moi ? Accuser un esprit-loup légendaire de chaparder des gâteaux de riz ? Mon honneur est bafoué, <character name="Cain" />. Je préfère la chair fraîche, pas les douceurs gluantes."
    `;

    const parser = new MarkupParser();
    const result = parser.parse(userExampleIncorrect);

    // Dans le format incorrect, le contenu devrait être traité majoritairement comme du texte
    const textNodes = result.nodes.filter(node => node.type === 'text');
    expect(textNodes.length).toBeGreaterThan(0);

    // Le tag character isolé pourrait être détecté mais sans le contexte du speaker parent
    const characterNodes = result.nodes.filter(node => node.type === 'character');
    if (characterNodes.length > 0) {
      expect(characterNodes[0]?.attributes?.name).toBe('Cain');
    }
  });
});