// Test de debug simple pour identifier le problème
import { describe, it, expect } from 'vitest';
import { MarkupParser } from '../parser';

describe('Simple Nested Debug', () => {
  it('should debug simple character tag', () => {
    const content = '<character name="Marie" />';
    
    const parser = new MarkupParser();
    const result = parser.parse(content);

    console.log('=== SIMPLE CHARACTER ===');
    console.log('Input:', content);
    console.log('Errors:', result.errors);
    console.log('Nodes:', result.nodes);
    
    expect(result.errors.length).toBe(0);
    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].type).toBe('character');
  });

  it('should debug speaker with simple text', () => {
    const content = '<speaker name="Test">Hello world</speaker>';
    
    const parser = new MarkupParser();
    const result = parser.parse(content);

    console.log('=== SPEAKER WITH TEXT ===');
    console.log('Input:', content);
    console.log('Errors:', result.errors);
    console.log('Nodes:', result.nodes);
    console.log('Speaker children:', result.nodes[0]?.children);
    
    expect(result.errors.length).toBe(0);
    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].type).toBe('speaker');
  });

  it('should debug speaker with nested character - ORIGINAL ISSUE', () => {
    const content = '<speaker name="Narrateur">Soudain, <character name="Alice">Alice</character> apparut dans <location name="la forêt">la forêt</location> mystérieuse.</speaker>';
    
    const parser = new MarkupParser();
    const result = parser.parse(content);

    console.log('=== ORIGINAL NESTED ISSUE ===');
    console.log('Input:', content);
    console.log('Error count:', result.errors.length);
    
    if (result.errors.length > 0) {
      console.log('Errors:');
      result.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error.message} at position ${error.position}`);
      });
    }
    
    console.log('Nodes count:', result.nodes.length);
    console.log('Nodes:', JSON.stringify(result.nodes, null, 2));
    
    if (result.nodes[0]) {
      console.log('Speaker content:', JSON.stringify(result.nodes[0].content));
      console.log('Speaker children count:', result.nodes[0].children?.length || 0);
      
      if (result.nodes[0].children) {
        result.nodes[0].children.forEach((child, i) => {
          console.log(`Child ${i}:`, {
            type: child.type,
            content: child.content,
            attributes: child.attributes
          });
        });
      }
    }
    
    // Pour l'instant, attendons-nous à des erreurs pour voir ce qui se passe
  });
});