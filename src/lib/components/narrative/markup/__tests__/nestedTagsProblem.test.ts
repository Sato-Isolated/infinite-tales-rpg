// Test pour reproduire le problème des balises imbriquées
import { describe, it, expect } from 'vitest';
import { MarkupParser } from '../parser';

describe('Nested Tags Problem', () => {
  it('should parse nested character in speaker dialogue', () => {
    const content = '<speaker name="Narrateur">Il regarde <character name="Marie" /> avec attention.</speaker>';
    
    const parser = new MarkupParser();
    const result = parser.parse(content);

    console.log('=== NESTED TAGS DEBUG ===');
    console.log('Input:', content);
    console.log('Errors:', result.errors);
    console.log('Nodes count:', result.nodes.length);
    
    result.nodes.forEach((node, i) => {
      console.log(`Node ${i}:`, {
        type: node.type,
        content: node.content ? `"${node.content}"` : 'empty',
        attributes: node.attributes || 'none',
        children: node.children ? `${node.children.length} children` : 'no children'
      });
      
      if (node.children) {
        node.children.forEach((child, j) => {
          console.log(`  Child ${j}:`, {
            type: child.type,
            content: child.content ? `"${child.content}"` : 'empty',
            attributes: child.attributes || 'none'
          });
        });
      }
    });

    // Les erreurs doivent être résolues maintenant
    console.log('Errors should be 0:', result.errors.length);
    expect(result.errors.length).toBe(0);
    
    // Devrait avoir un speaker avec du contenu parsé
    const speakerNodes = result.nodes.filter(node => node.type === 'speaker');
    expect(speakerNodes.length).toBe(1);
    
    const speakerNode = speakerNodes[0];
    console.log('Speaker content:', speakerNode.content);
    console.log('Speaker children:', speakerNode.children);
    
    // Le speaker devrait avoir des enfants maintenant
    expect(speakerNode.children).toBeDefined();
    if (speakerNode.children) {
      expect(speakerNode.children.length).toBeGreaterThan(0);
      
      // Il devrait y avoir une balise character parmi les enfants
      const characterChildren = speakerNode.children.filter(child => child.type === 'character');
      expect(characterChildren.length).toBe(1);
      expect(characterChildren[0].attributes?.name).toBe('Marie');
    }
  });

  it('should parse nested location in speaker dialogue', () => {
    const content = '<speaker name="Guide">Nous arrivons à <location name="Paris" />.</speaker>';
    
    const parser = new MarkupParser();
    const result = parser.parse(content);

    console.log('=== LOCATION IN DIALOGUE ===');
    console.log('Speaker content:', result.nodes[0]?.content);
    console.log('Speaker children:', result.nodes[0]?.children);
    
    const speakerNode = result.nodes[0];
    if (speakerNode?.children) {
      const locationChildren = speakerNode.children.filter(child => child.type === 'location');
      expect(locationChildren.length).toBe(1);
      expect(locationChildren[0].attributes?.name).toBe('Paris');
    } else {
      // Le contenu ne devrait plus contenir de XML brut
      expect(speakerNode?.content).not.toContain('<location');
    }
  });

  it('should show the current broken behavior', () => {
    const content = '<speaker name="Test"><character name="Marie" /></speaker>';
    
    const parser = new MarkupParser();
    const result = parser.parse(content);

    console.log('=== CURRENT BROKEN BEHAVIOR ===');
    console.log('Raw content:', result.nodes[0]?.content);
    
    // Actuellement, cela va probablement contenir le XML brut
    // ce qui montre que le parsing n'est pas récursif
  });
});