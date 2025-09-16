// Test de démonstration final de la balise line-break
import { describe, it, expect } from 'vitest';
import { MarkupParser } from '../parser';

describe('Line Break - Démonstration Finale', () => {
  it('should demonstrate line-break functionality with a simple example', () => {
    const demoContent = `
      <speaker name="Narrateur">Voici le début de notre histoire épique.</speaker>
      
      <line-break />
      
      Dans un monde lointain, les héros se préparaient à affronter leur destin.
      <highlight>Les étoiles brillaient</highlight> comme jamais auparavant.
      
      <line-break />
      
      <speaker name="Héros">Je suis prêt pour cette aventure !</speaker>
    `;

    const parser = new MarkupParser();
    const result = parser.parse(demoContent);

    // Aucune erreur de parsing
    expect(result.errors.length).toBe(0);
    
    // Les line-breaks sont correctement parsés
    const lineBreaks = result.nodes.filter(node => node.type === 'line-break');
    expect(lineBreaks.length).toBe(2);
    
    // Les autres éléments sont aussi présents
    const speakers = result.nodes.filter(node => node.type === 'speaker');
    const highlights = result.nodes.filter(node => node.type === 'highlight');
    
    expect(speakers.length).toBe(2); // Narrateur et Héros
    expect(highlights.length).toBe(1); // Les étoiles brillaient
    
    // Structure globale cohérente
    expect(result.nodes.length).toBeGreaterThan(5);
  });
});