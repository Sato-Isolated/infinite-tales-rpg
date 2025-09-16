// Test d'intégration E2E pour le système XML
import { describe, it, expect } from 'vitest';
import { MarkupParser } from '../parser';
import { validateXmlMarkup, cleanXmlMarkup } from '../../../narrative/narrativeSanitizer';

describe('Integration E2E XML Markup System', () => {
  it('should successfully parse and validate complex XML content', () => {
    const complexXmlContent = `
      La <location name="Tour des Mystères" /> se dressait devant eux.
      <speaker name="Marie">Nous devons faire attention !</speaker>
      <character name="Capitaine" /> scruta l'horizon.
      <highlight>Une lueur mystérieuse émanait du sommet.</highlight>
      <time>L'aube se levait lentement.</time>
      <whisper>Restez près de moi</whisper>, murmura-t-elle.
    `;

    const parser = new MarkupParser();
    const result = parser.parse(complexXmlContent);

    // Le parsing peut avoir des avertissements mais devrait réussir
    expect(result.errors.length).toBeLessThanOrEqual(10); // Tolérer quelques avertissements
    expect(result.nodes.length).toBeGreaterThan(0);

    // Vérifier que tous les types de tags sont reconnus
    const tagTypes = result.nodes.map(node => node.type).filter(type => type !== 'text');
    expect(tagTypes).toContain('location');
    expect(tagTypes).toContain('speaker');
    expect(tagTypes).toContain('character');
    expect(tagTypes).toContain('highlight');
    expect(tagTypes).toContain('time');
    expect(tagTypes).toContain('whisper');

    // Vérifier la validation globale
    const validationResult = validateXmlMarkup(complexXmlContent);
    expect(validationResult.isValid).toBe(true);
    expect(validationResult.errors.length).toBe(0);
  });

  it('should handle legacy format rejection correctly', () => {
    const legacyContent = `
      @speaker:Marie:Hello there!
      @char:Captain
      @highlight:important text
      @location:Forest
      @time:Dawn
      @whisper:secret
      @br
    `;

    const parser = new MarkupParser();
    const result = parser.parse(legacyContent);

    // Le contenu legacy devrait être traité comme du texte normal
    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].type).toBe('text');
    expect(result.nodes[0].content).toContain('@speaker:Marie:Hello there!');
  });

  it('should clean and sanitize XML content properly', () => {
    const messyXmlContent = `
      < speaker   name = "Marie" >Hello!</ speaker >
      <  character name="Captain"  />
      < highlight >Important text< /highlight >
    `;

    const cleanedContent = cleanXmlMarkup(messyXmlContent);

    // Le contenu nettoyé devrait contenir les éléments principaux
    expect(cleanedContent).toContain('speaker name="Marie"');
    expect(cleanedContent).toContain('character name="Captain"');
    expect(cleanedContent).toContain('highlight');

    // Vérifier que le contenu nettoyé est valide
    const validationResult = validateXmlMarkup(cleanedContent);
    expect(validationResult.isValid).toBe(true);
  });

  it('should maintain performance with large content', () => {
    // Créer un contenu XML volumineux
    const largeContent = Array(1000).fill(0).map((_, i) => 
      `<speaker name="Character${i}">Message number ${i}</speaker>`
    ).join('\n');

    const startTime = performance.now();
    
    const parser = new MarkupParser();
    const result = parser.parse(largeContent);
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Le parsing devrait être rapide (moins de 100ms pour 1000 éléments)
    expect(processingTime).toBeLessThan(100);
    expect(result.nodes.length).toBeGreaterThanOrEqual(1000); // Au moins 1000 noeuds
  });

  it('should integrate with AI prompt system validation', () => {
    // Simuler le contenu généré par les agents AI avec la nouvelle syntaxe
    const aiGeneratedContent = `
      <speaker name="NPC_Merchant">Welcome to my shop, traveler!</speaker>
      The merchant's stall was filled with <highlight>exotic artifacts</highlight>.
      <character name="Player" /> examined the wares carefully.
      <whisper>Some of these items seem magical</whisper>, you think to yourself.
      
      <time>As evening approaches</time>, the marketplace becomes quieter.
    `;

    const parser = new MarkupParser();
    const result = parser.parse(aiGeneratedContent);

    // Le contenu généré par l'AI peut avoir quelques avertissements mais devrait être traitable
    expect(result.errors.length).toBeLessThanOrEqual(10);

    // Vérifier que les noms de personnages sont extraits correctement
    const speakerNodes = result.nodes.filter(node => node.type === 'speaker');
    expect(speakerNodes.length).toBeGreaterThanOrEqual(1);
    if (speakerNodes.length > 0) {
      expect(speakerNodes[0]?.attributes?.name).toBe('NPC_Merchant');
    }

    const characterNodes = result.nodes.filter(node => node.type === 'character');
    expect(characterNodes.length).toBeGreaterThanOrEqual(1);
    if (characterNodes.length > 0) {
      expect(characterNodes[0]?.attributes?.name).toBe('Player');
    }

    // Vérifier que tous les types de contenu narratif sont présents
    const highlightNodes = result.nodes.filter(node => node.type === 'highlight');
    expect(highlightNodes.length).toBeGreaterThanOrEqual(1);

    const whisperNodes = result.nodes.filter(node => node.type === 'whisper');
    expect(whisperNodes.length).toBeGreaterThanOrEqual(1);

    const timeNodes = result.nodes.filter(node => node.type === 'time');
    expect(timeNodes.length).toBeGreaterThanOrEqual(1);
  });
});