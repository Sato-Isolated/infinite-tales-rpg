// Test de debug avec logs détaillés pour voir position par position
import { describe, it } from 'vitest';
import { MarkupParser } from '../parser';

describe('Position Debug', () => {
  it('should debug position tracking', () => {
    const content = '<speaker name="Test">Hello</speaker>';
    
    console.log('=== POSITION DEBUG ===');
    console.log('Content:', content);
    console.log('Content length:', content.length);
    
    // Recherchons manuellement les positions importantes
    console.log('Positions:');
    console.log('< at:', content.indexOf('<'));
    console.log('> at:', content.indexOf('>'));
    console.log('</ at:', content.indexOf('</'));
    console.log('Last > at:', content.lastIndexOf('>'));
    
    const parser = new MarkupParser();
    const result = parser.parse(content);

    console.log('Final result errors:', result.errors);
  });

  it('should manually test isClosingTag logic', () => {
    const text = '<speaker name="Test">Hello</speaker>';
    const tagName = 'speaker';
    
    // Test position 26 (where </speaker> should start)
    const position = 26;
    const substr = text.substr(position, tagName.length + 3);
    console.log(`Position ${position}, substr: "${substr}"`);
    console.log(`Expected: "</${tagName}>"`);
    console.log('Match:', substr === `</${tagName}>`);
    
    // Also test position 21 (where the content starts)
    const position2 = 21;
    const substr2 = text.substr(position2, tagName.length + 3);
    console.log(`Position ${position2}, substr: "${substr2}"`);
  });
});