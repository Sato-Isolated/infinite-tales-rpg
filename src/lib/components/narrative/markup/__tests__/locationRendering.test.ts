// Test de configuration et cohérence pour location
import { describe, it, expect } from 'vitest';
import { MarkupParser, MARKUP_CONFIG } from '../parser';
import type { MarkupTag } from '../types';

describe('Location Configuration Test', () => {
  it('should have location in MARKUP_CONFIG', () => {
    expect(MARKUP_CONFIG).toHaveProperty('location');
    
    const locationConfig = MARKUP_CONFIG.location;
    console.log('Location config:', locationConfig);
    
    expect(locationConfig.tag).toBe('location');
    expect(locationConfig.selfClosing).toBe(true);
    expect(locationConfig.hasAttributes).toBe(true);
    expect(locationConfig.requiredAttributes).toContain('name');
  });

  it('should verify MarkupTag type includes location', () => {
    // Test que le type est cohérent
    const locationTag: MarkupTag = 'location';
    expect(locationTag).toBe('location');
    
    // Test que la config accepte le type
    const config = MARKUP_CONFIG[locationTag];
    expect(config).toBeDefined();
  });

  it('should parse location correctly with debug output', () => {
    const content = 'La nuit tombait sur le <location name="Quartiers de néons" />.';
    
    const parser = new MarkupParser();
    const result = parser.parse(content);

    console.log('=== PARSING DEBUG ===');
    console.log('Input:', content);
    console.log('Errors:', result.errors);
    console.log('Nodes count:', result.nodes.length);
    
    result.nodes.forEach((node, i) => {
      console.log(`Node ${i}:`, {
        type: node.type,
        content: node.content ? `"${node.content}"` : 'empty',
        attributes: node.attributes || 'none'
      });
    });

    expect(result.errors.length).toBe(0);
    
    const locationNodes = result.nodes.filter(node => node.type === 'location');
    expect(locationNodes.length).toBe(1);
    
    const locationNode = locationNodes[0];
    expect(locationNode.attributes?.name).toBe('Quartiers de néons');
    
    // Vérifier la structure complète
    expect(result.nodes.length).toBe(3); // texte + location + texte
    expect(result.nodes[0].type).toBe('text');
    expect(result.nodes[1].type).toBe('location');
    expect(result.nodes[2].type).toBe('text');
  });
});