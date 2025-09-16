import { describe, it, expect } from 'vitest';
import { MarkupParser } from '../parser';

describe('Problem Resolution Validation', () => {
  it('should completely resolve the nested tags parsing issue - USER PROBLEM SOLVED', () => {
    const parser = new MarkupParser();
    
    // Problème exact de l'utilisateur: balises character et location imbriquées dans speaker
    const userProblem = `<speaker name="Narrateur">Soudain, <character name="Alice">Alice</character> apparut dans <location name="la forêt">la forêt</location> mystérieuse.</speaker>`;
    
    console.log('=== RÉSOLUTION DU PROBLÈME UTILISATEUR ===');
    console.log('Input problématique:', userProblem);
    
    const result = parser.parse(userProblem);
    
    console.log('Erreurs:', result.errors.length);
    console.log('Nodes parsés:', result.nodes.length);
    
    // VALIDATION: Plus d'erreurs
    expect(result.errors.length).toBe(0);
    
    // VALIDATION: Un noeud speaker principal
    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].type).toBe('speaker');
    
    // VALIDATION: Speaker a des enfants (balises imbriquées)
    expect(result.nodes[0].children).toBeDefined();
    expect(result.nodes[0].children!.length).toBe(5); // text + character + text + location + text
    
    // VALIDATION: Les balises character et location sont correctement parsées
    const children = result.nodes[0].children!;
    
    // Child 1 devrait être character avec contenu "Alice"
    expect(children[1].type).toBe('character');
    expect(children[1].attributes?.name).toBe('Alice');
    expect(children[1].content).toBe('Alice');
    
    // Child 3 devrait être location avec contenu "la forêt"
    expect(children[3].type).toBe('location');
    expect(children[3].attributes?.name).toBe('la forêt');
    expect(children[3].content).toBe('la forêt');
    
    console.log('✅ Problème utilisateur complètement résolu!');
    console.log('✅ Character parsé:', children[1]);
    console.log('✅ Location parsé:', children[3]);
  });

  it('should also handle both self-closing and content tags properly', () => {
    const parser = new MarkupParser();
    
    // Test des deux formats supportés
    const mixedFormat = `<speaker name="Test">Hello <character name="Bob" /> and <character name="Alice">Alice</character>!</speaker>`;
    
    const result = parser.parse(mixedFormat);
    
    expect(result.errors.length).toBe(0);
    expect(result.nodes[0].children!.length).toBe(5); // text + character + text + character + text
    
    // Self-closing character
    const selfClosingChar = result.nodes[0].children![1];
    expect(selfClosingChar.type).toBe('character');
    expect(selfClosingChar.attributes?.name).toBe('Bob');
    expect(selfClosingChar.content).toBe('');
    
    // Content character
    const contentChar = result.nodes[0].children![3];
    expect(contentChar.type).toBe('character');
    expect(contentChar.attributes?.name).toBe('Alice');
    expect(contentChar.content).toBe('Alice');
    
    console.log('✅ Les deux formats fonctionnent parfaitement!');
  });
});