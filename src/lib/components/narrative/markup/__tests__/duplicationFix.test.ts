import { describe, it, expect } from 'vitest';
import { MarkupParser } from '../parser';

describe('Duplication Fix Validation', () => {
  it('should not duplicate content when rendering nested tags', () => {
    const parser = new MarkupParser();
    
    // Test avec le cas exact où l'utilisateur a vu la duplication
    const duplicatingContent = `<speaker name="Narrateur">Soudain, <character name="Alice">Alice</character> apparut dans <location name="la forêt">la forêt</location> mystérieuse.</speaker>`;
    
    console.log('=== TEST DUPLICATION FIX ===');
    console.log('Input:', duplicatingContent);
    
    const result = parser.parse(duplicatingContent);
    
    expect(result.errors.length).toBe(0);
    expect(result.nodes.length).toBe(1);
    
    const speakerNode = result.nodes[0];
    expect(speakerNode.type).toBe('speaker');
    expect(speakerNode.children).toBeDefined();
    expect(speakerNode.children!.length).toBe(5);
    
    // Vérifier que le contenu n'est PAS dupliqué
    // Le content devrait contenir les balises non-parsées pour référence
    // Mais les composants utiliseront les children à la place
    console.log('Speaker content (raw):', speakerNode.content);
    console.log('Speaker children count:', speakerNode.children!.length);
    
    // Le contenu raw contient encore les balises (c'est normal pour la logique interne)
    expect(speakerNode.content).toContain('<character name="Alice" />');
    expect(speakerNode.content).toContain('<location name="la forêt" />');
    
    // Mais les children contiennent les données parsées
    const children = speakerNode.children!;
    expect(children[1].type).toBe('character');
    expect(children[1].content).toBe('Alice');
    expect(children[3].type).toBe('location');
    expect(children[3].content).toBe('la forêt');
    
    console.log('✅ Duplication fix verified - components will render children instead of raw content');
  });

  it('should handle simple content without children correctly', () => {
    const parser = new MarkupParser();
    
    // Test sans imbrication - doit afficher le contenu simple
    const simpleContent = `<speaker name="Bob">Hello world</speaker>`;
    
    const result = parser.parse(simpleContent);
    
    expect(result.errors.length).toBe(0);
    const speakerNode = result.nodes[0];
    
    // Sans enfants imbriqués, il y a juste un noeud de texte dans children
    expect(speakerNode.children!.length).toBe(1);
    expect(speakerNode.children![0].type).toBe('text');
    expect(speakerNode.children![0].content).toBe('Hello world');
    
    console.log('✅ Simple content works correctly with children');
  });

  it('should handle self-closing tags without duplication', () => {
    const parser = new MarkupParser();
    
    // Test avec balises self-closing
    const selfClosingContent = `<speaker name="Test">Hello <character name="Bob" /> and goodbye!</speaker>`;
    
    const result = parser.parse(selfClosingContent);
    
    expect(result.errors.length).toBe(0);
    const speakerNode = result.nodes[0];
    
    expect(speakerNode.children!.length).toBe(3); // text + character + text
    expect(speakerNode.children![1].type).toBe('character');
    expect(speakerNode.children![1].content).toBe(''); // Self-closing a un contenu vide
    expect(speakerNode.children![1].attributes?.name).toBe('Bob');
    
    console.log('✅ Self-closing tags work without duplication');
  });
});