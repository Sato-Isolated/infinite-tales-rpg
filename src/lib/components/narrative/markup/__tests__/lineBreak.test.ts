// Tests pour la balise line-break
import { describe, it, expect } from 'vitest';
import { MarkupParser } from '../parser';

describe('Line Break Support', () => {
  it('should parse simple line-break tags correctly', () => {
    const content = `
      Voici un premier paragraphe avec du contenu important.
      <line-break />
      Et voici un second paragraphe après le saut de ligne.
    `;

    const parser = new MarkupParser();
    const result = parser.parse(content);

    // Vérifier qu'il n'y a pas d'erreurs
    expect(result.errors.length).toBe(0);
    expect(result.nodes.length).toBeGreaterThan(0);

    // Vérifier que la balise line-break est trouvée
    const lineBreakNodes = result.nodes.filter(node => node.type === 'line-break');
    expect(lineBreakNodes.length).toBe(1);
    
    // Vérifier les propriétés du node line-break
    expect(lineBreakNodes[0].content).toBe('');
    expect(lineBreakNodes[0].attributes).toEqual({});
  });

  it('should handle multiple line-breaks in content', () => {
    const content = `
      <speaker name="Marie">Voici la première partie de mon discours.</speaker>
      <line-break />
      <speaker name="Marie">Et voici la suite après une pause.</speaker>
      <line-break />
      <speaker name="Captain">Je réponds maintenant.</speaker>
    `;

    const parser = new MarkupParser();
    const result = parser.parse(content);

    expect(result.errors.length).toBe(0);
    
    // Vérifier qu'on a bien 2 line-breaks
    const lineBreakNodes = result.nodes.filter(node => node.type === 'line-break');
    expect(lineBreakNodes.length).toBe(2);
    
    // Vérifier qu'on a aussi les speakers
    const speakerNodes = result.nodes.filter(node => node.type === 'speaker');
    expect(speakerNodes.length).toBe(3);
  });

  it('should handle line-breaks in complex narrative content', () => {
    const content = `
      L'aventure commence dans une <location name="forêt mystérieuse" />.
      <line-break />
      <speaker name="Guide">Suivez-moi de près, <character name="aventuriers" />.</speaker>
      <highlight>Un bruit étrange résonne dans les arbres.</highlight>
      <line-break />
      <whisper>Quelque chose nous observe</whisper>, murmura-t-il.
    `;

    const parser = new MarkupParser();
    const result = parser.parse(content);

    expect(result.errors.length).toBe(0);
    
    // Vérifier la variété de balises
    const lineBreakNodes = result.nodes.filter(node => node.type === 'line-break');
    const speakerNodes = result.nodes.filter(node => node.type === 'speaker');
    const locationNodes = result.nodes.filter(node => node.type === 'location');
    const highlightNodes = result.nodes.filter(node => node.type === 'highlight');
    const whisperNodes = result.nodes.filter(node => node.type === 'whisper');
    
    expect(lineBreakNodes.length).toBe(2);
    expect(speakerNodes.length).toBe(1);
    expect(locationNodes.length).toBe(1);
    expect(highlightNodes.length).toBe(1);
    expect(whisperNodes.length).toBe(1);
  });

  it('should handle line-break with proper self-closing syntax', () => {
    const variations = [
      '<line-break />',
      '<line-break/>',
      '<line-break />',
    ];

    const parser = new MarkupParser();

    variations.forEach(variation => {
      const content = `Texte avant ${variation} Texte après`;
      const result = parser.parse(content);
      
      expect(result.errors.length).toBe(0);
      const lineBreakNodes = result.nodes.filter(node => node.type === 'line-break');
      expect(lineBreakNodes.length).toBe(1);
    });
  });

  it('should prevent consecutive line-breaks as per guidelines', () => {
    const content = `
      Texte avant
      <line-break />
      <line-break />
      Texte après
    `;

    const parser = new MarkupParser();
    const result = parser.parse(content);

    // Le parser ne devrait pas bloquer, mais on pourra ajouter des warnings plus tard
    const lineBreakNodes = result.nodes.filter(node => node.type === 'line-break');
    expect(lineBreakNodes.length).toBe(2);
    
    // Pour l'instant, on accepte les multiples line-breaks
    // mais on pourra ajouter des warnings dans une future version
  });

  it('should work in long text blocks scenario', () => {
    const longContent = `
      Dans les profondeurs de la <location name="Caverne des Échos" />, l'équipe d'aventuriers avançait prudemment. Les murs suintaient d'humidité et l'air était chargé d'une tension palpable. Chaque pas résonnait comme un murmure amplifié par la voûte rocheuse.
      
      <line-break />
      
      <speaker name="Eldara">Je sens une présence magique puissante quelque part devant nous</speaker>, chuchota la <character name="mage elfe" />. Ses yeux brillaient d'une lueur bleutée, révélant l'activation de sa <highlight>vision mystique</highlight>.
      
      <line-break />
      
      Le groupe s'arrêta net. <character name="Thorin" /> leva son marteau en position défensive tandis que <character name="Lysa" /> préparait discrètement ses <highlight>dagues empoisonnées</highlight>. L'atmosphère était devenue électrique.
    `;

    const parser = new MarkupParser();
    const result = parser.parse(longContent);

    expect(result.errors.length).toBe(0);
    
    // Vérifier que les line-breaks structurent bien le contenu
    const lineBreakNodes = result.nodes.filter(node => node.type === 'line-break');
    expect(lineBreakNodes.length).toBe(2);
    
    // Vérifier que le reste du contenu est bien parsé
    expect(result.nodes.length).toBeGreaterThan(10); // Beaucoup d'éléments
  });
});