// Test de debug pour identifier le problème de parsing location
import { describe, it, expect } from 'vitest';
import { MarkupParser } from '../parser';

describe('Location Parsing Debug', () => {
  it('should debug the exact user example', () => {
    // Exemple exact de l'utilisateur
    const content = 'La nuit tombait sur le <location name="Quartiers de néons" />.';
    
    console.log('Content to parse:', JSON.stringify(content));
    
    const parser = new MarkupParser();
    const result = parser.parse(content);

    console.log('Parse result:', JSON.stringify(result, null, 2));
    console.log('Nodes found:', result.nodes.length);
    console.log('Errors:', result.errors);
    
    // Détails de chaque node
    result.nodes.forEach((node, index) => {
      console.log(`Node ${index}:`, {
        type: node.type,
        content: node.content,
        attributes: node.attributes
      });
    });

    // Vérifications
    expect(result.errors.length).toBe(0);
    
    const locationNodes = result.nodes.filter(node => node.type === 'location');
    console.log('Location nodes found:', locationNodes.length);
    
    if (locationNodes.length > 0) {
      console.log('First location node:', locationNodes[0]);
      expect(locationNodes[0].attributes?.name).toBe('Quartiers de néons');
    } else {
      console.log('NO LOCATION NODES FOUND!');
    }
  });

  it('should test simpler location example', () => {
    const content = '<location name="Test" />';
    const parser = new MarkupParser();
    const result = parser.parse(content);
    
    console.log('Simple test result:', result);
    expect(result.errors.length).toBe(0);
    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].type).toBe('location');
  });
});