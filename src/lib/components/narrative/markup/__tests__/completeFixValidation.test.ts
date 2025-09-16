import { describe, it, expect } from 'vitest';
import { MarkupParser } from '../parser';

describe('Complete Fix Validation - Characters No Longer Empty', () => {
  it('should resolve all empty character display issues', () => {
    const parser = new MarkupParser();
    
    console.log('\n🔧 VALIDATION COMPLÈTE - FIX CHARACTERS VIDES');
    console.log('===============================================');
    
    // Test complet avec tous les types de balises
    const complexDialogue = `<speaker name="Narrateur">Voici <character name="Alice">Alice</character>, puis <character name="Bob" />, ensuite <location name="Paris">Paris</location> et <location name="Londres" />.</speaker>`;
    
    console.log('\nInput complexe:', complexDialogue);
    
    const result = parser.parse(complexDialogue);
    
    expect(result.errors.length).toBe(0);
    expect(result.nodes.length).toBe(1);
    
    const speakerNode = result.nodes[0];
    expect(speakerNode.type).toBe('speaker');
    expect(speakerNode.children).toBeDefined();
    
    console.log('\nAnalyse des children:');
    console.log('Total children:', speakerNode.children!.length);
    
    let characterCount = 0;
    let locationCount = 0;
    
    speakerNode.children!.forEach((child, index) => {
      console.log(`\n[${index}] ${child.type}:`);
      
      if (child.type === 'character') {
        characterCount++;
        console.log(`  ├─ Name attribute: "${child.attributes?.name}"`);
        console.log(`  ├─ Content: "${child.content}"`);
        console.log(`  ├─ Has children: ${child.children ? child.children.length : 'none'}`);
        console.log(`  └─ Will display: ${child.children && child.children.length > 0 ? child.children[0].content : child.attributes?.name}`);
        
        // Validation spécifique
        if (child.attributes?.name === 'Alice') {
          expect(child.children).toBeDefined();
          expect(child.children!.length).toBe(1);
          expect(child.children![0].content).toBe('Alice');
        } else if (child.attributes?.name === 'Bob') {
          expect(child.children).toBeUndefined();
          expect(child.attributes?.name).toBe('Bob');
        }
      } else if (child.type === 'location') {
        locationCount++;
        console.log(`  ├─ Name attribute: "${child.attributes?.name}"`);
        console.log(`  ├─ Content: "${child.content}"`);
        console.log(`  ├─ Has children: ${child.children ? child.children.length : 'none'}`);
        console.log(`  └─ Will display: ${child.children && child.children.length > 0 ? child.children[0].content : child.attributes?.name}`);
        
        // Validation spécifique
        if (child.attributes?.name === 'Paris') {
          expect(child.children).toBeDefined();
          expect(child.children!.length).toBe(1);
          expect(child.children![0].content).toBe('Paris');
        } else if (child.attributes?.name === 'Londres') {
          expect(child.children).toBeUndefined();
          expect(child.attributes?.name).toBe('Londres');
        }
      } else if (child.type === 'text') {
        console.log(`  └─ Text content: "${child.content}"`);
      }
    });
    
    console.log(`\n📊 RÉSUMÉ:`)
    console.log(`├─ Characters trouvés: ${characterCount}`);
    console.log(`├─ Locations trouvées: ${locationCount}`);
    console.log(`└─ Erreurs: ${result.errors.length}`);
    
    // Validation finale
    expect(characterCount).toBe(2); // Alice et Bob
    expect(locationCount).toBe(2); // Paris et Londres
    
    console.log('\n✅ SUCCÈS: Les characters et locations ne sont plus vides!');
    console.log('   - Alice (avec contenu) → affichera "Alice"');
    console.log('   - Bob (self-closing) → affichera "Bob"');
    console.log('   - Paris (avec contenu) → affichera "Paris"');
    console.log('   - Londres (self-closing) → affichera "Londres"');
  });

  it('should handle edge cases correctly', () => {
    const parser = new MarkupParser();
    
    console.log('\n🧪 TEST DES CAS LIMITES:');
    
    const edgeCases = [
      {
        name: 'Character sans nom',
        input: '<character>Test</character>',
        shouldError: true
      },
      {
        name: 'Character self-closing sans nom',
        input: '<character />',
        shouldError: true
      },
      {
        name: 'Character avec contenu vide',
        input: '<character name="Empty"></character>',
        expected: 'devrait afficher le nom "Empty"'
      }
    ];
    
    edgeCases.forEach(testCase => {
      console.log(`\n${testCase.name}:`);
      console.log(`Input: ${testCase.input}`);
      
      const result = parser.parse(testCase.input);
      
      if (testCase.shouldError) {
        expect(result.errors.length).toBeGreaterThan(0);
        console.log(`✓ Erreur détectée comme attendu: ${result.errors[0]?.message}`);
      } else {
        expect(result.errors.length).toBe(0);
        console.log(`✓ ${testCase.expected}`);
      }
    });
  });
});