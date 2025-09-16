// Test de l'exemple utilisateur avec la balise location
import { describe, it, expect } from 'vitest';
import { MarkupParser } from '../parser';

describe('Location Example Test', () => {
  it('should parse French location example correctly', () => {
    const content = 'La nuit tombait sur le <location name="Quartiers de néons" />.';
    
    const parser = new MarkupParser();
    const result = parser.parse(content);

    // Aucune erreur de parsing
    expect(result.errors.length).toBe(0);
    
    // Une balise location trouvée
    const locationNodes = result.nodes.filter(node => node.type === 'location');
    expect(locationNodes.length).toBe(1);
    
    // Vérifier les attributs
    const locationNode = locationNodes[0];
    expect(locationNode.attributes?.name).toBe('Quartiers de néons');
    
    // Vérifier la structure complète
    expect(result.nodes.length).toBe(3); // Texte avant + location + texte après
    
    // Vérifier le contenu textuel
    const textNodes = result.nodes.filter(node => node.type === 'text');
    expect(textNodes[0].content).toBe('La nuit tombait sur le');
    expect(textNodes[1].content).toBe('.');
  });

  it('should handle location in French context with accents', () => {
    const content = 'Je me dirigeais vers <location name="Café de la République" /> quand soudain...';
    
    const parser = new MarkupParser();
    const result = parser.parse(content);

    expect(result.errors.length).toBe(0);
    
    const locationNodes = result.nodes.filter(node => node.type === 'location');
    expect(locationNodes.length).toBe(1);
    expect(locationNodes[0].attributes?.name).toBe('Café de la République');
  });
});