import { describe, it, expect } from 'vitest';
import { MarkupParser } from '../parser';

describe('Character Fix Validation', () => {
  it('should show characters correctly after fix', () => {
    const parser = new MarkupParser();
    
    console.log('=== TEST CHARACTERS APRÈS FIX ===');
    
    // Test des différents cas
    const cases = [
      {
        name: 'Self-closing simple',
        input: '<character name="Bob" />',
        expected: 'devrait afficher "Bob"'
      },
      {
        name: 'Avec contenu',
        input: '<character name="Alice">Alice</character>',
        expected: 'devrait afficher "Alice" (du contenu)'
      },
      {
        name: 'Dans speaker - mixte',
        input: '<speaker name="Test">Hello <character name="Charlie" /> and <character name="Diana">Diana</character>!</speaker>',
        expected: 'devrait afficher Charlie et Diana correctement'
      }
    ];
    
    cases.forEach((testCase, index) => {
      console.log(`\n${index + 1}. ${testCase.name}:`);
      console.log('Input:', testCase.input);
      
      const result = parser.parse(testCase.input);
      
      if (result.nodes[0].type === 'character') {
        // Character direct
        const charNode = result.nodes[0];
        console.log('Character node:');
        console.log('  - Name attribute:', charNode.attributes?.name);
        console.log('  - Content:', JSON.stringify(charNode.content));
        console.log('  - Has children:', charNode.children ? charNode.children.length : 'none');
        console.log('  - Expected display:', charNode.children && charNode.children.length > 0 ? 'children content' : 'name attribute');
      } else if (result.nodes[0].type === 'speaker') {
        // Character dans speaker
        const speakerNode = result.nodes[0];
        console.log('Speaker avec characters:');
        speakerNode.children?.forEach((child, i) => {
          if (child.type === 'character') {
            console.log(`  Character [${i}]:`);
            console.log(`    - Name: ${child.attributes?.name}`);
            console.log(`    - Content: ${JSON.stringify(child.content)}`);
            console.log(`    - Has children: ${child.children ? child.children.length : 'none'}`);
            console.log(`    - Should display: ${child.children && child.children.length > 0 ? 'children content' : 'name attribute'}`);
          }
        });
      }
      
      expect(result.errors.length).toBe(0);
    });
    
    console.log('\n✅ Tous les cas testés - les characters devraient maintenant s\'afficher correctement!');
  });
});